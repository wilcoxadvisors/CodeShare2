// Tests for Journal Entry functionality
describe('Journal Entry Form', () => {
  beforeEach(() => {
    cy.login('admin@example.com', 'password');
    Cypress.on('uncaught:exception', (err) => {
      // Returning false here prevents Cypress from failing the test on uncaught exceptions
      cy.log(`Uncaught exception: ${err.message}`);
      return false;
    });
    cy.visit('/entities/1/journal-entries/new');
    cy.get('form').should('exist');
    cy.contains('h2', 'Create Journal Entry').should('be.visible');
  });

  it('preserves selected date without timezone shifts', () => {
    cy.get('input[type="date"]').clear().type('2025-04-29');
    cy.get('input[name="description"]').type('Test date entry');
    cy.get('form').submit();
    
    // Verify the created entry has the correct date
    cy.contains('tr', 'Test date entry').within(() => {
      cy.contains('td', '04/29/2025').should('be.visible');
    });
  });

  it('supports file attachments in draft mode', () => {
    // Create a draft journal entry with attachments
    cy.get('input[name="description"]').type('Entry with attachments');
    
    // Simulating a file upload
    cy.get('input[type="file"]').attachFile('test-file.pdf');
    
    // Save as draft
    cy.contains('button', 'Save Draft').click();
    
    // Verify the entry was created and has an attachment
    cy.contains('Entry with attachments').should('be.visible');
    cy.contains('View').click();
    
    // Verify attachment is listed
    cy.contains('test-file.pdf').should('be.visible');
  });

  it('handles attachment uploads when posting directly', () => {
    // Create a journal entry with attachments and post immediately
    cy.get('input[name="description"]').type('Entry with immediate post');
    
    // Add an attachment
    cy.get('input[type="file"]').attachFile('test-file.pdf');
    
    // Fill in required fields for a valid journal entry
    cy.get('input[name="accountId"]').first().select('101');
    cy.get('input[name="debit"]').first().type('100.00');
    cy.get('input[name="accountId"]').last().select('201');
    cy.get('input[name="credit"]').last().type('100.00');
    
    // Post directly
    cy.contains('button', 'Post Entry').click();
    
    // Verify the entry was created as a posted entry with attachment
    cy.contains('tr', 'Entry with immediate post').within(() => {
      cy.contains('td', 'Posted').should('be.visible');
    });
    
    // View the entry to verify attachment
    cy.contains('View').click();
    cy.contains('test-file.pdf').should('be.visible');
  });
});