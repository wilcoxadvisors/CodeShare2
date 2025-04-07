# Database Cleanup Plan

## Overview
This document outlines the plan for maintaining a clean and efficient database by regularly removing test data while preserving essential system and reference data.

## Regular Cleanup Schedule
1. **Daily**: Run automated cleanup of journal entry temporary data
2. **Weekly**: Run `cleanup-test-data.ts` script to remove recently created test clients
3. **Monthly**: Perform comprehensive cleanup of all test data and check database health

## Preserved Test Data
The following test clients and their associated data will always be preserved:
- Client ID 1: Used for core system testing
- Client ID 2: Used for account relationships testing
- Client ID 7: Used for consolidation group testing

## Identification of Test Data
Test data is identified by:
1. Naming patterns such as "Test", "Demo", "Sample", etc.
2. Creation date (data created for testing and older than 30 days)
3. Specific metadata flags set during test data creation

## Cleanup Process
The cleanup process follows these steps:
1. Identify test clients and entities to delete
2. Follow a careful deletion order respecting foreign key constraints:
   - Delete dependent records first (journal entries, account relationships, etc.)
   - Delete primary records last (clients, entities)
3. Log all deletion operations for audit purposes
4. Generate a report of the cleanup results

## Cleanup Tools
1. **Primary Tool**: `scripts/cleanup-test-data.ts`
   - Comprehensive TypeScript script that safely removes all test data
   - Configurable to preserve specific test clients
   - Transaction-based to ensure consistency

2. **Supplementary Tools**:
   - `cleanup-admin-entities.ts`: For managing Admin client data
   - `cleanup-clients.js`: For more selective client cleanup

## Execution Safeguards
1. Always run cleanup scripts in test environment first
2. Ensure database backups are created before running cleanup in production
3. Use transactions to ensure atomicity of cleanup operations
4. Implement dry-run mode to preview cleanup actions before execution

## Monitoring and Reporting
1. Track database size before and after cleanup
2. Log all cleanup operations in `cleanup_log.md`
3. Monthly database health report including:
   - Total clients and entities
   - Percentage of test vs. production data
   - Identified anomalies or orphaned records

## Future Improvements
1. Implement a UI-based cleanup dashboard for administrators
2. Add more granular controls for test data identification
3. Enhance cleanup performance for larger datasets
4. Implement data archiving for historical test data preservation
