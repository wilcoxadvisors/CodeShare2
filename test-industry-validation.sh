#!/bin/bash

# Test script to verify entity industry value handling
# Tests various industry value scenarios:
# 1. String value (normal case)
# 2. Numeric value (edge case)
# 3. null value (edge case)
# 4. Empty string (edge case)

# Set up variables
API_BASE_URL="http://localhost:5000"
COOKIE_FILE="cookies.txt"
CLIENT_ID=""
BASE_ENTITY_ID=""

# Function to log section headers
log_section() {
  echo -e "\n=============================================================="
  echo "${1^^}"
  echo "=============================================================="
}

# Clean up any existing cookie file
[ -f $COOKIE_FILE ] && rm $COOKIE_FILE

# 1. Authenticate as admin
log_section "Step 1: Authentication"
AUTH_RESPONSE=$(curl -s -X POST "$API_BASE_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"password123"}' \
  -c $COOKIE_FILE)

echo "AUTH RESPONSE: $AUTH_RESPONSE"

# Verify authentication
ME_RESPONSE=$(curl -s -X GET "$API_BASE_URL/api/auth/me" -b $COOKIE_FILE)
echo "ME RESPONSE: $ME_RESPONSE"

if [[ ! "$ME_RESPONSE" =~ "admin" ]]; then
  echo "❌ Authentication verification failed"
  exit 1
fi

echo "✅ Authentication successful"

# 2. Create a client (simulate Step 1 of setup flow)
log_section "Step 2: Create client"
TIMESTAMP=$(date +%s)
CLIENT_NAME="Test Client $TIMESTAMP"

CLIENT_DATA='{
  "name": "'"$CLIENT_NAME"'",
  "contactName": "Test Contact",
  "industry": "technology",
  "phone": "555-123-4567", 
  "email": "test@example.com",
  "ownerId": 1
}'

echo "CLIENT DATA: $CLIENT_DATA"

CLIENT_RESPONSE=$(curl -s -X POST "$API_BASE_URL/api/admin/clients" \
  -H "Content-Type: application/json" \
  -d "$CLIENT_DATA" \
  -b $COOKIE_FILE)

echo "CLIENT RESPONSE: $CLIENT_RESPONSE"

# Extract client ID
CLIENT_ID=$(echo $CLIENT_RESPONSE | grep -o '"id":[0-9]*' | head -1 | cut -d ":" -f 2)

if [ -z "$CLIENT_ID" ]; then
  echo "❌ Failed to create client or extract client ID"
  exit 1
fi

echo "✅ Client created with ID: $CLIENT_ID"

# 3. Add base entity
log_section "Step 3: Add base entity"
ENTITY_NAME="Base Entity $TIMESTAMP"
ENTITY_CODE="BE$(( RANDOM % 1000 ))"

ENTITY_DATA='{
  "name": "'"$ENTITY_NAME"'",
  "legalName": "Base Entity Legal Name",
  "clientId": '"$CLIENT_ID"',
  "entityType": "llc",
  "industry": "technology",
  "taxId": "12-3456789",
  "address": "123 Test Street",
  "phone": "555-987-6543",
  "email": "entity@example.com",
  "ownerId": 1,
  "code": "'"$ENTITY_CODE"'"
}'

echo "ENTITY DATA: $ENTITY_DATA"

ENTITY_RESPONSE=$(curl -s -X POST "$API_BASE_URL/api/admin/entities" \
  -H "Content-Type: application/json" \
  -d "$ENTITY_DATA" \
  -b $COOKIE_FILE)

echo "ENTITY RESPONSE: $ENTITY_RESPONSE"

# Extract entity ID
BASE_ENTITY_ID=$(echo $ENTITY_RESPONSE | grep -o '"id":[0-9]*' | head -1 | cut -d ":" -f 2)

if [ -z "$BASE_ENTITY_ID" ]; then
  echo "❌ Failed to create entity or extract entity ID"
  exit 1
fi

echo "✅ Base entity created with ID: $BASE_ENTITY_ID"

# 4. TEST CASE 1: Update with string industry value
log_section "Test Case 1: Update with string industry value"
ENTITY_ID=$BASE_ENTITY_ID

UPDATE_DATA='{
  "id": '"$ENTITY_ID"',
  "name": "Test Case 1 - String Value",
  "industry": "healthcare",
  "clientId": '"$CLIENT_ID"',
  "ownerId": 1
}'

echo "UPDATE DATA: $UPDATE_DATA"

UPDATE_RESPONSE=$(curl -s -X PUT "$API_BASE_URL/api/admin/entities/$ENTITY_ID" \
  -H "Content-Type: application/json" \
  -d "$UPDATE_DATA" \
  -b $COOKIE_FILE)

echo "UPDATE RESPONSE: $UPDATE_RESPONSE"

# Check if industry was updated correctly
if [[ ! "$UPDATE_RESPONSE" =~ "healthcare" ]]; then
  echo "❌ String industry value test failed"
  exit 1
fi

echo "✅ String industry value test passed"

# 5. TEST CASE 2: Update with numeric industry value
log_section "Test Case 2: Update with numeric industry value"

UPDATE_DATA='{
  "id": '"$ENTITY_ID"',
  "name": "Test Case 2 - Numeric Value",
  "industry": 123,
  "clientId": '"$CLIENT_ID"',
  "ownerId": 1
}'

echo "UPDATE DATA: $UPDATE_DATA"

UPDATE_RESPONSE=$(curl -s -X PUT "$API_BASE_URL/api/admin/entities/$ENTITY_ID" \
  -H "Content-Type: application/json" \
  -d "$UPDATE_DATA" \
  -b $COOKIE_FILE)

echo "UPDATE RESPONSE: $UPDATE_RESPONSE"

# Retrieve entity to verify
GET_RESPONSE=$(curl -s -X GET "$API_BASE_URL/api/admin/entities/$ENTITY_ID" \
  -b $COOKIE_FILE)

echo "VERIFICATION GET RESPONSE: $GET_RESPONSE"

# The numeric value should be converted to a string, but since it's not a valid industry,
# we expect it to be "other"
if [[ "$UPDATE_RESPONSE" =~ "123" ]] || [[ "$GET_RESPONSE" =~ "123" ]] || [[ ! "$GET_RESPONSE" =~ "other" ]]; then
  echo "❌ Numeric industry value test failed"
  echo "Expected 'other', found numeric value retained or not properly converted"
  exit 1
fi

echo "✅ Numeric industry value test passed"

# 6. TEST CASE 3: Update with null industry value
log_section "Test Case 3: Update with null industry value"

UPDATE_DATA='{
  "id": '"$ENTITY_ID"',
  "name": "Test Case 3 - Null Value",
  "industry": null,
  "clientId": '"$CLIENT_ID"',
  "ownerId": 1
}'

echo "UPDATE DATA: $UPDATE_DATA"

UPDATE_RESPONSE=$(curl -s -X PUT "$API_BASE_URL/api/admin/entities/$ENTITY_ID" \
  -H "Content-Type: application/json" \
  -d "$UPDATE_DATA" \
  -b $COOKIE_FILE)

echo "UPDATE RESPONSE: $UPDATE_RESPONSE"

# Retrieve entity to verify
GET_RESPONSE=$(curl -s -X GET "$API_BASE_URL/api/admin/entities/$ENTITY_ID" \
  -b $COOKIE_FILE)

echo "VERIFICATION GET RESPONSE: $GET_RESPONSE"

# Null industry should be converted to "other"
if [[ ! "$GET_RESPONSE" =~ "other" ]]; then
  echo "❌ Null industry value test failed"
  echo "Expected 'other', but null was not properly handled"
  exit 1
fi

echo "✅ Null industry value test passed"

# 7. TEST CASE 4: Update with empty string industry value
log_section "Test Case 4: Update with empty string industry value"

UPDATE_DATA='{
  "id": '"$ENTITY_ID"',
  "name": "Test Case 4 - Empty String Value",
  "industry": "",
  "clientId": '"$CLIENT_ID"',
  "ownerId": 1
}'

echo "UPDATE DATA: $UPDATE_DATA"

UPDATE_RESPONSE=$(curl -s -X PUT "$API_BASE_URL/api/admin/entities/$ENTITY_ID" \
  -H "Content-Type: application/json" \
  -d "$UPDATE_DATA" \
  -b $COOKIE_FILE)

echo "UPDATE RESPONSE: $UPDATE_RESPONSE"

# Retrieve entity to verify
GET_RESPONSE=$(curl -s -X GET "$API_BASE_URL/api/admin/entities/$ENTITY_ID" \
  -b $COOKIE_FILE)

echo "VERIFICATION GET RESPONSE: $GET_RESPONSE"

# Empty string industry should be converted to "other"
if [[ ! "$GET_RESPONSE" =~ "other" ]]; then
  echo "❌ Empty string industry value test failed"
  echo "Expected 'other', but empty string was not properly handled"
  exit 1
fi

echo "✅ Empty string industry value test passed"

log_section "TEST SUMMARY"
echo "✅ All industry value edge cases were handled correctly!"
echo "✅ String values: Preserved correctly"
echo "✅ Numeric values: Converted to strings and validated"
echo "✅ Null values: Defaulted to 'other'"
echo "✅ Empty strings: Defaulted to 'other'"