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
  echo "Response: $LOGIN_RESPONSE"
  exit 1
fi

echo "Login successful. Token: ${TOKEN:0:10}..."

# 2. Create Supplier
echo "Creating supplier with contract file..."
CREATE_PAYLOAD='{
  "name": "FileTestSupplier_'$(date +%s)'",
  "contactPerson": "Test User",
  "contactPhone": "13800000000",
  "settlementType": "CASH",
  "settlementPeriod": 30,
  "contractFile": "/uploads/contracts/test.pdf",
  "qualificationFile": "/uploads/qualifications/test.png"
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

# 3. Get Supplier
echo "Retrieving supplier..."
GET_RESPONSE=$(curl -s -X GET "$BASE_URL/suppliers/$SUPPLIER_ID" \
  -H "Authorization: Bearer $TOKEN")

CONTRACT_FILE=$(echo $GET_RESPONSE | grep -o '"contractFile":"[^"]*"' | cut -d'"' -f4)
QUAL_FILE=$(echo $GET_RESPONSE | grep -o '"qualificationFile":"[^"]*"' | cut -d'"' -f4)

echo "Contract File: $CONTRACT_FILE"
echo "Qualification File: $QUAL_FILE"

if [ "$CONTRACT_FILE" == "/uploads/contracts/test.pdf" ] && [ "$QUAL_FILE" == "/uploads/qualifications/test.png" ]; then
  echo "SUCCESS: File paths persisted correctly."
else
  echo "FAILURE: File paths mismatch."
  echo "Expected: /uploads/contracts/test.pdf, /uploads/qualifications/test.png"
  exit 1
fi

# 4. Update Supplier
echo "Updating supplier file paths..."
UPDATE_PAYLOAD='{
  "name": "FileTestSupplier_Updated",
  "contactPerson": "Test User",
  "contactPhone": "13800000000",
  "settlementType": "CASH",
  "settlementPeriod": 30,
  "contractFile": "/uploads/contracts/updated.pdf",
  "qualificationFile": "/uploads/qualifications/updated.png"
}'

UPDATE_RESPONSE=$(curl -s -X PUT "$BASE_URL/suppliers/$SUPPLIER_ID" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d "$UPDATE_PAYLOAD")

# 5. Get Supplier Again
echo "Retrieving updated supplier..."
GET_RESPONSE_2=$(curl -s -X GET "$BASE_URL/suppliers/$SUPPLIER_ID" \
  -H "Authorization: Bearer $TOKEN")

CONTRACT_FILE_2=$(echo $GET_RESPONSE_2 | grep -o '"contractFile":"[^"]*"' | cut -d'"' -f4)

echo "Updated Contract File: $CONTRACT_FILE_2"

if [ "$CONTRACT_FILE_2" == "/uploads/contracts/updated.pdf" ]; then
  echo "SUCCESS: File paths updated correctly."
else
  echo "FAILURE: File paths update failed."
  exit 1
fi
