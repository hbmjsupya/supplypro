#!/bin/bash

# Configuration
API_URL="http://localhost:8080/api"
TOKEN=$(curl -s -X POST -H "Content-Type: application/json" -d '{"username":"admin","password":"123456"}' $API_URL/auth/signin | grep -o '"token":"[^"]*' | cut -d'"' -f4)

echo "Token: $TOKEN"

echo "--- Test 1: List On-Shelf Products ---"
curl -s -H "Authorization: Bearer $TOKEN" "$API_URL/products?page=0&size=1&status=ON_SHELF"
echo -e "\n"

echo "--- Test 2: Create Bundle with Invalid Quantity (0) ---"
# Creating a Bundle with quantity 0 - Should fail
# First need a valid sub-product ID and Category Code.
PRODUCT_DATA=$(curl -s -H "Authorization: Bearer $TOKEN" "$API_URL/products?page=0&size=1&status=ON_SHELF" | head -1)
PRODUCT_ID=$(echo $PRODUCT_DATA | grep -o '"id":[0-9]*' | head -1 | cut -d: -f2)
CATEGORY_CODE=$(echo $PRODUCT_DATA | grep -o '"categoryCode":"[^"]*' | head -1 | cut -d'"' -f4)
BRAND_ID=$(echo $PRODUCT_DATA | grep -o '"brandId":[0-9]*' | head -1 | cut -d: -f2)

if [ -z "$PRODUCT_ID" ]; then
  echo "No ON_SHELF product found. Creating a dummy sub-product first..."
  TIMESTAMP=$(date +%s)
  # Create a dummy product
  # Note: assuming CAT_E81834A4 exists or we need to find a valid one.
  # Let's try to list categories if needed, but for now use hardcoded fallback or fail.
  CATEGORY_CODE="CAT_E81834A4"
  BRAND_ID=1
  
  CREATE_RES=$(curl -s -X POST -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" -d '{
    "name": "Test Sub Product '$TIMESTAMP'",
    "categoryCode": "'$CATEGORY_CODE'",
    "brandId": '$BRAND_ID',
    "status": "ON_SHELF",
    "type": "NORMAL",
    "costPrice": 10.00
  }' "$API_URL/products")
  PRODUCT_ID=$(echo $CREATE_RES | grep -o '"id":[0-9]*' | head -1 | cut -d: -f2)
fi

echo "Using Sub Product ID: $PRODUCT_ID"
echo "Using Category Code: $CATEGORY_CODE"
echo "Using Brand ID: $BRAND_ID"

TIMESTAMP=$(date +%s)

curl -v -X POST -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" -d '{
  "name": "Invalid Bundle '$TIMESTAMP'",
  "categoryCode": "'$CATEGORY_CODE'",
  "brandId": '$BRAND_ID',
  "status": "ON_SHELF",
  "type": "BUNDLE",
  "bundleItems": [
    {
      "childProductId": '$PRODUCT_ID',
      "quantity": 0
    }
  ]
}' "$API_URL/products"
echo -e "\n"

echo "--- Test 3: Create Bundle with Valid Quantity ---"
curl -v -X POST -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" -d '{
  "name": "Valid Bundle '$TIMESTAMP'",
  "categoryCode": "'$CATEGORY_CODE'",
  "brandId": '$BRAND_ID',
  "status": "ON_SHELF",
  "type": "BUNDLE",
  "bundleItems": [
    {
      "childProductId": '$PRODUCT_ID',
      "quantity": 2
    }
  ]
}' "$API_URL/products"
echo -e "\n"

echo "--- Test 4: List Bundle Products ---"
curl -s -H "Authorization: Bearer $TOKEN" "$API_URL/products?type=BUNDLE&page=0&size=5"
echo -e "\n"

echo "--- Test 5: Search with Multiple Statuses (ON_SHELF & SELECTED) ---"
# We expect to see products with status ON_SHELF and SELECTED
curl -s -H "Authorization: Bearer $TOKEN" "$API_URL/products?status=ON_SHELF&status=SELECTED&page=0&size=5"
echo -e "\n"

echo "--- Test 6: Get Bundle List ---"
# Test if fetching bundle list causes any error
curl -s -H "Authorization: Bearer $TOKEN" "$API_URL/products?type=BUNDLE&page=0&size=5"
echo -e "\n"

echo "--- Test 7: Chinese Keyword Search (测试商品) ---"
# Ensure a target product exists
TARGET_NAME="测试商品_Target_$(date +%s)"
curl -s -X POST -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" -d '{
  "name": "'$TARGET_NAME'",
  "categoryCode": "CAT_E81834A4",
  "brandId": 1,
  "status": "ON_SHELF",
  "type": "NORMAL",
  "costPrice": 10.00
}' "$API_URL/products" > /dev/null

ENCODED_KEYWORD="%E6%B5%8B%E8%AF%95%E5%95%86%E5%93%81" # URL encoded "测试商品"
SEARCH_RES=$(curl -s -H "Authorization: Bearer $TOKEN" "$API_URL/products?keyword=$ENCODED_KEYWORD&page=0&size=10")
if echo "$SEARCH_RES" | grep -q "$TARGET_NAME"; then
  echo "SUCCESS: Found product with Chinese keyword."
else
  echo "FAILURE: Did not find product with Chinese keyword."
fi
echo -e "\n"

echo "--- Test 8: Verify Bundle Visibility after Save ---"
BUNDLE_NAME="VisibilityBundle_$(date +%s)"
BUNDLE_RES=$(curl -s -X POST -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" -d '{
  "name": "'$BUNDLE_NAME'",
  "type": "BUNDLE",
  "status": "PENDING_SELECTION",
  "bundleItems": [
    {
      "childProductId": '$PRODUCT_ID',
      "quantity": 1
    }
  ]
}' "$API_URL/products")
BUNDLE_ID=$(echo $BUNDLE_RES | grep -o '"id":[0-9]*' | head -1 | cut -d: -f2)

if [ -z "$BUNDLE_ID" ]; then
    echo "FAILURE: Could not create bundle."
else
    echo "Created Bundle ID: $BUNDLE_ID"
    # List without status filter, only type=BUNDLE
    LIST_RES=$(curl -s -H "Authorization: Bearer $TOKEN" "$API_URL/products?type=BUNDLE")
    if echo "$LIST_RES" | grep -q "\"id\":$BUNDLE_ID"; then
        echo "SUCCESS: Bundle $BUNDLE_ID is visible in the list."
    else
        echo "FAILURE: Bundle $BUNDLE_ID is NOT visible in the list."
    fi
fi
