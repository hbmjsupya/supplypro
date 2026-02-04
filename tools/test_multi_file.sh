#!/bin/bash

# Base URL
BASE_URL="http://localhost:8080/api"

# 1. Login
echo "Logging in..."
LOGIN_RESPONSE=$(curl -s -X POST "$BASE_URL/auth/signin" \
  -H "Content-Type: application/json" \
  -d '{"username":"admin", "password":"password"}')

TOKEN=$(echo $LOGIN_RESPONSE | grep -o '"token":"[^"]*' | cut -d'"' -f4)

if [ -z "$TOKEN" ]; then
  echo "Login failed!"
  exit 1
fi

echo "Login successful."

# 2. Create Supplier with Multiple Files and Account
echo "Creating supplier with multiple files..."
CREATE_PAYLOAD='{
  "name": "MultiFileSupplier_'$(date +%s)'",
  "contactPerson": "File User",
  "contactPhone": "13700000000",
  "settlementType": "CASH",
  "settlementPeriod": 30,
  "qualificationFile": ["/uploads/q1.png", "/uploads/q2.png"],
  "contractFile": ["/uploads/c1.pdf", "/uploads/c2.pdf"]
}'

CREATE_RESPONSE=$(curl -s -X POST "$BASE_URL/suppliers" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d "$CREATE_PAYLOAD")

SUPPLIER_ID=$(echo $CREATE_RESPONSE | grep -o '"id":[0-9]*' | head -1 | cut -d':' -f2)

if [ -z "$SUPPLIER_ID" ]; then
  echo "Create failed!"
  echo "Response: $CREATE_RESPONSE"
  exit 1
fi

echo "Supplier created. ID: $SUPPLIER_ID"

# 3. Add Account (Company)
echo "Adding Company Account..."
ACCOUNT_PAYLOAD='{
  "type": "COMPANY",
  "name": "Test Company",
  "bank": "ICBC",
  "account": "123456789",
  "isDefault": true
}'

ACCOUNT_RESPONSE=$(curl -s -X POST "$BASE_URL/suppliers/$SUPPLIER_ID/accounts" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d "$ACCOUNT_PAYLOAD")

# 4. Get Supplier and Verify Files
echo "Retrieving supplier..."
GET_RESPONSE=$(curl -s -X GET "$BASE_URL/suppliers/$SUPPLIER_ID" \
  -H "Authorization: Bearer $TOKEN")

echo "Response: $GET_RESPONSE"

# Check if qualificationFile contains multiple files
if echo "$GET_RESPONSE" | grep -q '"/uploads/q1.png"' && echo "$GET_RESPONSE" | grep -q '"/uploads/q2.png"'; then
   echo "SUCCESS: Multiple qualification files persisted."
else
   echo "FAILURE: Qualification files mismatch."
   exit 1
fi

# 5. Get Accounts and Verify Type
echo "Retrieving accounts..."
ACCOUNTS_RESPONSE=$(curl -s -X GET "$BASE_URL/suppliers/$SUPPLIER_ID/accounts" \
  -H "Authorization: Bearer $TOKEN")

echo "Accounts Response: $ACCOUNTS_RESPONSE"

if echo "$ACCOUNTS_RESPONSE" | grep -q '"type":"COMPANY"'; then
   echo "SUCCESS: Account type COMPANY persisted."
else
   echo "FAILURE: Account type mismatch."
   exit 1
fi

echo "ALL TESTS PASSED."
