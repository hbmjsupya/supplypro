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

# 2. Create Supplier with Brand
echo "Creating supplier with Brand ID 1..."
CREATE_PAYLOAD='{
  "name": "BrandTestSupplier_'$(date +%s)'",
  "contactPerson": "Brand User",
  "contactPhone": "13900000000",
  "settlementType": "CASH",
  "settlementPeriod": 30,
  "brandIds": [1]
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

# 3. Get Supplier and Check Brands
echo "Retrieving supplier brands..."
GET_RESPONSE=$(curl -s -X GET "$BASE_URL/suppliers/$SUPPLIER_ID" \
  -H "Authorization: Bearer $TOKEN")

# Simple check if brandId 1 is in response (assuming response structure contains brands list with IDs)
# Based on SupplierDTO, it should have 'brands' list of BrandDTOs.
if echo "$GET_RESPONSE" | grep -q '"id":1'; then
   echo "SUCCESS: Brand ID 1 found in supplier response."
else
   echo "FAILURE: Brand ID 1 NOT found in supplier response."
   echo "Response: $GET_RESPONSE"
   exit 1
fi
