
#!/bin/bash

# Configuration
API_URL="http://localhost:8080/api/purchase-orders"
CONTENT_TYPE="application/json"

# Payload based on InboundOrderCreate.tsx
# Note: we need valid supplier ID and warehouse ID. 
# From previous context, supplier ID 32 and warehouse ID 27 exist.
# Product ID 8 exists.

PAYLOAD='{
  "supplier": { "id": 32 },
  "warehouseId": 27,
  "type": "INBOUND",
  "status": "PENDING_SETTLEMENT",
  "items": [
    {
      "productId": 8,
      "quantity": 10,
      "unitPrice": 50,
      "totalPrice": 500
    }
  ],
  "totalAmount": 500,
  "contactName": "Test Contact",
  "contactPhone": "1234567890",
  "province": "河北省",
  "city": "石家庄市",
  "district": "长安区",
  "detailAddress": "003"
}'

echo "Sending request to $API_URL..."
curl -v -X POST "$API_URL" \
     -H "Content-Type: $CONTENT_TYPE" \
     -d "$PAYLOAD"

echo -e "\nRequest sent."
