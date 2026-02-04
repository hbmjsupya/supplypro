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

# 2. Create Dummy Files
echo "Creating dummy files..."
echo "This is a valid image" > test.jpg
echo "This is a valid text file but invalid extension" > test.txt
echo "This is a valid pdf" > test.pdf

# 3. Upload Valid File (JPG)
echo "Uploading Valid JPG..."
UPLOAD_RESPONSE=$(curl -s -X POST "$BASE_URL/files/upload" \
  -H "Authorization: Bearer $TOKEN" \
  -F "file=@test.jpg")

if echo "$UPLOAD_RESPONSE" | grep -q "test.jpg"; then
    echo "SUCCESS: Valid JPG uploaded."
else
    echo "FAILURE: Valid JPG upload failed. Response: $UPLOAD_RESPONSE"
    exit 1
fi

# 4. Upload Valid File (PDF)
echo "Uploading Valid PDF..."
UPLOAD_RESPONSE=$(curl -s -X POST "$BASE_URL/files/upload" \
  -H "Authorization: Bearer $TOKEN" \
  -F "file=@test.pdf")

if echo "$UPLOAD_RESPONSE" | grep -q "test.pdf"; then
    echo "SUCCESS: Valid PDF uploaded."
else
    echo "FAILURE: Valid PDF upload failed. Response: $UPLOAD_RESPONSE"
    exit 1
fi

# 5. Upload Invalid File (TXT)
echo "Uploading Invalid TXT..."
UPLOAD_RESPONSE=$(curl -s -X POST "$BASE_URL/files/upload" \
  -H "Authorization: Bearer $TOKEN" \
  -F "file=@test.txt")

if echo "$UPLOAD_RESPONSE" | grep -q "Invalid file type"; then
    echo "SUCCESS: Invalid TXT rejected."
else
    echo "FAILURE: Invalid TXT should be rejected but response was: $UPLOAD_RESPONSE"
    exit 1
fi

# Cleanup
rm test.jpg test.txt test.pdf

echo "ALL VALIDATION TESTS PASSED."
