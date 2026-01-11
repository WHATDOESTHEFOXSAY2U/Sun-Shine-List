# API Pipeline Scripts Documentation

This folder contains the ETL (Extract, Transform, Load) scripts used to process Ontario Sunshine List data (1996–2024). The pipeline is designed to be **robust**, **deterministic**, and **actionable**, avoiding complex probabilistic matching in favor of high-confidence logic.

## Quick Start

```bash
# Run the full pipeline (from project root)
python3 API/scripts/run_pipeline.py

# Run from a specific stage
python3 API/scripts/run_pipeline.py --from=analytics_basic

# Run only validation
python3 API/scripts/run_pipeline.py --validate-only
```

---

## Pipeline Overview

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        run_pipeline.py (Orchestrator)                    │
├─────────────────────────────────────────────────────────────────────────┤
│  1. ingest.py              → stg_rows.parquet                           │
│  2. normalize_employers.py → dim_employer.parquet, stg_rows_enriched    │
│  3. normalize_jobs.py      → dim_job.parquet, stg_rows_enriched_2       │
│  4. link_persons.py        → fact_comp.parquet                          │
│  5. validate_data.py       → data_quality_report.json                   │
│  6. generate_analytics_basic.py   → year_summary.json, top_earners.json │
│  7. generate_analytics_complex.py → employer_metrics.json, job_metrics  │
│  8. generate_analytics_sector.py  → sector_metrics.json                 │
│  9. generate_search_index.py      → search_index.json                   │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 0. Pipeline Orchestrator
### `run_pipeline.py`
**Purpose**: Master script that runs all pipeline stages in order with timing and error handling.
*   **Usage**:
    *   `python run_pipeline.py` - Run full pipeline
    *   `python run_pipeline.py --stage=ingest` - Run single stage
    *   `python run_pipeline.py --from=normalize_employers` - Resume from stage
    *   `python run_pipeline.py --validate-only` - Only run validation
    *   `python run_pipeline.py --skip-validation` - Skip validation stage
*   **Features**:
    *   Stage-level timing
    *   Automatic halt on failure
    *   Summary report at end

---

## 1. Ingestion
### `ingest.py`
**Purpose**: Consolidates 29+ years of heterogeneous CSV files into a single, standardized schema.
*   **Input**: `API/raw/*.csv`
*   **Output**: `API/staging/stg_rows.parquet`
*   **Key Logic**:
    *   **Column Mapping**: Normalizes headers (e.g., `Surname` -> `last_name`, `Position` -> `job_title`).
    *   **Currency Cleaning**: Removes `$` and `,`, handles invalid chars like `-` (converts to 0.0).
    *   **Encoding**: Auto-detects `utf-8` vs `ISO-8859-1`.

---

## 2. Normalization
### `normalize_employers.py`
**Purpose**: Creates a canonical list of employers, merging variations.
*   **Input**: `API/staging/stg_rows.parquet`, `API/dictionaries/employer_aliases.csv`
*   **Output**: `API/curated/dim_employer.parquet`, `API/staging/stg_rows_enriched.parquet`
*   **Key Logic**:
    *   **Cleaning**: Uppercases and removes punctuation (e.g., "U. of T." -> "U OF T").
    *   **Aliasing**: Strict map from `employer_aliases.csv` (e.g., "Univ. of Toronto" -> "UNIVERSITY OF TORONTO").
    *   **ID Generation**: Simple MD5 hash of the canonical string.

### `normalize_jobs.py`
**Purpose**: Standardizes job titles and infers "Job Family".
*   **Input**: `API/staging/stg_rows_enriched.parquet`, `API/dictionaries/job_title_aliases.csv`
*   **Output**: `API/curated/dim_job.parquet`, `API/staging/stg_rows_enriched_2.parquet`
*   **Key Logic**:
    *   **Cleaning**: Regex-based cleanup.
    *   **Aliasing**: e.g., "Teacher, Primary" -> "PRIMARY TEACHER".
    *   **Inference**: Infers `job_family` (e.g., 'Police', 'Academic', 'Medical') based on keywords (`constable`, `professor`, `nurse`).

---

## 3. Entity Linking
### `link_persons.py`
**Purpose**: Tracks individuals across years to calculate Retention and Growth.
*   **Input**: `API/staging/stg_rows_enriched_2.parquet`
*   **Output**: `API/curated/fact_comp.parquet`
*   **Key Logic (Strict Mode)**:
    *   **Goal**: Zero "hallucinations". Precision > Recall.
    *   **Matching Rule**: A record is linked to a previous year's record **IF AND ONLY IF**:
        1.  **Name Match**: `first_name + last_name` is identical.
        2.  **Employer Match**: Their `employer_id` is identical.
        3.  **Time Constraint**: Gap is ≤ 2 years.
    *   *Note*: This intentionally breaks the chain if a person moves employers. This ensures that "Growth" stats refer strictly to *salary growth within the same organization*.

---

## 4. Data Validation
### `validate_data.py`
**Purpose**: Runs quality checks on processed data and generates a report.
*   **Input**: `API/curated/fact_comp.parquet`
*   **Output**: `API/analytics/data_quality_report.json`
*   **Checks**:
    *   **Null Values**: Flags missing critical fields (name, employer, salary)
    *   **Salary Anomalies**: Detects outliers (>$2M, zero/negative, below threshold)
    *   **Year-over-Year Consistency**: Alerts on sudden headcount drops >50%
    *   **Duplicates**: Identifies exact and near-duplicate records
*   **Severity Levels**: High, Medium, Low, Info

---

## 5. Analytics Generation
### `generate_analytics_basic.py`
**Purpose**: Generates global aggregations.
*   **Input**: `API/curated/fact_comp.parquet`
*   **Outputs**:
    *   `API/analytics/year_summary.json`: Mean, P50, P75, P90, P95, P99, Headcount by year.
    *   `API/analytics/top_earners.json`: Top 100 earners per year with full metadata.

### `generate_analytics_complex.py`
**Purpose**: Generates the "Best Employer" dataset.
*   **Input**: `API/curated/fact_comp.parquet`
*   **Outputs**: 
    *   `API/analytics/employer_metrics.json`
    *   `API/analytics/job_metrics.json`
*   **Key Metrics (Per Employer/Year)**:
    *   **Pay Stats**: P50, P75, P90, P99 of total compensation.
    *   **Retention Rate**: (`Count(Stayed) / Headcount`). "Stayed" defined as person appearing in the same employer ID in Year T+1.
    *   **Growth Median**: Median % increase in comp for those who stayed.
*   **Usage**: Powering the dynamic slider UI (Weighted Score = w1*Pay + w2*Retention + w3*Growth).

### `generate_analytics_sector.py`
**Purpose**: Generates sector-level analytics (Hospitals, Colleges, Police, etc.).
*   **Input**: `API/curated/fact_comp.parquet`
*   **Output**: `API/analytics/sector_metrics.json`
*   **Key Metrics (Per Sector/Year)**:
    *   Headcount, total payroll, mean/median pay
    *   P75, P90, P99 compensation
    *   Year-over-year headcount and pay growth
    *   Top 10 job titles per sector
    *   Overall summary across all sectors

### `generate_search_index.py`
**Purpose**: Exports lightweight lists for frontend auto-complete.
*   **Input**: `API/curated/dim_employer.parquet`, `API/curated/dim_job.parquet`
*   **Output**: `API/analytics/search_index.json`
*   **Content**: `{"employers": [{id, name}...], "jobs": [{id, title, family}...]}`

---

## 6. Utility Scripts
### `generate_alias_suggestions.py`
**Purpose**: Analyzes raw employer data to suggest potential aliases for manual review.
*   **Input**: `API/staging/stg_rows.parquet`
*   **Output**: `API/dictionaries/suggested_employer_aliases.csv`
*   **Key Logic**:
    *   **Exact Normalized Match**: Finds employers that normalize to the same string
    *   **Keyword Similarity**: Finds employers with >70% keyword overlap
*   **Usage**: Review output manually and add confirmed aliases to `employer_aliases.csv`

---

## Output Files Summary

| File | Size | Description |
|------|------|-------------|
| `year_summary.json` | ~6 KB | Annual statistics (headcount, mean, percentiles) |
| `top_earners.json` | ~780 KB | Top 100 earners per year |
| `employer_metrics.json` | ~9.6 MB | Per-employer pay stats, retention, growth |
| `job_metrics.json` | ~56 MB | Per-job-title pay stats by year |
| `sector_metrics.json` | ~148 KB | Per-sector analytics and trends |
| `search_index.json` | ~22 MB | Employer and job lookup data |
| `data_quality_report.json` | ~4 KB | Validation results and issues |
