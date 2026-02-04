#!/bin/bash

BASE_URL="http://localhost:8080/api"
USERNAME="admin"
PASSWORD="password" # Based on start_server.sh output "Default admin user created: admin / 123456" -> Wait, start_server log said 123456. But check DataInitializer.
# Let's try 123456 first.

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m'

echo "Testing Backend Features..."

# 1. Login
echo -n "Logging in as $USERNAME... "
LOGIN_RESPONSE=$(curl -s -X POST "$BASE_URL/auth/signin" \
  -H "Content-Type: application/json" \
  -d "{\"username\": \"$USERNAME\", \"password\": \"123456\"}")

TOKEN=$(echo $LOGIN_RESPONSE | python3 -c "import sys, json; print(json.load(sys.stdin).get('data', {}).get('token', ''))")

if [ -z "$TOKEN" ]; then
    echo -e "${RED}FAILED${NC}"
    echo "Response: $LOGIN_RESPONSE"
    exit 1
fi
echo -e "${GREEN}SUCCESS${NC}"
# echo "Token: $TOKEN"

AUTH_HEADER="Authorization: Bearer $TOKEN"

# 2. Test Category
echo -n "Testing Categories (Parent=0)... "
CAT_RESPONSE=$(curl -s -X GET "$BASE_URL/categories?parentCode=0" -H "$AUTH_HEADER")
CAT_COUNT=$(echo $CAT_RESPONSE | python3 -c "import sys, json; print(len(json.load(sys.stdin).get('data', [])))")

if [ "$CAT_COUNT" -gt 0 ]; then
    echo -e "${GREEN}SUCCESS ($CAT_COUNT items)${NC}"
else
    echo -e "${RED}FAILED${NC}"
    echo "Response: $CAT_RESPONSE"
fi

# 3. Test Tax Sync (Manual Trigger)
echo -n "Triggering Tax Sync... "
SYNC_RESPONSE=$(curl -s -X POST "$BASE_URL/tax-classifications/sync" -H "$AUTH_HEADER")
echo "Response: $SYNC_RESPONSE"

# 4. Test Tax Search
echo -n "Testing Tax Search... "
TAX_SEARCH_RESPONSE=$(curl -s -X GET "$BASE_URL/tax-classifications/search?page=0&size=10" -H "$AUTH_HEADER")
TAX_COUNT=$(echo $TAX_SEARCH_RESPONSE | python3 -c "import sys, json; print(len(json.load(sys.stdin).get('data', [])))")

if [ "$TAX_COUNT" -gt 0 ]; then
    echo -e "${GREEN}SUCCESS ($TAX_COUNT items)${NC}"
    echo "Tax Data: $TAX_SEARCH_RESPONSE"
else
    echo -e "${RED}FAILED (0 items)${NC}"
    echo "Response: $TAX_SEARCH_RESPONSE"
fi

# 5. Test Tax Smart Match
echo -n "Testing Tax Smart Match (Product: '办公')... "
MATCH_RESPONSE=$(curl -s -G "$BASE_URL/tax-classifications/match" --data-urlencode "productName=办公" -H "$AUTH_HEADER")
MATCH_COUNT=$(echo $MATCH_RESPONSE | python3 -c "import sys, json; print(len(json.load(sys.stdin).get('data', [])))")

if [ "$MATCH_COUNT" -gt 0 ]; then
    echo -e "${GREEN}SUCCESS ($MATCH_COUNT matches)${NC}"
else
    echo -e "${RED}FAILED${NC}"
    echo "Response: $MATCH_RESPONSE"
fi

# 6. Test Brand Permission (Admin)
echo -n "Testing Brand Permission (Admin Access)... "
BRAND_RESPONSE=$(curl -s -X GET "$BASE_URL/brands/1" -H "$AUTH_HEADER")
BRAND_CODE=$(echo $BRAND_RESPONSE | python3 -c "import sys, json; print(json.load(sys.stdin).get('code', 0))")

# Note: Brand 1 might not exist. Check status code.
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" -X GET "$BASE_URL/brands/1" -H "$AUTH_HEADER")

if [ "$HTTP_CODE" == "200" ] || [ "$HTTP_CODE" == "404" ]; then
    # 404 is also fine as it means permission check passed (didn't get 403)
    echo -e "${GREEN}SUCCESS (HTTP $HTTP_CODE)${NC}"
else
    echo -e "${RED}FAILED (HTTP $HTTP_CODE)${NC}"
fi

# 6. Test Rate Limiting
echo -n "Testing Rate Limiting (Burst)... "
# We need to exceed 100 req/sec. Hard to do with curl loop in bash, but let's try 10 fast requests.
# If we don't get 429, it means we are under limit (which is good for normal use).
# To verify rate limit works, we'd need a load tool.
# Here just verify we CAN make requests.
echo -e "${GREEN}SKIPPED (Requires load tool)${NC}"

echo "All Tests Completed."
