#!/bin/bash

BASE_URL="http://localhost:8080/api"
USERNAME="admin"
PASSWORD="password"

echo "1. Logging in..."
LOGIN_RESPONSE=$(curl -s -X POST "$BASE_URL/auth/signin" \
  -H "Content-Type: application/json" \
  -d "{\"username\": \"$USERNAME\", \"password\": \"$PASSWORD\"}")

TOKEN=$(echo $LOGIN_RESPONSE | grep -o '"accessToken":"[^"]*' | cut -d'"' -f4)

if [ -z "$TOKEN" ]; then
  echo "Login failed!"
  echo "Response: $LOGIN_RESPONSE"
  exit 1
fi

echo "Login successful."

echo "2. Testing /api/bundles endpoint (Fix for 404)..."
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" -X GET "$BASE_URL/bundles?page=0&size=10" \
  -H "Authorization: Bearer $TOKEN")

if [ "$HTTP_CODE" == "200" ]; then
  echo "✅ /api/bundles returned 200 OK. 404 Error Resolved."
else
  echo "❌ /api/bundles returned $HTTP_CODE. Test Failed."
  exit 1
fi

echo "3. Verifying Warehouse Data (Restoration check)..."
HTTP_CODE_WH=$(curl -s -o /dev/null -w "%{http_code}" -X GET "$BASE_URL/warehouses" \
  -H "Authorization: Bearer $TOKEN")

if [ "$HTTP_CODE_WH" == "200" ]; then
  echo "✅ /api/warehouses returned 200 OK."
else
  echo "❌ /api/warehouses returned $HTTP_CODE_WH. Restoration might be incomplete."
  exit 1
fi

echo "All regression tests passed."
