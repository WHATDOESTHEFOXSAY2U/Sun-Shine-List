#!/usr/bin/env python3
"""
Data Validation Script for Ontario Sunshine List

Runs quality checks on the processed data and generates a report.
"""

import pandas as pd
import json
import os
from datetime import datetime

INPUT_FILE = "API/curated/fact_comp.parquet"
OUTPUT_FILE = "API/analytics/data_quality_report.json"

def check_null_values(df):
    """Check for null/empty values in critical fields."""
    issues = []
    critical_fields = ['first_name', 'last_name', 'employer_canonical', 'total_comp', 'year']
    
    for field in critical_fields:
        if field in df.columns:
            null_count = df[field].isna().sum()
            empty_count = (df[field] == '').sum() if df[field].dtype == 'object' else 0
            
            if null_count > 0 or empty_count > 0:
                issues.append({
                    "check": "null_values",
                    "field": field,
                    "null_count": int(null_count),
                    "empty_count": int(empty_count),
                    "severity": "high" if field in ['total_comp', 'year'] else "medium"
                })
    
    return issues

def check_salary_anomalies(df):
    """Detect salary outliers and anomalies."""
    issues = []
    
    # Extremely high salaries (> $2M)
    high_salary = df[df['total_comp'] > 2_000_000]
    if len(high_salary) > 0:
        issues.append({
            "check": "high_salary",
            "count": int(len(high_salary)),
            "max_value": float(high_salary['total_comp'].max()),
            "severity": "info",
            "sample": high_salary[['first_name', 'last_name', 'employer_canonical', 'total_comp', 'year']].head(5).to_dict('records')
        })
    
    # Zero or negative salaries
    zero_salary = df[df['total_comp'] <= 0]
    if len(zero_salary) > 0:
        issues.append({
            "check": "zero_negative_salary",
            "count": int(len(zero_salary)),
            "severity": "medium",
            "years_affected": sorted(zero_salary['year'].unique().tolist())
        })
    
    # Very low salaries (< $100,001 threshold but still in list)
    low_salary = df[(df['total_comp'] > 0) & (df['total_comp'] < 100_000)]
    if len(low_salary) > 0:
        issues.append({
            "check": "below_threshold",
            "count": int(len(low_salary)),
            "severity": "low",
            "note": "Records below $100K threshold - may be partial year or data issue"
        })
    
    return issues

def check_year_consistency(df):
    """Check for year-over-year consistency."""
    issues = []
    
    # Employer headcount changes
    employer_yearly = df.groupby(['employer_canonical', 'year']).size().reset_index(name='count')
    employer_pivot = employer_yearly.pivot(index='employer_canonical', columns='year', values='count').fillna(0)
    
    large_drops = []
    for col_idx in range(1, len(employer_pivot.columns)):
        curr_year = employer_pivot.columns[col_idx]
        prev_year = employer_pivot.columns[col_idx - 1]
        
        prev_counts = employer_pivot[prev_year]
        curr_counts = employer_pivot[curr_year]
        
        # Find employers with >50% drop (and had at least 50 employees)
        drop_mask = (prev_counts >= 50) & (curr_counts < prev_counts * 0.5) & (curr_counts > 0)
        dropped = employer_pivot[drop_mask].index.tolist()
        
        for emp in dropped[:5]:  # Limit to 5 per year
            large_drops.append({
                "employer": emp,
                "year": int(curr_year),
                "prev_count": int(prev_counts[emp]),
                "curr_count": int(curr_counts[emp]),
                "drop_pct": round((1 - curr_counts[emp] / prev_counts[emp]) * 100, 1)
            })
    
    if large_drops:
        issues.append({
            "check": "large_headcount_drops",
            "count": len(large_drops),
            "severity": "info",
            "samples": large_drops[:10]
        })
    
    return issues

def check_duplicates(df):
    """Check for potential duplicate records."""
    issues = []
    
    # Exact duplicates (same name, employer, year, salary)
    dup_cols = ['first_name', 'last_name', 'employer_canonical', 'year', 'total_comp']
    exact_dups = df[df.duplicated(subset=dup_cols, keep=False)]
    
    if len(exact_dups) > 0:
        issues.append({
            "check": "exact_duplicates",
            "count": int(len(exact_dups)),
            "unique_groups": int(exact_dups.groupby(dup_cols).ngroups),
            "severity": "high"
        })
    
    # Near duplicates (same name, employer, year but different salary - could be job change)
    near_dup_cols = ['first_name', 'last_name', 'employer_canonical', 'year']
    near_dups = df[df.duplicated(subset=near_dup_cols, keep=False)]
    
    # Filter out exact dups
    near_only = len(near_dups) - len(exact_dups)
    if near_only > 0:
        issues.append({
            "check": "same_person_employer_year",
            "count": int(near_only),
            "severity": "low",
            "note": "May indicate job changes within same year/employer"
        })
    
    return issues

def generate_summary_stats(df):
    """Generate summary statistics."""
    return {
        "total_records": int(len(df)),
        "year_range": [int(df['year'].min()), int(df['year'].max())],
        "unique_employers": int(df['employer_canonical'].nunique()),
        "unique_persons": int(df['person_id'].nunique()) if 'person_id' in df.columns else None,
        "unique_job_titles": int(df['job_canonical'].nunique()) if 'job_canonical' in df.columns else None,
        "total_compensation_sum": float(df['total_comp'].sum()),
        "mean_compensation": float(df['total_comp'].mean()),
        "median_compensation": float(df['total_comp'].median())
    }

def main():
    print("Loading data for validation...")
    
    if not os.path.exists(INPUT_FILE):
        print(f"❌ Input file not found: {INPUT_FILE}")
        print("   Run the pipeline stages before validation.")
        return
    
    df = pd.read_parquet(INPUT_FILE)
    print(f"Loaded {len(df):,} records")
    
    all_issues = []
    
    print("\nRunning validation checks...")
    
    print("  Checking null values...")
    all_issues.extend(check_null_values(df))
    
    print("  Checking salary anomalies...")
    all_issues.extend(check_salary_anomalies(df))
    
    print("  Checking year-over-year consistency...")
    all_issues.extend(check_year_consistency(df))
    
    print("  Checking for duplicates...")
    all_issues.extend(check_duplicates(df))
    
    # Categorize issues
    high_severity = [i for i in all_issues if i.get('severity') == 'high']
    medium_severity = [i for i in all_issues if i.get('severity') == 'medium']
    low_severity = [i for i in all_issues if i.get('severity') == 'low']
    info_severity = [i for i in all_issues if i.get('severity') == 'info']
    
    report = {
        "generated_at": datetime.now().isoformat(),
        "summary": generate_summary_stats(df),
        "issue_counts": {
            "high": len(high_severity),
            "medium": len(medium_severity),
            "low": len(low_severity),
            "info": len(info_severity)
        },
        "issues": all_issues
    }
    
    # Save report
    os.makedirs(os.path.dirname(OUTPUT_FILE), exist_ok=True)
    with open(OUTPUT_FILE, 'w') as f:
        json.dump(report, f, indent=2)
    
    print(f"\n{'='*50}")
    print("Data Quality Report")
    print(f"{'='*50}")
    print(f"  Total Records: {report['summary']['total_records']:,}")
    print(f"  Year Range: {report['summary']['year_range'][0]} - {report['summary']['year_range'][1]}")
    print(f"  Unique Employers: {report['summary']['unique_employers']:,}")
    print(f"\nIssues Found:")
    print(f"  🔴 High:   {len(high_severity)}")
    print(f"  🟡 Medium: {len(medium_severity)}")
    print(f"  🟢 Low:    {len(low_severity)}")
    print(f"  ℹ️  Info:   {len(info_severity)}")
    print(f"\nReport saved to: {OUTPUT_FILE}")
    
    # Exit with error if high severity issues
    if len(high_severity) > 0:
        print("\n⚠️  High severity issues detected - review report!")

if __name__ == "__main__":
    main()
