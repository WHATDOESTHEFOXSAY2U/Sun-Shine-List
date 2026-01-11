
import pandas as pd
import json
import os

INPUT_FILE = "API/curated/fact_comp.parquet"
OUT_DIR = "API/analytics"
os.makedirs(OUT_DIR, exist_ok=True)

def generate_year_summary(df):
    print("Generating Year Summary...")
    # Group by Year
    stats = df.groupby('year')['total_comp'].agg(
        count='count',
        mean='mean',
        p50=lambda x: x.quantile(0.50),
        p75=lambda x: x.quantile(0.75),
        p90=lambda x: x.quantile(0.90),
        p95=lambda x: x.quantile(0.95),
        p99=lambda x: x.quantile(0.99)
    ).reset_index()
    
    # Format
    output = stats.to_dict(orient='records')
    
    with open(os.path.join(OUT_DIR, "year_summary.json"), 'w') as f:
        json.dump(output, f, indent=2)

def generate_top_earners(df):
    print("Generating Top Earners...")
    years = sorted(df['year'].unique())
    results = {}
    
    for y in years:
        # Get top 100
        top = df[df['year'] == y].nlargest(100, 'total_comp')
        
        records = top[[
            'person_id', 'first_name', 'last_name', 
            'employer_canonical', 'job_canonical', 'total_comp',
            'salary', 'benefits'
        ]].copy()
        
        # Add Rank (1-100)
        records['rank'] = range(1, len(records) + 1)
        
        results[int(y)] = records.to_dict(orient='records')
        
    with open(os.path.join(OUT_DIR, "top_earners.json"), 'w') as f:
        json.dump(results, f, indent=2)

def main():
    print("Loading facts...")
    df = pd.read_parquet(INPUT_FILE)
    
    generate_year_summary(df)
    generate_top_earners(df)
    print("Done.")

if __name__ == "__main__":
    main()
