#!/bin/bash

# Base URL
API_URL="http://localhost:8080/api"

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m'

echo "---------------------------------------------------"
echo "Reproducing Logout Issue (Token Validity)"
echo "---------------------------------------------------"

# 1. Login
echo "1. Logging in..."
LOGIN_RESPONSE=$(curl -s -X POST "$API_URL/auth/signin" \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"123456"}')

TOKEN=$(echo $LOGIN_RESPONSE | grep -o '"token":"[^"]*' | cut -d'"' -f4)

if [ -z "$TOKEN" ]; then
    echo -e "${RED}Login Failed!${NC}"
    echo "Response: $LOGIN_RESPONSE"
    exit 1
fi

echo -e "${GREEN}Login Successful. Token obtained.${NC}"

# 2. Access Protected Resource (Verify Token works)
echo "2. Accessing Protected Resource (Users List)..."
PROFILE_CODE=$(curl -s -o /dev/null -w "%{http_code}" -X GET "$API_URL/users/list" \
  -H "Authorization: Bearer $TOKEN")

if [ "$PROFILE_CODE" == "200" ]; then
    echo -e "${GREEN}Access Granted (200).${NC}"
else
    echo -e "${RED}Access Denied ($PROFILE_CODE).${NC}"
fi

# 3. Client-side Logout (Real Logout now)
echo "3. Performing Real Logout..."
LOGOUT_RESPONSE=$(curl -s -X POST "$API_URL/auth/signout" -H "Authorization: Bearer $TOKEN")
echo "Logout Response: $LOGOUT_RESPONSE"
echo "   (Token should be blacklisted now)"

# 4. Reuse Old Token (Should still work currently, but SHOULD FAIL after fix)
echo "4. Reusing Old Token..."
REUSE_CODE=$(curl -s -o /dev/null -w "%{http_code}" -X GET "$API_URL/users/list" \
  -H "Authorization: Bearer $TOKEN")

if [ "$REUSE_CODE" == "200" ]; then
    echo -e "${RED}Old Token is STILL VALID! (Security Risk / Incomplete Logout)${NC}"
else
    echo -e "${GREEN}Old Token Rejected ($REUSE_CODE).${NC}"
fi

# 5. Check for Server Error on Logout (Simulate call if it existed)
echo "5. Checking for 500 Error on hypothetical logout endpoint..."
LOGOUT_CODE=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$API_URL/auth/signout" \
  -H "Authorization: Bearer $TOKEN")

echo "Logout Endpoint Code: $LOGOUT_CODE"
if [ "$LOGOUT_CODE" == "404" ]; then
    echo "Endpoint /api/auth/signout does not exist (Expected)."
elif [ "$LOGOUT_CODE" == "500" ]; then
    echo -e "${RED}System Internal Error on Logout!${NC}"
else
    echo "Logout returned: $LOGOUT_CODE"
fi
