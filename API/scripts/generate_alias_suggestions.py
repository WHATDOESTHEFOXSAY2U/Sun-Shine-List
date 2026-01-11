#!/usr/bin/env python3
"""
Alias Suggestion Generator for Ontario Sunshine List

Analyzes raw employer data to suggest potential aliases for manual review.
Uses string similarity to find employers that might be the same entity.
"""

import pandas as pd
import os
from collections import defaultdict
import re

INPUT_FILE = "API/staging/stg_rows.parquet"
OUTPUT_FILE = "API/dictionaries/suggested_employer_aliases.csv"

def normalize_for_comparison(s):
    """Normalize string for comparison."""
    if not isinstance(s, str):
        return ""
    s = s.upper()
    # Remove common suffixes/prefixes
    s = re.sub(r'\b(INC|LTD|LIMITED|CORP|CORPORATION|THE|OF|AND)\b', '', s)
    # Remove punctuation
    s = re.sub(r'[^A-Z0-9\s]', '', s)
    # Collapse whitespace
    s = ' '.join(s.split())
    return s.strip()

def get_key_words(s):
    """Extract key words for comparison."""
    normalized = normalize_for_comparison(s)
    words = set(normalized.split())
    # Remove very short words
    return {w for w in words if len(w) > 2}

def find_similar_employers(employers_df):
    """Find employers with similar names."""
    # Group by normalized name
    normalized_groups = defaultdict(list)
    
    for emp in employers_df['employer'].unique():
        if not emp or not isinstance(emp, str):
            continue
        normalized = normalize_for_comparison(emp)
        if normalized:
            normalized_groups[normalized].append(emp)
    
    # Find groups with multiple variations
    suggestions = []
    
    for normalized, variations in normalized_groups.items():
        if len(variations) > 1:
            # Pick the most common as canonical
            canonical = max(variations, key=lambda x: len(x))
            for var in variations:
                if var != canonical:
                    suggestions.append({
                        'raw': var,
                        'canonical': canonical.upper(),
                        'reason': 'exact_normalized_match'
                    })
    
    return suggestions

def find_keyword_similar(employers_df, min_overlap=0.8):
    """Find employers with high keyword overlap."""
    employers = [e for e in employers_df['employer'].unique() 
                 if e and isinstance(e, str) and len(e) > 10]
    
    # Pre-compute keywords
    keywords = {emp: get_key_words(emp) for emp in employers}
    
    suggestions = []
    seen_pairs = set()
    
    for i, emp1 in enumerate(employers):
        kw1 = keywords[emp1]
        if len(kw1) < 2:
            continue
            
        for emp2 in employers[i+1:]:
            kw2 = keywords[emp2]
            if len(kw2) < 2:
                continue
            
            # Calculate Jaccard similarity
            intersection = len(kw1 & kw2)
            union = len(kw1 | kw2)
            
            if union > 0:
                similarity = intersection / union
                
                if similarity >= min_overlap:
                    # Avoid duplicates
                    pair_key = tuple(sorted([emp1, emp2]))
                    if pair_key not in seen_pairs:
                        seen_pairs.add(pair_key)
                        
                        # Pick longer as canonical (usually more complete)
                        if len(emp1) >= len(emp2):
                            canonical, raw = emp1, emp2
                        else:
                            canonical, raw = emp2, emp1
                        
                        suggestions.append({
                            'raw': raw,
                            'canonical': canonical.upper(),
                            'reason': f'keyword_similarity_{similarity:.2f}'
                        })
    
    return suggestions

def main():
    print("Loading data...")
    
    if not os.path.exists(INPUT_FILE):
        print(f"❌ Input file not found: {INPUT_FILE}")
        print("   Run ingest.py first.")
        return
    
    df = pd.read_parquet(INPUT_FILE)
    print(f"Loaded {len(df):,} records with {df['employer'].nunique():,} unique employer names")
    
    all_suggestions = []
    
    print("\nFinding exact normalized matches...")
    exact_matches = find_similar_employers(df)
    all_suggestions.extend(exact_matches)
    print(f"  Found {len(exact_matches)} exact match suggestions")
    
    print("\nFinding keyword-similar employers...")
    keyword_matches = find_keyword_similar(df, min_overlap=0.7)
    all_suggestions.extend(keyword_matches)
    print(f"  Found {len(keyword_matches)} keyword similarity suggestions")
    
    # Deduplicate
    seen = set()
    unique_suggestions = []
    for s in all_suggestions:
        key = (s['raw'], s['canonical'])
        if key not in seen:
            seen.add(key)
            unique_suggestions.append(s)
    
    # Sort by canonical name
    unique_suggestions.sort(key=lambda x: x['canonical'])
    
    # Save
    os.makedirs(os.path.dirname(OUTPUT_FILE), exist_ok=True)
    suggestions_df = pd.DataFrame(unique_suggestions)
    suggestions_df.to_csv(OUTPUT_FILE, index=False)
    
    print(f"\n{'='*50}")
    print(f"Alias Suggestion Report")
    print(f"{'='*50}")
    print(f"  Total suggestions: {len(unique_suggestions)}")
    print(f"  Output: {OUTPUT_FILE}")
    print("\n⚠️  Please review these suggestions manually before adding to employer_aliases.csv")
    
    # Show sample
    if unique_suggestions:
        print("\nSample suggestions:")
        for s in unique_suggestions[:10]:
            print(f"  '{s['raw']}' -> '{s['canonical']}' ({s['reason']})")

if __name__ == "__main__":
    main()
