import { storage } from './server/index';
import { BudgetStatus, BudgetPeriodType } from './shared/schema';

async function testBudgetCreation() {
  console.log('Testing budget creation...');
  
  try {
    // Create a test budget
    const newBudget = await storage.createBudget({
      name: 'Test Budget 2024',
      entityId: 1, // Using the default entity
      createdBy: 1, // Using the admin user
      fiscalYear: 2024,
      startDate: new Date('2024-01-01'),
      endDate: new Date('2024-12-31'),
      status: BudgetStatus.DRAFT,
      periodType: BudgetPeriodType.MONTHLY,
      description: 'Test budget for fiscal year 2024'
    });
    
    console.log('Created budget:', newBudget);
    
    // Add a budget item
    const budgetItem = await storage.createBudgetItem({
      budgetId: newBudget.id,
      accountId: 7, // Revenue account
      periodNumber: 1,
      amount: 10000,
      description: 'Projected revenue for January'
    });
    
    console.log('Created budget item:', budgetItem);
    
    // Get the budget with the items
    const budget = await storage.getBudget(newBudget.id);
    console.log('Retrieved budget:', budget);
    
    const budgetItems = await storage.getBudgetItems(newBudget.id);
    console.log('Budget items:', budgetItems);
    
    console.log('Test completed successfully!');
  } catch (error) {
    console.error('Test failed:', error);
  }
}

testBudgetCreation();
