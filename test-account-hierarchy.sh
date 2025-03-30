#!/bin/bash

# =============================================================
# Chart of Accounts Hierarchy Test Script
# =============================================================

echo "===== Testing Chart of Accounts Hierarchy ====="
echo "Date: $(date)"
echo ""
echo "====== CHART OF ACCOUNTS HIERARCHY TEST ======"
echo "Test Time: $(date -Iseconds)"
echo ""

# Define variables
BASE_URL="http://localhost:5000"
CLIENT_ID=1
COOKIE_JAR="cookies.txt"

# ------------------------------------------
# Step 1: Authentication
# ------------------------------------------
echo "--- Step 1: Authentication ---"
LOGIN_RESPONSE=$(curl -s -X POST "$BASE_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -c "$COOKIE_JAR" \
  -d '{"username":"admin", "password":"password123"}')

# Check authentication status code
AUTH_STATUS=$?
echo "Making POST request to /api/auth/login"
echo "Authentication Status: $AUTH_STATUS"

if [ $AUTH_STATUS -eq 0 ]; then
  echo "Authentication successful!"
else
  echo "Authentication failed with status: $AUTH_STATUS"
  echo "Server response: $LOGIN_RESPONSE"
  exit 1
fi
echo ""

# ------------------------------------------
# Step 2: Create a parent account
# ------------------------------------------
echo "--- Step 2: Create a parent account ---"
PARENT_RESPONSE=$(curl -s -X POST "$BASE_URL/api/clients/$CLIENT_ID/accounts" \
  -H "Content-Type: application/json" \
  -b "$COOKIE_JAR" \
  -d '{
    "code": "P1000",
    "name": "Parent Account",
    "type": "asset",
    "subtype": "current_asset",
    "isSubledger": false,
    "active": true,
    "description": "This is a parent account for testing hierarchy"
  }')

# Parse the parent account ID from the response
PARENT_ID=$(echo $PARENT_RESPONSE | jq -r '.id')
echo "Created parent account with ID: $PARENT_ID"
echo "Parent Account: $PARENT_RESPONSE"
echo ""

# ------------------------------------------
# Step 3: Create child accounts referencing the parent
# ------------------------------------------
echo "--- Step 3: Create child accounts referencing the parent ---"
# Create first child account
CHILD1_RESPONSE=$(curl -s -X POST "$BASE_URL/api/clients/$CLIENT_ID/accounts" \
  -H "Content-Type: application/json" \
  -b "$COOKIE_JAR" \
  -d "{
    \"code\": \"C1001\",
    \"name\": \"Child Account 1\",
    \"type\": \"asset\",
    \"subtype\": \"current_asset\",
    \"parentId\": $PARENT_ID,
    \"isSubledger\": false,
    \"active\": true,
    \"description\": \"This is a child account for testing hierarchy\"
  }")

# Parse the child account ID from the response
CHILD1_ID=$(echo $CHILD1_RESPONSE | jq -r '.id')
echo "Created child account 1 with ID: $CHILD1_ID"

# Create second child account
CHILD2_RESPONSE=$(curl -s -X POST "$BASE_URL/api/clients/$CLIENT_ID/accounts" \
  -H "Content-Type: application/json" \
  -b "$COOKIE_JAR" \
  -d "{
    \"code\": \"C1002\",
    \"name\": \"Child Account 2\",
    \"type\": \"asset\",
    \"subtype\": \"current_asset\",
    \"parentId\": $PARENT_ID,
    \"isSubledger\": false,
    \"active\": true,
    \"description\": \"This is another child account for testing hierarchy\"
  }")

# Parse the child account ID from the response
CHILD2_ID=$(echo $CHILD2_RESPONSE | jq -r '.id')
echo "Created child account 2 with ID: $CHILD2_ID"
echo ""

# ------------------------------------------
# Step 4: Create a grandchild account
# ------------------------------------------
echo "--- Step 4: Create a grandchild account ---"
GRANDCHILD_RESPONSE=$(curl -s -X POST "$BASE_URL/api/clients/$CLIENT_ID/accounts" \
  -H "Content-Type: application/json" \
  -b "$COOKIE_JAR" \
  -d "{
    \"code\": \"G1001\",
    \"name\": \"Grandchild Account\",
    \"type\": \"asset\",
    \"subtype\": \"current_asset\",
    \"parentId\": $CHILD1_ID,
    \"isSubledger\": false,
    \"active\": true,
    \"description\": \"This is a grandchild account for testing hierarchy\"
  }")

# Parse the grandchild account ID from the response
GRANDCHILD_ID=$(echo $GRANDCHILD_RESPONSE | jq -r '.id')
echo "Created grandchild account with ID: $GRANDCHILD_ID"
echo ""

# ------------------------------------------
# Step 5: Fetch the account tree hierarchy
# ------------------------------------------
echo "--- Step 5: Fetch the account tree hierarchy ---"
TREE_RESPONSE=$(curl -s -X GET "$BASE_URL/api/clients/$CLIENT_ID/accounts/tree" \
  -H "Content-Type: application/json" \
  -b "$COOKIE_JAR")

# Check the response status
TREE_STATUS=$?
if [ $TREE_STATUS -eq 0 ]; then
  echo "Successfully fetched account tree hierarchy"
  
  # Save the response to a file for inspection
  echo "$TREE_RESPONSE" > hierarchy-tree-output.json
  echo "Tree response saved to hierarchy-tree-output.json"
  
  # Find and display our new hierarchy
  echo "Extracting our test hierarchy..."
  cat hierarchy-tree-output.json | jq --arg pid "$PARENT_ID" '.data[] | select(.id == ($pid | tonumber))' > hierarchy-extract.json
  
  echo "Our hierarchy structure:"
  cat hierarchy-extract.json
else
  echo "Failed to fetch account tree with status: $TREE_STATUS"
  echo "Response: $TREE_RESPONSE"
  exit 1
fi
echo ""

# ------------------------------------------
# Step 6: Verify the hierarchy structure
# ------------------------------------------
echo "--- Step 6: Verify the hierarchy structure ---"
# Check that parent has exactly 2 children
CHILDREN_COUNT=$(cat hierarchy-extract.json | jq '.children | length')
echo "Parent account has $CHILDREN_COUNT children (expected: 2)"

if [ "$CHILDREN_COUNT" -eq 2 ]; then
  echo "✅ Parent has correct number of children"
else
  echo "❌ Parent has wrong number of children"
  exit 1
fi

# Check that one of the children has a grandchild
CHILD1_HAS_GRANDCHILD=$(cat hierarchy-extract.json | jq --arg cid "$CHILD1_ID" '.children[] | select(.id == ($cid | tonumber)) | .children | length')
echo "Child 1 has $CHILD1_HAS_GRANDCHILD children (expected: 1)"

if [ "$CHILD1_HAS_GRANDCHILD" -eq 1 ]; then
  echo "✅ Child 1 has correct number of children (grandchild)"
else
  echo "❌ Child 1 has wrong number of children"
  exit 1
fi

# Check that child 2 has no children
CHILD2_HAS_CHILDREN=$(cat hierarchy-extract.json | jq --arg cid "$CHILD2_ID" '.children[] | select(.id == ($cid | tonumber)) | .children | length')
echo "Child 2 has $CHILD2_HAS_CHILDREN children (expected: 0)"

if [ "$CHILD2_HAS_CHILDREN" -eq 0 ]; then
  echo "✅ Child 2 has no children as expected"
else
  echo "❌ Child 2 has unexpected children"
  exit 1
fi

# Check that grandchild has no children
GRANDCHILD_IN_TREE=$(cat hierarchy-extract.json | jq --arg cid "$CHILD1_ID" --arg gcid "$GRANDCHILD_ID" '.children[] | select(.id == ($cid | tonumber)) | .children[] | select(.id == ($gcid | tonumber)) | .id')

if [ -n "$GRANDCHILD_IN_TREE" ]; then
  echo "✅ Grandchild found in the correct position in the hierarchy"
else
  echo "❌ Grandchild not found in the expected position"
  exit 1
fi

echo ""
echo "====== TEST SUMMARY ======" 
echo "Authentication: ✅ PASS"
echo "Create Parent Account: ✅ PASS"
echo "Create Child Accounts: ✅ PASS"
echo "Create Grandchild Account: ✅ PASS"
echo "Fetch Account Tree: ✅ PASS"
echo "Verify Hierarchy: ✅ PASS"
echo ""
echo "✅ Hierarchy test executed successfully"
echo ""
echo "===== Test Complete ====="
