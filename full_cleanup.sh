#!/bin/bash

# Configuration
API_URL="http://localhost:8080/api/system/maintenance/cleanup-all-products"
AUTH_TOKEN="" # User should provide token or we can try to login if needed. 
# For simplicity, assuming the user might put the token here or passed as argument.

# Check if curl is installed
if ! command -v curl &> /dev/null; then
    echo "Error: curl is required but not installed."
    exit 1
fi

echo "========================================================"
echo "      DANGER: FULL SYSTEM DATA CLEANUP OPERATION        "
echo "========================================================"
echo "This script will PERMANENTLY DELETE ALL product data,"
echo "including Sales Orders, Purchase Orders, Inventory,"
echo "and all associated records."
echo ""
echo "A backup will be created automatically before deletion."
echo "========================================================"

read -p "Are you absolutely sure you want to proceed? (yes/no): " confirmation

if [ "$confirmation" != "yes" ]; then
    echo "Operation cancelled."
    exit 0
fi

read -p "Please enter your JWT Authentication Token (Bearer ...): " token

if [ -z "$token" ]; then
    echo "Error: Authentication token is required."
    exit 1
fi

echo ""
echo "Executing cleanup..."
echo "Please wait, this may take a while..."

response=$(curl -s -X POST "$API_URL?confirm=true" \
    -H "Authorization: $token" \
    -H "Content-Type: application/json")

echo ""
echo "Operation Result:"
echo "$response"

# Extract report if possible (requires jq, but we can just show raw json)
if command -v jq &> /dev/null; then
    echo ""
    echo "Parsed Report:"
    echo "$response" | jq .
fi

echo ""
echo "Check the 'backups' directory on the server for the data backup."
