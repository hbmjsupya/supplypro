#!/bin/bash

# Base URL
BASE_URL="http://localhost:8081/api"

# 0. Signup a temp user (in case admin fails)
echo "Registering verifyuser..."
curl -s -X POST $BASE_URL/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"username":"verifyuser","email":"verify@test.com","password":"123456","role":["admin"]}'

# 1. Login to get token
echo "Logging in..."
LOGIN_RESPONSE=$(curl -s -X POST $BASE_URL/auth/signin \
  -H "Content-Type: application/json" \
  -d '{"username":"verifyuser","password":"123456"}')


TOKEN=$(echo $LOGIN_RESPONSE | grep -o '"token":"[^"]*' | cut -d'"' -f4)

if [ -z "$TOKEN" ]; then
  echo "Login failed. Response: $LOGIN_RESPONSE"
  exit 1
fi

echo "Login successful. Token obtained."

# 2. Search Banks (Seeded Data)
echo -e "\nSearching banks (keyword '工')..."
SEARCH_RESPONSE=$(curl -s -G "$BASE_URL/banks" \
  --data-urlencode "keyword=工" \
  -H "Authorization: Bearer $TOKEN")

echo "Search Response: $SEARCH_RESPONSE"

# Check if '工商银行' is in response
if [[ $SEARCH_RESPONSE == *"工商银行"* ]]; then
  echo "✅ Verification Passed: Found seeded bank '工商银行'."
else
  echo "❌ Verification Failed: Did not find '工商银行'."
fi

# 3. Create a new Bank
echo -e "\nCreating a new bank..."
CREATE_PAYLOAD='{
  "bankCode": "999888777666",
  "name": "测试银行",
  "shortName": "测试行",
  "type": "OTHER",
  "level": "HEAD_OFFICE",
  "status": true,
  "region": "Beijing"
}'

CREATE_RESPONSE=$(curl -s -X POST "$BASE_URL/banks" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "$CREATE_PAYLOAD")

echo "Create Response: $CREATE_RESPONSE"

if [[ $CREATE_RESPONSE == *"测试银行"* ]]; then
  echo "✅ Verification Passed: Created '测试银行'."
else
  echo "❌ Verification Failed: Failed to create bank."
fi
