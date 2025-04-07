#!/bin/bash

# Log file
LOG_FILE="verification-logs/api-verification.log"
echo "===== API VERIFICATION: CHART OF ACCOUNTS =====" > $LOG_FILE
echo "Start time: $(date)" >> $LOG_FILE
echo "" >> $LOG_FILE

# Login and get cookies
echo "Step 1: Logging in to get authentication cookies..." >> $LOG_FILE
# Read credentials from .auth-credentials
USERNAME=$(grep "username:" .auth-credentials | cut -d' ' -f2)
PASSWORD=$(grep "password:" .auth-credentials | cut -d' ' -f2)

echo "Using credentials: $USERNAME / $PASSWORD" >> $LOG_FILE

LOGIN_RESPONSE=$(curl -s -c verification-logs/cookies.txt -X POST \
  -H "Content-Type: application/json" \
  -d "{\"username\":\"$USERNAME\",\"password\":\"$PASSWORD\"}" \
  http://localhost:5000/api/auth/login)

echo "Login response: $LOGIN_RESPONSE" >> $LOG_FILE
echo "" >> $LOG_FILE

# Check test client (ID 100) flat accounts
echo "Step 2: Checking Test Client (ID 100) flat accounts..." >> $LOG_FILE
CLIENT_100_RESPONSE=$(curl -s -b verification-logs/cookies.txt \
  http://localhost:5000/api/clients/100/accounts)

# Save response to file
echo "$CLIENT_100_RESPONSE" > verification-logs/client-100-accounts.json

# Count accounts in response
CLIENT_100_COUNT=$(echo "$CLIENT_100_RESPONSE" | grep -o '"id":' | wc -l)
echo "Found $CLIENT_100_COUNT accounts for Client 100" >> $LOG_FILE
echo "" >> $LOG_FILE

# Check test client (ID 100) tree structure
echo "Step 3: Checking Test Client (ID 100) tree structure..." >> $LOG_FILE
CLIENT_100_TREE=$(curl -s -b verification-logs/cookies.txt \
  http://localhost:5000/api/clients/100/accounts/tree)

# Save tree response to file
echo "$CLIENT_100_TREE" > verification-logs/client-100-tree.json

# Count top-level accounts in tree
CLIENT_100_TREE_COUNT=$(echo "$CLIENT_100_TREE" | grep -o '"id":' | wc -l)
echo "Found approximately $CLIENT_100_TREE_COUNT nodes in tree for Client 100" >> $LOG_FILE
echo "" >> $LOG_FILE

# Check if account_code is present in the response
echo "Step 4: Checking for accountCode field in response..." >> $LOG_FILE
ACCOUNT_CODE_COUNT=$(echo "$CLIENT_100_RESPONSE" | grep -o '"accountCode":' | wc -l)
CODE_COUNT=$(echo "$CLIENT_100_RESPONSE" | grep -o '"code":' | wc -l)

echo "Found $ACCOUNT_CODE_COUNT 'accountCode' fields and $CODE_COUNT 'code' fields in Client 100 response" >> $LOG_FILE
echo "" >> $LOG_FILE

# Check existing client (ID 1) flat accounts
echo "Step 5: Checking Existing Client (ID 1) flat accounts..." >> $LOG_FILE
CLIENT_1_RESPONSE=$(curl -s -b verification-logs/cookies.txt \
  http://localhost:5000/api/clients/1/accounts)

# Save response to file
echo "$CLIENT_1_RESPONSE" > verification-logs/client-1-accounts.json

# Count accounts in response
CLIENT_1_COUNT=$(echo "$CLIENT_1_RESPONSE" | grep -o '"id":' | wc -l)
echo "Found $CLIENT_1_COUNT accounts for Client 1" >> $LOG_FILE
echo "" >> $LOG_FILE

# Check existing client (ID 1) tree structure
echo "Step 6: Checking Existing Client (ID 1) tree structure..." >> $LOG_FILE
CLIENT_1_TREE=$(curl -s -b verification-logs/cookies.txt \
  http://localhost:5000/api/clients/1/accounts/tree)

# Save tree response to file
echo "$CLIENT_1_TREE" > verification-logs/client-1-tree.json

# Count top-level accounts in tree
CLIENT_1_TREE_COUNT=$(echo "$CLIENT_1_TREE" | grep -o '"id":' | wc -l)
echo "Found approximately $CLIENT_1_TREE_COUNT nodes in tree for Client 1" >> $LOG_FILE
echo "" >> $LOG_FILE

# Summary
echo "======= API VERIFICATION SUMMARY =======" >> $LOG_FILE
echo "" >> $LOG_FILE

# Test Client (ID 100) results
if [ $CLIENT_100_COUNT -gt 0 ] && [ $CLIENT_100_TREE_COUNT -gt 0 ]; then
  echo "Test Client (ID 100): PASS - API returns data" >> $LOG_FILE
else
  echo "Test Client (ID 100): FAIL - API does not return proper data" >> $LOG_FILE
fi

# Existing Client (ID 1) results
if [ $CLIENT_1_COUNT -gt 0 ] && [ $CLIENT_1_TREE_COUNT -gt 0 ]; then
  echo "Existing Client (ID 1): PASS - API returns data" >> $LOG_FILE
else
  echo "Existing Client (ID 1): FAIL - API does not return proper data" >> $LOG_FILE
fi

# Field check results
if [ $ACCOUNT_CODE_COUNT -gt 0 ]; then
  echo "Field Verification: PASS - 'accountCode' field is present in API response" >> $LOG_FILE
else
  if [ $CODE_COUNT -gt 0 ]; then
    echo "Field Verification: PARTIAL PASS - 'code' field is present but not 'accountCode'" >> $LOG_FILE
  else
    echo "Field Verification: FAIL - Neither 'accountCode' nor 'code' fields are present" >> $LOG_FILE
  fi
fi

echo "" >> $LOG_FILE
echo "API Verification completed at $(date)" >> $LOG_FILE