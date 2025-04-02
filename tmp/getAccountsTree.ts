  async getAccountsTree(clientId: number): Promise<AccountTreeNode[]> {
    // Get all accounts for the given client
    console.log(`DEBUG: getAccountsTree - Fetching accounts for clientId: ${clientId}`);
    
    let clientAccounts: any[] = [];
    
    try {
      // First get all accounts, then sort them in memory for complex sorting logic
      clientAccounts = await db
        .select()
        .from(accounts)
        .where(eq(accounts.clientId, clientId));

      // Sort accounts - first by active status (active first), then by accountCode
      clientAccounts.sort((a, b) => {
        // First sort by active status (active first)
        if (a.active !== b.active) {
          return a.active ? -1 : 1;
        }
        // Then sort by accountCode
        return a.accountCode.localeCompare(b.accountCode);
      });

      console.log(`DEBUG: getAccountsTree - Found ${clientAccounts.length} accounts`);
      
      if (clientAccounts.length === 0) {
        return [];
      }
    } catch (error) {
      console.error("DEBUG: getAccountsTree - Error fetching accounts:", error);
      throw error;
    }

    // Create a map of accounts by ID with empty children arrays
    const accountsMap: Record<number, AccountTreeNode> = {};
    
    // First pass: Add all accounts to the map with empty children arrays
    for (const account of clientAccounts) {
      accountsMap[account.id] = {
        ...account,
        children: []
      };
    }
    
    // Second pass: Populate children arrays based on parentId relationships
    const rootAccounts: AccountTreeNode[] = [];
    
    for (const account of clientAccounts) {
      if (account.parentId === null || account.parentId === undefined || !accountsMap[account.parentId]) {
        // This is a root account (no parent or parent doesn't exist in this client)
        rootAccounts.push(accountsMap[account.id]);
      } else {
        // This account has a parent, add it to the parent's children array
        accountsMap[account.parentId].children.push(accountsMap[account.id]);
      }
    }
    
    return rootAccounts;
  }
