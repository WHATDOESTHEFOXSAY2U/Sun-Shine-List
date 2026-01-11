
import pandas as pd
import hashlib
import os
import uuid

INPUT_FILE = "API/staging/stg_rows_enriched_2.parquet"
OUTPUT_FILE = "API/curated/fact_comp.parquet"
OUTPUT_DIM = "API/curated/dim_person.parquet"

def fast_link_persons(df):
    # 1. Normalize Names
    print("Normalizing names...")
    df['name_clean'] = (df['first_name'] + " " + df['last_name']).astype(str).str.upper().str.strip()
    
    # 2. Calculate Name Frequency (Global) - Proxy for "Common Name"
    print("Calculating name frequency...")
    name_counts = df['name_clean'].value_counts().to_dict()
    df['name_freq'] = df['name_clean'].map(name_counts)
    
    # 3. Sort for Linear Scan
    print("Sorting for linking...")
    df = df.sort_values(by=['name_clean', 'year', 'total_comp'])
    
    # 4. Vectorized Lookback logic is hard. Using Python Loop or optimized GroupBy.
    # GroupBy is safe because linking only happens WITHIN name groups.
    # We can apply custom logic per group.
    
    print("Linking persons (this may take a moment)...")
    
    # Vectorized logic attempt:
    # Shift columns to compare with previous row
    df['prev_name'] = df['name_clean'].shift(1)
    df['prev_employer'] = df['employer_id'].shift(1)
    df['prev_job_family'] = df['job_family'].shift(1)
    df['prev_year'] = df['year'].shift(1)
    df['prev_pid'] = None # Placeholder
    
    # Initialize link_mask: Start with False
    # True if we should link to previous
    
    # Condition 1: Name must match
    name_match = (df['name_clean'] == df['prev_name'])
    
    # Condition 2: Employer Match (Strongest signal)
    emp_match = (df['employer_id'] == df['prev_employer'])

    # Condition 3: Job Family Match logic - REMOVED for Robustness/Simplicity
    # We found that people change titles too much, or data is too messy.
    # We will ONLY link on Employer Match for now (High Precision).
    
    # Condition 4: Consecutive Years
    year_diff = df['year'] - df['prev_year']
    
    # STRICT RULES:
    # 1. Name Match IS REQUIRED.
    # 2. Employer Match IS REQUIRED.
    # 3. Gap <= 2 years.
    
    # Why? Because "John Smith" moving from "Toronto Police" to "Hydro One" is rare.
    # "John Smith" stays at "Toronto Police".
    # If they move, we treat them as a new record (False Negative) rather than merging two John Smiths (False Positive).
    # False Positives ruin the "Profile" credibility.
    
    should_link = name_match & emp_match & (year_diff <= 2)
    
    # Variable: Confidence
    # Since we are strict, confidence is effectively "High" for all links.
    df['match_confidence'] = 'High'
    
    # Assign Group IDs
    # cumsum of (~should_link) gives a unique ID for every new "chain"
    # Note: ~should_link is True when we start a NEW person.
    
    df['person_group_id'] = (~should_link).cumsum()
    
    # Now valid person_ids are just these group IDs? 
    # Yes, simplified.
    
    # Let's hash it to look cool
    print("Generating Person IDs...")
    # Map group_id to UUID or Hash
    # For speed, we just use the int group_id, or stringify it
    df['person_id'] = df['person_group_id'].astype(str)
    
    # Drop temp cols
    cols_to_drop = ['prev_name', 'prev_employer', 'prev_job_family', 'prev_year', 'prev_pid', 'link_mask', 'person_group_id']
    df = df.drop(columns=[c for c in cols_to_drop if c in df.columns])
    
    return df

def main():
    print("Loading enriched data...")
    df = pd.read_parquet(INPUT_FILE)
    
    df = fast_link_persons(df)
    
    # Create Fact Table
    print("Creating Fact Table...")
    # Select columns
    fact_cols = [
        'year', 'person_id', 'employer_id', 'job_id', 'sector', 
        'salary', 'benefits', 'total_comp', 
        'first_name', 'last_name', 'employer_canonical', 'job_canonical' # Denormalized for ease?
    ]
    # Actually, keep 'employer_canonical' and 'job_canonical' in fact table for easier debugging/queries without joins
    # or keep them for display. The 'dim' tables are for analytics.
    
    # Let's include name in fact for display
    fact = df[fact_cols].copy()
    
    print(f"Saving {len(fact)} facts to {OUTPUT_FILE}...")
    fact.to_parquet(OUTPUT_FILE, index=False)
    
    # Create Dim Person (Optional, for profile metadata like aggregate stats)
    # For now, fact table is sufficient as the "Profile" is just a query on person_id.
    
    print("Done.")

if __name__ == "__main__":
    main()
