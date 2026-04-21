#!/bin/bash
API_URL="http://localhost:8080/api"

echo "--- Testing Search with Chinese Characters ---"

# 0. Login
echo "Logging in..."
LOGIN_RESP=$(curl -s -X POST -H "Content-Type: application/json" -d '{"username":"admin","password":"123456"}' "$API_URL/auth/signin")
TOKEN=$(echo $LOGIN_RESP | grep -o '"token":"[^"]*' | cut -d'"' -f4)

if [ -z "$TOKEN" ]; then
  echo "Login failed."
  echo "Response: $LOGIN_RESP"
  exit 1
fi
echo "Login successful."

# 1. Create a product with Chinese name
echo "Creating '测试商品'..."
CREATE_RESP=$(curl -s -X POST -H "Content-Type: application/json" -H "Authorization: Bearer $TOKEN" \
  -d '{
    "name": "测试商品",
    "status": "ON_SHELF",
    "type": "NORMAL",
    "categoryCode": "CAT001",
    "taxClass": "TAX001",
    "brandId": 1,
    "costPrice": 100.00
  }' \
  "$API_URL/products")
echo "Create Response: $CREATE_RESP"

# Extract ID
ID=$(echo $CREATE_RESP | grep -o '"id":[0-9]*' | head -n 1 | cut -d: -f2)

# If ID is empty, maybe it already exists. Try to find it.
if [ -z "$ID" ]; then
  echo "Creation failed (possibly exists). Searching for existing ID..."
  # Use encoded keyword to find it
  KEYWORD="%E6%B5%8B%E8%AF%95%E5%95%86%E5%93%81"
  SEARCH_EXISTING=$(curl -s -H "Authorization: Bearer $TOKEN" "$API_URL/products?keyword=$KEYWORD&page=0&size=1")
  ID=$(echo $SEARCH_EXISTING | grep -o '"id":[0-9]*' | head -n 1 | cut -d: -f2)
fi

if [ -z "$ID" ]; then
  echo "Failed to create or find product."
  exit 1
fi
echo "Target Product ID: $ID"

# 2. Search using URL encoded keyword
# "测试商品" encoded is %E6%B5%8B%E8%AF%95%E5%95%86%E5%93%81
KEYWORD="%E6%B5%8B%E8%AF%95%E5%95%86%E5%93%81"
echo "Searching for '$KEYWORD'..."

SEARCH_RESP=$(curl -s -H "Authorization: Bearer $TOKEN" "$API_URL/products?keyword=$KEYWORD&page=0&size=10")
# echo "Search Response: $SEARCH_RESP"

# Check if ID is in response
if echo "$SEARCH_RESP" | grep -q "\"id\":$ID"; then
  echo "SUCCESS: Found '测试商品' in search results."
else
  echo "FAILURE: Did not find '测试商品' in search results."
  echo "Response snippet: ${SEARCH_RESP:0:200}"
fi

# 3. Cleanup
echo "Deleting test product..."
curl -s -X DELETE -H "Authorization: Bearer $TOKEN" "$API_URL/products/$ID"
echo "Done."
