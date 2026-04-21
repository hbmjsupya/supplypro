#!/bin/bash

# Configuration
API_URL="http://localhost:8080/api"
USERNAME="admin"
PASSWORD="123456"

echo "=================================================="
echo "Starting Sequential Cleanup Operation"
echo "=================================================="

# 1. Login to get JWT
echo "Logging in as $USERNAME..."
LOGIN_RESPONSE=$(curl -s -X POST "$API_URL/auth/signin" \
  -H "Content-Type: application/json" \
  -d "{\"username\": \"$USERNAME\", \"password\": \"$PASSWORD\"}")

# Extract Token (using grep/sed/awk since jq might not be installed)
# Response format: {"code":200,"message":"success","data":{"token":"eyJhbG...","type":"Bearer",...}}
TOKEN=$(echo $LOGIN_RESPONSE | grep -o '"token":"[^"]*"' | cut -d'"' -f4)

if [ -z "$TOKEN" ]; then
  echo "Error: Login failed. Response: $LOGIN_RESPONSE"
  exit 1
fi

echo "Login Response: $LOGIN_RESPONSE"

# 2. Pre-Cleanup Verification (Optional: Check counts via API if available, skipping for now as we trust the report)

# 3. Execute Cleanup
echo "Executing Sequential Cleanup (Bundles -> Product Pool)..."
CLEANUP_RESPONSE=$(curl -s -X POST "$API_URL/system/maintenance/cleanup-sequential?confirm=true" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json")

# 4. Display Result
echo "Cleanup Response:"
echo $CLEANUP_RESPONSE

# Check for success
if [[ $CLEANUP_RESPONSE == *"\"code\":200"* ]]; then
  echo "=================================================="
  echo "Cleanup Completed Successfully!"
  echo "=================================================="
  
  # Extract Report Details
  TOTAL_BEFORE=$(echo $CLEANUP_RESPONSE | grep -o '"total_products_before":[0-9]*' | cut -d':' -f2)
  BUNDLES_DELETED=$(echo $CLEANUP_RESPONSE | grep -o '"bundles_deleted":[0-9]*' | cut -d':' -f2)
  POOL_DELETED=$(echo $CLEANUP_RESPONSE | grep -o '"pool_products_deleted":[0-9]*' | cut -d':' -f2)
  TOTAL_AFTER=$(echo $CLEANUP_RESPONSE | grep -o '"total_products_after":[0-9]*' | cut -d':' -f2)
  BUNDLE_BACKUP=$(echo $CLEANUP_RESPONSE | grep -o '"bundle_backup":"[^"]*"' | cut -d'"' -f4)
  POOL_BACKUP=$(echo $CLEANUP_RESPONSE | grep -o '"pool_backup":"[^"]*"' | cut -d'"' -f4)

  echo "Summary Report:"
  echo "- Total Products Before: $TOTAL_BEFORE"
  echo "- Bundles Deleted:       $BUNDLES_DELETED"
  echo "- Pool Products Deleted: $POOL_DELETED"
  echo "- Total Products After:  $TOTAL_AFTER"
  echo "- Bundle Backup File:    $BUNDLE_BACKUP"
  echo "- Pool Backup File:      $POOL_BACKUP"
  
else
  echo "Error: Cleanup failed."
  exit 1
fi
