# Data Cleanup Toolset

This directory contains a suite of scripts for cleaning up mock/import data and validating data quality in the SupplyPro database.

## Prerequisites

- Python 3.x
- `mysql-connector-python` library
- Database connection to `localhost:3307` (ensure Docker container `supplypro-mysql` is running)

## Workflow

The cleanup process follows a safe, multi-step workflow:

1.  **Setup (`1_setup_cleanup.py`)**: Adds a `created_type` column to key tables (`products`, `brands`, `suppliers`, `warehouses`) and backfills it based on heuristics (e.g., regex matching for mock data patterns like `^Product_[0-9]+$`).
2.  **Scan (`2_scan_candidates.py`)**: Scans for records where `created_type != 'manual'` (i.e., imported or mock data). Outputs to `cleanup_candidates.csv`.
3.  **Quality Check (`2_5_check_data_quality.py`)**: Validates data against business rules (e.g., empty SKUs, invalid emails). Outputs to `data_quality_report.csv`.
4.  **Validate (`3_validate_deletion.py`)**: Checks for foreign key associations. Records with existing dependencies (e.g., used in Purchase Orders) are marked as `SKIP` to prevent data integrity loss. Outputs to `validated_deletion_list.csv`.
5.  **Backup (`0_backup_candidates.py`)**: Generates SQL insert statements for all candidates marked for deletion, allowing for rollback.
6.  **Execute (`4_execute_deletion.py`)**: Deletes records marked as `DELETE`. Logs actions to `deletion_log.txt`.
7.  **Verify (`5_verify_cleanup.py`)**: Verifies that deleted records are no longer present.

## Usage

### Run All (Recommended)

To execute the full workflow in order:

```bash
chmod +x scripts/data_cleanup/run_all.sh
./scripts/data_cleanup/run_all.sh
```

### Run Individual Steps

You can run individual scripts using Python:

```bash
# Example: Run Quality Check only
python3 scripts/data_cleanup/2_5_check_data_quality.py
```

## Data Quality Rules

The `2_5_check_data_quality.py` script enforces the following validations:

-   **Products**:
    -   SKU Code must not be empty.
-   **Suppliers**:
    -   Email must follow standard format (regex check).
-   **Purchase Orders**:
    -   Total Amount must be non-negative (if column exists).

## Manual Review Required

Records marked as `SKIP` in `validated_deletion_list.csv` are "import" data that are currently in use. These require manual review to decide if they should be:
1.  Kept (and potentially marked as 'manual' to exclude from future scans).
2.  Deleted (requiring manual deletion of dependent records first).

## Configuration

Database connection settings are currently defined in `get_db_connection()` within each script:
-   Host: `localhost`
-   Port: `3307`
-   User: `root`
-   Password: `password`
-   Database: `supplypro`

## Dependencies

-   `mysql-connector-python`: `pip install mysql-connector-python`
