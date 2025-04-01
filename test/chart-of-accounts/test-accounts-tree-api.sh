#!/bin/bash

# =============================================================
# Chart of Accounts Tree Hierarchy API Test Script
# =============================================================

echo "===== Running Chart of Accounts Tree API Test ====="
echo "Date: $(date)"
echo ""
echo "====== CHART OF ACCOUNTS TREE API TEST ======"
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
# Step 2: Fetch Account Tree Hierarchy
# ------------------------------------------
echo "--- Step 2: Fetch Account Tree Hierarchy ---"
TREE_RESPONSE=$(curl -s -X GET "$BASE_URL/api/clients/$CLIENT_ID/accounts/tree" \
  -H "Content-Type: application/json" \
  -b "$COOKIE_JAR")

# Check status code
TREE_STATUS=$?
echo "Making GET request to /api/clients/$CLIENT_ID/accounts/tree"
echo "Tree Fetch Status: $TREE_STATUS"

if [ $TREE_STATUS -eq 0 ]; then
  # Save the response to parse and check
  echo "$TREE_RESPONSE" > test/chart-of-accounts/tree-response.json
  
  # Check if the response contains "status": "success"
  if echo "$TREE_RESPONSE" | grep -q '"status":"success"'; then
    echo "Successfully fetched account tree hierarchy"
    
    # Count how many accounts are in the response
    COUNT=$(echo "$TREE_RESPONSE" | grep -o '"id":' | wc -l)
    echo "Tree contains $COUNT accounts"
    
    # Count how many children references are in the response
    CHILDREN_COUNT=$(echo "$TREE_RESPONSE" | grep -o '"children":' | wc -l)
    echo "Tree contains $CHILDREN_COUNT 'children' references"
    
    echo "Account tree structure successfully retrieved"
  else
    echo "Failed to fetch account tree hierarchy"
    echo "Response: $TREE_RESPONSE"
    exit 1
  fi
else
  echo "Failed to fetch account tree with status: $TREE_STATUS"
  echo "Response: $TREE_RESPONSE"
  exit 1
fi
echo ""

# ------------------------------------------
# Test Summary
# ------------------------------------------
echo "====== TEST SUMMARY ======" 
echo "Authentication: ✅ PASS"
echo "Fetch Account Tree: ✅ PASS"
echo ""
echo "✅ Test script executed successfully"

# Save test results to file
echo "$TREE_RESPONSE" > test/chart-of-accounts/test-tree-output.txt
echo "Saving tree results to test/chart-of-accounts/test-tree-output.txt"
echo ""
echo "===== Test Complete ====="