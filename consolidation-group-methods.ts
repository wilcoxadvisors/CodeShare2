// Consolidation Group methods
async getConsolidationGroup(id: number): Promise<ConsolidationGroup | undefined> {
  try {
    const result = await db.query.consolidationGroups.findFirst({
      where: eq(consolidationGroups.id, id)
    });
    return result;
  } catch (err) {
    console.error('Error getting consolidation group:', err);
    throwInternal('Failed to get consolidation group');
  }
}

async getConsolidationGroups(userId: number): Promise<ConsolidationGroup[]> {
  try {
    const result = await db.query.consolidationGroups.findMany({
      where: eq(consolidationGroups.createdBy, userId)
    });
    return result;
  } catch (err) {
    console.error('Error getting consolidation groups:', err);
    throwInternal('Failed to get consolidation groups');
  }
}

async getConsolidationGroupsByEntity(entityId: number): Promise<ConsolidationGroup[]> {
  try {
    // Find all groups where the entity_ids array contains the entityId
    const result = await db.query.consolidationGroups.findMany({
      where: sql`${entityId} = ANY(${consolidationGroups.entity_ids})`
    });
    return result;
  } catch (err) {
    console.error('Error getting consolidation groups by entity:', err);
    throwInternal('Failed to get consolidation groups by entity');
  }
}

async createConsolidationGroup(group: InsertConsolidationGroup): Promise<ConsolidationGroup> {
  try {
    // Use a transaction to ensure data consistency
    return await db.transaction(async (tx) => {
      // Insert the consolidation group
      const [newGroup] = await tx.insert(consolidationGroups).values({
        name: group.name,
        ownerId: group.ownerId,
        createdBy: group.createdBy,
        startDate: group.startDate,
        endDate: group.endDate,
        description: group.description || null,
        currency: group.currency || 'USD',
        periodType: group.periodType || 'monthly',
        rules: group.rules || {},
        isActive: group.isActive !== undefined ? group.isActive : true,
        icon: group.icon || null
      }).returning();
      
      // Process entities if provided
      if (group.entities && group.entities.length > 0) {
        // Create entries in the junction table for each entity
        const junctionRecords = group.entities.map(entityId => ({
          groupId: newGroup.id,
          entityId: entityId
        }));
        
        // Insert all records into the junction table
        await tx.insert(consolidationGroupEntities)
          .values(junctionRecords)
          .onConflictDoNothing();
      }
      
      return newGroup;
    });
  } catch (err) {
    console.error('Error creating consolidation group:', err);
    throwInternal('Failed to create consolidation group');
  }
}

async updateConsolidationGroup(id: number, group: Partial<ConsolidationGroup>): Promise<ConsolidationGroup | undefined> {
  try {
    // Check if the group exists
    const existingGroup = await this.getConsolidationGroup(id);
    if (!existingGroup) return undefined;
    
    // Prepare update data
    const updateData: Partial<ConsolidationGroup> = {
      ...group,
      updatedAt: new Date() 
    };
    
    // Remove entities field from direct update as we handle it separately
    if ('entities' in updateData) {
      delete updateData.entities;
    }
    
    // Use a transaction to ensure data consistency
    return await db.transaction(async (tx) => {
      // Update the group first
      const [updatedGroup] = await tx.update(consolidationGroups)
        .set(updateData)
        .where(eq(consolidationGroups.id, id))
        .returning();
      
      // If entity IDs were provided, update them in the junction table
      if (group.entities && Array.isArray(group.entities)) {
        // First remove all existing associations
        await tx.delete(consolidationGroupEntities)
          .where(eq(consolidationGroupEntities.groupId, id));
        
        // Then add all the new ones
        const junctionRecords = group.entities.map(entityId => ({
          groupId: id,
          entityId: entityId
        }));
        
        if (junctionRecords.length > 0) {
          await tx.insert(consolidationGroupEntities)
            .values(junctionRecords)
            .onConflictDoNothing({ target: [consolidationGroupEntities.groupId, consolidationGroupEntities.entityId] });
        }
      }
      
      return updatedGroup;
    });
  } catch (err) {
    console.error('Error updating consolidation group:', err);
    throwInternal('Failed to update consolidation group');
  }
}

async deleteConsolidationGroup(id: number): Promise<void> {
  try {
    // Use a transaction to delete both the group and its junction table entries
    await db.transaction(async (tx) => {
      // First delete related junction table entries
      await tx.delete(consolidationGroupEntities)
        .where(eq(consolidationGroupEntities.groupId, id));
      
      // Then delete the group itself
      await tx.delete(consolidationGroups)
        .where(eq(consolidationGroups.id, id));
    });
  } catch (err) {
    console.error('Error deleting consolidation group:', err);
    throwInternal('Failed to delete consolidation group');
  }
}

async addEntityToConsolidationGroup(groupId: number, entityId: number): Promise<void> {
  try {
    // Check if the group exists
    const group = await this.getConsolidationGroup(groupId);
    if (!group) throw new Error(`Consolidation group with ID ${groupId} not found`);
    
    // Check if the entity exists
    const entityExists = await db.query.entities.findFirst({
      where: eq(entities.id, entityId)
    });
    
    if (!entityExists) {
      throw new Error(`Entity ${entityId} not found`);
    }
    
    // Add the entity to the junction table
    await db.insert(consolidationGroupEntities)
      .values({
        groupId,
        entityId
      })
      .onConflictDoNothing({ target: [consolidationGroupEntities.groupId, consolidationGroupEntities.entityId] });
    
    // Update the timestamp on the group
    await db.update(consolidationGroups)
      .set({ updatedAt: new Date() })
      .where(eq(consolidationGroups.id, groupId));
      
  } catch (err) {
    console.error('Error adding entity to consolidation group:', err);
    throwInternal('Failed to add entity to consolidation group');
  }
}

async removeEntityFromConsolidationGroup(groupId: number, entityId: number): Promise<void> {
  try {
    // Check if the group exists
    const group = await this.getConsolidationGroup(groupId);
    if (!group) throw new Error(`Consolidation group with ID ${groupId} not found`);
    
    // Remove the entity from the junction table
    await db.delete(consolidationGroupEntities)
      .where(
        and(
          eq(consolidationGroupEntities.groupId, groupId),
          eq(consolidationGroupEntities.entityId, entityId)
        )
      );
    
    // Update the timestamp on the group
    await db.update(consolidationGroups)
      .set({ updatedAt: new Date() })
      .where(eq(consolidationGroups.id, groupId));
      
  } catch (err) {
    console.error('Error removing entity from consolidation group:', err);
    throwInternal('Failed to remove entity from consolidation group');
  }
}

async generateConsolidatedReport(groupId: number, reportType: ReportType, startDate?: Date, endDate?: Date): Promise<any> {
  try {
    // Get the consolidation group
    const group = await this.getConsolidationGroup(groupId);
    if (!group) throw new Error(`Consolidation group with ID ${groupId} not found`);
    
    // Get entities from the junction table
    const groupEntities = await db.select({ entityId: consolidationGroupEntities.entityId })
      .from(consolidationGroupEntities)
      .where(eq(consolidationGroupEntities.groupId, groupId));
    
    // Extract entity IDs
    const entityIds = groupEntities.map(ge => ge.entityId);
    
    if (entityIds.length === 0) {
      throw new Error('Cannot generate consolidated report for an empty group');
    }
    
    // Set default dates if not provided
    const effectiveEndDate = endDate || new Date();
    let effectiveStartDate = startDate;
    
    if (!effectiveStartDate) {
      // Default to beginning of fiscal year
      // Use the first entity in the group as the primary entity
      const primaryEntity = entityIds.length > 0 
        ? await this.getEntity(entityIds[0])
        : null;
      
      if (primaryEntity) {
        const fiscalYearStart = primaryEntity.fiscalYearStart || '01-01'; // Default to Jan 1
        const [month, day] = fiscalYearStart.split('-').map(Number);
        
        effectiveStartDate = new Date(effectiveEndDate.getFullYear(), month - 1, day);
        if (effectiveStartDate > effectiveEndDate) {
          // If fiscal year start is after the end date, use previous year
          effectiveStartDate.setFullYear(effectiveStartDate.getFullYear() - 1);
        }
      } else {
        // Default to 1 year ago
        effectiveStartDate = new Date(effectiveEndDate);
        effectiveStartDate.setFullYear(effectiveStartDate.getFullYear() - 1);
      }
    }
    
    // Generate reports for each entity in the group
    const entityReports = await Promise.all(entityIds.map(async (entityId) => {
      let report;
      
      switch (reportType) {
        case ReportType.BALANCE_SHEET:
          report = await this.generateBalanceSheet(entityId, effectiveEndDate);
          break;
        case ReportType.INCOME_STATEMENT:
          report = await this.generateIncomeStatement(entityId, effectiveStartDate, effectiveEndDate);
          break;
        case ReportType.CASH_FLOW:
          report = await this.generateCashFlow(entityId, effectiveStartDate, effectiveEndDate);
          break;
        case ReportType.TRIAL_BALANCE:
          report = await this.generateTrialBalance(entityId, effectiveStartDate, effectiveEndDate);
          break;
        default:
          throw new Error(`Unsupported report type: ${reportType}`);
      }
      
      return { entityId, report };
    }));
    
    // Consolidate the reports based on report type
    let consolidatedReport;
    
    switch (reportType) {
      case ReportType.BALANCE_SHEET:
        consolidatedReport = this.consolidateBalanceSheets(entityReports.map(er => er.report));
        break;
      case ReportType.INCOME_STATEMENT:
        consolidatedReport = this.consolidateIncomeStatements(entityReports.map(er => er.report));
        break;
      case ReportType.CASH_FLOW:
        consolidatedReport = this.consolidateCashFlows(entityReports.map(er => er.report));
        break;
      case ReportType.TRIAL_BALANCE:
        consolidatedReport = this.consolidateTrialBalances(entityReports.map(er => er.report));
        break;
      default:
        throw new Error(`Unsupported report type: ${reportType}`);
    }
    
    // Update last run timestamp
    await db.update(consolidationGroups)
      .set({ lastRun: new Date() })
      .where(eq(consolidationGroups.id, groupId));
    
    return {
      ...consolidatedReport,
      entities: entityIds,
      groupName: group.name,
      groupId: group.id,
      reportType,
      startDate: effectiveStartDate,
      endDate: effectiveEndDate,
      generatedAt: new Date()
    };
  } catch (err) {
    console.error('Error generating consolidated report:', err);
    throwInternal('Failed to generate consolidated report');
  }
}

// Helper methods for consolidation
private consolidateBalanceSheets(reports: any[]): any {
  // Initialize consolidated structure
  const consolidated = {
    assets: [] as any[],
    liabilities: [] as any[],
    equity: [] as any[],
    totalAssets: 0,
    totalLiabilities: 0,
    totalEquity: 0,
    liabilitiesAndEquity: 0
  };
  
  // Mapping to track accounts across entities by code
  const accountMap: {[code: string]: any} = {};
  
  // Process each entity's report
  reports.forEach(report => {
    // Process assets
    if (report.assets) {
      report.assets.forEach((asset: any) => {
        const key = `${asset.accountCode || ''}-${asset.accountName}`;
        if (!accountMap[key]) {
          accountMap[key] = {
            accountId: asset.accountId,
            accountName: asset.accountName,
            accountCode: asset.accountCode,
            balance: 0
          };
          consolidated.assets.push(accountMap[key]);
        }
        accountMap[key].balance += asset.balance;
      });
    }
    
    // Process liabilities
    if (report.liabilities) {
      report.liabilities.forEach((liability: any) => {
        const key = `${liability.accountCode || ''}-${liability.accountName}`;
        if (!accountMap[key]) {
          accountMap[key] = {
            accountId: liability.accountId,
            accountName: liability.accountName,
            accountCode: liability.accountCode,
            balance: 0
          };
          consolidated.liabilities.push(accountMap[key]);
        }
        accountMap[key].balance += liability.balance;
      });
    }
    
    // Process equity
    if (report.equity) {
      report.equity.forEach((equity: any) => {
        const key = `${equity.accountCode || ''}-${equity.accountName}`;
        if (!accountMap[key]) {
          accountMap[key] = {
            accountId: equity.accountId,
            accountName: equity.accountName,
            accountCode: equity.accountCode,
            balance: 0
          };
          consolidated.equity.push(accountMap[key]);
        }
        accountMap[key].balance += equity.balance;
      });
    }
  });
  
  // Calculate totals
  consolidated.totalAssets = consolidated.assets.reduce((sum, asset) => sum + asset.balance, 0);
  consolidated.totalLiabilities = consolidated.liabilities.reduce((sum, liability) => sum + liability.balance, 0);
  consolidated.totalEquity = consolidated.equity.reduce((sum, equity) => sum + equity.balance, 0);
  consolidated.liabilitiesAndEquity = consolidated.totalLiabilities + consolidated.totalEquity;
  
  return consolidated;
}

private consolidateIncomeStatements(reports: any[]): any {
  // Initialize consolidated structure
  const consolidated = {
    revenue: [] as any[],
    expenses: [] as any[],
    totalRevenue: 0,
    totalExpenses: 0,
    netIncome: 0
  };
  
  // Mapping to track accounts across entities by code
  const accountMap: {[code: string]: any} = {};
  
  // Process each entity's report
  reports.forEach(report => {
    // Process revenue
    if (report.revenue) {
      report.revenue.forEach((rev: any) => {
        const key = `${rev.accountCode || ''}-${rev.accountName}`;
        if (!accountMap[key]) {
          accountMap[key] = {
            accountId: rev.accountId,
            accountName: rev.accountName,
            accountCode: rev.accountCode,
            balance: 0
          };
          consolidated.revenue.push(accountMap[key]);
        }
        accountMap[key].balance += rev.balance;
      });
    }
    
    // Process expenses
    if (report.expenses) {
      report.expenses.forEach((expense: any) => {
        const key = `${expense.accountCode || ''}-${expense.accountName}`;
        if (!accountMap[key]) {
          accountMap[key] = {
            accountId: expense.accountId,
            accountName: expense.accountName,
            accountCode: expense.accountCode,
            balance: 0
          };
          consolidated.expenses.push(accountMap[key]);
        }
        accountMap[key].balance += expense.balance;
      });
    }
  });
  
  // Calculate totals
  consolidated.totalRevenue = consolidated.revenue.reduce((sum, rev) => sum + rev.balance, 0);
  consolidated.totalExpenses = consolidated.expenses.reduce((sum, expense) => sum + expense.balance, 0);
  consolidated.netIncome = consolidated.totalRevenue - consolidated.totalExpenses;
  
  return consolidated;
}

private consolidateCashFlows(reports: any[]): any {
  // Initialize consolidated structure
  const consolidated = {
    cashFlows: [] as any[],
    netCashFlow: 0
  };
  
  // Track cash flow categories and items
  const categories: {[category: string]: any} = {};
  
  // Process each entity's report
  reports.forEach(report => {
    if (report.cashFlows) {
      report.cashFlows.forEach((cf: any) => {
        if (!categories[cf.category]) {
          categories[cf.category] = {
            category: cf.category,
            items: [],
            total: 0
          };
          consolidated.cashFlows.push(categories[cf.category]);
        }
        
        // Map items by name
        if (cf.items) {
          cf.items.forEach((item: any) => {
            const existingItem = categories[cf.category].items.find(
              (i: any) => i.accountName === item.accountName
            );
            
            if (existingItem) {
              existingItem.balance += item.balance;
            } else {
              categories[cf.category].items.push({...item});
            }
          });
        }
        
        // Update category total
        categories[cf.category].total += cf.total;
      });
    }
  });
  
  // Calculate net cash flow
  consolidated.netCashFlow = consolidated.cashFlows.reduce((sum, cf) => sum + cf.total, 0);
  
  return consolidated;
}

private consolidateTrialBalances(reports: any[]): any {
  // Initialize consolidated structure
  const consolidated = {
    items: [] as any[],
    totalDebits: 0,
    totalCredits: 0
  };
  
  // Mapping to track accounts across entities by code
  const accountMap: {[code: string]: any} = {};
  
  // Process each entity's report
  reports.forEach(report => {
    if (report.items) {
      report.items.forEach((item: any) => {
        const key = `${item.accountCode || ''}-${item.accountName}`;
        if (!accountMap[key]) {
          accountMap[key] = {
            accountId: item.accountId,
            accountName: item.accountName,
            accountCode: item.accountCode,
            debit: 0,
            credit: 0,
            balance: 0
          };
          consolidated.items.push(accountMap[key]);
        }
        accountMap[key].debit += item.debit;
        accountMap[key].credit += item.credit;
        accountMap[key].balance = accountMap[key].debit - accountMap[key].credit;
      });
    }
  });
  
  // Calculate totals
  consolidated.totalDebits = consolidated.items.reduce((sum, item) => sum + item.debit, 0);
  consolidated.totalCredits = consolidated.items.reduce((sum, item) => sum + item.credit, 0);
  
  return consolidated;
}