
import pandas as pd
import json
import os
import numpy as np

INPUT_FILE = "API/curated/fact_comp.parquet"
OUT_DIR = "API/analytics"
os.makedirs(OUT_DIR, exist_ok=True)

def generate_employer_metrics(df):
    print("Generating Employer Metrics...")
    
    years = sorted(df['year'].unique())
    results = {}
    
    # Pre-calculate Pay Stats per (Employer, Year)
    # This is fast.
    print("  Calculating Pay Stats...")
    pay_stats = df.groupby(['employer_id', 'year'])['total_comp'].agg(
        headcount='count',
        mean_pay='mean',
        p50=lambda x: x.quantile(0.50),
        p75=lambda x: x.quantile(0.75),
        p90=lambda x: x.quantile(0.90),
        p99=lambda x: x.quantile(0.99)
    ).reset_index()
    
    # Convert to dict for easy lookup: (emp_id, year) -> stats
    pay_map = pay_stats.set_index(['employer_id', 'year']).to_dict(orient='index')
    
    # Retention & Growth - BACKWARD LOOKING
    # For year T, we look at who from T-1 stayed in T
    # This allows the latest year (2024) to have valid metrics
    print("  Calculating Retention & Growth (Backward-Looking)...")
    
    # We need to iterate years to compare T-1 -> T
    # For gaps in data, we look at the most recent previous year for each employer
    # Collecting list of records
    final_records = []
    
    for idx, year in enumerate(years):
        print(f"    Processing {year}...")
        
        # Current Year Data
        curr_df = df[df['year'] == year]
        
        # If not first year, calculate retention/growth by looking backward
        if idx > 0:
            # Get ALL previous years data for matching
            # This handles employers with gaps in their data
            prev_years = years[:idx]  # All years before current
            prev_df = df[df['year'].isin(prev_years)]
            
            # For each person-employer combo, get the most recent previous year's data
            # Sort by year descending and take the first (most recent) for each person-employer combo
            prev_df = prev_df.sort_values('year', ascending=False)
            prev_df = prev_df.drop_duplicates(subset=['person_id', 'employer_id'], keep='first')
            
            # Merge: Find people in CURRENT year who were at same employer in ANY PREVIOUS year
            # Left join on curr_df to see who stayed from previous years
            merged = curr_df.merge(
                prev_df[['person_id', 'employer_id', 'total_comp', 'year']], 
                on=['employer_id', 'person_id'], 
                suffixes=('', '_prev'), 
                how='left'
            )
            
            # Stayed: total_comp_prev is not NaN (they were here in a previous year)
            merged['stayed'] = merged['total_comp_prev'].notna()
            
            # Growth: (Current - Previous) / Previous
            merged['growth'] = (merged['total_comp'] - merged['total_comp_prev']) / merged['total_comp_prev']
            
            # Aggregates per Employer
            agg = merged.groupby('employer_id').agg(
                stayed_count=('stayed', 'sum'),
                median_growth=('growth', 'median')
            ).reset_index()
            
            # Get headcount from current year
            curr_headcount = curr_df.groupby('employer_id').size().reset_index(name='curr_headcount')
            agg = agg.merge(curr_headcount, on='employer_id', how='left')
            
            # Create metric objects
            for _, row in agg.iterrows():
                emp_id = row['employer_id']
                stats = pay_map.get((emp_id, year))
                
                if stats:
                    rec = stats.copy()
                    rec['employer_id'] = str(emp_id)
                    rec['year'] = int(year)
                    rec['stayed_count'] = int(row['stayed_count'])
                    # Retention = people who stayed / current headcount
                    rec['retention_rate'] = rec['stayed_count'] / rec['headcount'] if rec['headcount'] > 0 else 0
                    rec['growth_median'] = float(row['median_growth']) if pd.notna(row['median_growth']) else 0.0
                    
                    final_records.append(rec)
        else:
            # First year (1996): No previous data to look backward
            # Just output pay stats with 0 for retention/growth
            curr_stats = pay_stats[pay_stats['year'] == year]
            for _, row in curr_stats.iterrows():
                emp_id = row['employer_id']
                rec = row.to_dict()
                rec['employer_id'] = str(emp_id)
                rec['year'] = int(year)
                rec['stayed_count'] = 0
                rec['retention_rate'] = 0.0
                rec['growth_median'] = 0.0
                final_records.append(rec)

    # Structuring Output
    # List of objects or Map?
    # User might want efficient lookup.
    # But usually a list is fine or grouped by Employer.
    # Let's do List for now, or map by EmployerID?
    # Map is huge. List is standard.
    # Group by Employer ID? -> { "EmpID": [ {Years...} ] }
    # This is better for "Employer Profile".
    
    print("  Grouping by Employer...")
    grouped_output = {}
    for rec in final_records:
        eid = rec['employer_id']
        if eid not in grouped_output:
            grouped_output[eid] = []
        grouped_output[eid].append(rec)
        
    with open(os.path.join(OUT_DIR, "employer_metrics.json"), 'w') as f:
        json.dump(grouped_output, f)

def generate_job_metrics(df):
    print("Generating Job Metrics...")
    # Group by JobID + Year
    # We use 'job_id' (which is canonical + family).
    
    stats = df.groupby(['job_id', 'year'])['total_comp'].agg(
        headcount='count',
        mean_pay='mean',
        p50=lambda x: x.quantile(0.50),
        p75=lambda x: x.quantile(0.75),
        p90=lambda x: x.quantile(0.90)
    ).reset_index()
    
    # Group by Job ID for JSON output
    # { "job_id": [ {year, p50, headcount...} ] }
    print("  Grouping by Job...")
    grouped = {}
    for _, row in stats.iterrows():
        jid = str(row['job_id'])
        if jid not in grouped: grouped[jid] = []
        
        grouped[jid].append({
            'year': int(row['year']),
            'headcount': int(row['headcount']),
            'p50': float(row['p50']),
            'p75': float(row['p75']),
            'p90': float(row['p90']),
            'mean_pay': float(row['mean_pay'])
        })
        
    with open(os.path.join(OUT_DIR, "job_metrics.json"), 'w') as f:
        json.dump(grouped, f)

def main():
    print("Loading facts...")
    df = pd.read_parquet(INPUT_FILE)
    
    generate_employer_metrics(df)
    generate_job_metrics(df)
    print("Done.")

if __name__ == "__main__":
    main()
