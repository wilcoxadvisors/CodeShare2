// Consolidation Group methods
async getConsolidationGroup(id: number): Promise<ConsolidationGroup | undefined> {
  return this.consolidationGroups.get(id);
}

async getConsolidationGroups(userId: number): Promise<ConsolidationGroup[]> {
  return Array.from(this.consolidationGroups.values())
    .filter(group => group.createdBy === userId);
}

async getConsolidationGroupsByEntity(entityId: number): Promise<ConsolidationGroup[]> {
  const groupIds = Array.from(this.consolidationGroupEntities.entries())
    .filter(([key, value]) => {
      const parts = key.split('-');
      return parts[1] === entityId.toString() && value === true;
    })
    .map(([key]) => {
      const parts = key.split('-');
      return parseInt(parts[0]);
    });
  
  return Array.from(this.consolidationGroups.values())
    .filter(group => groupIds.includes(group.id));
}

async createConsolidationGroup(group: InsertConsolidationGroup): Promise<ConsolidationGroup> {
  const id = this.currentConsolidationGroupId++;
  const newGroup: ConsolidationGroup = {
    id,
    name: group.name,
    description: group.description || null,
    createdBy: group.createdBy,
    entityIds: group.entityIds || [],
    primaryEntityId: group.primaryEntityId || null,
    isActive: group.isActive !== undefined ? group.isActive : true,
    createdAt: new Date(),
    updatedAt: null,
    lastGeneratedAt: null,
    reportTypes: group.reportTypes || [],
    color: group.color || '#4A6CF7',
    icon: group.icon || null
  };
  
  this.consolidationGroups.set(id, newGroup);
  
  // Add entity relationships
  if (group.entityIds && group.entityIds.length > 0) {
    group.entityIds.forEach(entityId => {
      this.consolidationGroupEntities.set(`${id}-${entityId}`, true);
    });
  }
  
  return newGroup;
}

async updateConsolidationGroup(id: number, group: Partial<ConsolidationGroup>): Promise<ConsolidationGroup | undefined> {
  const existingGroup = this.consolidationGroups.get(id);
  if (!existingGroup) return undefined;
  
  // Handle entity membership changes if entityIds is provided
  if (group.entityIds) {
    // Remove old entity associations
    Array.from(this.consolidationGroupEntities.entries())
      .filter(([key]) => key.startsWith(`${id}-`))
      .forEach(([key]) => {
        this.consolidationGroupEntities.delete(key);
      });
    
    // Add new entity associations
    group.entityIds.forEach(entityId => {
      this.consolidationGroupEntities.set(`${id}-${entityId}`, true);
    });
  }
  
  const updatedGroup = { ...existingGroup, ...group, updatedAt: new Date() };
  this.consolidationGroups.set(id, updatedGroup);
  return updatedGroup;
}

async deleteConsolidationGroup(id: number): Promise<void> {
  // Remove all entity associations
  Array.from(this.consolidationGroupEntities.entries())
    .filter(([key]) => key.startsWith(`${id}-`))
    .forEach(([key]) => {
      this.consolidationGroupEntities.delete(key);
    });
  
  // Delete the group
  this.consolidationGroups.delete(id);
}

async addEntityToConsolidationGroup(groupId: number, entityId: number): Promise<void> {
  const group = await this.getConsolidationGroup(groupId);
  if (!group) throw new Error(`Consolidation group with ID ${groupId} not found`);
  
  // Add entity to group's entityIds array if not already there
  if (!group.entityIds.includes(entityId)) {
    group.entityIds.push(entityId);
    await this.updateConsolidationGroup(groupId, { entityIds: group.entityIds });
  }
  
  // Add entry to relationship map
  this.consolidationGroupEntities.set(`${groupId}-${entityId}`, true);
}

async removeEntityFromConsolidationGroup(groupId: number, entityId: number): Promise<void> {
  const group = await this.getConsolidationGroup(groupId);
  if (!group) throw new Error(`Consolidation group with ID ${groupId} not found`);
  
  // Remove entity from group's entityIds array
  group.entityIds = group.entityIds.filter(id => id !== entityId);
  await this.updateConsolidationGroup(groupId, { entityIds: group.entityIds });
  
  // Remove entry from relationship map
  this.consolidationGroupEntities.delete(`${groupId}-${entityId}`);
}

async generateConsolidatedReport(groupId: number, reportType: ReportType, startDate?: Date, endDate?: Date): Promise<any> {
  const group = await this.getConsolidationGroup(groupId);
  if (!group) throw new Error(`Consolidation group with ID ${groupId} not found`);
  
  if (group.entityIds.length === 0) {
    throw new Error('Cannot generate consolidated report for an empty group');
  }
  
  // Set default dates if not provided
  const effectiveEndDate = endDate || new Date();
  let effectiveStartDate = startDate;
  
  if (!effectiveStartDate) {
    // Default to beginning of fiscal year
    const primaryEntity = group.primaryEntityId 
      ? await this.getEntity(group.primaryEntityId)
      : await this.getEntity(group.entityIds[0]);
    
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
  const entityReports = await Promise.all(group.entityIds.map(async (entityId) => {
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
  
  // Update last generated timestamp
  await this.updateConsolidationGroup(groupId, { lastGeneratedAt: new Date() });
  
  return {
    ...consolidatedReport,
    entities: group.entityIds,
    groupName: group.name,
    groupId: group.id,
    reportType,
    startDate: effectiveStartDate,
    endDate: effectiveEndDate,
    generatedAt: new Date()
  };
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