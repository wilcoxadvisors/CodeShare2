/**
 * Visual Regression Testing for Journal Entry Form
 * Takes pixel-perfect screenshots to detect unintended UI changes
 */

describe('Journal Entry Form Visual Regression Tests', () => {
  
  beforeEach(() => {
    // Login and navigate to journal entry form
    cy.visit('/');
    cy.get('[data-testid="login-username"]').type('admin');
    cy.get('[data-testid="login-password"]').type('password123');
    cy.get('[data-testid="login-submit"]').click();
    
    // Wait for authentication and navigation
    cy.url().should('include', '/dashboard');
    
    // Navigate to journal entries
    cy.get('[data-testid="nav-journal-entries"]').click();
    cy.get('[data-testid="new-journal-entry-btn"]').click();
    
    // Wait for form to load
    cy.get('[data-testid="journal-entry-form"]').should('be.visible');
  });

  it('should match baseline for empty journal entry form', () => {
    // Take screenshot of empty form
    cy.get('[data-testid="journal-entry-form"]')
      .compareSnapshot('journal-entry-form-empty', {
        threshold: 0.1,
        thresholdType: 'percent'
      });
  });

  it('should match baseline for form with validation errors', () => {
    // Try to submit empty form to trigger validation
    cy.get('[data-testid="submit-journal-entry"]').click();
    
    // Wait for validation errors to appear
    cy.get('[data-testid="form-errors"]').should('be.visible');
    
    // Take screenshot with validation errors
    cy.get('[data-testid="journal-entry-form"]')
      .compareSnapshot('journal-entry-form-validation-errors', {
        threshold: 0.1,
        thresholdType: 'percent'
      });
  });

  it('should match baseline for form with data entered', () => {
    // Fill in form data
    cy.get('[data-testid="journal-entry-description"]')
      .type('Visual regression test entry');
    
    cy.get('[data-testid="journal-entry-date"]')
      .type('2025-06-14');
    
    // Add first line
    cy.get('[data-testid="add-line-btn"]').click();
    cy.get('[data-testid="line-0-account"]').select('7980');
    cy.get('[data-testid="line-0-type"]').select('debit');
    cy.get('[data-testid="line-0-amount"]').type('100.00');
    cy.get('[data-testid="line-0-description"]').type('Test debit line');
    
    // Add second line
    cy.get('[data-testid="add-line-btn"]').click();
    cy.get('[data-testid="line-1-account"]').select('8011');
    cy.get('[data-testid="line-1-type"]').select('credit');
    cy.get('[data-testid="line-1-amount"]').type('100.00');
    cy.get('[data-testid="line-1-description"]').type('Test credit line');
    
    // Take screenshot with data
    cy.get('[data-testid="journal-entry-form"]')
      .compareSnapshot('journal-entry-form-with-data', {
        threshold: 0.1,
        thresholdType: 'percent'
      });
  });

  it('should match baseline for balance indicator states', () => {
    // Test unbalanced state
    cy.get('[data-testid="add-line-btn"]').click();
    cy.get('[data-testid="line-0-account"]').select('7980');
    cy.get('[data-testid="line-0-type"]').select('debit');
    cy.get('[data-testid="line-0-amount"]').type('100.00');
    
    // Take screenshot of unbalanced state
    cy.get('[data-testid="balance-indicator"]')
      .compareSnapshot('balance-indicator-unbalanced', {
        threshold: 0.1,
        thresholdType: 'percent'
      });
    
    // Add balancing line
    cy.get('[data-testid="add-line-btn"]').click();
    cy.get('[data-testid="line-1-account"]').select('8011');
    cy.get('[data-testid="line-1-type"]').select('credit');
    cy.get('[data-testid="line-1-amount"]').type('100.00');
    
    // Take screenshot of balanced state
    cy.get('[data-testid="balance-indicator"]')
      .compareSnapshot('balance-indicator-balanced', {
        threshold: 0.1,
        thresholdType: 'percent'
      });
  });
});