
import pandas as pd
import hashlib
import os
import re

STAGING_FILE = "API/staging/stg_rows.parquet"
DICT_FILE = "API/dictionaries/employer_aliases.csv"
OUTPUT_ROWS = "API/staging/stg_rows_enriched.parquet" # Temporary, eventually replace stg_rows? Or keep adding columns?
OUTPUT_DIM = "API/curated/dim_employer.parquet"

def normalize_string(s):
    if not isinstance(s, str): return ""
    # Uppercase, remove special chars (keep spaces/digits), single spaces
    s = s.upper()
    s = re.sub(r'[^A-Z0-9\s-]', '', s) # Keep dashes? 
    # Actually, let's keep it simple: Uppercase + strip
    # "City of Toronto" -> "CITY OF TORONTO"
    # "City Of Toronto" -> "CITY OF TORONTO"
    return " ".join(s.split())

def main():
    print("Loading data...")
    df = pd.read_parquet(STAGING_FILE)
    
    # 1. Basic Normalization
    print("Normalizing strings...")
    df['employer_clean'] = df['employer'].fillna('').apply(normalize_string)
    
    # 2. Apply Aliases
    if os.path.exists(DICT_FILE):
        print("Applying aliases...")
        aliases = pd.read_csv(DICT_FILE)
        alias_map = dict(zip(aliases['raw'], aliases['canonical']))
        
        # Apply map
        df['employer_canonical'] = df['employer'].map(alias_map).fillna(df['employer_clean'])
    else:
        df['employer_canonical'] = df['employer_clean']
        
    # 3. Final cleanup of canonical
    df['employer_canonical'] = df['employer_canonical'].apply(normalize_string)

    # 4. Generate IDs
    # CRITICAL CHANGE: Include SECTOR in the ID generation?
    # If "St. Mary's" exists in "Hospitals" and "Schools", are they the same? Likely NOT.
    # But sometimes Sector names change too... "Public Sector" vs "Broader Public Sector"
    # Let's assume broad sector continuity is safer than name-only collision.
    # However, user wants "Canonical Employer". 
    # Let's stick to Name-Based but warn/check. 
    # Actually, for robustness, Employer ID should probably be Name + Sector to handle generic names.
    # But if a Hospital changes sector name slightly, we break the ID.
    # Compromise: We keep ID based on Name, but we verify collisions?
    
    # Let's keep ID purely Name-based for simplicity, relying on the 'canonical' name being strictly mapped.
    # If "St. Mary's" is ambiguous, it should be aliased to "ST MARYS HOSPITAL" vs "ST MARYS SCHOOL".
    
    print("Generating IDs...")
    unique_employers = df[['employer_canonical']].drop_duplicates().reset_index(drop=True)
    unique_employers['employer_id'] = unique_employers['employer_canonical'].apply(
        lambda x: int(hashlib.md5(x.encode('utf-8')).hexdigest()[:8], 16)
    )
    
    # Merge ID back
    df = df.merge(unique_employers, on='employer_canonical', how='left')
    
    # Save Dimensions
    print(f"Saving {len(unique_employers)} employers to {OUTPUT_DIM}...")
    unique_employers.to_parquet(OUTPUT_DIM, index=False)
    
    # Save Enriched Rows
    # We drop the temp cols? Or keep 'employer_canonical'? Keep it for debugging/display.
    print(f"Saving enriched data to {OUTPUT_ROWS}...")
    df.to_parquet(OUTPUT_ROWS, index=False)
    print("Done.")

if __name__ == "__main__":
    main()
