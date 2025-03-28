#!/bin/bash

# Login and store cookie
echo "Logging in..."
curl -c cookies.txt -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"testuser_1742830853830", "password":"password123"}' \
  -s

echo -e "\n\nTesting GET /api/clients/1/accounts"
curl -b cookies.txt -X GET http://localhost:5000/api/clients/1/accounts -s | jq .

echo -e "\n\nTesting POST /api/clients/1/accounts (Create Account)"
curl -b cookies.txt -X POST http://localhost:5000/api/clients/1/accounts \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Client Account",
    "code": "TEST123",
    "type": "ASSET",
    "subtype": "Current Asset", 
    "isSubledger": false
  }' \
  -s | jq .

echo -e "\n\nFetch the created account"
ACCOUNT_ID=$(curl -b cookies.txt -X GET http://localhost:5000/api/clients/1/accounts -s | jq '.[length-1].id')
echo "Last account ID: $ACCOUNT_ID"
curl -b cookies.txt -X GET http://localhost:5000/api/clients/1/accounts/$ACCOUNT_ID -s | jq .

echo -e "\n\nTesting PUT /api/clients/1/accounts/$ACCOUNT_ID (Update Account)"
curl -b cookies.txt -X PUT http://localhost:5000/api/clients/1/accounts/$ACCOUNT_ID \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Updated Test Client Account",
    "active": true
  }' \
  -s | jq .

echo -e "\n\nTesting DELETE /api/clients/1/accounts/$ACCOUNT_ID (Delete Account)"
curl -b cookies.txt -X DELETE http://localhost:5000/api/clients/1/accounts/$ACCOUNT_ID -s -v