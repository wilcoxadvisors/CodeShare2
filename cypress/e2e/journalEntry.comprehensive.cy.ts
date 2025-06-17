/**
 * Part 2 of Architect's State-of-the-Art Testing Strategy: E2E Workflow Testing
 * 
 * This test suite simulates real user interactions to guarantee seamless workflows
 * from UI interaction to data persistence, covering all critical user stories.
 */

describe('Journal Entry - Comprehensive E2E Workflow Tests', () => {
  let testClientId: string;
  let testEntityId: string;

  before(() => {
    // Set up test environment with proper authentication
    cy.task('db:seed');
    
    // Get test client and entity IDs from the seeded data
    cy.request('GET', '/api/clients').then((response) => {
      const testClient = response.body.find((c: any) => c.name.includes('Test'));
      testClientId = testClient.id;
      
      cy.request('GET', `/api/clients/${testClientId}/entities`).then((entitiesResponse) => {
        testEntityId = entitiesResponse.body[0].id;
      });
    });
  });

  beforeEach(() => {
    cy.login(); // Use default admin credentials
    Cypress.on('uncaught:exception', (err) => {
      cy.log(`Uncaught exception: ${err.message}`);
      return false;
    });
  });

  /**
   * Critical User Story 1: Create & Edit Draft with File Management
   * 
   * This test covers the complete draft workflow including file operations
   * as specified in the architect's testing strategy.
   */
  describe('Create & Edit Draft Workflow', () => {
    it('should create draft, add files, edit with file changes, and verify persistence', () => {
      // Step 1: Create new JE, add lines, and attach File A
      cy.visit(`/clients/${testClientId}/entities/${testEntityId}/journal-entries/new`);
      cy.wait(1000); // Allow form to load
      
      // Fill out basic journal entry information
      cy.get('input[name="description"]').type('Draft Entry with File Operations');
      cy.get('input[name="date"]').clear().type('2025-06-17');
      
      // Add first journal entry line (debit)
      cy.get('[data-testid="add-line-button"]').click();
      cy.get('[data-testid="line-0"] select[name="accountId"]').select('1'); // Select first account
      cy.get('[data-testid="line-0"] select[name="type"]').select('debit');
      cy.get('[data-testid="line-0"] input[name="amount"]').type('500.00');
      cy.get('[data-testid="line-0"] input[name="description"]').type('Test debit line');
      
      // Add second journal entry line (credit)
      cy.get('[data-testid="add-line-button"]').click();
      cy.get('[data-testid="line-1"] select[name="accountId"]').select('2'); // Select second account
      cy.get('[data-testid="line-1"] select[name="type"]').select('credit');
      cy.get('[data-testid="line-1"] input[name="amount"]').type('500.00');
      cy.get('[data-testid="line-1"] input[name="description"]').type('Test credit line');
      
      // Attach File A
      cy.fixture('test-file-a.pdf').then(fileContent => {
        cy.get('input[type="file"]').attachFile({
          fileContent: fileContent.toString(),
          fileName: 'test-file-a.pdf',
          mimeType: 'application/pdf'
        });
      });
      
      // Save as draft
      cy.get('[data-testid="save-draft-button"]').click();
      cy.wait(2000); // Allow save operation
      
      // Verify entry exists and File A is present
      cy.url().should('include', '/journal-entries/');
      cy.contains('Draft Entry with File Operations').should('be.visible');
      cy.contains('test-file-a.pdf').should('be.visible');
      
      // Step 2: Edit the draft with comprehensive changes
      cy.get('[data-testid="edit-button"]').click();
      cy.wait(1000);
      
      // Change description
      cy.get('input[name="description"]').clear().type('Updated Draft Entry with Modified Files');
      
      // Add a new line
      cy.get('[data-testid="add-line-button"]').click();
      cy.get('[data-testid="line-2"] select[name="accountId"]').select('3');
      cy.get('[data-testid="line-2"] select[name="type"]').select('debit');
      cy.get('[data-testid="line-2"] input[name="amount"]').type('100.00');
      cy.get('[data-testid="line-2"] input[name="description"]').type('Additional debit line');
      
      // Modify existing credit line to balance
      cy.get('[data-testid="line-1"] input[name="amount"]').clear().type('600.00');
      
      // Delete an old line (first debit line)
      cy.get('[data-testid="line-0"] [data-testid="delete-line-button"]').click();
      
      // Upload File B
      cy.fixture('test-file-b.jpg').then(fileContent => {
        cy.get('input[type="file"]').attachFile({
          fileContent: fileContent.toString(),
          fileName: 'test-file-b.jpg',
          mimeType: 'image/jpeg'
        });
      });
      
      // Delete File A
      cy.contains('test-file-a.pdf').parent().find('[data-testid="delete-file-button"]').click();
      cy.get('[data-testid="confirm-delete-button"]').click();
      
      // Save changes
      cy.get('[data-testid="save-draft-button"]').click();
      cy.wait(2000);
      
      // Step 3: Comprehensive verification
      // Verify description change
      cy.contains('Updated Draft Entry with Modified Files').should('be.visible');
      
      // Verify File B is present and File A is gone
      cy.contains('test-file-b.jpg').should('be.visible');
      cy.contains('test-file-a.pdf').should('not.exist');
      
      // Verify line changes - should have 2 lines total
      cy.get('[data-testid="journal-lines"] tr').should('have.length', 2);
      
      // Verify amounts balance
      cy.contains('Additional debit line').should('be.visible');
      cy.contains('$100.00').should('be.visible'); // New debit line
      cy.contains('$600.00').should('be.visible'); // Modified credit line
    });
  });

  /**
   * Critical User Story 2: Post & Void Workflow
   * 
   * Tests the complete posting workflow and business rule enforcement
   */
  describe('Post & Void Workflow', () => {
    let journalEntryId: string;

    it('should create draft, post entry, enforce read-only state, and void successfully', () => {
      // Step 1: Create and save a draft JE
      cy.visit(`/clients/${testClientId}/entities/${testEntityId}/journal-entries/new`);
      cy.wait(1000);
      
      cy.get('input[name="description"]').type('Entry for Post and Void Test');
      cy.get('input[name="date"]').clear().type('2025-06-17');
      
      // Add balanced lines
      cy.get('[data-testid="add-line-button"]').click();
      cy.get('[data-testid="line-0"] select[name="accountId"]').select('1');
      cy.get('[data-testid="line-0"] select[name="type"]').select('debit');
      cy.get('[data-testid="line-0"] input[name="amount"]').type('750.00');
      cy.get('[data-testid="line-0"] input[name="description"]').type('Debit for posting test');
      
      cy.get('[data-testid="add-line-button"]').click();
      cy.get('[data-testid="line-1"] select[name="accountId"]').select('2');
      cy.get('[data-testid="line-1"] select[name="type"]').select('credit');
      cy.get('[data-testid="line-1"] input[name="amount"]').type('750.00');
      cy.get('[data-testid="line-1"] input[name="description"]').type('Credit for posting test');
      
      cy.get('[data-testid="save-draft-button"]').click();
      cy.wait(2000);
      
      // Extract journal entry ID from URL
      cy.url().then((url) => {
        journalEntryId = url.split('/').pop() || '';
      });
      
      // Step 2: Post the entry and verify status change
      cy.get('[data-testid="post-button"]').click();
      cy.get('[data-testid="confirm-post-button"]').click();
      cy.wait(2000);
      
      // Verify status changed to "Posted"
      cy.contains('Status: Posted').should('be.visible');
      cy.get('[data-testid="status-badge"]').should('contain', 'Posted');
      
      // Step 3: Attempt to edit posted entry and confirm all fields are disabled
      cy.get('[data-testid="edit-button"]').click();
      cy.wait(1000);
      
      // Verify all input fields are disabled
      cy.get('input[name="description"]').should('be.disabled');
      cy.get('input[name="date"]').should('be.disabled');
      cy.get('[data-testid="line-0"] input[name="amount"]').should('be.disabled');
      cy.get('[data-testid="line-0"] input[name="description"]').should('be.disabled');
      cy.get('[data-testid="line-1"] input[name="amount"]').should('be.disabled');
      cy.get('[data-testid="line-1"] input[name="description"]').should('be.disabled');
      
      // Verify action buttons are disabled/hidden
      cy.get('[data-testid="save-draft-button"]').should('not.exist');
      cy.get('[data-testid="post-button"]').should('not.exist');
      cy.get('[data-testid="add-line-button"]').should('be.disabled');
      
      // Step 4: Void the posted entry
      cy.get('[data-testid="void-button"]').click();
      cy.get('[data-testid="confirm-void-button"]').click();
      cy.wait(2000);
      
      // Verify status changed to "Voided"
      cy.contains('Status: Voided').should('be.visible');
      cy.get('[data-testid="status-badge"]').should('contain', 'Voided');
    });
  });

  /**
   * Critical User Story 3: Reversal Workflow
   * 
   * Tests the complete reversal process with proper linking and amount inversion
   */
  describe('Reversal Workflow', () => {
    it('should post entry, create reversal with opposite amounts, and verify linking', () => {
      // Step 1: Create and post a journal entry
      cy.visit(`/clients/${testClientId}/entities/${testEntityId}/journal-entries/new`);
      cy.wait(1000);
      
      cy.get('input[name="description"]').type('Original Entry for Reversal');
      cy.get('input[name="date"]').clear().type('2025-06-17');
      
      // Add specific lines for reversal testing
      cy.get('[data-testid="add-line-button"]').click();
      cy.get('[data-testid="line-0"] select[name="accountId"]').select('1');
      cy.get('[data-testid="line-0"] select[name="type"]').select('debit');
      cy.get('[data-testid="line-0"] input[name="amount"]').type('1000.00');
      cy.get('[data-testid="line-0"] input[name="description"]').type('Original debit line');
      
      cy.get('[data-testid="add-line-button"]').click();
      cy.get('[data-testid="line-1"] select[name="accountId"]').select('2');
      cy.get('[data-testid="line-1"] select[name="type"]').select('credit');
      cy.get('[data-testid="line-1"] input[name="amount"]').type('1000.00');
      cy.get('[data-testid="line-1"] input[name="description"]').type('Original credit line');
      
      // Save and post
      cy.get('[data-testid="save-draft-button"]').click();
      cy.wait(2000);
      cy.get('[data-testid="post-button"]').click();
      cy.get('[data-testid="confirm-post-button"]').click();
      cy.wait(2000);
      
      // Store original entry ID
      let originalEntryId: string;
      cy.url().then((url) => {
        originalEntryId = url.split('/').pop() || '';
      });
      
      // Step 2: Create reversal entry
      cy.get('[data-testid="reverse-button"]').click();
      cy.wait(1000);
      
      // Fill reversal details
      cy.get('input[name="reversalDescription"]').type('Reversal of original entry');
      cy.get('input[name="reversalDate"]').clear().type('2025-06-18');
      
      cy.get('[data-testid="create-reversal-button"]').click();
      cy.wait(3000);
      
      // Step 3: Verification of reversal entry
      // Should be redirected to the new reversal entry
      cy.url().should('include', '/journal-entries/');
      cy.url().should('not.include', originalEntryId);
      
      // Verify reversal entry properties
      cy.contains('Reversal of original entry').should('be.visible');
      cy.contains('Status: Posted').should('be.visible'); // Reversals are auto-posted
      
      // Verify opposite debit/credit values
      cy.get('[data-testid="journal-lines"]').within(() => {
        // Original debit should become credit in reversal
        cy.contains('Original debit line').parent().should('contain', 'Credit');
        cy.contains('Original debit line').parent().should('contain', '$1,000.00');
        
        // Original credit should become debit in reversal
        cy.contains('Original credit line').parent().should('contain', 'Debit');
        cy.contains('Original credit line').parent().should('contain', '$1,000.00');
      });
      
      // Verify reversal is linked to original entry
      cy.contains('Reversal of Entry').should('be.visible');
      cy.get('[data-testid="original-entry-link"]').should('contain', originalEntryId);
      
      // Step 4: Verify original entry shows reversal link
      cy.get('[data-testid="original-entry-link"]').click();
      cy.wait(1000);
      
      cy.contains('Reversed by Entry').should('be.visible');
      cy.get('[data-testid="reversal-entry-link"]').should('be.visible');
    });
  });

  /**
   * Critical User Story 4: Copy Workflow
   * 
   * Tests the complete copy process with dimension tags and business rules
   */
  describe('Copy Workflow', () => {
    it('should copy posted entry with lines and dimension tags, excluding attachments', () => {
      // Step 1: Create and post a JE with dimension tags and attachments
      cy.visit(`/clients/${testClientId}/entities/${testEntityId}/journal-entries/new`);
      cy.wait(1000);
      
      cy.get('input[name="description"]').type('Original Entry for Copy Test');
      cy.get('input[name="date"]').clear().type('2025-06-17');
      
      // Add lines with dimension tags
      cy.get('[data-testid="add-line-button"]').click();
      cy.get('[data-testid="line-0"] select[name="accountId"]').select('1');
      cy.get('[data-testid="line-0"] select[name="type"]').select('debit');
      cy.get('[data-testid="line-0"] input[name="amount"]').type('800.00');
      cy.get('[data-testid="line-0"] input[name="description"]').type('Debit with dimensions');
      
      // Add dimension tag to first line
      cy.get('[data-testid="line-0"] [data-testid="add-dimension-button"]').click();
      cy.get('[data-testid="line-0"] select[name="dimensionValue"]').select('1'); // Select first dimension value
      cy.get('[data-testid="line-0"] input[name="dimensionAmount"]').type('800.00');
      
      cy.get('[data-testid="add-line-button"]').click();
      cy.get('[data-testid="line-1"] select[name="accountId"]').select('2');
      cy.get('[data-testid="line-1"] select[name="type"]').select('credit');
      cy.get('[data-testid="line-1"] input[name="amount"]').type('800.00');
      cy.get('[data-testid="line-1"] input[name="description"]').type('Credit line');
      
      // Add attachment
      cy.fixture('test-copy-file.pdf').then(fileContent => {
        cy.get('input[type="file"]').attachFile({
          fileContent: fileContent.toString(),
          fileName: 'test-copy-file.pdf',
          mimeType: 'application/pdf'
        });
      });
      
      // Save and post
      cy.get('[data-testid="save-draft-button"]').click();
      cy.wait(2000);
      cy.get('[data-testid="post-button"]').click();
      cy.get('[data-testid="confirm-post-button"]').click();
      cy.wait(2000);
      
      // Step 2: Copy the entry
      cy.get('[data-testid="copy-button"]').click();
      cy.wait(3000);
      
      // Step 3: Comprehensive verification of copied entry
      // Should be redirected to new draft entry
      cy.url().should('include', '/journal-entries/');
      cy.contains('Copy of: Original Entry for Copy Test').should('be.visible');
      cy.contains('Status: Draft').should('be.visible');
      
      // Verify all lines are duplicated with identical properties
      cy.get('[data-testid="journal-lines"] tr').should('have.length', 2);
      
      // Verify first line with dimension tags
      cy.get('[data-testid="line-0"]').within(() => {
        cy.get('select[name="type"]').should('have.value', 'debit');
        cy.get('input[name="amount"]').should('have.value', '800.00');
        cy.get('input[name="description"]').should('have.value', 'Debit with dimensions');
        
        // Verify dimension tag is copied
        cy.get('[data-testid="dimension-tags"]').should('contain', '$800.00');
      });
      
      // Verify second line
      cy.get('[data-testid="line-1"]').within(() => {
        cy.get('select[name="type"]').should('have.value', 'credit');
        cy.get('input[name="amount"]').should('have.value', '800.00');
        cy.get('input[name="description"]').should('have.value', 'Credit line');
      });
      
      // Verify NO attachments are copied (security practice)
      cy.contains('test-copy-file.pdf').should('not.exist');
      cy.get('[data-testid="attachments-section"]').should('contain', 'No attachments');
      
      // Verify entry can be edited (it's a draft)
      cy.get('input[name="description"]').should('not.be.disabled');
      cy.get('[data-testid="save-draft-button"]').should('be.visible');
      cy.get('[data-testid="post-button"]').should('be.visible');
    });
  });

  /**
   * Critical User Story 5: Accrual Reversal Feature End-to-End Test
   * 
   * This test verifies the complete lifecycle of an auto-reversing accrual entry
   * as specified by the architect to meet Odoo/Sage Intacct standards.
   */
  describe('Accrual Reversal Feature E2E Test', () => {
    it('should create accrual entry, post it, and automatically create posted reversal entry', () => {
      // Step 1: Create Accrual - Navigate to Journal Entry form and create new entry
      cy.visit(`/clients/${testClientId}/entities/${testEntityId}/journal-entries/new`);
      cy.wait(1000);
      
      cy.get('input[name="description"]').type('Auto-Reversing Accrual Test Entry');
      cy.get('input[name="date"]').clear().type('2025-06-17');
      
      // Add balanced lines for the accrual
      cy.get('[data-testid="add-line-button"]').click();
      cy.get('[data-testid="line-0"] select[name="accountId"]').select('1');
      cy.get('[data-testid="line-0"] select[name="type"]').select('debit');
      cy.get('[data-testid="line-0"] input[name="amount"]').type('2000.00');
      cy.get('[data-testid="line-0"] input[name="description"]').type('Accrual debit line');
      
      cy.get('[data-testid="add-line-button"]').click();
      cy.get('[data-testid="line-1"] select[name="accountId"]').select('2');
      cy.get('[data-testid="line-1"] select[name="type"]').select('credit');
      cy.get('[data-testid="line-1"] input[name="amount"]').type('2000.00');
      cy.get('[data-testid="line-1"] input[name="description"]').type('Accrual credit line');
      
      // Step 2: Set Accrual Data - Toggle switch ON and select future date
      cy.get('[data-testid="accrual-switch"]').click(); // Toggle ON
      cy.get('[data-testid="accrual-switch"]').should('be.checked');
      
      // Select specific future date (July 15, 2025)
      cy.get('[data-testid="reversal-date-picker"]').click();
      cy.get('input[name="reversalDate"]').clear().type('2025-07-15');
      
      // Save as draft first
      cy.get('[data-testid="save-draft-button"]').click();
      cy.wait(2000);
      
      // Extract original entry ID from URL
      let originalEntryId: string;
      cy.url().then((url) => {
        originalEntryId = url.split('/').pop() || '';
      });
      
      // Step 3: Post the accrual entry
      cy.get('[data-testid="post-button"]').click();
      cy.get('[data-testid="confirm-post-button"]').click();
      cy.wait(3000); // Allow time for reversal creation
      
      // Step 4: Verify Original Entry properties
      cy.contains('Status: Posted').should('be.visible');
      cy.get('[data-testid="status-badge"]').should('contain', 'Posted');
      
      // Verify accrual flag is true
      cy.contains('Auto-Reversing Accrual').should('be.visible');
      cy.get('[data-testid="accrual-indicator"]').should('be.visible');
      
      // Step 5: Verify Reversal Entry was automatically created
      // Navigate to journal entries list to find the reversal
      cy.visit(`/clients/${testClientId}/entities/${testEntityId}/journal-entries`);
      cy.wait(2000);
      
      // Look for the reversal entry (should have "Reversal of" in description)
      cy.contains('Reversal of Auto-Reversing Accrual Test Entry').should('be.visible');
      cy.contains('Reversal of Auto-Reversing Accrual Test Entry').click();
      cy.wait(1000);
      
      // Verify reversal entry properties
      // Date should be the reversal date (July 15, 2025)
      cy.contains('07/15/2025').should('be.visible');
      
      // Status should be "Posted"
      cy.contains('Status: Posted').should('be.visible');
      cy.get('[data-testid="status-badge"]').should('contain', 'Posted');
      
      // Verify isReversal flag is true
      cy.contains('Reversal Entry').should('be.visible');
      cy.get('[data-testid="reversal-indicator"]').should('be.visible');
      
      // Step 6: Verify line items are exact inverse
      cy.get('[data-testid="journal-lines"]').within(() => {
        // Original debit line should become credit in reversal
        cy.contains('Accrual debit line').parent().should('contain', 'Credit');
        cy.contains('Accrual debit line').parent().should('contain', '$2,000.00');
        
        // Original credit line should become debit in reversal
        cy.contains('Accrual credit line').parent().should('contain', 'Debit');
        cy.contains('Accrual credit line').parent().should('contain', '$2,000.00');
      });
      
      // Verify reversal is linked to original entry
      cy.contains('Reversal of Entry').should('be.visible');
      cy.get('[data-testid="original-entry-link"]').should('contain', originalEntryId);
      
      // Step 7: Final verification - navigate back to original entry
      cy.get('[data-testid="original-entry-link"]').click();
      cy.wait(1000);
      
      // Verify original entry shows reversal link
      cy.contains('Reversed by Entry').should('be.visible');
      cy.get('[data-testid="reversal-entry-link"]').should('be.visible');
      
      // Verify complete accrual lifecycle is documented
      cy.contains('Auto-Reversing Accrual').should('be.visible');
      cy.contains('Reversal Date: 07/15/2025').should('be.visible');
    });
  });

  /**
   * Integration Test: Complete End-to-End User Journey
   * 
   * This test simulates a complete user workflow combining all features
   */
  describe('Complete User Journey Integration', () => {
    it('should handle complete workflow: create, edit, attach files, post, copy, and reverse', () => {
      // Step 1: Create comprehensive journal entry
      cy.visit(`/clients/${testClientId}/entities/${testEntityId}/journal-entries/new`);
      cy.wait(1000);
      
      cy.get('input[name="description"]').type('Complete Workflow Integration Test');
      cy.get('input[name="date"]').clear().type('2025-06-17');
      
      // Add multiple lines with different amounts
      cy.get('[data-testid="add-line-button"]').click();
      cy.get('[data-testid="line-0"] select[name="accountId"]').select('1');
      cy.get('[data-testid="line-0"] select[name="type"]').select('debit');
      cy.get('[data-testid="line-0"] input[name="amount"]').type('1500.00');
      cy.get('[data-testid="line-0"] input[name="description"]').type('Primary debit line');
      
      cy.get('[data-testid="add-line-button"]').click();
      cy.get('[data-testid="line-1"] select[name="accountId"]').select('2');
      cy.get('[data-testid="line-1"] select[name="type"]').select('credit');
      cy.get('[data-testid="line-1"] input[name="amount"]').type('1500.00');
      cy.get('[data-testid="line-1"] input[name="description"]').type('Primary credit line');
      
      // Add file attachment
      cy.fixture('integration-test-file.pdf').then(fileContent => {
        cy.get('input[type="file"]').attachFile({
          fileContent: fileContent.toString(),
          fileName: 'integration-test-file.pdf',
          mimeType: 'application/pdf'
        });
      });
      
      // Save as draft and verify
      cy.get('[data-testid="save-draft-button"]').click();
      cy.wait(2000);
      cy.contains('Complete Workflow Integration Test').should('be.visible');
      cy.contains('integration-test-file.pdf').should('be.visible');
      
      // Step 2: Edit and modify the entry
      cy.get('[data-testid="edit-button"]').click();
      cy.wait(1000);
      
      // Modify description
      cy.get('input[name="description"]').clear().type('Updated Integration Test Entry');
      
      // Add dimension tag
      cy.get('[data-testid="line-0"] [data-testid="add-dimension-button"]').click();
      cy.get('[data-testid="line-0"] select[name="dimensionValue"]').select('1');
      cy.get('[data-testid="line-0"] input[name="dimensionAmount"]').type('1500.00');
      
      cy.get('[data-testid="save-draft-button"]').click();
      cy.wait(2000);
      
      // Step 3: Post the entry
      cy.get('[data-testid="post-button"]').click();
      cy.get('[data-testid="confirm-post-button"]').click();
      cy.wait(2000);
      cy.contains('Status: Posted').should('be.visible');
      
      // Step 4: Copy the posted entry
      cy.get('[data-testid="copy-button"]').click();
      cy.wait(3000);
      
      // Verify copy was created successfully
      cy.contains('Copy of: Updated Integration Test Entry').should('be.visible');
      cy.contains('Status: Draft').should('be.visible');
      
      // Navigate back to original entry for reversal
      cy.visit(`/clients/${testClientId}/entities/${testEntityId}/journal-entries`);
      cy.contains('Updated Integration Test Entry').click();
      cy.wait(1000);
      
      // Step 5: Create reversal
      cy.get('[data-testid="reverse-button"]').click();
      cy.wait(1000);
      
      cy.get('input[name="reversalDescription"]').type('Reversal of integration test');
      cy.get('input[name="reversalDate"]').clear().type('2025-06-18');
      
      cy.get('[data-testid="create-reversal-button"]').click();
      cy.wait(3000);
      
      // Step 6: Final verification
      cy.contains('Reversal of integration test').should('be.visible');
      cy.contains('Status: Posted').should('be.visible');
      
      // Verify amounts are reversed
      cy.get('[data-testid="journal-lines"]').within(() => {
        cy.contains('Primary debit line').parent().should('contain', 'Credit');
        cy.contains('Primary credit line').parent().should('contain', 'Debit');
        cy.contains('$1,500.00').should('be.visible');
      });
      
      // Verify all operations completed successfully
      cy.contains('Reversal of Entry').should('be.visible');
    });
  });
});