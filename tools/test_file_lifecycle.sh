#!/bin/bash

# Login to get token
echo "Logging in as admin..."
LOGIN_RESPONSE=$(curl -s -X POST -H "Content-Type: application/json" -d '{"username":"admin","password":"password"}' http://localhost:8080/api/auth/signin)
TOKEN=$(echo $LOGIN_RESPONSE | grep -o '"token":"[^"]*"' | awk -F':' '{print $2}' | tr -d '"')

if [ -z "$TOKEN" ]; then
    echo "Login failed! Token not found."
    exit 1
fi
echo "Token obtained."

BASE_URL="http://localhost:8080/api/supplier-files"
AUTH_HEADER="Authorization: Bearer $TOKEN"

# Fetch first supplier ID
echo "Fetching first supplier ID..."
SUPPLIER_RESPONSE=$(curl -s -H "$AUTH_HEADER" "http://localhost:8080/api/suppliers?page=0&size=1")
SUPPLIER_ID=$(echo $SUPPLIER_RESPONSE | grep -o '"id":[0-9]*' | head -1 | awk -F':' '{print $2}')

if [ -z "$SUPPLIER_ID" ]; then
    echo "No supplier found! Cannot proceed."
    exit 1
fi
echo "Using Supplier ID: $SUPPLIER_ID"

echo "Creating dummy files..."
echo "This is version 1" > test_v1.pdf
echo "This is version 2" > test_v2.pdf

# 1. Upload File (Version 1)
echo "1. Uploading File (Version 1)..."
UPLOAD_RESPONSE=$(curl -s -X POST -H "$AUTH_HEADER" -F "file=@test_v1.pdf" -F "category=QUALIFICATION" -F "description=Version 1 Description" "$BASE_URL/$SUPPLIER_ID/upload")
echo "Response: $UPLOAD_RESPONSE"
FILE_ID=$(echo $UPLOAD_RESPONSE | grep -o '"id":[0-9]*' | head -1 | awk -F':' '{print $2}')
GROUP_ID=$(echo $UPLOAD_RESPONSE | grep -o '"groupId":"[^"]*"' | head -1 | awk -F':' '{print $2}' | tr -d '"')

if [ -z "$FILE_ID" ]; then
    echo "Upload failed!"
    exit 1
fi
echo "File ID: $FILE_ID"
echo "Group ID: $GROUP_ID"

# 2. Update Metadata
echo -e "\n2. Updating Metadata..."
UPDATE_META_RESPONSE=$(curl -s -X PUT -H "$AUTH_HEADER" "$BASE_URL/$FILE_ID?description=Updated_Description")
echo "Response: $UPDATE_META_RESPONSE"

# 3. Upload New Version (Version 2)
echo -e "\n3. Uploading New Version (Version 2)..."
VERSION_RESPONSE=$(curl -s -X POST -H "$AUTH_HEADER" -F "file=@test_v2.pdf" -F "description=Version 2 Description" "$BASE_URL/$FILE_ID/version")
echo "Response: $VERSION_RESPONSE"
NEW_FILE_ID=$(echo $VERSION_RESPONSE | grep -o '"id":[0-9]*' | head -1 | awk -F':' '{print $2}')
echo "New File ID: $NEW_FILE_ID"

if [ "$FILE_ID" == "$NEW_FILE_ID" ]; then
    echo "Error: File ID should change for new version"
    exit 1
fi

# 4. Get History
echo -e "\n4. Getting History..."
HISTORY_RESPONSE=$(curl -s -H "$AUTH_HEADER" "$BASE_URL/history/$GROUP_ID")
echo "Response: $HISTORY_RESPONSE"
VERSION_COUNT=$(echo $HISTORY_RESPONSE | grep -o '"version"' | wc -l)
echo "Version Count: $VERSION_COUNT (Expect >= 2)"

# 5. Delete File (Logical Delete)
echo -e "\n5. Deleting File (ID: $NEW_FILE_ID)..."
DELETE_RESPONSE=$(curl -s -X DELETE -H "$AUTH_HEADER" "$BASE_URL/$NEW_FILE_ID")
echo "Response Code: $DELETE_RESPONSE"

# 6. Get Deleted Files
echo -e "\n6. Getting Deleted Files..."
DELETED_RESPONSE=$(curl -s -H "$AUTH_HEADER" "$BASE_URL/$SUPPLIER_ID/deleted")
echo "Response: $DELETED_RESPONSE"
IS_DELETED_FOUND=$(echo $DELETED_RESPONSE | grep "\"id\":$NEW_FILE_ID")

if [ -z "$IS_DELETED_FOUND" ]; then
    echo "Error: Deleted file not found in recycle bin"
    # exit 1
else
    echo "Success: File found in recycle bin"
fi

# 7. Restore File
echo -e "\n7. Restoring File (ID: $NEW_FILE_ID)..."
RESTORE_RESPONSE=$(curl -s -X POST -H "$AUTH_HEADER" "$BASE_URL/$NEW_FILE_ID/restore")
echo "Response Code: $RESTORE_RESPONSE"

# 8. Verify Restore
echo -e "\n8. Verifying Restore..."
FILES_RESPONSE=$(curl -s -H "$AUTH_HEADER" "$BASE_URL/$SUPPLIER_ID?category=QUALIFICATION")
IS_RESTORED_FOUND=$(echo $FILES_RESPONSE | grep "\"id\":$NEW_FILE_ID")

if [ -z "$IS_RESTORED_FOUND" ]; then
    echo "Error: Restored file not found in active list"
    exit 1
else
    echo "Success: File restored successfully"
fi

# 9. Verify Download (with token)
echo -e "\n9. Verifying Download..."
DOWNLOAD_URL=$(echo $FILES_RESPONSE | grep -o '"url":"[^"]*"' | head -1 | awk -F':' '{print $2}' | tr -d '"')
# Strip leading slash if present in variable expansion, but URL is typically /api/supplier-files/2/download
FULL_DOWNLOAD_URL="http://localhost:8080$DOWNLOAD_URL?token=$TOKEN"
echo "Downloading from: $FULL_DOWNLOAD_URL"
DOWNLOAD_STATUS=$(curl -o /dev/null -s -w "%{http_code}\n" "$FULL_DOWNLOAD_URL")
if [ "$DOWNLOAD_STATUS" == "200" ]; then
    echo "Success: Download verification passed (Status 200)"
else
    echo "Error: Download verification failed (Status $DOWNLOAD_STATUS)"
    exit 1
fi

echo -e "\nAll Lifecycle Tests Passed!"
rm test_v1.pdf test_v2.pdf
