#!/bin/bash

# Configuration
THRESHOLD_GB=2
PROJECT_ROOT=$(cd "$(dirname "$0")/../.." && pwd)
LOG_FILE="${PROJECT_ROOT}/project_size_report.txt"

echo "=================================================="
echo "Project Size Analysis Report"
echo "Date: $(date)"
echo "Project Root: ${PROJECT_ROOT}"
echo "=================================================="

# 1. Total Size
TOTAL_SIZE=$(du -sh "${PROJECT_ROOT}" | cut -f1)
echo "Total Project Size: ${TOTAL_SIZE}"

# 2. Large Directories (>100MB)
echo -e "\n[Large Directories (>100MB)]"
du -h -d 3 "${PROJECT_ROOT}" | grep '[0-9\.]*[GM]' | sort -rh | head -n 20

# 3. Check for Duplicate JDKs
echo -e "\n[JDK Check]"
JDK_COUNT=$(find "${PROJECT_ROOT}/backend/tools" -name "java" -type f | grep "/bin/java$" | wc -l)
echo "Found ${JDK_COUNT} Java executables in backend/tools."
if [ "$JDK_COUNT" -gt 1 ]; then
    echo "WARNING: Multiple JDKs detected! Please run cleanup."
    find "${PROJECT_ROOT}/backend/tools" -name "java" -type f | grep "/bin/java$"
else
    echo "JDK setup looks clean."
fi

# 4. Check for Large Files (>50MB)
echo -e "\n[Large Files (>50MB)]"
find "${PROJECT_ROOT}" -type f -size +50M -not -path "*/.git/*" -exec ls -lh {} \; | awk '{print $5, $9}'

# 5. Alerting
SIZE_GB=$(du -s "${PROJECT_ROOT}" | awk '{print $1/1024/1024}')
if (( $(echo "$SIZE_GB > $THRESHOLD_GB" | bc -l) )); then
    echo -e "\n[ALERT] Project size (${TOTAL_SIZE}) exceeds threshold (${THRESHOLD_GB}GB)!"
    echo "Recommendation: Run 'scripts/maintenance/cleanup.sh' to free up space."
else
    echo -e "\n[OK] Project size is within limits."
fi
