#!/bin/bash

# Exit on error
set -e

# Change to project root directory (assuming script is run from project root or scripts/data_cleanup)
# Get the directory of the script
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_ROOT="$(dirname "$(dirname "$SCRIPT_DIR")")"

cd "$PROJECT_ROOT"

echo "Starting Data Cleanup Workflow..."
echo "Project Root: $PROJECT_ROOT"

# 1. Setup Environment
echo "------------------------------------------------"
echo "Step 1: Setting up cleanup environment..."
python3 scripts/data_cleanup/1_setup_cleanup.py

# 2. Scan Candidates
echo "------------------------------------------------"
echo "Step 2: Scanning for cleanup candidates..."
python3 scripts/data_cleanup/2_scan_candidates.py

# 2.5 Data Quality Check
echo "------------------------------------------------"
echo "Step 2.5: Performing Data Quality Check..."
python3 scripts/data_cleanup/2_5_check_data_quality.py

# 3. Validate Deletion
echo "------------------------------------------------"
echo "Step 3: Validating deletion candidates..."
python3 scripts/data_cleanup/3_validate_deletion.py

# 4. Backup
echo "------------------------------------------------"
echo "Step 4: Backing up candidates..."
python3 scripts/data_cleanup/0_backup_candidates.py

# 5. Execute Deletion
echo "------------------------------------------------"
echo "Step 5: Executing deletion..."
python3 scripts/data_cleanup/4_execute_deletion.py

# 6. Verify
echo "------------------------------------------------"
echo "Step 6: Verifying cleanup..."
python3 scripts/data_cleanup/5_verify_cleanup.py

echo "------------------------------------------------"
echo "Data Cleanup Workflow Completed Successfully."
echo "Reports available in scripts/data_cleanup/ directory."
