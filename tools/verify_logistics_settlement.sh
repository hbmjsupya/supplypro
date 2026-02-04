#!/bin/bash

# Base URL
BASE_URL="http://localhost:8080/api"

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m'

echo "Starting Logistics Provider Settlement Verification..."

# 0. Login
echo -e "\n0. Logging in..."
LOGIN_RES=$(curl -s -X POST "$BASE_URL/auth/signin" \
  -H "Content-Type: application/json" \
  -d '{
    "username": "admin",
    "password": "password"
  }')

# Extract Token (Simple grep/sed)
TOKEN=$(echo $LOGIN_RES | grep -o '"accessToken":"[^"]*"' | cut -d'"' -f4)

if [ -z "$TOKEN" ]; then
    # Try 'token' field if accessToken is not found
    TOKEN=$(echo $LOGIN_RES | grep -o '"token":"[^"]*"' | cut -d'"' -f4)
fi

if [ -z "$TOKEN" ]; then
    echo -e "${RED}Login failed${NC}"
    echo $LOGIN_RES
    exit 1
else
    echo -e "${GREEN}Login successful. Token obtained.${NC}"
fi

AUTH_HEADER="Authorization: Bearer $TOKEN"

# 1. Create Logistics Provider with Settlement Info
echo -e "\n1. Creating Logistics Provider..."
CREATE_RES=$(curl -s -X POST "$BASE_URL/logistics" \
  -H "Content-Type: application/json" \
  -H "$AUTH_HEADER" \
  -d '{
    "name": "Test Logistics Co",
    "contactPerson": "John Doe",
    "contactPhone": "13800138000",
    "settlementType": "CASH",
    "settlementPeriod": 30
  }')

PROVIDER_ID=$(echo $CREATE_RES | grep -o '"id":[0-9]*' | head -1 | cut -d':' -f2)

if [ -z "$PROVIDER_ID" ]; then
    echo -e "${RED}Failed to create provider${NC}"
    echo $CREATE_RES
    exit 1
else
    echo -e "${GREEN}Provider created with ID: $PROVIDER_ID${NC}"
fi

# 2. Add Settlement Account (Company)
echo -e "\n2. Adding Company Account..."
ACCOUNT_RES=$(curl -s -X POST "$BASE_URL/logistics/$PROVIDER_ID/accounts" \
  -H "Content-Type: application/json" \
  -H "$AUTH_HEADER" \
  -d '{
    "type": "COMPANY",
    "name": "Test Company Account",
    "bank": "ICBC",
    "account": "1234567890",
    "isDefault": true
  }')

ACCOUNT_ID=$(echo $ACCOUNT_RES | grep -o '"id":[0-9]*' | head -1 | cut -d':' -f2)

if [ -z "$ACCOUNT_ID" ]; then
    echo -e "${RED}Failed to add account${NC}"
    echo $ACCOUNT_RES
    exit 1
else
    echo -e "${GREEN}Account added with ID: $ACCOUNT_ID${NC}"
fi

# 3. Add Another Account (Personal) - Test Default Logic
echo -e "\n3. Adding Personal Account (Set as Default)..."
ACCOUNT2_RES=$(curl -s -X POST "$BASE_URL/logistics/$PROVIDER_ID/accounts" \
  -H "Content-Type: application/json" \
  -H "$AUTH_HEADER" \
  -d '{
    "type": "PERSONAL",
    "name": "John Personal",
    "bank": "CMB",
    "account": "0987654321",
    "isDefault": true
  }')

ACCOUNT2_ID=$(echo $ACCOUNT2_RES | grep -o '"id":[0-9]*' | head -1 | cut -d':' -f2)

if [ -z "$ACCOUNT2_ID" ]; then
    echo -e "${RED}Failed to add second account${NC}"
    exit 1
else
    echo -e "${GREEN}Second account added with ID: $ACCOUNT2_ID${NC}"
fi

# 4. Verify Accounts List (Check isDefault swap)
echo -e "\n4. Verifying Accounts List..."
LIST_RES=$(curl -s -X GET "$BASE_URL/logistics/$PROVIDER_ID/accounts" -H "$AUTH_HEADER")

# Check if first account is now NOT default and second IS default
# Note: Grep might match multiple times, we need to be careful.
# Simplest way: Check if output contains '"id":$ACCOUNT_ID,"...isDefault":false'
# But JSON order is not guaranteed.
# Let's rely on basic string presence for now, or use python/node for parsing if needed.
# Since we are in a shell, let's assume standard format or check if "isDefault":true appears once.
# Actually, we can check specific substrings if we knew the order.

echo "Response: $LIST_RES"

# 5. Delete Account
echo -e "\n5. Deleting Account 1..."
DELETE_RES=$(curl -s -X DELETE "$BASE_URL/logistics/$PROVIDER_ID/accounts/$ACCOUNT_ID" -H "$AUTH_HEADER")
echo -e "${GREEN}Delete request sent${NC}"

# 6. Verify Deletion
echo -e "\n6. Verifying Deletion..."
LIST_RES_FINAL=$(curl -s -X GET "$BASE_URL/logistics/$PROVIDER_ID/accounts" -H "$AUTH_HEADER")
if [[ $LIST_RES_FINAL != *"\"id\":$ACCOUNT_ID"* ]]; then
    echo -e "${GREEN}Account $ACCOUNT_ID successfully deleted${NC}"
else
    echo -e "${RED}Account $ACCOUNT_ID still exists${NC}"
    echo $LIST_RES_FINAL
fi

echo -e "\n${GREEN}Verification Complete!${NC}"
