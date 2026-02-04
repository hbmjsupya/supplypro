#!/bin/bash

# Base URL
BASE_URL="http://localhost:8080/api"
STATIC_URL="http://localhost:8080"

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

# 2. Create Dummy Image
echo "Creating dummy image..."
echo "fake image content" > test_display.png

# 3. Upload File
echo "Uploading File..."
UPLOAD_RESPONSE=$(curl -s -X POST "$BASE_URL/files/upload" \
  -H "Authorization: Bearer $TOKEN" \
  -F "file=@test_display.png")

echo "Upload Response: $UPLOAD_RESPONSE"

# Extract URL
FILE_URL=$(echo $UPLOAD_RESPONSE | grep -o '"fileUrl":"[^"]*' | cut -d'"' -f4)
echo "Extracted File URL: $FILE_URL"

if [[ "$FILE_URL" != /uploads/* ]]; then
    echo "FAILURE: File URL format incorrect. Expected /uploads/..., got $FILE_URL"
    exit 1
fi

# 4. Verify Access (No Auth)
echo "Verifying Access without Auth..."
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$STATIC_URL$FILE_URL")

if [ "$HTTP_CODE" == "200" ]; then
    echo "SUCCESS: File accessible without auth (HTTP 200)."
else
    echo "FAILURE: File not accessible. HTTP Code: $HTTP_CODE"
    exit 1
fi

# Cleanup
rm test_display.png

echo "ALL DISPLAY TESTS PASSED."
