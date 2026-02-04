#!/bin/bash
echo "Waiting for server to be ready..."
sleep 5

echo "Getting Token..."
# Use jq if available, otherwise python
TOKEN=$(curl -s -X POST http://localhost:8080/api/auth/signin -H 'Content-Type: application/json' -d '{"username":"admin", "password":"123456"}' | python3 -c "import sys, json; data=json.load(sys.stdin); print(data.get('data', {}).get('token', 'ERROR'))")

if [ "$TOKEN" == "ERROR" ] || [ -z "$TOKEN" ]; then
    echo "Failed to get token."
    curl -v -X POST http://localhost:8080/api/auth/signin -H 'Content-Type: application/json' -d '{"username":"admin", "password":"123456"}'
    exit 1
fi

echo "Token obtained. Testing Tax Match for 'A4纸'..."
curl -v -G "http://localhost:8080/api/tax-classifications/match" --data-urlencode "productName=A4纸" -H "Authorization: Bearer $TOKEN"
