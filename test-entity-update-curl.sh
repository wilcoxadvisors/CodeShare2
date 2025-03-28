#!/bin/bash

# Test script to verify entity update functionality using cURL
# This script simulates the UI flow for:
# 1. Authentication
# 2. Create client
# 3. Create entity
# 4. Update entity (change industry and name)
# 5. Verify changes are reflected in dashboard data

# Set up variables
API_BASE_URL="http://localhost:5000"
COOKIE_FILE="cookies.txt"
CLIENT_ID=""
ENTITY_ID=""

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
log_section "Step 2: Create client (Setup Step 1)"
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

# 3. Add entity (simulate Step 2 of setup flow)
log_section "Step 3: Add entity (Setup Step 2)"
ENTITY_NAME="Test Entity $TIMESTAMP"
ENTITY_CODE="TE$(( RANDOM % 1000 ))"

ENTITY_DATA='{
  "name": "'"$ENTITY_NAME"'",
  "legalName": "Test Entity Legal Name",
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
ENTITY_ID=$(echo $ENTITY_RESPONSE | grep -o '"id":[0-9]*' | head -1 | cut -d ":" -f 2)

if [ -z "$ENTITY_ID" ]; then
  echo "❌ Failed to create entity or extract entity ID"
  exit 1
fi

echo "✅ Entity created with ID: $ENTITY_ID"

# 4. Edit entity - change industry and name (simulate Edit button click in UI)
log_section "Step 4: Edit entity - change industry and name"
UPDATED_ENTITY_NAME="$ENTITY_NAME (Updated)"

# Get the current entity data first
ENTITY_GET_RESPONSE=$(curl -s -X GET "$API_BASE_URL/api/admin/entities/$ENTITY_ID" \
  -b $COOKIE_FILE)

echo "CURRENT ENTITY DATA: $ENTITY_GET_RESPONSE"

# Create the updated entity data
UPDATED_ENTITY_DATA='{
  "id": '"$ENTITY_ID"',
  "name": "'"$UPDATED_ENTITY_NAME"'",
  "legalName": "Test Entity Legal Name",
  "clientId": '"$CLIENT_ID"',
  "entityType": "llc",
  "industry": "finance",
  "taxId": "12-3456789",
  "address": "123 Test Street",
  "phone": "555-987-6543",
  "email": "entity@example.com",
  "ownerId": 1,
  "code": "'"$ENTITY_CODE"'"
}'

echo "UPDATED ENTITY DATA: $UPDATED_ENTITY_DATA"

UPDATE_RESPONSE=$(curl -s -X PUT "$API_BASE_URL/api/admin/entities/$ENTITY_ID" \
  -H "Content-Type: application/json" \
  -d "$UPDATED_ENTITY_DATA" \
  -b $COOKIE_FILE)

echo "UPDATE RESPONSE: $UPDATE_RESPONSE"

# Verify update was successful
if [[ ! "$UPDATE_RESPONSE" =~ "finance" ]] || [[ ! "$UPDATE_RESPONSE" =~ "Updated" ]]; then
  echo "❌ Entity update verification failed"
  echo "Expected industry: finance, Name should include '(Updated)'"
  exit 1
fi

echo "✅ Entity updated successfully"

# 5. Verify entity update in dashboard data (simulate dashboard refresh)
log_section "Step 5: Verify entity update in dashboard data"
DASHBOARD_RESPONSE=$(curl -s -X GET "$API_BASE_URL/api/admin/dashboard" \
  -b $COOKIE_FILE)

# Extract just a snippet of the response for readability
DASHBOARD_SNIPPET=$(echo $DASHBOARD_RESPONSE | grep -o -E '"entities":\[[^]]*\]' | head -c 1000)
echo "DASHBOARD DATA SNIPPET: $DASHBOARD_SNIPPET"

# Check if our updated entity is in the dashboard data
if [[ ! "$DASHBOARD_RESPONSE" =~ "$ENTITY_ID" ]] || [[ ! "$DASHBOARD_RESPONSE" =~ "finance" ]] || [[ ! "$DASHBOARD_RESPONSE" =~ "Updated" ]]; then
  echo "❌ Entity update verification in dashboard failed"
  echo "Entity ID: $ENTITY_ID"
  echo "Expected to find entity with ID $ENTITY_ID, industry 'finance', and name containing '(Updated)'"
  exit 1
fi

echo "✅ Entity updates are correctly reflected in dashboard data"

log_section "TEST COMPLETED SUCCESSFULLY"
echo "✅ The entity update functionality is working correctly!"
echo "✅ Entity with ID $ENTITY_ID was successfully updated and reflects the changes in the dashboard."