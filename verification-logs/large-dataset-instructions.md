# Large Dataset Upload Instructions

## File Structure Requirements
- CSV format with the following headers:
  - date: YYYY-MM-DD format
  - reference_number: Unique identifier for the journal entry
  - description: Description of the journal entry
  - journal_type: JE (General Journal), AJ (Adjusting Journal), SJ (Statistical Journal), CL (Closing Journal)
  - entity_code: Code of the entity this entry belongs to
  - account_code: Account code from the Chart of Accounts
  - type: 'debit' or 'credit'
  - amount: Decimal number (e.g., 1000.00)
  - line_description: Description for this specific line
  - fsli_bucket: Financial Statement Line Item bucket
  - internal_reporting_bucket: Internal reporting categorization
  - item: Additional categorization detail

## Import Validation Criteria
1. Each journal entry (identified by reference_number) must balance (debits = credits)
2. All account codes must exist in the Chart of Accounts
3. All entity codes must exist
4. Dates must be valid
5. Types must be either 'debit' or 'credit'
6. Amounts must be positive numbers

## Processing Large Datasets
For datasets with 100,000+ lines:
1. Split the file into smaller batches of 5,000 lines each
2. Upload batches sequentially
3. Use the batch status endpoint to monitor progress
4. Each batch will be validated before processing

## Example Usage with curl
```bash
curl -X POST "http://localhost:5000/api/journal-entries/batch-upload" \
  -H "Cookie: connect.sid=s%3AKkBMfEMWs2Yg-QY9iMbg670tM409dQBl.T%2Bfjo%2B2595ocXZfFWHmFPjBxtUAk7I0p9J9UKbhiZRI" \
  -F "file=@path/to/your/file.csv" \
  -F "clientId=134" \
  -F "batchSize=5000"
```

An example template file has been generated at /home/runner/workspace/verification-logs/large-dataset-template.csv
