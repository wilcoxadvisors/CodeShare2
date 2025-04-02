    // Third pass: Sort children arrays in each node by active status and then by accountCode
    const sortAccountNodes = (nodes: AccountTreeNode[]) => {
      // Sort the nodes array - active accounts first, then by accountCode
      nodes.sort((a, b) => {
        // First sort by active status (active first)
        if (a.active !== b.active) {
          return a.active ? -1 : 1;
        }
        // Then sort by accountCode
        return a.accountCode.localeCompare(b.accountCode);
      });
      
      // Recursively sort children
      for (const node of nodes) {
        if (node.children && node.children.length > 0) {
          sortAccountNodes(node.children);
        }
      }
    };
    
    // Sort root accounts and their children
    sortAccountNodes(rootAccounts);
    