# Chart of Accounts Import/Export Test Results

**Test Date:** 2025-04-07T03:09:13.659Z
**Duration:** 2.862 seconds

## Summary

* **Total Tests:** 8
* **Passed:** 4
* **Failed:** 4

## Detailed Results

### 1. Add New Accounts via CSV

**Status:** ✅ PASSED

**Details:**

* ✅ Added account found: 9100
* ✅ Added account found: 9110
* ✅ Added account found: 9200

### 2. Modify Existing Accounts via CSV

**Status:** ❌ FAILED

**Details:**

* ✅ Account modified: 1110 (Cash (Mixed) -> Cash (Modified))
* ❌ Account not modified as expected: 1120

### 3. Mixed Operations via CSV

**Status:** ✅ PASSED

**Details:**

* ✅ Added account found: 9300
* ✅ Added account found: 9310
* ✅ Account modified: 1110 (Cash (Modified) -> Cash (Mixed))

### 4. Add New Accounts via Excel

**Status:** ✅ PASSED

**Details:**

* ✅ Added account found: 9500
* ✅ Added account found: 9510
* ✅ Added account found: 9600

### 5. Modify Existing Accounts via Excel

**Status:** ❌ FAILED

**Details:**

* ❌ Account not modified as expected: 1130
* ❌ Account not modified as expected: 1140

### 6. Mixed Operations via Excel

**Status:** ❌ FAILED

**Details:**

* ✅ Added account found: 9700
* ✅ Added account found: 9710
* ❌ Account not modified as expected: 1150

### 7. Error Handling - Duplicate Account Codes

**Status:** ✅ PASSED

**Details:**

* Successfully detected duplicate account codes error: {"message":"Error importing accounts: A conflict occurred: error: duplicate key value violates unique constraint \"account_code_client_unique\""}

### 8. Error Handling - Invalid Parent Codes

**Status:** ❌ FAILED

**Details:**

* Failed to detect invalid parent code

