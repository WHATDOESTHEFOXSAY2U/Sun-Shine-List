
import os
import pandas as pd
import glob

# Configuration
RAW_DIR = "API/raw"
STAGING_DIR = "API/staging"
OUTPUT_FILE = os.path.join(STAGING_DIR, "stg_rows.parquet")

# Column Mapping (Lower case normalized key -> Standard Column)
# We will lowercase the file's headers before mapping
COLUMN_MAP = {
    'sector': 'sector',
    'last name': 'last_name',
    'surname': 'last_name',
    'last_name': 'last_name',
    'first name': 'first_name',
    'first_name': 'first_name',
    'salary paid': 'salary',
    'salary': 'salary',
    'taxable benefits': 'benefits',
    'benefits': 'benefits',
    'employer': 'employer',
    'job title': 'job_title',
    'position': 'job_title',
    'job_title': 'job_title',
    'jobtitle': 'job_title',
    'year': 'year',
    'calendar year': 'year'
}

def clean_currency(x):
    if isinstance(x, str):
        x = x.replace('$', '').replace(',', '').strip()
        if x == '-' or x == '':
            return 0.0
        return float(x)
    return float(x)

def process_file(filepath):
    filename = os.path.basename(filepath)
    year = int(filename.split('.')[0])
    print(f"Processing {year}...")
    
    try:
        df = pd.read_csv(filepath, encoding='utf-8')
    except UnicodeDecodeError:
        df = pd.read_csv(filepath, encoding='ISO-8859-1')
        
    # Normalize columns
    df.columns = [c.strip().lower() for c in df.columns]
    
    # Rename
    renamed = {}
    for col in df.columns:
        if col in COLUMN_MAP:
            renamed[col] = COLUMN_MAP[col]
            
    df = df.rename(columns=renamed)
    
    # Ensure required columns exist
    required = ['sector', 'last_name', 'first_name', 'salary', 'benefits', 'employer', 'job_title']
    for req in required:
        if req not in df.columns:
            print(f"  WARNING: Missing {req} in {year}")
            return None
            
    # Force Year
    df['year'] = year
    
    # Select subset
    df = df[['year', 'sector', 'last_name', 'first_name', 'employer', 'job_title', 'salary', 'benefits']]
    
    # Clean types
    df['salary'] = df['salary'].apply(clean_currency)
    df['benefits'] = df['benefits'].apply(clean_currency)
    df['total_comp'] = df['salary'] + df['benefits']
    
    # Text normalization matches
    df['employer'] = df['employer'].fillna('').astype(str).str.strip()
    df['job_title'] = df['job_title'].fillna('').astype(str).str.strip()
    df['last_name'] = df['last_name'].fillna('').astype(str).str.strip()
    df['first_name'] = df['first_name'].fillna('').astype(str).str.strip()
    
    return df

all_dfs = []
files = sorted(glob.glob(os.path.join(RAW_DIR, "*.csv")))

for f in files:
    try:
        if not os.path.basename(f)[0].isdigit(): continue
        df = process_file(f)
        if df is not None:
            all_dfs.append(df)
    except Exception as e:
        print(f"  ERROR processing {f}: {e}")

if all_dfs:
    final_df = pd.concat(all_dfs, ignore_index=True)
    print(f"Saving {len(final_df)} rows to {OUTPUT_FILE}...")
    final_df.to_parquet(OUTPUT_FILE, index=False)
    print("Done.")
else:
    print("No data processed!")
