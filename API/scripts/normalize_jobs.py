
import pandas as pd
import hashlib
import os
import re

STAGING_FILE = "API/staging/stg_rows_enriched.parquet"
DICT_FILE = "API/dictionaries/job_title_aliases.csv"
OUTPUT_ROWS = "API/staging/stg_rows_enriched_2.parquet"
OUTPUT_DIM = "API/curated/dim_job.parquet"

def normalize_string(s):
    if not isinstance(s, str): return ""
    s = s.upper()
    # Replace common formatting issues
    s = s.replace(' / ', '/')
    s = s.replace(' - ', ' ')
    s = s.replace(',', ' ')
    s = re.sub(r'[^A-Z0-9\s/]', '', s) 
    return " ".join(s.split())

def infer_family(title):
    t = title.lower()
    if 'professor' in t: return 'Academic'
    if 'teacher' in t or 'principal' in t: return 'Education'
    if 'nurse' in t: return 'Medical'
    if 'physician' in t or 'doctor' in t: return 'Medical'
    if 'police' in t or 'constable' in t or 'detective' in t: return 'Police'
    if 'firefighter' in t: return 'Fire'
    if 'engineer' in t: return 'Engineering'
    if 'director' in t: return 'Management'
    if 'manager' in t: return 'Management'
    return 'Other'

def main():
    print("Loading data...")
    df = pd.read_parquet(STAGING_FILE)
    
    # 1. Basic Normalization
    print("Normalizing strings...")
    df['job_clean'] = df['job_title'].apply(normalize_string)
    
    # 2. Apply Aliases
    if os.path.exists(DICT_FILE):
        print("Applying aliases...")
        aliases = pd.read_csv(DICT_FILE)
        alias_map = dict(zip(aliases['raw'], aliases['canonical']))
        
        # Apply map (trying match on clean-ish raw)
        # It's better to map 'raw' -> 'canonical'
        # But our raw in CSV might be "Teacher, Elementary"
        # And our normalize_string transforms it to "TEACHER ELEMENTARY"
        # So we should rely on specific raw matches OR map normalized -> normalized.
        
        # Let's simply apply map to 'job_title' (raw) first
        df['job_canonical'] = df['job_title'].map(alias_map)
        
        # Fill missing with job_clean
        df['job_canonical'] = df['job_canonical'].fillna(df['job_clean'])
    else:
        df['job_canonical'] = df['job_clean']
        
    df['job_canonical'] = df['job_canonical'].apply(normalize_string)
    
    # 3. Infer Family
    print("Inferring families...")
    df['job_family'] = df['job_canonical'].apply(infer_family)

    # 4. Generate IDs
    print("Generating IDs...")
    unique_jobs = df[['job_canonical', 'job_family']].drop_duplicates().reset_index(drop=True)
    unique_jobs['job_id'] = unique_jobs['job_canonical'].apply(
        lambda x: int(hashlib.md5(x.encode('utf-8')).hexdigest()[:8], 16)
    )
    
    # Merge ID back
    df = df.merge(unique_jobs, on=['job_canonical', 'job_family'], how='left')
    
    # Save Dimensions
    print(f"Saving {len(unique_jobs)} jobs to {OUTPUT_DIM}...")
    unique_jobs.to_parquet(OUTPUT_DIM, index=False)
    
    # Save Enriched Rows
    # Overwrite stg_rows? No, let's keep chain but finally we'll just have fact_comp.
    print(f"Saving enriched data to {OUTPUT_ROWS}...")
    df.to_parquet(OUTPUT_ROWS, index=False)
    print("Done.")

if __name__ == "__main__":
    main()
