
import pandas as pd
import json
import os

OUT_DIR = "API/analytics"

def main():
    print("Loading dims...")
    emp = pd.read_parquet("API/curated/dim_employer.parquet")
    job = pd.read_parquet("API/curated/dim_job.parquet")
    
    # Employers
    print("Exporting Employers...")
    # Rename columns for frontend convenience?
    # Keep standard: id, name
    emps = emp[['employer_id', 'employer_canonical']].rename(columns={
        'employer_canonical': 'name',
        'employer_id': 'id'
    }).to_dict(orient='records')
    
    # Jobs
    print("Exporting Jobs...")
    jobs = job[['job_id', 'job_canonical', 'job_family']].rename(columns={
        'job_canonical': 'title',
        'job_id': 'id',
        'job_family': 'family'
    }).to_dict(orient='records')
    
    index = {
        "employers": emps,
        "jobs": jobs
    }
    
    with open(os.path.join(OUT_DIR, "search_index.json"), 'w') as f:
        json.dump(index, f)
    
    print("Done.")

if __name__ == "__main__":
    main()
