#!/usr/bin/env python3
"""
Sector-Level Analytics Generator for Ontario Sunshine List

Generates analytics aggregated by sector (Hospitals, Schools, Police, etc.)
"""

import pandas as pd
import json
import os

INPUT_FILE = "API/curated/fact_comp.parquet"
OUTPUT_FILE = "API/analytics/sector_metrics.json"

def main():
    print("Loading data...")
    df = pd.read_parquet(INPUT_FILE)
    
    print("Generating sector metrics...")
    
    # Normalize sector names to handle case sensitivity (e.g., "COLLEGES" vs "Colleges")
    df['sector'] = df['sector'].astype(str).str.title().str.strip()
    
    # Group by sector and year
    sector_stats = df.groupby(['sector', 'year']).agg(
        headcount=('total_comp', 'count'),
        total_payroll=('total_comp', 'sum'),
        mean_pay=('total_comp', 'mean'),
        median_pay=('total_comp', 'median'),
        p75=('total_comp', lambda x: x.quantile(0.75)),
        p90=('total_comp', lambda x: x.quantile(0.90)),
        p99=('total_comp', lambda x: x.quantile(0.99)),
        min_pay=('total_comp', 'min'),
        max_pay=('total_comp', 'max'),
        unique_employers=('employer_id', 'nunique')
    ).reset_index()
    
    # Calculate year-over-year growth
    print("Calculating YoY growth...")
    sector_stats = sector_stats.sort_values(['sector', 'year'])
    sector_stats['prev_headcount'] = sector_stats.groupby('sector')['headcount'].shift(1)
    sector_stats['yoy_headcount_growth'] = (
        (sector_stats['headcount'] - sector_stats['prev_headcount']) / 
        sector_stats['prev_headcount']
    ).fillna(0)
    
    sector_stats['prev_mean_pay'] = sector_stats.groupby('sector')['mean_pay'].shift(1)
    sector_stats['yoy_pay_growth'] = (
        (sector_stats['mean_pay'] - sector_stats['prev_mean_pay']) / 
        sector_stats['prev_mean_pay']
    ).fillna(0)
    
    # Get top job titles per sector
    print("Finding top job titles per sector...")
    top_jobs = df.groupby(['sector', 'job_canonical']).size().reset_index(name='count')
    top_jobs = top_jobs.sort_values(['sector', 'count'], ascending=[True, False])
    top_jobs_per_sector = top_jobs.groupby('sector').head(10)
    
    # Build output structure
    print("Building output...")
    output = {}
    
    for sector in sector_stats['sector'].unique():
        sector_data = sector_stats[sector_stats['sector'] == sector]
        sector_jobs = top_jobs_per_sector[top_jobs_per_sector['sector'] == sector]
        
        output[sector] = {
            "years": {},
            "top_job_titles": sector_jobs['job_canonical'].tolist()
        }
        
        for _, row in sector_data.iterrows():
            year = int(row['year'])
            output[sector]["years"][year] = {
                "headcount": int(row['headcount']),
                "total_payroll": round(float(row['total_payroll']), 2),
                "mean_pay": round(float(row['mean_pay']), 2),
                "median_pay": round(float(row['median_pay']), 2),
                "p75": round(float(row['p75']), 2),
                "p90": round(float(row['p90']), 2),
                "p99": round(float(row['p99']), 2),
                "min_pay": round(float(row['min_pay']), 2),
                "max_pay": round(float(row['max_pay']), 2),
                "unique_employers": int(row['unique_employers']),
                "yoy_headcount_growth": round(float(row['yoy_headcount_growth']), 4),
                "yoy_pay_growth": round(float(row['yoy_pay_growth']), 4)
            }
    
    # Add summary across all sectors
    print("Calculating overall summary...")
    overall = df.groupby('year').agg(
        headcount=('total_comp', 'count'),
        total_payroll=('total_comp', 'sum'),
        mean_pay=('total_comp', 'mean'),
        median_pay=('total_comp', 'median')
    ).reset_index()
    
    output["_overall"] = {
        "years": {
            int(row['year']): {
                "headcount": int(row['headcount']),
                "total_payroll": round(float(row['total_payroll']), 2),
                "mean_pay": round(float(row['mean_pay']), 2),
                "median_pay": round(float(row['median_pay']), 2)
            }
            for _, row in overall.iterrows()
        }
    }
    
    # Save
    os.makedirs(os.path.dirname(OUTPUT_FILE), exist_ok=True)
    with open(OUTPUT_FILE, 'w') as f:
        json.dump(output, f)
    
    print(f"\nSector Metrics Summary:")
    print(f"  Sectors: {len(output) - 1}")  # -1 for _overall
    print(f"  Years: {df['year'].min()} - {df['year'].max()}")
    print(f"  Output: {OUTPUT_FILE}")
    print("Done.")

if __name__ == "__main__":
    main()
