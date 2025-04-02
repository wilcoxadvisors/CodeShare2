    return rootAccounts;
  }
  
  // Implementation for Chart of Accounts export
  async getAccountsForClient(clientId: number): Promise<Account[]> {
    // We can reuse the getAccounts method as it already fetches accounts by clientId
    return this.getAccounts(clientId);
  }
  
  // Implementation for Chart of Accounts import
  async generateCoaImportPreview(clientId: number, fileBuffer: Buffer, fileName: string): Promise<ImportPreview> {
    console.log(`Generating Chart of Accounts import preview. Client ID: ${clientId}`);
    
    const preview: ImportPreview = {
      changes: [],
      totalChanges: 0,
      totalAdds: 0,
      totalUpdates: 0,
      totalRemoves: 0,
      totalUnchanged: 0,
      accountsWithTransactions: 0
    };
    
    return await db.transaction(async (tx) => {
      try {
        // ==================== STEP 1: Parse the file ====================
        let rows: any[] = [];
        
        try {
          // Determine if this is an Excel file or CSV based on file extension
          const isExcel = fileName && (fileName.endsWith('.xlsx') || fileName.endsWith('.xls'));
          
          if (isExcel) {
            // Process Excel file
            const XLSX = await import('xlsx');
            const workbook = XLSX.read(fileBuffer, { type: 'buffer' });
            const sheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[sheetName];
            
            // Convert to JSON with header option
            const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
            
            // Extract headers and transform them
            if (jsonData.length < 2) {
              throw new Error('Excel file is empty or missing data rows');
            }
            
            const headers = (jsonData[0] as string[]).map(header => 
              header ? this.normalizeHeaderField(header) : '');
            
            // Process data rows (skip header row)
            rows = jsonData.slice(1).map(row => {
              const rowData: any = {};
              (row as any[]).forEach((cell, index) => {
                if (index < headers.length && headers[index]) {
                  rowData[headers[index]] = cell;
                }
              });
              return rowData;
            });
          } else {
            // Process CSV file
            const csvParser = await import('csv-parser');
            const { Readable } = await import('stream');
            
            // Create in-memory stream from buffer
            const bufferStream = new Readable();
            bufferStream.push(fileBuffer);
            bufferStream.push(null);
            
            // Parse CSV
            const results: any[] = [];
            
            await new Promise<void>((resolve, reject) => {
              bufferStream
                .pipe(csvParser({
                  mapHeaders: ({ header }: { header: string }) => this.normalizeHeaderField(header)
                }))
                .on('data', (data: any) => results.push(data))
                .on('end', () => resolve())
                .on('error', (error: Error) => reject(error));
            });
            
            rows = results;
          }
        } catch (error: any) {
          console.error('Error parsing import file', error);
          throw new Error(`Error parsing file: ${error.message}`);
        }
        
        if (rows.length === 0) {
          throw new Error('No data rows found in the imported file');
        }
        
        // ==================== STEP 2: Get existing accounts for this client ====================
        const existingAccounts = await this.getAccounts(clientId);
        
        // Create lookup maps for more efficient processing
        const existingCodeMap = new Map<string, Account>();
        const existingIdMap = new Map<number, Account>();
        
        // Map for faster lookups - storing lowercase codes for case-insensitive matching
        for (const account of existingAccounts) {
          existingCodeMap.set(account.accountCode.toLowerCase(), account);
          existingIdMap.set(account.id, account);
        }
        
        // ==================== STEP 3: Batch query for accounts with transactions ====================
        // Efficiently query which accounts have transactions
        const accountsWithTransactions = new Set<number>();
        
        if (existingAccounts.length > 0) {
          const accountIds = existingAccounts.map(a => a.id);
          
          // Split into chunks of 500 to avoid query size limitations
          const chunkSize = 500;
          for (let i = 0; i < accountIds.length; i += chunkSize) {
            const chunk = accountIds.slice(i, i + chunkSize);
            
            const transactionCounts = await tx
              .select({
                accountId: journalEntryLines.accountId,
                count: count()
              })
              .from(journalEntryLines)
              .where(inArray(journalEntryLines.accountId, chunk))
              .groupBy(journalEntryLines.accountId)
              .having(gt(count(), 0))
              .execute();
            
            transactionCounts.forEach(item => {
              accountsWithTransactions.add(item.accountId);
            });
          }
        }
        
        preview.accountsWithTransactions = accountsWithTransactions.size;
        
        // ==================== STEP 4: Process import data ====================
        // Track account codes seen in the import file
        const importedCodes = new Set<string>();
        let processedCount = 0;
        
        // Process each row in the import file
        for (const row of rows) {
          processedCount++;
          
          // Extract account code from the row (required field)
          const accountCode = this.getCaseInsensitiveValue(row, 'accountCode') || 
                             this.getCaseInsensitiveValue(row, 'accountcode') || 
                             this.getCaseInsensitiveValue(row, 'account_code') ||
                             this.getCaseInsensitiveValue(row, 'code'); // Legacy support
          
          if (!accountCode) {
            // Skip rows without account code
            continue;
          }
          
          // Add to set of imported codes
          importedCodes.add(accountCode.toLowerCase());
          
          // Check if account already exists (case insensitive)
          const existingAccount = existingCodeMap.get(accountCode.toLowerCase());
          
          // Get account name (required field)
          const accountName = this.getCaseInsensitiveValue(row, 'name') || 
                             this.getCaseInsensitiveValue(row, 'accountname') || 
                             this.getCaseInsensitiveValue(row, 'account_name');
          
          if (!accountName) {
            // Skip rows without account name
            continue;
          }
          
          // Get account type (required field) and normalize it
          const accountType = this.getCaseInsensitiveValue(row, 'type') || 
                             this.getCaseInsensitiveValue(row, 'accounttype') || 
                             this.getCaseInsensitiveValue(row, 'account_type');
          
          if (!accountType) {
            // Skip rows without account type
            continue;
          }
          
          // Normalize the account type
          const normalizedType = this.normalizeAccountType(accountType);
          
          // If it's not a valid type, skip this account
          if (!normalizedType) {
            continue;
          }
          
          // Extract parent code if present
          const parentCode = this.getCaseInsensitiveValue(row, 'parentcode') || 
                           this.getCaseInsensitiveValue(row, 'parent_code') || 
                           this.getCaseInsensitiveValue(row, 'parent');
          
          // Create change record
          const change: ImportAccountChange = {
            code: accountCode,
            changeType: existingAccount ? 'update' : 'add',
          };
          
          if (existingAccount) {
            change.id = existingAccount.id;
            change.existingName = existingAccount.name;
            change.existingType = existingAccount.type;
            change.existingSubtype = existingAccount.subtype;
            change.existingDescription = existingAccount.description;
            change.existingIsSubledger = existingAccount.isSubledger;
            change.existingSubledgerType = existingAccount.subledgerType;
            
            // Lookup parent code if existingAccount has parentId
            if (existingAccount.parentId) {
              const parentAccount = existingIdMap.get(existingAccount.parentId);
              if (parentAccount) {
                change.existingParentCode = parentAccount.accountCode;
              }
            }
            
            // Check if account has transactions
            if (existingAccount.id && accountsWithTransactions.has(existingAccount.id)) {
              change.hasTransactions = true;
            }
            
            // Add new values
            change.newName = accountName;
            change.newType = normalizedType as string;
            change.newSubtype = this.getCaseInsensitiveValue(row, 'subtype') || existingAccount.subtype;
            change.newDescription = this.getCaseInsensitiveValue(row, 'description') || existingAccount.description;
            change.newIsSubledger = this.parseIsSubledger(row, existingAccount);
            change.newSubledgerType = this.getSubledgerType(row, existingAccount);
            change.newParentCode = parentCode;
            
            // Check if anything changed
            if (
              change.existingName === change.newName &&
              change.existingType === change.newType &&
              change.existingSubtype === change.newSubtype &&
              change.existingDescription === change.newDescription &&
              change.existingIsSubledger === change.newIsSubledger &&
              change.existingSubledgerType === change.newSubledgerType &&
              change.existingParentCode === change.newParentCode
            ) {
              change.changeType = 'unchanged';
              preview.totalUnchanged++;
            } else {
              preview.totalUpdates++;
            }
          } else {
            // New account
            change.newName = accountName;
            change.newType = normalizedType as string;
            change.newSubtype = this.getCaseInsensitiveValue(row, 'subtype');
            change.newDescription = this.getCaseInsensitiveValue(row, 'description');
            change.newIsSubledger = this.parseIsSubledger(row);
            change.newSubledgerType = this.getSubledgerType(row);
            change.newParentCode = parentCode;
            preview.totalAdds++;
          }
          
          preview.changes.push(change);
        }
        
        // Identify accounts missing from import for potential deactivation
        for (const account of existingAccounts) {
          if (!importedCodes.has(account.accountCode.toLowerCase()) && account.active) {
            const hasTransactions = account.id && accountsWithTransactions.has(account.id);
            
            preview.changes.push({
              id: account.id,
              accountCode: account.accountCode,
              existingName: account.name,
              existingType: account.type,
              existingSubtype: account.subtype,
              existingDescription: account.description,
              existingIsSubledger: account.isSubledger,
              existingSubledgerType: account.subledgerType,
              changeType: 'remove',
              hasTransactions
            });
            
            preview.totalRemoves++;
          }
        }
        
        preview.totalChanges = preview.totalAdds + preview.totalUpdates + preview.totalRemoves;
        
        return preview;
      } catch (error: any) {
        console.error("Error generating import preview:", error);
        throw error;
      }
    });
  }
  
  async importCoaForClient(clientId: number, fileBuffer: Buffer, fileName?: string, selections?: ImportSelections | null): Promise<ImportResult> {
    const result: ImportResult = {
      count: 0,     // Total accounts processed
      added: 0,     // New accounts added
      updated: 0,   // Existing accounts updated
      unchanged: 0, // Existing accounts unchanged
      skipped: 0,   // Accounts skipped (validation failure)
      inactive: 0,  // Accounts marked inactive
      deleted: 0,   // Accounts that were deleted
      errors: [],   // Error messages
      warnings: []  // Warning messages
    };
    
    return await db.transaction(async (tx) => {
      try {
        // ==================== STEP 1: Parse the file ====================
        let rows: any[] = [];
        console.log(`Parsing file for Chart of Accounts import. Client ID: ${clientId}`);
        
        try {
          // Determine if this is an Excel file or CSV based on file extension
          const isExcel = fileName && (fileName.endsWith('.xlsx') || fileName.endsWith('.xls'));
          
          if (isExcel) {
            // Process Excel file
            const XLSX = await import('xlsx');
            const workbook = XLSX.read(fileBuffer, { type: 'buffer' });
            const sheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[sheetName];
            
            // Convert to JSON with header option
            const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
            
            // Extract headers and transform them
            if (jsonData.length < 2) {
              result.errors.push('Excel file is empty or missing data rows');
              return result;
            }
            
            const headers = (jsonData[0] as string[]).map(header => 
              header ? this.normalizeHeaderField(header) : '');
            
            // Process data rows (skip header row)
            rows = jsonData.slice(1).map(row => {
              const rowData: any = {};
              (row as any[]).forEach((cell, index) => {
                if (index < headers.length && headers[index]) {
                  rowData[headers[index]] = cell;
                }
              });
              return rowData;
            });
          } else {
            // Parse CSV from buffer
            const csvContent = fileBuffer.toString('utf-8');
            const Papa = await import('papaparse');
            const parseResult = Papa.default.parse(csvContent, {
              header: true,
              skipEmptyLines: true,
              transformHeader: (header: string) => this.normalizeHeaderField(header)
            });
          
            if (parseResult.errors && parseResult.errors.length > 0) {
              for (const error of parseResult.errors) {
                result.errors.push(`CSV parsing error at row ${error.row}: ${error.message}`);
              }
              return result;
            }
            
            rows = parseResult.data as any[];
          }
        } catch (parseError: any) {
          result.errors.push(`File parsing error: ${parseError.message}`);
          return result;
        }
        
        // ==================== STEP 2: Validate and normalize rows ====================
        if (!rows || rows.length === 0) {
          result.errors.push('No accounts found in the imported file');
          return result;
        }
        
        // Process each row to normalize field names and handle case sensitivity
        rows = this.normalizeImportRows(rows);
        console.log(`Normalized ${rows.length} rows from imported file`);
        
        // Pre-validate rows to filter out any with missing required fields
        const validRows: any[] = [];
        const accountCodesInImport = new Set<string>();
        
        for (const row of rows) {
          // Check for accountCode first, then fall back to 'code' for backward compatibility
          const code = this.getCaseInsensitiveValue(row, 'accountCode') || 
                       this.getCaseInsensitiveValue(row, 'account_code') || 
                       this.getCaseInsensitiveValue(row, 'accountcode') || 
                       this.getCaseInsensitiveValue(row, 'code'); // Legacy support
          const name = this.getCaseInsensitiveValue(row, 'name');
          const type = this.getCaseInsensitiveValue(row, 'type');
          
          if (!code || !name || !type) {
            result.skipped++;
            continue;
          }
          
          // Standardize the accountCode format (trim and store original case)
          const trimmedCode = code.trim();
          row.accountCode = trimmedCode;
          
          // Track unique account codes to identify duplicates in the import file
          const lowerCode = trimmedCode.toLowerCase();
          if (accountCodesInImport.has(lowerCode)) {
            result.warnings.push(`Duplicate account code in import: ${trimmedCode}. Only the first entry will be processed.`);
            result.skipped++;
            continue;
          }
          
          accountCodesInImport.add(lowerCode);
          validRows.push(row);
        }
        
        if (validRows.length === 0) {
          result.errors.push('No valid accounts found in the file after filtering rows with missing required fields');
          return result;
        }
        
        console.log(`Found ${validRows.length} valid rows after filtering`);
        
        // ==================== STEP 3: Retrieve existing accounts efficiently ====================
        // Get existing accounts to check for duplicates - do this ONCE to avoid multiple DB queries
        const existingAccounts = await tx
          .select()
          .from(accounts)
          .where(eq(accounts.clientId, clientId))
          .execute();
        
        console.log(`Found ${existingAccounts.length} existing accounts for client ${clientId}`);
        
        // Create lookup maps for efficient access
        const existingCodeMap = new Map<string, Account>();
        const existingIdMap = new Map<number, Account>();
        const codeToIdMap = new Map<string, number>();
        
        // Map for faster lookups - storing lowercase codes for case-insensitive matching
        for (const account of existingAccounts) {
          existingCodeMap.set(account.accountCode.toLowerCase(), account);
          existingIdMap.set(account.id, account);
          codeToIdMap.set(account.accountCode, account.id);
          // Also map lowercase for more robust matching later
          codeToIdMap.set(account.accountCode.toLowerCase(), account.id);
        }
        
        // ==================== STEP 4: Batch query for accounts with transactions ====================
        // Efficiently query which accounts have transactions in one go
        const accountsWithTransactions = new Set<number>();
        
        if (existingAccounts.length > 0) {
          const accountIds = existingAccounts.map(a => a.id);
          
          // Split into chunks of 500 to avoid query size limitations
          const chunkSize = 500;
          for (let i = 0; i < accountIds.length; i += chunkSize) {
            const chunk = accountIds.slice(i, i + chunkSize);
            
            const transactionCounts = await tx
              .select({
                accountId: journalEntryLines.accountId,
                count: count()
              })
              .from(journalEntryLines)
              .where(inArray(journalEntryLines.accountId, chunk))
              .groupBy(journalEntryLines.accountId)
              .having(gt(count(), 0))
              .execute();
            
            transactionCounts.forEach(item => {
              accountsWithTransactions.add(item.accountId);
            });
          }
        }
        
        console.log(`Found ${accountsWithTransactions.size} accounts with transactions`);
        
        // ==================== STEP 5: First pass - create/update accounts ====================
        // Prepare collections for batch operations
        const accountsToCreate: InsertAccount[] = [];
        const accountsToUpdate: { id: number, data: Partial<Account> }[] = [];
        const newAccountCodeToRow = new Map<string, any>();
        
        for (const row of validRows) {
          try {
            const accountCode = row.accountCode;
            const accountName = this.getCaseInsensitiveValue(row, 'name')?.trim();
            const accountTypeRaw = this.getCaseInsensitiveValue(row, 'type');
            
            // Normalize account type to match enum
            let normalizedType;
            try {
              normalizedType = this.normalizeAccountType(accountTypeRaw);
            } catch (typeError: any) {
              result.errors.push(`Account ${accountCode}: ${typeError.message}`);
              result.skipped++;
              continue;
            }
            
            // Check if the account already exists using various matching strategies:
            // 1. First try to match by accountId if provided in the import file
            // 2. Then try to match by accountCode (case-insensitive)
            let existingAccount = null;
            
            // If the import file includes account IDs, try to match by ID first
            if (row.id) {
              const accountId = parseInt(row.id, 10);
              if (!isNaN(accountId) && accountId > 0) {
                existingAccount = existingIdMap.get(accountId);
                if (existingAccount) {
                  console.log(`Found existing account by ID: ${accountId}, code: ${existingAccount.accountCode}`);
                }
              }
            }
            
            // If we didn't find by ID, try to match by accountCode (case-insensitive)
            if (!existingAccount) {
              existingAccount = existingCodeMap.get(accountCode.toLowerCase());
              if (existingAccount) {
                console.log(`Found existing account by code: ${accountCode.toLowerCase()}`);
              }
            }
            
            const isActiveInImport = this.parseIsActive(row, true);
            
            if (existingAccount) {
              // Check if there are selections and this account should be skipped
              if (selections && selections.excludedCodes && selections.excludedCodes.includes(accountCode)) {
                result.skipped++;
                result.count++;
                continue;
              }
              
              // Skip updates if selections specify not to update
              if (selections && selections.updateStrategy === 'none') {
                result.unchanged++;
                result.count++;
                continue;
              }
              
              // If selections specify to update only selected accounts and this account is not included
              if (selections && 
                  selections.updateStrategy === 'selected' && 
                  selections.includedCodes && 
                  !selections.includedCodes.includes(accountCode)) {
                result.unchanged++;
                result.count++;
                continue;
              }
              
              // Check if this account has transactions using our pre-computed set
              const hasTransactions = accountsWithTransactions.has(existingAccount.id);
              
              // Handle active status changes
              if (!isActiveInImport && existingAccount.active) {
                // Mark as inactive
                accountsToUpdate.push({
                  id: existingAccount.id,
                  data: { active: false }
                });
                result.inactive++;
                result.warnings.push(`Account ${accountCode} (${accountName}) has been marked inactive`);
                result.count++;
                continue;
              } else if (!existingAccount.active && isActiveInImport) {
                // Reactivate the account
                accountsToUpdate.push({
                  id: existingAccount.id,
                  data: { active: true }
                });
                result.updated++;
                result.count++;
                continue;
              }
              
              // For accounts with transactions, be very selective about updates
              if (hasTransactions) {
                const typeChanged = normalizedType !== existingAccount.type;
                
                if (typeChanged) {
                  result.warnings.push(`Account ${accountCode} (${accountName}) has transactions and its type cannot be changed`);
                  result.unchanged++;
                  result.count++;
                  continue;
                }
                
                // Only update non-critical fields for accounts with transactions
                const safeUpdate = {
                  name: accountName,
                  description: this.getCaseInsensitiveValue(row, 'description') || existingAccount.description,
                };
                
                // Check if there are actual changes
                const nameChanged = safeUpdate.name !== existingAccount.name;
                const descChanged = safeUpdate.description !== existingAccount.description;
                
                if (nameChanged || descChanged) {
                  accountsToUpdate.push({
                    id: existingAccount.id,
                    data: safeUpdate
                  });
                  result.updated++;
                  result.warnings.push(`Account ${accountCode} has transactions - only name and description were updated`);
                } else {
                  result.unchanged++;
                }
              } else {
                // For accounts without transactions, we can update more fields
                const updateData = {
                  // Allow updating the accountCode itself if changed
                  accountCode: accountCode !== existingAccount.accountCode ? accountCode : existingAccount.accountCode,
                  name: accountName,
                  type: normalizedType as AccountType,
                  subtype: this.getCaseInsensitiveValue(row, 'subtype') || existingAccount.subtype,
                  description: this.getCaseInsensitiveValue(row, 'description') || existingAccount.description,
                  isSubledger: this.parseIsSubledger(row, existingAccount),
                  subledgerType: this.getSubledgerType(row, existingAccount),
                };
                
                // Check if anything actually changed before updating
                const hasChanges = 
                  updateData.accountCode !== existingAccount.accountCode ||
                  updateData.name !== existingAccount.name ||
                  updateData.type !== existingAccount.type ||
                  updateData.subtype !== existingAccount.subtype ||
                  updateData.description !== existingAccount.description ||
                  updateData.isSubledger !== existingAccount.isSubledger ||
                  updateData.subledgerType !== existingAccount.subledgerType;
                
                if (hasChanges) {
                  accountsToUpdate.push({
                    id: existingAccount.id,
                    data: updateData
                  });
                  result.updated++;
                } else {
                  result.unchanged++;
                }
              }
            } else {
              // If selections specify not to add new accounts, skip
              if (selections && selections.updateStrategy === 'none') {
                result.skipped++;
                continue;
              }
              
              // If selections specify to only add selected accounts and this one is not included
              if (selections && 
                  selections.updateStrategy === 'selected' && 
                  selections.includedCodes && 
                  !selections.includedCodes.includes(accountCode)) {
                result.skipped++;
                continue;
              }
              
              // Prepare new account for batch creation
              accountsToCreate.push({
                clientId,
                accountCode: accountCode,
                name: accountName,
                type: normalizedType as AccountType,
                subtype: this.getCaseInsensitiveValue(row, 'subtype') || null,
                isSubledger: this.parseIsSubledger(row),
                subledgerType: this.getSubledgerType(row),
                parentId: null, // We'll update this in the second pass
                description: this.getCaseInsensitiveValue(row, 'description') || null,
                active: isActiveInImport
              });
              
              // Store relationship between code and row for parent resolution
              newAccountCodeToRow.set(accountCode.toLowerCase(), row);
              result.added++;
            }
            
            result.count++;
          } catch (error: any) {
            result.errors.push(`Error processing account ${this.getCaseInsensitiveValue(row, 'accountCode') || 'unknown'}: ${error.message || 'Unknown error'}`);
            result.skipped++;
          }
        }
        
        // ==================== STEP 6: Execute batch creations ====================
        console.log(`Preparing to create ${accountsToCreate.length} new accounts`);
        
        // Create accounts in batches to improve performance
        if (accountsToCreate.length > 0) {
          const batchSize = 100;
          const newAccounts: Account[] = [];
          
          for (let i = 0; i < accountsToCreate.length; i += batchSize) {
            const batch = accountsToCreate.slice(i, i + batchSize);
            try {
              const createdBatch = await tx
                .insert(accounts)
                .values(batch)
                .returning();
              
              newAccounts.push(...createdBatch);
            } catch (batchError: any) {
              console.error(`Error creating batch of accounts:`, batchError);
              result.errors.push(`Failed to create some accounts: ${batchError.message}`);
              // Continue with other batches even if one fails
            }
          }
          
          // Add newly created accounts to our lookup maps
          for (const newAccount of newAccounts) {
            codeToIdMap.set(newAccount.accountCode, newAccount.id);
            codeToIdMap.set(newAccount.accountCode.toLowerCase(), newAccount.id); // Add lowercase version too
            existingCodeMap.set(newAccount.accountCode.toLowerCase(), newAccount);
            existingIdMap.set(newAccount.id, newAccount);
          }
          
          console.log(`Successfully created ${newAccounts.length} new accounts`);
        }
        
        // ==================== STEP 7: Execute batch updates ====================
        console.log(`Preparing to update ${accountsToUpdate.length} existing accounts`);
        
        if (accountsToUpdate.length > 0) {
          const batchSize = 100;
          const updatedAccounts: Account[] = [];
          
          for (let i = 0; i < accountsToUpdate.length; i += batchSize) {
            const batch = accountsToUpdate.slice(i, i + batchSize);
            
            // Execute updates individually within the transaction
            for (const update of batch) {
              try {
                console.log(`Updating account ID ${update.id} with data:`, update.data);
                
                // Execute update and return the updated record
                const [updatedAccount] = await tx
                  .update(accounts)
                  .set(update.data)
                  .where(eq(accounts.id, update.id))
                  .returning();
                
                if (updatedAccount) {
                  updatedAccounts.push(updatedAccount);
                  console.log(`Successfully updated account: ${updatedAccount.accountCode} (${updatedAccount.name})`);
                } else {
                  console.warn(`No rows updated for account ID ${update.id}`);
                }
              } catch (updateError: any) {
                console.error(`Error updating account ${update.id}:`, updateError);
                result.errors.push(`Failed to update account with ID ${update.id}: ${updateError.message}`);
              }
            }
          }
          
          console.log(`Successfully updated ${updatedAccounts.length} accounts out of ${accountsToUpdate.length} attempted`);
        }
        
        // ==================== STEP 8: Handle missing accounts ====================
        console.log(`Processing accounts present in database but missing from import file`);
        console.log(`DEBUG: Selections update strategy: ${selections?.updateStrategy || 'all (default)'}`);
        console.log(`DEBUG: Selections remove strategy: ${selections?.removeStrategy || 'inactive (default)'}`);
        
        if (selections?.includedCodes) {
          console.log(`DEBUG: Selected accounts count: ${selections.includedCodes.length}`);
          console.log(`DEBUG: First 5 selected accounts: ${selections.includedCodes.slice(0, 5).join(', ')}`);
        }
        
        // Track account codes in the import file (using a Set for faster lookups)
        const importedAccountCodes = new Set<string>();
        for (const row of validRows) {
          const accountCode = row.accountCode.toLowerCase();
          importedAccountCodes.add(accountCode);
        }
        console.log(`DEBUG: Found ${importedAccountCodes.size} account codes in import file`);
        
        // Find accounts in the database that were not in the import file
        const missingAccounts: number[] = [];
        
        // Determine how to handle accounts not in the import
        // Options:
        // - 'inactive': Mark accounts as inactive (default)
        // - 'delete': Delete accounts (if they don't have transactions)
        // - 'none': Leave accounts unchanged
        const removeStrategy = selections?.removeStrategy || 'inactive'; // Default to 'inactive' if not specified
        
        // If selections specify not to make any updates or removeStrategy is 'none', skip marking accounts
        if ((selections && selections.updateStrategy === 'none') || removeStrategy === 'none') {
          console.log(`Skipping processing of missing accounts due to ${selections?.updateStrategy === 'none' ? 'updateStrategy = none' : 'removeStrategy = none'}`);
        } else {
          console.log(`DEBUG: Starting check for missing accounts from ${existingAccounts.length} existing accounts`);
          let skipInactiveCount = 0;
          let skipImportedCount = 0;
          let skipTransactionsCount = 0;
          let skipNotSelectedCount = 0;
          
          for (const account of existingAccounts) {
            // Skip accounts that are already inactive
            if (!account.active) {
              skipInactiveCount++;
              continue;
            }
            
            const lowerAccountCode = account.accountCode.toLowerCase();
            // Skip if the account was in the import
            if (importedAccountCodes.has(lowerAccountCode)) {
              skipImportedCount++;
              continue;
            }
            
            // Skip accounts with transactions (we don't want to deactivate these)
            if (accountsWithTransactions.has(account.id)) {
              console.log(`Account ${account.accountCode} (${account.name}) has transactions and is missing from import - keeping active`);
              result.warnings.push(`Account ${account.accountCode} (${account.name}) has transactions and is missing from import - keeping active`);
              skipTransactionsCount++;
              continue;
            }
            
            // If selections specify to only update selected accounts and this is not included, skip
            if (selections && 
                selections.updateStrategy === 'selected' &&
                selections.includedCodes) {
              // For missing accounts, we'll skip if this account is not explicitly selected for update
              if (!selections.includedCodes.includes(account.accountCode)) {
                console.log(`Account ${account.accountCode} (${account.name}) is missing from import but not selected for update - keeping active`);
                skipNotSelectedCount++;
                continue;
              }
            }
            
            console.log(`Account ${account.accountCode} (${account.name}) is missing from import file - will mark inactive`);
            missingAccounts.push(account.id);
          }
          
          console.log(`DEBUG: Skipped marking inactive - Already inactive: ${skipInactiveCount}, Present in import: ${skipImportedCount}, Has transactions: ${skipTransactionsCount}, Not selected: ${skipNotSelectedCount}`);
        }
        
        // Process accounts to mark as inactive or delete (accounts that exist in DB but aren't in import)
        console.log(`Found ${missingAccounts.length} accounts missing from import to process with strategy: ${removeStrategy}`);
        
        if (missingAccounts.length > 0) {
          // Skip if removeStrategy is 'none'
          if (removeStrategy === 'none') {
            console.log(`Skipping processing of missing accounts due to removeStrategy = none`);
          } else if (removeStrategy === 'inactive') {
            // Mark accounts as inactive (default behavior)
            for (const accountId of missingAccounts) {
              try {
                // Get the original account data for the log message
                const account = existingIdMap.get(accountId);
                
                // Mark the account as inactive
                await tx
                  .update(accounts)
                  .set({ active: false })
                  .where(eq(accounts.id, accountId));
                
                console.log(`Marked account ${account?.accountCode} (${account?.name}) as inactive`);
                result.inactive++;
                result.count++;
              } catch (inactiveError: any) {
                console.error(`Error marking account ${accountId} as inactive:`, inactiveError);
                result.errors.push(`Failed to mark account ID ${accountId} as inactive: ${inactiveError.message}`);
              }
            }
          } else if (removeStrategy === 'delete') {
            // Delete accounts - only if they don't have transactions or child accounts
            for (const accountId of missingAccounts) {
              try {
                // Get the original account data for the log message
                const account = existingIdMap.get(accountId);
                
                // Check if the account has transactions - don't delete if it does
                if (accountsWithTransactions.has(accountId)) {
                  console.log(`Cannot delete account ${account?.accountCode} (${account?.name}) as it has transactions - marking inactive instead`);
                  result.warnings.push(`Account ${account?.accountCode} (${account?.name}) has transactions and cannot be deleted - marked inactive instead`);
                  
                  // Mark as inactive instead
                  await tx
                    .update(accounts)
                    .set({ active: false })
                    .where(eq(accounts.id, accountId));
                    
                  result.inactive++;
                } else {
                  // Check if this account has any child accounts
                  const childAccounts = await tx
                    .select({ count: count() })
                    .from(accounts)
                    .where(eq(accounts.parentId, accountId));
                  
                  // If there are child accounts, don't allow deletion
                  if (childAccounts[0]?.count > 0) {
                    console.log(`Cannot delete account ${account?.accountCode} (${account?.name}) as it has child accounts - marking inactive instead`);
                    result.warnings.push(`Account ${account?.accountCode} (${account?.name}) has child accounts and cannot be deleted - marked inactive instead`);
                    
                    // Mark as inactive instead
                    await tx
                      .update(accounts)
                      .set({ active: false })
                      .where(eq(accounts.id, accountId));
                      
                    result.inactive++;
                  } else {
                    // Delete the account - it has no transactions and no child accounts
                    await tx
                      .delete(accounts)
                      .where(eq(accounts.id, accountId));
                    
                    console.log(`Deleted account ${account?.accountCode} (${account?.name})`);
                    result.deleted++; // Track accounts that were actually deleted
                  }
                }
                
                result.count++;
              } catch (deleteError: any) {
                console.error(`Error processing account ${accountId} for deletion:`, deleteError);
                result.errors.push(`Failed to process account ID ${accountId} for deletion: ${deleteError.message}`);
              }
            }
          }
        }
        
        // ==================== STEP 9: Second pass - parent-child relationships ====================
        console.log(`Processing parent-child relationships`);
        
        // Skip parent relationship processing if selections specify not to make updates
        if (selections && selections.updateStrategy === 'none') {
          console.log('Skipping parent relationship processing due to updateStrategy = none');
          return result;
        }
        
        // First gather all parent relationships to resolve
        const parentUpdates: { accountId: number, parentId: number, accountCode: string, parentCode: string }[] = [];
        
        // Process existing accounts that may need parent updates
        for (const row of validRows) {
          try {
            const accountCode = row.accountCode;
            const lowerAccountCode = accountCode.toLowerCase();
            
            // If selections specify to only update selected accounts and this is not included, skip
            if (selections && 
                selections.updateStrategy === 'selected' && 
                selections.includedCodes && 
                !selections.includedCodes.includes(accountCode)) {
              continue;
            }
            
            // If this is a new account or an existing one that doesn't have transactions
            const accountId = codeToIdMap.get(lowerAccountCode);
            if (!accountId) continue; // Skip if account wasn't successfully created/found
            
            // Skip accounts with transactions since we don't update parent relationships for those
            if (accountsWithTransactions.has(accountId)) continue;
            
            // Extract parent code with comprehensive case-insensitive handling
            const parentCode = this.getParentCode(row);
            if (!parentCode) continue; // No parent specified
            
            const lowerParentCode = parentCode.toLowerCase();
            
            // Get the parent ID, trying different case variations
            const parentId = codeToIdMap.get(parentCode) || codeToIdMap.get(lowerParentCode);
            
            if (!parentId) {
              result.warnings.push(`Cannot establish parent relationship: Parent account ${parentCode} not found for ${accountCode}`);
              continue;
            }
            
            // Don't allow self-referencing parent
            if (accountId === parentId) {
              result.warnings.push(`Account ${accountCode} cannot be its own parent`);
              continue;
            }
            
            // Check for circular references
            let potentialParentId = parentId;
            let isCircular = false;
            const visited = new Set<number>();
            
            while (potentialParentId) {
              if (visited.has(potentialParentId)) {
                isCircular = true;
                break;
              }
              
              visited.add(potentialParentId);
              
              const parent = existingIdMap.get(potentialParentId);
              potentialParentId = parent?.parentId || null;
              
              // Would this create a circular reference?
              if (potentialParentId === accountId) {
                isCircular = true;
                break;
              }
            }
            
            if (isCircular) {
              result.warnings.push(`Cannot set parent for ${accountCode}: Would create a circular reference`);
              continue;
            }
            
            // Queue up the parent relationship update
            parentUpdates.push({
              accountId,
              parentId,
              accountCode,
              parentCode
            });
            
          } catch (error: any) {
            const accountCode = row.accountCode || 'unknown';
            console.error(`Error resolving parent for ${accountCode}:`, error);
            result.warnings.push(`Error resolving parent for account ${accountCode}: ${error.message || 'Unknown error'}`);
          }
        }
        
        // ==================== STEP 9: Execute parent relationship updates ====================
        console.log(`Applying ${parentUpdates.length} parent relationship updates`);
        
        if (parentUpdates.length > 0) {
          for (const update of parentUpdates) {
            try {
              await tx
                .update(accounts)
                .set({ parentId: update.parentId })
                .where(eq(accounts.id, update.accountId));
                
              console.log(`Updated parent relationship: ${update.accountCode} -> ${update.parentCode}`);
            } catch (updateError: any) {
              console.error(`Error updating parent relationship for account ${update.accountCode}:`, updateError);
              result.warnings.push(`Failed to update parent for account ${update.accountCode}: ${updateError.message}`);
            }
          }
        }
        
        console.log(`Chart of Accounts import completed successfully for client ${clientId}`);
        return result;
      } catch (error: any) {
        console.error(`Chart of Accounts import failed:`, error);
        result.errors.push(`Import failed: ${error.message || 'Unknown error'}`);
        throw error; // This will trigger a rollback of the transaction
      }
    });
  }
  
  /**
   * Helper to normalize CSV/Excel header fields for consistent access
   */
  private normalizeHeaderField(header: string): string {
    if (!header) return '';
    return header.trim().toLowerCase();
  }
  
  /**
   * Normalize import rows to handle case sensitivity and field variations
   */
  private normalizeImportRows(rows: any[]): any[] {
    return rows.map(row => {
      // Create a new object with all lowercase keys
      const normalizedRow: any = {};
      
      for (const key in row) {
        const normalizedKey = key.toLowerCase();
        normalizedRow[normalizedKey] = row[key];
        
        // Also preserve the original key for backward compatibility
        normalizedRow[key] = row[key];
      }
      
      return normalizedRow;
    });
  }
  
  /**
   * Helper to get value from a row with case-insensitive access
   * Enhanced to handle different field naming conventions
   */
  private getCaseInsensitiveValue(row: any, fieldName: string): any {
    if (!row) return null;
    
    // Try direct access first
    if (row[fieldName] !== undefined) return row[fieldName];
    
    // Create variants of field names to try
    const variants = new Set<string>();
    
    // Lowercase and uppercase variants
    const lowerFieldName = fieldName.toLowerCase();
    const upperFieldName = fieldName.toUpperCase();
    variants.add(lowerFieldName);
    variants.add(upperFieldName);
    
    // Handle camelCase, snake_case, kebab-case, and PascalCase conversions
    // Convert to snake_case
    const snakeCaseField = lowerFieldName.replace(/([A-Z])/g, '_$1').toLowerCase();
    variants.add(snakeCaseField);
    
    // Convert to kebab-case
    const kebabCaseField = lowerFieldName.replace(/([A-Z])/g, '-$1').toLowerCase();
    variants.add(kebabCaseField);
    
    // Convert to camelCase
    const camelCaseField = lowerFieldName.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
    variants.add(camelCaseField);
    
    // Convert to PascalCase
    const pascalCaseField = lowerFieldName.charAt(0).toUpperCase() + 
                            lowerFieldName.slice(1).replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
    variants.add(pascalCaseField);
    
    // Try common variations with spaces
    variants.add(lowerFieldName.replace(/_/g, ' '));
    variants.add(lowerFieldName.replace(/-/g, ' '));
    
    // Check all variants
    for (const variant of variants) {
      if (row[variant] !== undefined) {
        return row[variant];
      }
    }
    
    // Last resort: check all keys case-insensitively
    for (const key in row) {
      if (key.toLowerCase() === lowerFieldName) {
        return row[key];
      }
    }
    
    // Look for variant-like matches (partial matches or similar fields)
    for (const key in row) {
      const keyLower = key.toLowerCase();
      // Check if the key contains the field name or vice versa
      if (keyLower.includes(lowerFieldName) || lowerFieldName.includes(keyLower)) {
        // Only match if at least 3 characters in length and the match is significant
        if (lowerFieldName.length >= 3 && keyLower.length >= 3) {
          return row[key];
        }
      }
    }
    
    return null;
  }
  
  /**
   * Helper to extract parent code from row with comprehensive case handling
   */
  private getParentCode(row: any): string | null {
    if (!row) return null;
    
    // Check for ParentCode field first (from our new export format)
    const parentCodeValue = this.getCaseInsensitiveValue(row, 'ParentCode');
    if (parentCodeValue !== null && parentCodeValue !== undefined && parentCodeValue !== '') {
      const trimmed = typeof parentCodeValue === 'string' ? parentCodeValue.trim() : String(parentCodeValue).trim();
      if (trimmed) {
        return trimmed;
      }
    }
    
    // Array of possible parent code field names - expanded with more variations
    const parentCodeFields = [
      'parentcode', 'parentCode', 'PARENTCODE', 'ParentCODE', 'parent code', 'parent_code',
      'PARENT_CODE', 'parent-code', 'PARENT-CODE', 'parent', 'Parent', 'PARENT', 'parentaccountnumber',
      'parentAccountNumber', 'ParentAccountNumber', 'PARENTACCOUNTNUMBER', 'parent_account_number',
      'parent account number', 'Parent Account Number', 'parent_account', 'parent account'
    ];
    
    // Try each possible field name
    for (const field of parentCodeFields) {
      const value = this.getCaseInsensitiveValue(row, field);
      if (value !== null && value !== undefined && value !== '') {
        // Convert to string, trim, and check if it's not just whitespace
        const trimmed = typeof value === 'string' ? value.trim() : String(value).trim();
        if (trimmed) {
          return trimmed;
        }
      }
    }
    
    return null;
  }
  
  /**
   * Helper to parse active status with comprehensive case handling
   */
  private parseIsActive(row: any, defaultValue: boolean = true): boolean {
    const activeValue = this.getCaseInsensitiveValue(row, 'active') || 
                        this.getCaseInsensitiveValue(row, 'isactive') || 
                        this.getCaseInsensitiveValue(row, 'is_active');
    
    if (activeValue === undefined || activeValue === null) {
      return defaultValue;
    }
    
    if (typeof activeValue === 'boolean') {
      return activeValue;
    }
    
    const normalizedValue = String(activeValue).toLowerCase().trim();
    
    // Recognize common "false" values
    if (normalizedValue === 'no' || 
        normalizedValue === 'false' || 
        normalizedValue === 'n' || 
        normalizedValue === '0' || 
        normalizedValue === 'inactive') {
      return false;
    }
    
    // Anything else is considered true (yes, true, 1, active, etc.)
    return true;
  }
  
  // Helper method to normalize account types from imported data
  private normalizeAccountType(type: string): AccountType {
    if (!type) {
      throw new Error("Account type is required");
    }
    
    switch (type.trim().toUpperCase()) {
      case 'ASSET':
      case 'ASSETS':
        return AccountType.ASSET;
      
      case 'LIABILITY':
      case 'LIABILITIES':
        return AccountType.LIABILITY;
      
      case 'EQUITY':
        return AccountType.EQUITY;
      
      case 'REVENUE':
      case 'INCOME':
      case 'REVENUES':
      case 'INCOMES':
        return AccountType.REVENUE;
      
      case 'EXPENSE':
      case 'EXPENSES':
        return AccountType.EXPENSE;
      
      default:
        throw new Error(`Invalid account type: ${type}`);
    }
  }
  
  /**
   * Helper method to parse isSubledger field with case-insensitive handling
   * This handles different case variations and formats (yes/no, true/false, 1/0)
   */
  private parseIsSubledger(row: any, existingAccount?: Account): boolean {
    // Check all possible case variations of isSubledger field
    const isSubledgerField = row.issubledger || row.isSubledger || row.IsSubledger || row.ISSUBLEDGER;
    
    if (isSubledgerField === undefined && existingAccount) {
      return existingAccount.isSubledger;
    }
    
    if (typeof isSubledgerField === 'boolean') {
      return isSubledgerField;
    }
    
    // Check string values
    if (isSubledgerField) {
      const normalized = isSubledgerField.toString().toLowerCase().trim();
      if (normalized === 'yes' || normalized === '1' || normalized === 'true') {
        return true;
      }
    }
    
    return false;
  }
  
  /**
   * Helper method to get subledger type with case-insensitive handling
   */
  private getSubledgerType(row: any, existingAccount?: Account): string | null {
    // Check all possible case variations of subledgerType field
    const subledgerType = row.subledgertype || row.subledgerType || row.SubledgerType || row.SUBLEDGERTYPE;
    
    if (subledgerType) {
      return subledgerType.trim();
    }
    
    if (existingAccount) {
      return existingAccount.subledgerType;
    }
    
    return null;
  }

  async createAccount(insertAccount: InsertAccount): Promise<Account> {
    const [account] = await db
      .insert(accounts)
      .values({
        name: insertAccount.name,
        accountCode: insertAccount.accountCode,
        type: insertAccount.type,
        clientId: insertAccount.clientId,
        active: insertAccount.active ?? true,
        subtype: insertAccount.subtype,
        isSubledger: insertAccount.isSubledger ?? false,
        subledgerType: insertAccount.subledgerType,
        parentId: insertAccount.parentId,
        description: insertAccount.description
      })
      .returning();
    return account;
  }

  async updateAccount(id: number, accountData: Partial<Account>): Promise<Account | undefined> {
    const [account] = await db
      .update(accounts)
      .set(accountData)
      .where(eq(accounts.id, id))
      .returning();
    return account || undefined;
  }

  async deleteAccount(id: number): Promise<void> {
    // First check if this account has any transactions associated with it
    const journalLines = await db
      .select({ count: count() })
      .from(journalEntryLines)
      .where(eq(journalEntryLines.accountId, id));
    
    // If there are transactions, don't allow deletion
    if (journalLines[0]?.count > 0) {
      throw new Error('Cannot delete account with existing transactions. Mark it as inactive instead.');
    }
    
    // Check if this account has any child accounts
    const childAccounts = await db
      .select({ count: count() })
      .from(accounts)
      .where(eq(accounts.parentId, id));
    
    // If there are child accounts, don't allow deletion
    if (childAccounts[0]?.count > 0) {
      throw new Error('Cannot delete account with child accounts. Remove child accounts first or mark this account as inactive.');
    }
    
    // If no transactions and no child accounts exist, proceed with deletion
    await db
      .delete(accounts)
      .where(eq(accounts.id, id));
  }
  
  /**
   * Marks an account as inactive instead of deleting it
   * This is used when an account has transactions and cannot be deleted
   */
  async markAccountInactive(id: number): Promise<Account | undefined> {
    return this.updateAccount(id, { active: false });
  }
  
  /**
   * Checks if an account has any transactions
   */
  async accountHasTransactions(id: number): Promise<boolean> {
    const journalLines = await db
      .select({ count: count() })
      .from(journalEntryLines)
      .where(eq(journalEntryLines.accountId, id));
    
    return journalLines[0]?.count > 0;
  }

  async getJournalEntry(id: number): Promise<(JournalEntry & { lines: JournalEntryLine[] }) | undefined> {
    const [entry] = await db
      .select()
      .from(journalEntries)
      .where(eq(journalEntries.id, id));
    
    if (!entry) return undefined;
    
    // Get the lines for this journal entry
    const lines = await this.getJournalEntryLines(id);
    
    return {
      ...entry,
      lines
    };
  }

  async getJournalEntries(entityId: number): Promise<JournalEntry[]> {
    return await db
      .select()
      .from(journalEntries)
      .where(eq(journalEntries.entityId, entityId))
      .orderBy(desc(journalEntries.date));
  }
  
  async listJournalEntries(options?: { clientId?: number, entityId?: number, startDate?: Date, endDate?: Date, status?: string, limit?: number, offset?: number }): Promise<JournalEntry[]> {
    let query = db.select().from(journalEntries);
    
    // Apply filters based on options
    if (options) {
      const conditions = [];
      
      if (options.clientId) {
        conditions.push(eq(journalEntries.clientId, options.clientId));
      }
      
      if (options.entityId) {
        conditions.push(eq(journalEntries.entityId, options.entityId));
      }
      
      if (options.startDate) {
        conditions.push(gte(journalEntries.date, options.startDate));
      }
      
      if (options.endDate) {
        conditions.push(lte(journalEntries.date, options.endDate));
      }
      
      if (options.status) {
        conditions.push(eq(journalEntries.status, options.status));
      }
      
      // Apply all conditions if there are any
      if (conditions.length > 0) {
        query = query.where(and(...conditions));
      }
      
      // Apply pagination
      if (options.limit) {
        query = query.limit(options.limit);
      }
      
      if (options.offset) {
        query = query.offset(options.offset);
      }
    }
    
    // Order by date (most recent first) and then by ID
    query = query.orderBy(desc(journalEntries.date), journalEntries.id);
    
    return await query;
  }

  async getJournalEntriesByStatus(entityId: number, status: JournalEntryStatus): Promise<JournalEntry[]> {
    return await db
      .select()
      .from(journalEntries)
      .where(and(
        eq(journalEntries.entityId, entityId),
        eq(journalEntries.status, status)
      ))
      .orderBy(desc(journalEntries.date));
  }

  async createJournalEntry(entryData: InsertJournalEntry, linesData: InsertJournalEntryLine[]): Promise<JournalEntry & { lines: JournalEntryLine[] }> {
    // Check if there's at least one line
    if (!linesData || linesData.length === 0) {
      throw new Error("Journal entry must have at least one line");
    }
    
    // Calculate the sum of debits and credits
    let totalDebits = 0;
    let totalCredits = 0;
    
    linesData.forEach(line => {
      const amount = parseFloat(line.amount.toString());
      
      if (line.type === 'debit') {
        totalDebits += amount;
      } else if (line.type === 'credit') {
        totalCredits += amount;
      }
    });
    
    // Verify that debits = credits (within a small epsilon for floating point comparisons)
    const epsilon = 0.001;
    if (Math.abs(totalDebits - totalCredits) > epsilon) {
      throw new Error("Journal entry must balance: total debits must equal total credits");
    }
    
    // Verify the total is not zero
    if (totalDebits < epsilon) {
      throw new Error("Journal entry total amount cannot be zero");
    }
    
    // Start a transaction for creating the entry and its lines
    return await db.transaction(async (tx) => {
      // Insert the journal entry
      const [entry] = await tx
        .insert(journalEntries)
        .values({
          clientId: entryData.clientId,
          entityId: entryData.entityId,
          date: entryData.date,
          referenceNumber: entryData.referenceNumber,
          description: entryData.description,
          isSystemGenerated: entryData.isSystemGenerated || false,
          status: entryData.status || 'draft',
          journalType: entryData.journalType || 'JE',
          supDocId: entryData.supDocId,
          reversalDate: entryData.reversalDate,
          isReversal: entryData.isReversal || false,
          reversedEntryId: entryData.reversedEntryId,
          isReversed: entryData.isReversed || false,
          reversedByEntryId: entryData.reversedByEntryId,
          requestedBy: entryData.requestedBy,
          requestedAt: entryData.requestedAt,
          approvedBy: entryData.approvedBy,
          approvedAt: entryData.approvedAt,
          rejectedBy: entryData.rejectedBy,
          rejectedAt: entryData.rejectedAt,
          rejectionReason: entryData.rejectionReason,
          postedBy: entryData.postedBy,
          postedAt: entryData.postedAt,
          createdBy: entryData.createdBy
        })
        .returning();
      
      // Insert all journal entry lines
      const insertedLines: JournalEntryLine[] = [];
      
      for (const lineData of linesData) {
        const [line] = await tx
          .insert(journalEntryLines)
          .values({
            journalEntryId: entry.id,
            accountId: lineData.accountId,
            type: lineData.type,
            amount: lineData.amount,
            description: lineData.description,
            locationId: lineData.locationId,
            lineNo: lineData.lineNo,
            reference: lineData.reference,
            reconciled: lineData.reconciled || false,
            reconciledAt: lineData.reconciledAt,
            reconciledBy: lineData.reconciledBy
          })
          .returning();
        
        insertedLines.push(line);
      }
      
      // Return the full created entry with its lines
      return {
        ...entry,
        lines: insertedLines
      };
    });
  }

  async updateJournalEntry(id: number, entryData: Partial<JournalEntry>, linesData?: (Partial<JournalEntryLine> & { id?: number })[]): Promise<(JournalEntry & { lines: JournalEntryLine[] }) | undefined> {
    // Start a transaction for updating entry and its lines
    return await db.transaction(async (tx) => {
      // Get the existing entry first to check its status
      const [existingEntry] = await tx
        .select()
        .from(journalEntries)
        .where(eq(journalEntries.id, id));
        
      if (!existingEntry) {
        throw new Error("Journal entry not found");
      }
      
      // Prevent updates to posted or voided entries (business rule)
      if (existingEntry.status === 'posted' || existingEntry.status === 'void') {
        // Allow only specific fields to be updated based on status
        if (entryData.status === 'void' && existingEntry.status === 'posted') {
          // Allow voiding a posted entry
        } else if (!entryData.description && Object.keys(entryData).length > 1) {
          // Only description changes are allowed for posted/voided entries
          throw new Error(`Cannot modify a journal entry with status '${existingEntry.status}' except for description`);
        }
      }
      
      // Update the journal entry
      const [updatedEntry] = await tx
        .update(journalEntries)
        .set({
          ...entryData,
          updatedAt: new Date()
        })
        .where(eq(journalEntries.id, id))
        .returning();
      
      if (!updatedEntry) return undefined;
      
      // If we have lines data and the entry is not posted/voided, update the lines
      if (linesData && linesData.length > 0 && existingEntry.status !== 'posted' && existingEntry.status !== 'void') {
        // Get existing lines to determine what needs to be deleted
        const existingLines = await tx
          .select()
          .from(journalEntryLines)
          .where(eq(journalEntryLines.journalEntryId, id));
        
        // Find line IDs that are in existingLines but not in linesData (to be deleted)
        const existingLineIds = existingLines.map(line => line.id);
        const updatedLineIds = linesData.filter(line => line.id).map(line => line.id);
        const linesToDelete = existingLineIds.filter(id => !updatedLineIds.includes(id));
        
        // Delete lines that are no longer needed
        for (const lineId of linesToDelete) {
          await tx
            .delete(journalEntryLines)
            .where(eq(journalEntryLines.id, lineId));
        }
        
        // Handle each line - either update existing or create new
        for (const lineData of linesData) {
          if (lineData.id) {
            // Update existing line
            await tx
              .update(journalEntryLines)
              .set({
                ...lineData,
                updatedAt: new Date()
              })
              .where(eq(journalEntryLines.id, lineData.id));
          } else {
            // Create new line
            await tx
              .insert(journalEntryLines)
              .values({
                journalEntryId: id,
                accountId: lineData.accountId!,
                type: lineData.type!,
                amount: lineData.amount!,
                description: lineData.description || null,
                locationId: lineData.locationId || null,
                lineNo: lineData.lineNo || null,
                reference: lineData.reference || null,
                reconciled: lineData.reconciled || false,
                reconciledAt: lineData.reconciledAt || null,
                reconciledBy: lineData.reconciledBy || null
              });
          }
        }
      }
      
      // Get the updated lines for this journal entry
      const lines = await tx
        .select()
        .from(journalEntryLines)
        .where(eq(journalEntryLines.journalEntryId, id))
        .orderBy(journalEntryLines.lineNo);
      
      // Only verify balance if we updated lines and entry is still in draft
      if (linesData && linesData.length > 0 && updatedEntry.status === 'draft') {
        // Validate that debits = credits
        let totalDebits = 0;
        let totalCredits = 0;
        
        lines.forEach(line => {
          const amount = parseFloat(line.amount.toString());
          
          if (line.type === 'debit') {
            totalDebits += amount;
          } else if (line.type === 'credit') {
            totalCredits += amount;
          }
        });
        
        // Verify that debits = credits (within a small epsilon for floating point comparisons)
        const epsilon = 0.001;
        if (Math.abs(totalDebits - totalCredits) > epsilon) {
          throw new Error("Journal entry must balance: total debits must equal total credits");
        }
        
        // Verify the total is not zero
        if (totalDebits < epsilon) {
          throw new Error("Journal entry total amount cannot be zero");
        }
      }
      
      // Return the entry with lines
      return {
        ...updatedEntry,
        lines
      };
    });
  }

  async getJournalEntryLines(journalEntryId: number): Promise<JournalEntryLine[]> {
    return await db
      .select()
      .from(journalEntryLines)
      .where(eq(journalEntryLines.journalEntryId, journalEntryId))
      .orderBy(journalEntryLines.lineNo);
  }

  async createJournalEntryLine(insertLine: InsertJournalEntryLine): Promise<JournalEntryLine> {
    const [line] = await db
      .insert(journalEntryLines)
      .values(insertLine)
      .returning();
    return line;
  }
  
  async updateJournalEntryLine(id: number, lineData: Partial<JournalEntryLine>): Promise<JournalEntryLine | undefined> {
    const [updatedLine] = await db
      .update(journalEntryLines)
      .set({
        ...lineData,
        updatedAt: new Date()
      })
      .where(eq(journalEntryLines.id, id))
      .returning();
    
    return updatedLine || undefined;
  }
  
  async deleteJournalEntryLine(id: number): Promise<boolean> {
    const result = await db
      .delete(journalEntryLines)
      .where(eq(journalEntryLines.id, id));
    
    return result.rowCount > 0;
  }
  
  async reverseJournalEntry(journalEntryId: number, options: {
    date?: Date;
    description?: string;
    createdBy: number;
    referenceNumber?: string;
  }): Promise<(JournalEntry & { lines: JournalEntryLine[] }) | undefined> {
    // Start a transaction for creating the reversing entry and its lines
    return await db.transaction(async (tx) => {
      // 1. Get the original journal entry with lines
      const originalEntry = await this.getJournalEntry(journalEntryId);
      if (!originalEntry) {
        throw new Error("Journal entry not found");
      }
      
      // 2. Check if journal entry can be reversed (must be posted)
      if (originalEntry.status !== "posted") {
        throw new Error("Only posted journal entries can be reversed");
      }
      
      // 3. Create the reversing journal entry
      const date = options.date || new Date();
      const currentDate = new Date();
      
      const [reversalEntry] = await tx
        .insert(journalEntries)
        .values({
          clientId: originalEntry.clientId,
          entityId: originalEntry.entityId,
          date: date,
          description: options.description || `Reversal of ${originalEntry.referenceNumber || journalEntryId}`,
          referenceNumber: options.referenceNumber || `REV-${originalEntry.referenceNumber || journalEntryId}`,
          createdBy: options.createdBy,
          journalType: originalEntry.journalType,
          status: "draft", // Start as draft, to be reviewed
          isSystemGenerated: true, // Mark as system-generated
          isReversal: true, // Flag as a reversal entry
          reversedEntryId: journalEntryId, // Reference to the original entry
          createdAt: currentDate,
          updatedAt: currentDate
        })
        .returning();
        
      if (!reversalEntry) {
        throw new Error("Failed to create reversal journal entry");
      }
      
      // 4. Create the reversed lines (with debits/credits flipped)
      const lines: JournalEntryLine[] = [];
      
      for (const line of originalEntry.lines) {
        // Flip the type (debit/credit)
        const reversedType = line.type === "debit" ? "credit" : "debit";
        
        // Create the reversal line
        const [reversalLine] = await tx
          .insert(journalEntryLines)
          .values({
            journalEntryId: reversalEntry.id,
            accountId: line.accountId,
            type: reversedType,
            amount: line.amount,
            description: line.description,
            locationId: line.locationId,
            lineNo: line.lineNo,
            reference: line.reference,
            reconciled: false, // New line is not reconciled
            createdAt: currentDate,
            updatedAt: currentDate
          })
          .returning();
          
        lines.push(reversalLine);
      }
      
      // 5. Return the new entry with its lines
      return {
        ...reversalEntry,
        lines
      };
    });
  }
  
  async deleteJournalEntry(id: number): Promise<boolean> {
    // Check if journal entry exists and get its status
    const entry = await this.getJournalEntry(id);
    if (!entry) return false;
    
    // Only draft entries can be deleted (to ensure data integrity)
    if (entry.status !== "draft") {
      throw new Error("Cannot delete a journal entry that is not in 'draft' status");
    }
    
    // Start a transaction for deleting the entry and its lines
    return await db.transaction(async (tx) => {
      // Delete all lines first
      await tx
        .delete(journalEntryLines)
        .where(eq(journalEntryLines.journalEntryId, id));
      
      // Delete files associated with the entry if any
      await tx
        .delete(journalEntryFiles)
        .where(eq(journalEntryFiles.journalEntryId, id));
      
      // Finally delete the journal entry
      const result = await tx
        .delete(journalEntries)
        .where(eq(journalEntries.id, id));
      
      return result.rowCount > 0;
    });
  }

  async getJournalEntryFiles(journalEntryId: number): Promise<any[]> {
    return await db
      .select()
      .from(journalEntryFiles)
      .where(eq(journalEntryFiles.journalEntryId, journalEntryId));
  }

  async createJournalEntryFile(journalEntryId: number, file: any): Promise<any> {
    const [newFile] = await db
      .insert(journalEntryFiles)
      .values({ ...file, journalEntryId })
      .returning();
    return newFile;
  }

  async getFixedAsset(id: number): Promise<FixedAsset | undefined> {
    const [asset] = await db
      .select()
      .from(fixedAssets)
      .where(eq(fixedAssets.id, id));
    return asset || undefined;
  }

  async getFixedAssets(entityId: number): Promise<FixedAsset[]> {
    return await db
      .select()
      .from(fixedAssets)
      .where(eq(fixedAssets.entityId, entityId));
  }

  async createFixedAsset(insertAsset: InsertFixedAsset): Promise<FixedAsset> {
    const [asset] = await db
      .insert(fixedAssets)
      .values({
        name: insertAsset.name,
        entityId: insertAsset.entityId,
        description: insertAsset.description,
        createdBy: insertAsset.createdBy,
        status: insertAsset.status || "active",
        acquisitionDate: insertAsset.acquisitionDate,
        acquisitionCost: insertAsset.acquisitionCost,
        depreciationMethod: insertAsset.depreciationMethod,
        usefulLife: insertAsset.usefulLife,
        assetAccountId: insertAsset.assetAccountId,
        accumulatedDepreciationAccountId: insertAsset.accumulatedDepreciationAccountId,
        depreciationExpenseAccountId: insertAsset.depreciationExpenseAccountId,
        salvageValue: insertAsset.salvageValue || "0",
        disposalDate: insertAsset.disposalDate,
        disposalAmount: insertAsset.disposalAmount
      })
      .returning();
    return asset;
  }

  async updateFixedAsset(id: number, assetData: Partial<FixedAsset>): Promise<FixedAsset | undefined> {
    const [asset] = await db
      .update(fixedAssets)
      .set(assetData)
      .where(eq(fixedAssets.id, id))
      .returning();
    return asset || undefined;
  }

  async generateTrialBalance(clientId: number, startDate?: Date, endDate?: Date): Promise<any> {
    // This is a more complex query that will need to aggregate data from journal entries
    // For now, return a simple implementation
    const accounts = await this.getAccounts(clientId);
    const result = [];
    
    for (const account of accounts) {
      const balance = await this.calculateAccountBalance(account.id, startDate, endDate);
      
      // Determine debit and credit columns based on balance
      let debit = 0;
      let credit = 0;
      
      if (balance > 0) {
        if (account.type === AccountType.ASSET || account.type === AccountType.EXPENSE) {
          debit = balance;
        } else {
          credit = balance;
        }
      } else if (balance < 0) {
        if (account.type === AccountType.ASSET || account.type === AccountType.EXPENSE) {
          credit = Math.abs(balance);
        } else {
          debit = Math.abs(balance);
        }
      }
      
      result.push({
        accountId: account.id,
        accountCode: account.accountCode,
        accountName: account.name,
        debit,
        credit
      });
    }
    
    return result;
  }

  async generateBalanceSheet(clientId: number, asOfDate?: Date): Promise<any> {
    const assets = await this.getAccountsByType(clientId, AccountType.ASSET);
    const liabilities = await this.getAccountsByType(clientId, AccountType.LIABILITY);
    const equity = await this.getAccountsByType(clientId, AccountType.EQUITY);
    
    const assetItems = [];
    const liabilityItems = [];
    const equityItems = [];
    
    let totalAssets = 0;
    let totalLiabilities = 0;
    let totalEquity = 0;
    
    // Calculate assets
    for (const account of assets) {
      const balance = await this.calculateAccountBalance(account.id, undefined, asOfDate);
      
      assetItems.push({
        accountId: account.id,
        accountName: account.name,
        accountCode: account.accountCode,
        balance
      });
      
      totalAssets += balance;
    }
    
    // Calculate liabilities
    for (const account of liabilities) {
      const balance = await this.calculateAccountBalance(account.id, undefined, asOfDate);
      
      liabilityItems.push({
        accountId: account.id,
        accountName: account.name,
        accountCode: account.accountCode,
        balance
      });
      
      totalLiabilities += balance;
    }
    
    // Calculate equity
    for (const account of equity) {
      const balance = await this.calculateAccountBalance(account.id, undefined, asOfDate);
      
      equityItems.push({
        accountId: account.id,
        accountName: account.name,
        accountCode: account.accountCode,
        balance
      });
      
      totalEquity += balance;
    }
    
    return {
      assets: assetItems,
      liabilities: liabilityItems,
      equity: equityItems,
      totalAssets,
      totalLiabilities,
      totalEquity,
      liabilitiesAndEquity: totalLiabilities + totalEquity
    };
  }

  async generateIncomeStatement(clientId: number, startDate?: Date, endDate?: Date): Promise<any> {
    const revenues = await this.getAccountsByType(clientId, AccountType.REVENUE);
    const expenses = await this.getAccountsByType(clientId, AccountType.EXPENSE);
    
    const revenueItems = [];
    const expenseItems = [];
    
    let totalRevenue = 0;
    let totalExpenses = 0;
    
    // Calculate revenue
    for (const account of revenues) {
      const balance = await this.calculateAccountBalance(account.id, startDate, endDate);
      
      revenueItems.push({
        accountId: account.id,
        accountName: account.name,
        accountCode: account.accountCode,
        balance: Math.abs(balance) // Revenue is normally credited, so positive balance is negative
      });
      
      totalRevenue += Math.abs(balance);
    }
    
    // Calculate expenses
    for (const account of expenses) {
      const balance = await this.calculateAccountBalance(account.id, startDate, endDate);
      
      expenseItems.push({
        accountId: account.id,
        accountName: account.name,
        accountCode: account.accountCode,
        balance // Expenses are normally debited, so positive balance is positive
      });
      
      totalExpenses += balance;
    }
    
    const netIncome = totalRevenue - totalExpenses;
    
    return {
      revenue: revenueItems,
      expenses: expenseItems,
      totalRevenue,
      totalExpenses,
      netIncome
    };
  }

  async generateCashFlow(clientId: number, startDate?: Date, endDate?: Date): Promise<any> {
    // This is a complex calculation that requires categorizing activities
    // For now, return a simplified structure
    return {
      cashFlows: [
        {
          category: "Operating Activities",
          items: [],
          total: 0
        },
        {
          category: "Investing Activities",
          items: [],
          total: 0
        },
        {
          category: "Financing Activities",
          items: [],
          total: 0
        }
      ],
      netCashFlow: 0
    };
  }

  async getGeneralLedger(entityId: number, options?: GLOptions): Promise<GLEntry[]> {
    // Base query selecting from journal entry lines
    let query = db.select({
      id: journalEntryLines.id,
      date: journalEntries.date,
      journalId: journalEntries.reference,
      accountId: journalEntryLines.accountId,
      accountCode: accounts.accountCode,
      accountName: accounts.name,
      description: journalEntryLines.description,
      debit: journalEntryLines.debit,
      credit: journalEntryLines.credit,
      status: journalEntries.status
    })
    .from(journalEntryLines)
    .innerJoin(journalEntries, eq(journalEntryLines.journalEntryId, journalEntries.id))
    .innerJoin(accounts, eq(journalEntryLines.accountId, accounts.id))
    .where(eq(journalEntries.entityId, entityId));
    
    // Apply filters based on options
    if (options) {
      if (options.accountId) {
        query = query.where(eq(journalEntryLines.accountId, options.accountId));
      }
      
      if (options.startDate) {
        query = query.where(gte(journalEntries.date, options.startDate));
      }
      
      if (options.endDate) {
        query = query.where(lte(journalEntries.date, options.endDate));
      }
      
      if (options.status) {
        query = query.where(eq(journalEntries.status, options.status));
      }
    }
    
    // Order by date and journal entry ID
    query = query.orderBy(journalEntries.date, journalEntries.id);
    
    // Execute query
    const results = await query;
    
    // Calculate running balance
    let balance = 0;
    const entries: GLEntry[] = [];
    
    for (const row of results) {
      // Calculate the impact on balance based on account type
      const account = await this.getAccount(row.accountId);
      if (!account) continue;
      
      const debitValue = parseFloat(row.debit as any) || 0;
      const creditValue = parseFloat(row.credit as any) || 0;
      
      // Update balance based on account type
      if (account.type === AccountType.ASSET || account.type === AccountType.EXPENSE) {
        balance += debitValue - creditValue;
      } else {
        balance += creditValue - debitValue;
      }
      
      entries.push({
        ...row,
        balance
      } as GLEntry);
    }
    
    return entries;
  }

  // Helper method to calculate account balance
  private async calculateAccountBalance(accountId: number, startDate?: Date, endDate?: Date): Promise<number> {
    const account = await this.getAccount(accountId);
    if (!account) return 0;
    
    // Build a query to sum debits and credits for the account
    let query = db.select({
      totalDebit: sql<number>`COALESCE(SUM(${journalEntryLines.debit}), 0)`,
      totalCredit: sql<number>`COALESCE(SUM(${journalEntryLines.credit}), 0)`
    })
    .from(journalEntryLines)
    .innerJoin(journalEntries, eq(journalEntryLines.journalEntryId, journalEntries.id))
    .where(and(
      eq(journalEntryLines.accountId, accountId),
      eq(journalEntries.status, JournalEntryStatus.POSTED)
    ));
    
    // Apply date filters if provided
    if (startDate) {
      query = query.where(gte(journalEntries.date, startDate));
    }
    
    if (endDate) {
      query = query.where(lte(journalEntries.date, endDate));
    }
    
    // Execute query
    const [result] = await query;
    
    if (!result) return 0;
    
    const { totalDebit, totalCredit } = result;
    
    // Calculate balance based on account type
    if (account.type === AccountType.ASSET || account.type === AccountType.EXPENSE) {
      return totalDebit - totalCredit;
    } else {
      return totalCredit - totalDebit;
    }
  }

  // User Activity Tracking methods
  async logUserActivity(activity: InsertUserActivityLog): Promise<UserActivityLog> {
    const [result] = await db.insert(userActivityLogs).values({
      userId: activity.userId,
      entityId: activity.entityId,
      action: activity.action,
      resourceType: activity.resourceType,
      resourceId: activity.resourceId,
      details: activity.details,
      ipAddress: activity.ipAddress,
      userAgent: activity.userAgent
    }).returning();
    
    return result;
  }
  
  async getUserActivities(userId: number, limit: number = 100): Promise<UserActivityLog[]> {
    return await db.select()
      .from(userActivityLogs)
      .where(eq(userActivityLogs.userId, userId))
      .orderBy(desc(userActivityLogs.timestamp))
      .limit(limit);
  }
  
  async getUserActivitiesByEntity(entityId: number, limit: number = 100): Promise<UserActivityLog[]> {
    return await db.select()
      .from(userActivityLogs)
      .where(eq(userActivityLogs.entityId, entityId))
      .orderBy(desc(userActivityLogs.timestamp))
      .limit(limit);
  }
  
  async getUserActivitiesByResourceType(resourceType: string, limit: number = 100): Promise<UserActivityLog[]> {
    return await db.select()
      .from(userActivityLogs)
      .where(eq(userActivityLogs.resourceType, resourceType))
      .orderBy(desc(userActivityLogs.timestamp))
      .limit(limit);
  }
  
  // Feature Usage Analytics methods
  async recordFeatureUsage(usage: InsertFeatureUsage): Promise<FeatureUsage> {
    // Check if this feature has been used by this user before
    const [existingUsage] = await db.select()
      .from(featureUsage)
      .where(and(
        eq(featureUsage.userId, usage.userId),
        eq(featureUsage.featureName, usage.featureName)
      ));
    
    if (existingUsage) {
      // Update existing usage record
      const [updatedUsage] = await db.update(featureUsage)
        .set({
          usageCount: Number(existingUsage.usageCount) + 1,
          lastUsed: new Date(),
          useTime: usage.useTime,
          successful: usage.successful
        })
        .where(eq(featureUsage.id, existingUsage.id))
        .returning();
      
      return updatedUsage;
    } else {
      // Create new usage record
      const [newUsage] = await db.insert(featureUsage)
        .values({
          userId: usage.userId,
          entityId: usage.entityId,
          featureName: usage.featureName,
          usageCount: 1,
          useTime: usage.useTime,
          successful: usage.successful !== undefined ? usage.successful : true
        })
        .returning();
      
      return newUsage;
    }
  }
  
  async updateFeatureUsage(id: number, data: Partial<FeatureUsage>): Promise<FeatureUsage | undefined> {
    const [updatedUsage] = await db.update(featureUsage)
      .set(data)
      .where(eq(featureUsage.id, id))
      .returning();
    
    return updatedUsage;
  }
  
  async getFeatureUsage(userId: number, featureName: string): Promise<FeatureUsage | undefined> {
    const [usage] = await db.select()
      .from(featureUsage)
      .where(and(
        eq(featureUsage.userId, userId),
        eq(featureUsage.featureName, featureName)
      ));
    
    return usage;
  }
  
  async getFeatureUsageStats(featureName: string): Promise<{
    totalUsageCount: number,
    uniqueUsers: number,
    avgUseTime?: number
  }> {
    const [stats] = await db.select({
      totalUsageCount: sum(featureUsage.usageCount),
      uniqueUsers: count(featureUsage.userId, { distinct: true })
    })
    .from(featureUsage)
    .where(eq(featureUsage.featureName, featureName));
    
    const [timeStats] = await db.select({
      avgUseTime: sql`AVG(${featureUsage.useTime})`
    })
    .from(featureUsage)
    .where(and(
      eq(featureUsage.featureName, featureName),
      not(isNull(featureUsage.useTime))
    ));
    
    return {
      totalUsageCount: Number(stats.totalUsageCount) || 0,
      uniqueUsers: Number(stats.uniqueUsers) || 0,
      avgUseTime: timeStats?.avgUseTime ? Number(timeStats.avgUseTime) : undefined
    };
  }
  
  // Industry Benchmark methods
  async addIndustryBenchmark(benchmark: InsertIndustryBenchmark): Promise<IndustryBenchmark> {
    const [result] = await db.insert(industryBenchmarks)
      .values({
        industry: benchmark.industry,
        subIndustry: benchmark.subIndustry,
        metricName: benchmark.metricName,
        metricValue: benchmark.metricValue,
        entitySizeRange: benchmark.entitySizeRange,
        year: benchmark.year,
        quarter: benchmark.quarter,
        dataSource: benchmark.dataSource,
        confidenceLevel: benchmark.confidenceLevel,
        sampleSize: benchmark.sampleSize
      })
      .returning();
    
    return result;
  }
  
  async getIndustryBenchmarks(industry: string, year: number): Promise<IndustryBenchmark[]> {
    return await db.select()
      .from(industryBenchmarks)
      .where(and(
        eq(industryBenchmarks.industry, industry),
        eq(industryBenchmarks.year, year)
      ));
  }
  
  async getBenchmarksByMetric(metricName: string): Promise<IndustryBenchmark[]> {
    return await db.select()
      .from(industryBenchmarks)
      .where(eq(industryBenchmarks.metricName, metricName))
      .orderBy(desc(industryBenchmarks.year), desc(industryBenchmarks.quarter || 0));
  }
  
  async getIndustryComparison(entityId: number, metricNames: string[]): Promise<any> {
    // Get entity details to determine industry
    const entity = await this.getEntity(entityId);
    if (!entity || !entity.industry) {
      return { 
        entityMetrics: [],
        industryBenchmarks: [],
        comparison: {}
      };
    }
    
    // Get industry benchmarks for the requested metrics
    const benchmarks = await Promise.all(
      metricNames.map(metricName => 
        db.select()
          .from(industryBenchmarks)
          .where(and(
            eq(industryBenchmarks.industry, entity.industry as string),
            eq(industryBenchmarks.metricName, metricName)
          ))
          .orderBy(desc(industryBenchmarks.year), desc(industryBenchmarks.quarter || 0))
          .limit(1)
      )
    );
    
    // Process the benchmarks for the comparison
    const comparison = metricNames.reduce((result, metricName, index) => {
      const benchmark = benchmarks[index][0];
      if (benchmark) {
        result[metricName] = {
          entityValue: null, // Would need to calculate this based on entity data
          benchmarkValue: benchmark.metricValue,
          difference: null // Would calculate this once entity value is determined
        };
      }
      return result;
    }, {} as Record<string, any>);
    
    return {
      entityMetrics: [], // Would contain entity-specific metric values
      industryBenchmarks: benchmarks.flatMap(b => b),
      comparison
    };
  }
  
  // Data Consent methods
  async recordDataConsent(consent: InsertDataConsent): Promise<DataConsent> {
    const [result] = await db.insert(dataConsent)
      .values({
        userId: consent.userId,
        entityId: consent.entityId,
        consentType: consent.consentType,
        granted: consent.granted,
        grantedAt: consent.granted ? new Date() : null,
        revokedAt: !consent.granted ? new Date() : null,
        consentVersion: consent.consentVersion,
        ipAddress: consent.ipAddress
      })
      .returning();
    
    return result;
  }
  
  async getUserConsent(userId: number, consentType: string): Promise<DataConsent | undefined> {
    const [consent] = await db.select()
      .from(dataConsent)
      .where(and(
        eq(dataConsent.userId, userId),
        eq(dataConsent.consentType, consentType)
      ))
      .orderBy(desc(dataConsent.lastUpdated))
      .limit(1);
    
    return consent;
  }
  
  async updateUserConsent(id: number, granted: boolean): Promise<DataConsent | undefined> {
    const updateData: any = {
      granted,
      lastUpdated: new Date()
    };
    
    if (granted) {
      updateData.grantedAt = new Date();
      updateData.revokedAt = null;
    } else {
      updateData.revokedAt = new Date();
    }
    
    const [updatedConsent] = await db.update(dataConsent)
      .set(updateData)
      .where(eq(dataConsent.id, id))
      .returning();
    
    return updatedConsent;
  }
  
  async hasUserConsented(userId: number, consentType: string): Promise<boolean> {
    const consent = await this.getUserConsent(userId, consentType);
    return !!consent && consent.granted;
  }
  
  // User Activity Tracking methods
  async logUserActivity(activity: InsertUserActivityLog): Promise<UserActivityLog> {
    const [result] = await db.insert(userActivityLogs).values({
      userId: activity.userId,
      entityId: activity.entityId,
      action: activity.action,
      resourceType: activity.resourceType,
      resourceId: activity.resourceId,
      details: activity.details,
      ipAddress: activity.ipAddress,
      userAgent: activity.userAgent
    }).returning();
    
    return result;
  }
  
  async getUserActivities(userId: number, limit: number = 100): Promise<UserActivityLog[]> {
    return await db.select()
      .from(userActivityLogs)
      .where(eq(userActivityLogs.userId, userId))
      .orderBy(desc(userActivityLogs.timestamp))
      .limit(limit);
  }
  
  async getUserActivitiesByEntity(entityId: number, limit: number = 100): Promise<UserActivityLog[]> {
    return await db.select()
      .from(userActivityLogs)
      .where(eq(userActivityLogs.entityId, entityId))
      .orderBy(desc(userActivityLogs.timestamp))
      .limit(limit);
  }
  
  async getUserActivitiesByResourceType(resourceType: string, limit: number = 100): Promise<UserActivityLog[]> {
    return await db.select()
      .from(userActivityLogs)
      .where(eq(userActivityLogs.resourceType, resourceType))
      .orderBy(desc(userActivityLogs.timestamp))
      .limit(limit);
  }
  
  // Feature Usage Analytics methods
  async recordFeatureUsage(usage: InsertFeatureUsage): Promise<FeatureUsage> {
    // Check if this feature has been used by this user before
    const [existingUsage] = await db.select()
      .from(featureUsage)
      .where(and(
        eq(featureUsage.userId, usage.userId),
        eq(featureUsage.featureName, usage.featureName)
      ));
    
    if (existingUsage) {
      // Update existing usage record
      const [updatedUsage] = await db.update(featureUsage)
        .set({
          usageCount: Number(existingUsage.usageCount) + 1,
          lastUsed: new Date(),
          useTime: usage.useTime,
          successful: usage.successful
        })
        .where(eq(featureUsage.id, existingUsage.id))
        .returning();
      
      return updatedUsage;
    } else {
      // Create new usage record
      const [newUsage] = await db.insert(featureUsage)
        .values({
          userId: usage.userId,
          entityId: usage.entityId,
          featureName: usage.featureName,
          usageCount: 1,
          useTime: usage.useTime,
          successful: usage.successful !== undefined ? usage.successful : true
        })
        .returning();
      
      return newUsage;
    }
  }
  
  async updateFeatureUsage(id: number, data: Partial<FeatureUsage>): Promise<FeatureUsage | undefined> {
    const [updatedUsage] = await db.update(featureUsage)
      .set(data)
      .where(eq(featureUsage.id, id))
      .returning();
    
    return updatedUsage;
  }
  
  async getFeatureUsage(userId: number, featureName: string): Promise<FeatureUsage | undefined> {
    const [usage] = await db.select()
      .from(featureUsage)
      .where(and(
        eq(featureUsage.userId, userId),
        eq(featureUsage.featureName, featureName)
      ));
    
    return usage;
  }
  
  async getFeatureUsageStats(featureName: string): Promise<{
    totalUsageCount: number,
    uniqueUsers: number,
    avgUseTime?: number
  }> {
    const [stats] = await db.select({
      totalUsageCount: sum(featureUsage.usageCount),
      uniqueUsers: count(featureUsage.userId, { distinct: true })
    })
    .from(featureUsage)
    .where(eq(featureUsage.featureName, featureName));
    
    const [timeStats] = await db.select({
      avgUseTime: sql`AVG(${featureUsage.useTime})`
    })
    .from(featureUsage)
    .where(and(
      eq(featureUsage.featureName, featureName),
      not(isNull(featureUsage.useTime))
    ));
    
    return {
      totalUsageCount: Number(stats?.totalUsageCount) || 0,
      uniqueUsers: Number(stats?.uniqueUsers) || 0,
      avgUseTime: timeStats?.avgUseTime ? Number(timeStats.avgUseTime) : undefined
    };
  }
  
  // Industry Benchmark methods
  async addIndustryBenchmark(benchmark: InsertIndustryBenchmark): Promise<IndustryBenchmark> {
    const [result] = await db.insert(industryBenchmarks)
      .values({
        industry: benchmark.industry,
        subIndustry: benchmark.subIndustry,
        metricName: benchmark.metricName,
        metricValue: benchmark.metricValue,
        entitySizeRange: benchmark.entitySizeRange,
        year: benchmark.year,
        quarter: benchmark.quarter,
        dataSource: benchmark.dataSource,
        confidenceLevel: benchmark.confidenceLevel,
        sampleSize: benchmark.sampleSize
      })
      .returning();
    
    return result;
  }
  
  async getIndustryBenchmarks(industry: string, year: number): Promise<IndustryBenchmark[]> {
    return await db.select()
      .from(industryBenchmarks)
      .where(and(
        eq(industryBenchmarks.industry, industry),
        eq(industryBenchmarks.year, year)
      ));
  }
  
  async getBenchmarksByMetric(metricName: string): Promise<IndustryBenchmark[]> {
    return await db.select()
      .from(industryBenchmarks)
      .where(eq(industryBenchmarks.metricName, metricName))
      .orderBy(desc(industryBenchmarks.year), desc(industryBenchmarks.quarter || 0));
  }
  
  async getIndustryComparison(entityId: number, metricNames: string[]): Promise<any> {
    // Get entity details to determine industry
    const entity = await this.getEntity(entityId);
    if (!entity || !entity.industry) {
      return { 
        entityMetrics: [],
        industryBenchmarks: [],
        comparison: {}
      };
    }
    
    // Get industry benchmarks for the requested metrics
    const benchmarks = await Promise.all(
      metricNames.map(metricName => 
        db.select()
          .from(industryBenchmarks)
          .where(and(
            eq(industryBenchmarks.industry, entity.industry as string),
            eq(industryBenchmarks.metricName, metricName)
          ))
          .orderBy(desc(industryBenchmarks.year), desc(industryBenchmarks.quarter || 0))
          .limit(1)
      )
    );
    
    // Process the benchmarks for the comparison
    const comparison = metricNames.reduce((result, metricName, index) => {
      const benchmark = benchmarks[index][0];
      if (benchmark) {
        result[metricName] = {
          entityValue: null, // Would need to calculate this based on entity data
          benchmarkValue: benchmark.metricValue,
          difference: null // Would calculate this once entity value is determined
        };
      }
      return result;
    }, {} as Record<string, any>);
    
    return {
      entityMetrics: [], // Would contain entity-specific metric values
      industryBenchmarks: benchmarks.flatMap(b => b),
      comparison
    };
  }
  
  // Data Consent methods
  async recordDataConsent(consent: InsertDataConsent): Promise<DataConsent> {
    const [result] = await db.insert(dataConsent)
      .values({
        userId: consent.userId,
        entityId: consent.entityId,
        consentType: consent.consentType,
        granted: consent.granted,
        grantedAt: consent.granted ? new Date() : null,
        revokedAt: !consent.granted ? new Date() : null,
        consentVersion: consent.consentVersion,
        ipAddress: consent.ipAddress
      })
      .returning();
    
    return result;
  }
  
  async getUserConsent(userId: number, consentType: string): Promise<DataConsent | undefined> {
    const [consent] = await db.select()
      .from(dataConsent)
      .where(and(
        eq(dataConsent.userId, userId),
        eq(dataConsent.consentType, consentType)
      ))
      .orderBy(desc(dataConsent.lastUpdated))
      .limit(1);
    
    return consent;
  }
  
  async updateUserConsent(id: number, granted: boolean): Promise<DataConsent | undefined> {
    const updateData: any = {
      granted,
      lastUpdated: new Date()
    };
    
    if (granted) {
      updateData.grantedAt = new Date();
      updateData.revokedAt = null;
    } else {
      updateData.revokedAt = new Date();
    }
    
    const [updatedConsent] = await db.update(dataConsent)
      .set(updateData)
      .where(eq(dataConsent.id, id))
      .returning();
    
    return updatedConsent;
  }

  // Form Submission methods
  
  // Contact Form submissions
  async createContactSubmission(submission: InsertContactSubmission): Promise<ContactSubmission> {
    const [result] = await db.insert(contactSubmissions)
      .values({
        name: submission.name,
        email: submission.email,
        phone: submission.phone,
        message: submission.message,
        ipAddress: submission.ipAddress,
        userAgent: submission.userAgent,
        status: submission.status || 'unread'
      })
      .returning();
    
    return result;
  }

  async getContactSubmissions(limit: number = 100, offset: number = 0): Promise<ContactSubmission[]> {
    const results = await db.select()
      .from(contactSubmissions)
      .orderBy(desc(contactSubmissions.createdAt))
      .limit(limit)
      .offset(offset);
    
    return results;
  }

  async getContactSubmissionById(id: number): Promise<ContactSubmission | undefined> {
    const [result] = await db.select()
      .from(contactSubmissions)
      .where(eq(contactSubmissions.id, id))
      .limit(1);
    
    return result;
  }

  async updateContactSubmission(id: number, status: string): Promise<ContactSubmission | undefined> {
    const [result] = await db.update(contactSubmissions)
      .set({
        status: status,
        updatedAt: new Date()
      })
      .where(eq(contactSubmissions.id, id))
      .returning();
    
    return result;
  }

  // Checklist Form submissions
  async createChecklistSubmission(submission: InsertChecklistSubmission): Promise<ChecklistSubmission> {
    const [result] = await db.insert(checklistSubmissions)
      .values({
        name: submission.name,
        email: submission.email,
        company: submission.company,
        revenueRange: submission.revenueRange,
        ipAddress: submission.ipAddress,
        userAgent: submission.userAgent,
        status: submission.status || 'unread'
      })
      .returning();
    
    return result;
  }

  async getChecklistSubmissions(limit: number = 100, offset: number = 0): Promise<ChecklistSubmission[]> {
    const results = await db.select()
      .from(checklistSubmissions)
      .orderBy(desc(checklistSubmissions.createdAt))
      .limit(limit)
      .offset(offset);
    
    return results;
  }

  async getChecklistSubmissionById(id: number): Promise<ChecklistSubmission | undefined> {
    const [result] = await db.select()
      .from(checklistSubmissions)
      .where(eq(checklistSubmissions.id, id))
      .limit(1);
    
    return result;
  }

  async updateChecklistSubmission(id: number, status: string): Promise<ChecklistSubmission | undefined> {
    const [result] = await db.update(checklistSubmissions)
      .set({
        status: status,
        updatedAt: new Date()
      })
      .where(eq(checklistSubmissions.id, id))
      .returning();
    
    return result;
  }

  // Consultation Form submissions
  async createConsultationSubmission(submission: InsertConsultationSubmission): Promise<ConsultationSubmission> {
    const [result] = await db.insert(consultationSubmissions)
      .values({
        firstName: submission.firstName,
        lastName: submission.lastName,
        email: submission.email,
        phone: submission.phone,
        companyName: submission.companyName,
        industry: submission.industry,
        companySize: submission.companySize,
        annualRevenue: submission.annualRevenue,
        preferredContact: submission.preferredContact,
        message: submission.message,
        services: submission.services,
        ipAddress: submission.ipAddress,
        userAgent: submission.userAgent,
        status: submission.status || 'unread'
      })
      .returning();
    
    return result;
  }

  async getConsultationSubmissions(limit: number = 100, offset: number = 0): Promise<ConsultationSubmission[]> {
    const results = await db.select()
      .from(consultationSubmissions)
      .orderBy(desc(consultationSubmissions.createdAt))
      .limit(limit)
      .offset(offset);
    
    return results;
  }

  async getConsultationSubmissionById(id: number): Promise<ConsultationSubmission | undefined> {
    const [result] = await db.select()
      .from(consultationSubmissions)
      .where(eq(consultationSubmissions.id, id))
      .limit(1);
    
    return result;
  }

  async updateConsultationSubmission(id: number, status: string): Promise<ConsultationSubmission | undefined> {
    const [result] = await db.update(consultationSubmissions)
      .set({
        status: status,
        updatedAt: new Date()
      })
      .where(eq(consultationSubmissions.id, id))
      .returning();
    
    return result;
  }

  // Blog subscriber methods
  async createBlogSubscriber(subscriber: InsertBlogSubscriber): Promise<BlogSubscriber> {
    const [result] = await db
      .insert(blogSubscribers)
      .values({
        email: subscriber.email,
        name: subscriber.name || null,
        ipAddress: subscriber.ipAddress || null,
        userAgent: subscriber.userAgent || null,
        active: true
      })
      .returning();
    
    return result;
  }

  async getBlogSubscribers(includeInactive: boolean = false): Promise<BlogSubscriber[]> {
    const query = includeInactive 
      ? db.select().from(blogSubscribers)
      : db.select().from(blogSubscribers).where(eq(blogSubscribers.active, true));
    
    return await query;
  }

  async getBlogSubscriberByEmail(email: string): Promise<BlogSubscriber | undefined> {
    const [result] = await db
      .select()
      .from(blogSubscribers)
      .where(eq(blogSubscribers.email, email));
    
    return result;
  }

  async updateBlogSubscriber(id: number, data: Partial<BlogSubscriber>): Promise<BlogSubscriber | undefined> {
    const [updatedSubscriber] = await db
      .update(blogSubscribers)
      .set(data)
      .where(eq(blogSubscribers.id, id))
      .returning();
    
    return updatedSubscriber;
  }

  async deleteBlogSubscriber(id: number): Promise<void> {
    await db
      .delete(blogSubscribers)
      .where(eq(blogSubscribers.id, id));
  }
  
  // Location methods
  async createLocation(location: InsertLocation): Promise<Location> {
    const [result] = await db
      .insert(locations)
      .values({
        clientId: location.clientId,
        name: location.name,
        code: location.code || null,
        description: location.description || null,
        isActive: location.isActive !== undefined ? location.isActive : true
      })
      .returning();
    
    return result;
  }

  async getLocation(id: number): Promise<Location | undefined> {
    const [result] = await db
      .select()
      .from(locations)
      .where(eq(locations.id, id));
    
    return result;
  }

  async listLocationsByClient(clientId: number): Promise<Location[]> {
    return await db
      .select()
      .from(locations)
      .where(and(
        eq(locations.clientId, clientId),
        eq(locations.isActive, true)
      ));
  }

  async updateLocation(id: number, data: Partial<Location>): Promise<Location | undefined> {
    const [updatedLocation] = await db
      .update(locations)
      .set({
        ...data,
        updatedAt: new Date()
      })
      .where(eq(locations.id, id))
      .returning();
    
    return updatedLocation;
  }

  async setLocationActiveStatus(id: number, isActive: boolean): Promise<boolean> {
    const [result] = await db
      .update(locations)
      .set({
        isActive: isActive,
        updatedAt: new Date()
      })
      .where(eq(locations.id, id))
      .returning();
    
    return !!result;
  }

  // Checklist Files methods
  async createChecklistFile(fileData: any): Promise<any> {
    const buffer = fileData.fileData;
    delete fileData.fileData;

    const [result] = await db.insert(checklistFiles)
      .values({
        filename: fileData.filename,
        originalFilename: fileData.originalFilename, // This maps to original_filename in the database
        mimeType: fileData.mimeType,
        size: fileData.size,
        path: fileData.path,
        isActive: fileData.isActive ?? false,
        uploadedBy: fileData.uploadedBy
      })
      .returning();

    if (result) {
      // Execute a raw SQL query to update the BYTEA column 'file_data'
      await db.execute(
        sql`UPDATE checklist_files SET file_data = ${buffer} WHERE id = ${result.id}`
      );

      // Retrieve the file again with the binary data
      const fileRow = await db.execute(
        sql`SELECT id, filename, original_filename as "originalFilename", mime_type as "mimeType", size, path, is_active as "isActive", uploaded_by as "uploadedBy", 
            created_at as "createdAt", file_data as "fileData" 
            FROM checklist_files WHERE id = ${result.id}`
      );

      if (fileRow && fileRow.rows && fileRow.rows.length > 0) {
        return fileRow.rows[0];
      }
    }
    
    return result;
  }

  async getChecklistFiles(): Promise<any[]> {
    // Don't fetch the binary data in the listing
    const results = await db.select({
      id: checklistFiles.id,
      filename: checklistFiles.filename,
      originalFilename: checklistFiles.originalFilename,
      mimeType: checklistFiles.mimeType,
      size: checklistFiles.size,
      path: checklistFiles.path,
      isActive: checklistFiles.isActive,
      uploadedBy: checklistFiles.uploadedBy,
      createdAt: checklistFiles.createdAt,
      updatedAt: checklistFiles.updatedAt
    })
    .from(checklistFiles)
    .orderBy(desc(checklistFiles.createdAt));
    
    return results;
  }

  async getActiveChecklistFile(): Promise<any | undefined> {
    // Include binary data for the active file
    const fileRow = await db.execute(
      sql`SELECT id, filename, original_filename as "originalFilename", mime_type as "mimeType", size, path, is_active as "isActive", uploaded_by as "uploadedBy", 
          created_at as "createdAt", file_data as "fileData" 
          FROM checklist_files WHERE is_active = true LIMIT 1`
    );
    
    if (fileRow && fileRow.rows && fileRow.rows.length > 0) {
      return fileRow.rows[0];
    }
    
    return undefined;
  }

  async getChecklistFileById(id: number): Promise<any | undefined> {
    // Include binary data for specific file
    const fileRow = await db.execute(
      sql`SELECT id, filename, original_filename as "originalFilename", mime_type as "mimeType", size, path, is_active as "isActive", uploaded_by as "uploadedBy", 
          created_at as "createdAt", file_data as "fileData" 
          FROM checklist_files WHERE id = ${id} LIMIT 1`
    );
    
    if (fileRow && fileRow.rows && fileRow.rows.length > 0) {
      return fileRow.rows[0];
    }
    
    return undefined;
  }

  async updateChecklistFile(id: number, isActive: boolean): Promise<any | undefined> {
    // If marking as active, deactivate all other files
    if (isActive) {
      await db.update(checklistFiles)
        .set({ isActive: false })
        .where(ne(checklistFiles.id, id));
    }
    
    const [result] = await db.update(checklistFiles)
      .set({
        isActive: isActive,
        updatedAt: new Date()
      })
      .where(eq(checklistFiles.id, id))
      .returning();
    
    return result;
  }

  async deleteChecklistFile(id: number): Promise<void> {
    await db.delete(checklistFiles)
      .where(eq(checklistFiles.id, id));
  }

  // Consolidation Group methods
  async getConsolidationGroup(id: number): Promise<ConsolidationGroup | undefined> {
    try {
      // Get the consolidation group data
      const result = await db
        .select()
        .from(consolidationGroups)
        .where(eq(consolidationGroups.id, id))
        .limit(1);
      
      if (!result || result.length === 0) return undefined;
      
      // Get all associated entities from the junction table
      const entityRelations = await db
        .select()
        .from(consolidationGroupEntities)
        .where(eq(consolidationGroupEntities.groupId, id));
      
      // Extract entity IDs from the junction table
      const entities = entityRelations.map(relation => relation.entityId);
      
      // Create a ConsolidationGroup object with the entities property
      // populated from the junction table relationships
      return {
        ...result[0],
        entities: entities
      } as ConsolidationGroup;
    } catch (error) {
      console.error('Error retrieving consolidation group:', error);
      throw error;
    }
  }

  async getConsolidationGroups(): Promise<ConsolidationGroup[]> {
    try {
      // Get all active consolidation groups
      const groups = await db
        .select()
        .from(consolidationGroups)
        .where(eq(consolidationGroups.isActive, true));
      
      // Get entity relationships for all groups
      const entityRelations = await db
        .select()
        .from(consolidationGroupEntities);
      
      // Group entity relationships by group ID
      const entityRelationsByGroup = entityRelations.reduce((acc, relation) => {
        if (!acc[relation.groupId]) {
          acc[relation.groupId] = [];
        }
        acc[relation.groupId].push(relation.entityId);
        return acc;
      }, {} as Record<number, number[]>);
      
      // Create ConsolidationGroup objects with the entities property
      // populated from the junction table relationships
      return groups.map(group => ({
        ...group,
        entities: entityRelationsByGroup[group.id] || []
      }) as ConsolidationGroup);
    } catch (error) {
      console.error('Error retrieving consolidation groups:', error);
      throw error;
    }
  }

  async getConsolidationGroupsByUser(userId: number): Promise<ConsolidationGroup[]> {
    try {
      // Get all active consolidation groups owned by the user
      const groups = await db
        .select()
        .from(consolidationGroups)
        .where(
          and(
            eq(consolidationGroups.ownerId, userId),
            eq(consolidationGroups.isActive, true)
          )
        );
      
      if (groups.length === 0) {
        return [];
      }
      
      // Get group IDs
      const groupIds = groups.map(g => g.id);
      
      // Get entity relationships for these groups from the junction table
      const entityRelations = await db
        .select()
        .from(consolidationGroupEntities)
        .where(inArray(consolidationGroupEntities.groupId, groupIds));
      
      // Group entity relationships by group ID
      const entityRelationsByGroup = entityRelations.reduce((acc, relation) => {
        if (!acc[relation.groupId]) {
          acc[relation.groupId] = [];
        }
        acc[relation.groupId].push(relation.entityId);
        return acc;
      }, {} as Record<number, number[]>);
      
      // Create ConsolidationGroup objects with the entities property
      // populated from the junction table relationships
      return groups.map(group => ({
        ...group,
        entities: entityRelationsByGroup[group.id] || []
      }) as ConsolidationGroup);
    } catch (error) {
      console.error('Error retrieving user consolidation groups:', error);
      throw error;
    }
  }

  async getConsolidationGroupsByEntity(entityId: number): Promise<ConsolidationGroup[]> {
    try {
      // Use the junction table to find all groups that contain this entity
      const result = await db
        .select({
          group: consolidationGroups
        })
        .from(consolidationGroupEntities)
        .innerJoin(
          consolidationGroups,
          eq(consolidationGroupEntities.groupId, consolidationGroups.id)
        )
        .where(
          and(
            eq(consolidationGroupEntities.entityId, entityId),
            eq(consolidationGroups.isActive, true)
          )
        );
      
      // Extract the group objects
      const groups = result.map(row => row.group);
      
      // Since we're using only the junction table now, no need to fetch
      // entity IDs again - they're not actually used in the code
      return groups;
    } catch (error) {
      console.error('Error retrieving entity consolidation groups:', error);
      throw error;
    }
  }

  async createConsolidationGroup(group: InsertConsolidationGroup): Promise<ConsolidationGroup> {
    try {
      // Start a transaction to ensure both the group and entity associations are created atomically
      return await db.transaction(async (tx) => {
        // Extract entities array from the request if provided (from InsertConsolidationGroupSchema.entities)
        const entities = group.entities || [];
        
        // Create the consolidation group
        const [result] = await tx.insert(consolidationGroups)
          .values({
            name: group.name,
            description: group.description || null,
            ownerId: group.ownerId,
            currency: group.currency || 'USD',
            startDate: group.startDate,
            endDate: group.endDate,
            periodType: group.periodType,
            rules: group.rules || null,
            isActive: group.isActive !== undefined ? group.isActive : true,
            createdBy: group.createdBy,
            createdAt: new Date(),
            updatedAt: null,
            icon: group.icon || null
          })
          .returning();
        
        // Create entity associations in the junction table
        if (entities.length > 0) {
          const junctionValues = entities.map(entityId => ({
            groupId: result.id,
            entityId: entityId,
            createdAt: new Date()
          }));
          
          await tx.insert(consolidationGroupEntities)
            .values(junctionValues)
            .onConflictDoNothing();
        }
        
        // The result already has the correct structure expected by the application
        return result;
      });
    } catch (error) {
      console.error('Error creating consolidation group:', error);
      throw error;
    }
  }

  async updateConsolidationGroup(id: number, group: Partial<ConsolidationGroup>): Promise<ConsolidationGroup | undefined> {
    try {
      // Create update data without entity relationships (handled separately if needed)
      const updateData: any = { ...group };
      
      // Ensure we don't have any references to the legacy properties
      delete updateData.entityIds;
      delete updateData.entity_ids;
      
      // Add the updated timestamp
      updateData.updatedAt = new Date();
      
      // Check if entities were provided for updating relationships
      let handleEntityUpdate = false;
      let newEntities: number[] = [];
      
      if (group.entities !== undefined) {
        handleEntityUpdate = true;
        newEntities = group.entities || [];
      }
      
      return await db.transaction(async (tx) => {
        // Update the group metadata
        const [result] = await tx.update(consolidationGroups)
          .set(updateData)
          .where(eq(consolidationGroups.id, id))
          .returning();
        
        if (!result) return undefined;
        
        // If entity relationships need updating
        if (handleEntityUpdate) {
          // Clear existing relationships
          await tx.delete(consolidationGroupEntities)
            .where(eq(consolidationGroupEntities.groupId, id));
          
          // Insert new relationships if any
          if (newEntities.length > 0) {
            const junctionValues = newEntities.map(entityId => ({
              groupId: id,
              entityId: entityId,
              createdAt: new Date()
            }));
            
            await tx.insert(consolidationGroupEntities)
              .values(junctionValues)
              .onConflictDoNothing();
          }
        }
        
        // Return the updated group
        return result;
      });
    } catch (error) {
      console.error('Error updating consolidation group:', error);
      throw error;
    }
  }

  async deleteConsolidationGroup(id: number): Promise<void> {
    // Soft delete by setting isActive to false
    await db.update(consolidationGroups)
      .set({
        isActive: false,
        updatedAt: new Date()
      })
      .where(eq(consolidationGroups.id, id));
  }

  async addEntityToConsolidationGroup(groupId: number, entityId: number): Promise<ConsolidationGroup> {
    try {
      // Check if group exists
      const group = await this.getConsolidationGroup(groupId);
      if (!group) {
        throw new Error(`Consolidation group with ID ${groupId} not found`);
      }
      
      return await db.transaction(async (tx) => {
        // Add the entity to the junction table if it doesn't already exist
        await tx.insert(consolidationGroupEntities)
          .values({
            groupId,
            entityId,
            createdAt: new Date()
          })
          .onConflictDoNothing(); // Prevent duplicate entries
        
        // Update the timestamp on the group
        await tx.update(consolidationGroups)
          .set({ 
            updatedAt: new Date() 
          })
          .where(eq(consolidationGroups.id, groupId));
        
        // Get the updated group
        const [updatedGroup] = await tx.select()
          .from(consolidationGroups)
          .where(eq(consolidationGroups.id, groupId))
          .limit(1);
        
        return updatedGroup;
      });
    } catch (error) {
      console.error('Error adding entity to consolidation group:', error);
      throw error;
    }
  }

  async removeEntityFromConsolidationGroup(groupId: number, entityId: number): Promise<ConsolidationGroup> {
    try {
      // Check if group exists
      const group = await this.getConsolidationGroup(groupId);
      if (!group) {
        throw new Error(`Consolidation group with ID ${groupId} not found`);
      }
      
      return await db.transaction(async (tx) => {
        // Remove the entity from the junction table
        await tx.delete(consolidationGroupEntities)
          .where(
            and(
              eq(consolidationGroupEntities.groupId, groupId),
              eq(consolidationGroupEntities.entityId, entityId)
            )
          );
        
        // Update the timestamp on the group
        await tx.update(consolidationGroups)
          .set({ 
            updatedAt: new Date() 
          })
          .where(eq(consolidationGroups.id, groupId));
        
        // Get the updated group
        const [updatedGroup] = await tx.select()
          .from(consolidationGroups)
          .where(eq(consolidationGroups.id, groupId))
          .limit(1);
        
        return updatedGroup;
      });
    } catch (error) {
      console.error('Error removing entity from consolidation group:', error);
      throw error;
    }
  }

  async generateConsolidatedReport(groupId: number, reportType: ReportType, startDate?: Date, endDate?: Date): Promise<any> {
    try {
      // Get consolidation group directly from the database
      const groupResult = await db
        .select()
        .from(consolidationGroups)
        .where(eq(consolidationGroups.id, groupId))
        .limit(1);
      
      if (!groupResult || groupResult.length === 0) {
        throw new Error('Consolidation group not found');
      }
      
      const group = groupResult[0];
      
      // Get entity IDs from the junction table
      const junctionEntities = await db
        .select()
        .from(consolidationGroupEntities)
        .where(eq(consolidationGroupEntities.groupId, groupId));
      
      const entityIds: number[] = junctionEntities.map(je => je.entityId);
      
      if (entityIds.length === 0) {
        throw new Error('No entities associated with this consolidation group');
      }
      
      const reports = [];
      
      // Generate reports for each entity in the group
      for (const entityId of entityIds) {
        let report;
        
        switch (reportType) {
          case ReportType.BALANCE_SHEET:
            report = await this.generateBalanceSheet(entityId, endDate);
            break;
          case ReportType.INCOME_STATEMENT:
            report = await this.generateIncomeStatement(entityId, startDate, endDate);
            break;
          case ReportType.CASH_FLOW:
            report = await this.generateCashFlow(entityId, startDate, endDate);
            break;
          case ReportType.TRIAL_BALANCE:
            report = await this.generateTrialBalance(entityId, startDate, endDate);
            break;
          default:
            throw new Error('Unsupported report type for consolidation');
        }
        
        reports.push(report);
      }
    
      // Consolidate reports
      let consolidatedReport;
      
      switch (reportType) {
        case ReportType.BALANCE_SHEET:
          consolidatedReport = this.consolidateBalanceSheets(reports);
          break;
        case ReportType.INCOME_STATEMENT:
          consolidatedReport = this.consolidateIncomeStatements(reports);
          break;
        case ReportType.CASH_FLOW:
          consolidatedReport = this.consolidateCashFlows(reports);
          break;
        case ReportType.TRIAL_BALANCE:
          consolidatedReport = this.consolidateTrialBalances(reports);
          break;
        default:
          throw new Error('Unsupported report type for consolidation');
      }
      
      // Update last run date
      await this.updateConsolidationGroup(groupId, { lastRun: new Date() });
      
      return consolidatedReport;
    } catch (error) {
      console.error('Error generating consolidated report:', error);
      throw error;
    }
  }

  private consolidateBalanceSheets(reports: any[]): any {
    // Implementation similar to MemoryStorage
    const consolidatedReport = {
      assets: [],
      liabilities: [],
      equity: [],
      totalAssets: 0,
      totalLiabilities: 0,
      totalEquity: 0,
      liabilitiesAndEquity: 0
    };

    // Process each entity's balance sheet
    reports.forEach(report => {
      // Consolidate assets
      report.assets.forEach((asset: any) => {
        const existingAsset = consolidatedReport.assets.find(a => a.accountId === asset.accountId);
        if (existingAsset) {
          existingAsset.balance += asset.balance;
        } else {
          consolidatedReport.assets.push({ ...asset });
        }
      });

      // Consolidate liabilities
      report.liabilities.forEach((liability: any) => {
        const existingLiability = consolidatedReport.liabilities.find(l => l.accountId === liability.accountId);
        if (existingLiability) {
          existingLiability.balance += liability.balance;
        } else {
          consolidatedReport.liabilities.push({ ...liability });
        }
      });

      // Consolidate equity
      report.equity.forEach((equity: any) => {
        const existingEquity = consolidatedReport.equity.find(e => e.accountId === equity.accountId);
        if (existingEquity) {
          existingEquity.balance += equity.balance;
        } else {
          consolidatedReport.equity.push({ ...equity });
        }
      });
    });

    // Recalculate totals
    consolidatedReport.totalAssets = consolidatedReport.assets.reduce((sum: number, asset: any) => sum + asset.balance, 0);
    consolidatedReport.totalLiabilities = consolidatedReport.liabilities.reduce((sum: number, liability: any) => sum + liability.balance, 0);
    consolidatedReport.totalEquity = consolidatedReport.equity.reduce((sum: number, equity: any) => sum + equity.balance, 0);
    consolidatedReport.liabilitiesAndEquity = consolidatedReport.totalLiabilities + consolidatedReport.totalEquity;

    return consolidatedReport;
  }

  private consolidateIncomeStatements(reports: any[]): any {
    // Implement income statement consolidation
    const consolidatedReport = {
      revenue: [],
      expenses: [],
      totalRevenue: 0,
      totalExpenses: 0,
      netIncome: 0
    };

    // Process each entity's income statement
    reports.forEach(report => {
      // Consolidate revenue
      report.revenue.forEach((revenue: any) => {
        const existingRevenue = consolidatedReport.revenue.find(r => r.accountId === revenue.accountId);
        if (existingRevenue) {
          existingRevenue.balance += revenue.balance;
        } else {
          consolidatedReport.revenue.push({ ...revenue });
        }
      });

      // Consolidate expenses
      report.expenses.forEach((expense: any) => {
        const existingExpense = consolidatedReport.expenses.find(e => e.accountId === expense.accountId);
        if (existingExpense) {
          existingExpense.balance += expense.balance;
        } else {
          consolidatedReport.expenses.push({ ...expense });
        }
      });
    });

    // Recalculate totals
    consolidatedReport.totalRevenue = consolidatedReport.revenue.reduce((sum: number, revenue: any) => sum + revenue.balance, 0);
    consolidatedReport.totalExpenses = consolidatedReport.expenses.reduce((sum: number, expense: any) => sum + expense.balance, 0);
    consolidatedReport.netIncome = consolidatedReport.totalRevenue - consolidatedReport.totalExpenses;

    return consolidatedReport;
  }

  private consolidateCashFlows(reports: any[]): any {
    // Implement cash flow consolidation
    const consolidatedReport = {
      cashFlows: [],
      netCashFlow: 0
    };

    // Map to keep track of categories we've processed
    const categoryMap = new Map();

    // Process each entity's cash flow
    reports.forEach(report => {
      report.cashFlows.forEach((categoryGroup: any) => {
        const { category, items, total } = categoryGroup;
        
        // If we've already processed this category, update it
        if (categoryMap.has(category)) {
          const existingCategory = categoryMap.get(category);
          
          // Merge items
          items.forEach((item: any) => {
            const existingItem = existingCategory.items.find((i: any) => i.accountId === item.accountId);
            if (existingItem) {
              existingItem.balance += item.balance;
            } else {
              existingCategory.items.push({ ...item });
            }
          });
          
          // Update total
          existingCategory.total += total;
        } else {
          // New category, clone the items and add to our map
          categoryMap.set(category, {
            category,
            items: items.map((item: any) => ({ ...item })),
            total
          });
        }
      });
    });

    // Convert the map back to an array
    consolidatedReport.cashFlows = Array.from(categoryMap.values());
    
    // Calculate the total net cash flow
    consolidatedReport.netCashFlow = consolidatedReport.cashFlows.reduce((sum: number, flow: any) => sum + flow.total, 0);

    return consolidatedReport;
  }

  private consolidateTrialBalances(reports: any[]): any {
    // Implement trial balance consolidation
    const consolidatedReport = {
      entries: [],
      totalDebit: 0,
      totalCredit: 0
    };

    // Map to track accounts we've processed
    const accountMap = new Map();

    // Process each entity's trial balance
    reports.forEach(report => {
      report.entries.forEach((entry: any) => {
        const key = `${entry.accountCode}-${entry.accountName}`;
        
        if (accountMap.has(key)) {
          const existingEntry = accountMap.get(key);
          existingEntry.debit += entry.debit;
          existingEntry.credit += entry.credit;
          existingEntry.balance += entry.balance;
        } else {
          accountMap.set(key, { ...entry });
        }
      });
    });

    // Convert the map to an array
    consolidatedReport.entries = Array.from(accountMap.values());
    
    // Recalculate totals
    consolidatedReport.totalDebit = consolidatedReport.entries.reduce((sum: number, entry: any) => sum + entry.debit, 0);
    consolidatedReport.totalCredit = consolidatedReport.entries.reduce((sum: number, entry: any) => sum + entry.credit, 0);

    return consolidatedReport;
  }
}

// Storage is initialized in index.ts, not here
