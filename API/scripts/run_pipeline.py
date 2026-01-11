#!/usr/bin/env python3
"""
Master Pipeline Orchestrator for Ontario Sunshine List ETL

Usage:
    python run_pipeline.py                  # Run full pipeline
    python run_pipeline.py --stage=ingest   # Run specific stage
    python run_pipeline.py --from=normalize # Resume from stage
    python run_pipeline.py --validate-only  # Only run validation
"""

import subprocess
import sys
import time
import os
import argparse
from datetime import datetime

# Pipeline stages in execution order
PIPELINE_STAGES = [
    ("ingest", "ingest.py", "Consolidate raw CSVs into staging parquet"),
    ("normalize_employers", "normalize_employers.py", "Canonicalize employer names"),
    ("normalize_jobs", "normalize_jobs.py", "Standardize job titles and infer families"),
    ("link_persons", "link_persons.py", "Link individuals across years"),
    ("validate", "validate_data.py", "Run data quality checks"),
    ("analytics_basic", "generate_analytics_basic.py", "Generate year summaries and top earners"),
    ("analytics_complex", "generate_analytics_complex.py", "Generate employer and job metrics"),
    ("analytics_sector", "generate_analytics_sector.py", "Generate sector-level analytics"),
    ("search_index", "generate_search_index.py", "Export search indexes"),
]

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
API_DIR = os.path.dirname(SCRIPT_DIR)
PROJECT_ROOT = os.path.dirname(API_DIR)  # Go up from API/scripts to project root

def run_stage(name, script, description):
    """Execute a single pipeline stage."""
    script_path = os.path.join(SCRIPT_DIR, script)
    
    if not os.path.exists(script_path):
        print(f"  ⚠️  Script not found: {script} (skipping)")
        return True, 0
    
    print(f"\n{'='*60}")
    print(f"📦 Stage: {name}")
    print(f"   {description}")
    print(f"{'='*60}")
    
    start_time = time.time()
    
    try:
        result = subprocess.run(
            [sys.executable, script_path],
            cwd=PROJECT_ROOT,
            capture_output=False,
            text=True
        )
        
        elapsed = time.time() - start_time
        
        if result.returncode == 0:
            print(f"✅ {name} completed in {elapsed:.1f}s")
            return True, elapsed
        else:
            print(f"❌ {name} failed with exit code {result.returncode}")
            return False, elapsed
            
    except Exception as e:
        elapsed = time.time() - start_time
        print(f"❌ {name} error: {e}")
        return False, elapsed

def main():
    parser = argparse.ArgumentParser(description="Run the Sunshine List ETL pipeline")
    parser.add_argument("--stage", help="Run only a specific stage")
    parser.add_argument("--from", dest="from_stage", help="Start from a specific stage")
    parser.add_argument("--validate-only", action="store_true", help="Only run validation")
    parser.add_argument("--skip-validation", action="store_true", help="Skip validation stage")
    args = parser.parse_args()
    
    print("\n" + "="*60)
    print("🌞 Ontario Sunshine List ETL Pipeline")
    print(f"   Started: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("="*60)
    
    # Determine which stages to run
    stages_to_run = PIPELINE_STAGES.copy()
    
    if args.validate_only:
        stages_to_run = [s for s in stages_to_run if s[0] == "validate"]
    elif args.stage:
        stages_to_run = [s for s in stages_to_run if s[0] == args.stage]
        if not stages_to_run:
            print(f"❌ Unknown stage: {args.stage}")
            print(f"   Available: {', '.join(s[0] for s in PIPELINE_STAGES)}")
            sys.exit(1)
    elif args.from_stage:
        start_idx = next((i for i, s in enumerate(stages_to_run) if s[0] == args.from_stage), None)
        if start_idx is None:
            print(f"❌ Unknown stage: {args.from_stage}")
            sys.exit(1)
        stages_to_run = stages_to_run[start_idx:]
    
    if args.skip_validation:
        stages_to_run = [s for s in stages_to_run if s[0] != "validate"]
    
    # Execute stages
    total_time = 0
    failed_stages = []
    
    for name, script, description in stages_to_run:
        success, elapsed = run_stage(name, script, description)
        total_time += elapsed
        
        if not success:
            failed_stages.append(name)
            print(f"\n⛔ Pipeline halted at stage: {name}")
            break
    
    # Summary
    print("\n" + "="*60)
    print("📊 Pipeline Summary")
    print("="*60)
    print(f"   Total time: {total_time:.1f}s ({total_time/60:.1f} min)")
    print(f"   Stages run: {len(stages_to_run) - len(failed_stages)}/{len(stages_to_run)}")
    
    if failed_stages:
        print(f"   ❌ Failed: {', '.join(failed_stages)}")
        sys.exit(1)
    else:
        print("   ✅ All stages completed successfully!")
        sys.exit(0)

if __name__ == "__main__":
    main()
