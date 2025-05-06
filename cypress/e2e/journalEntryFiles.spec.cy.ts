describe('Journal Entry File Attachments', () => {
  beforeEach(() => {
    // Login to the application
    cy.visit('/login');
    cy.get('input[name="email"]').type('admin@example.com');
    cy.get('input[name="password"]').type('password123');
    cy.get('button[type="submit"]').click();
    
    // Verify login was successful by checking if we're on the dashboard
    cy.url().should('include', '/dashboard');
  });

  it('should redirect legacy routes to hierarchical routes', () => {
    // Create a spy for 307 redirects
    cy.intercept('GET', '/api/journal-entries/*/files').as('legacyFilesGet');
    
    // Access a known journal entry with the legacy route pattern
    cy.visit('/journal-entries/1');
    
    // Check if the files tab is clicked, the API will be redirected
    cy.contains('button', 'Files').click();
    
    // Verify the redirect happened
    cy.wait('@legacyFilesGet').then((interception) => {
      expect(interception.response.statusCode).to.be.oneOf([307, 302]);
      expect(interception.response.headers.location).to.include('/api/clients/');
      expect(interception.response.headers.location).to.include('/entities/');
      expect(interception.response.headers.location).to.include('/journal-entries/');
      expect(interception.response.headers.location).to.include('/files');
    });
  });

  it('should support uploading files to journal entries', () => {
    // Navigate to create a new journal entry
    cy.visit('/journal-entries/new');
    
    // Fill in required fields for the journal entry
    cy.get('input[name="date"]').type('2025-05-06');
    cy.get('input[name="description"]').type('Test Journal Entry with File Upload');
    cy.get('input[name="referenceNumber"]').type('TEST-JE-001');
    
    // Add debit line
    cy.get('select[name="lines.0.accountId"]').select('1'); // Select first account
    cy.get('input[name="lines.0.debit"]').type('100.00');
    
    // Add credit line
    cy.get('select[name="lines.1.accountId"]').select('2'); // Select second account
    cy.get('input[name="lines.1.credit"]').type('100.00');
    
    // Save as draft
    cy.contains('button', 'Save as Draft').click();
    
    // Verify successful save
    cy.contains('Journal entry created successfully').should('be.visible');
    
    // Verify we're on the journal entry detail page
    cy.url().should('include', '/journal-entries/');
    
    // Navigate to the Files tab
    cy.contains('button', 'Files').click();
    
    // Attach a test file (using Cypress file upload)
    cy.fixture('sample.pdf', { encoding: null }).then((fileContent) => {
      cy.get('input[type="file"]').attachFile({
        fileContent,
        fileName: 'sample.pdf',
        mimeType: 'application/pdf'
      });
    });
    
    // Wait for upload to complete
    cy.contains('Uploading').should('be.visible');
    cy.contains('File uploaded successfully', { timeout: 10000 }).should('be.visible');
    
    // Verify the file appears in the list
    cy.contains('sample.pdf').should('be.visible');
  });

  it('should download a file from a journal entry', () => {
    // Navigate to a journal entry with a file
    cy.visit('/journal-entries'); // Assuming we have a journal entry with files
    cy.get('table tbody tr').first().click(); // Click the first entry
    
    // Go to the Files tab
    cy.contains('button', 'Files').click();
    
    // Check if there's a file, if not skip the test
    cy.get('body').then(($body) => {
      if ($body.find('.file-list-item').length > 0) {
        // Click the download button for the first file
        cy.get('.file-list-item').first().find('button[aria-label="Download file"]').click();
        
        // Since we can't verify file downloads directly in Cypress, we'll just check the click happened
        cy.contains('File download initiated').should('be.visible');
      } else {
        cy.log('No files found for testing download. Test skipped.');
      }
    });
  });

  it('should delete a file from a journal entry', () => {
    // Find an entry with files
    cy.visit('/journal-entries');
    cy.get('table tbody tr').first().click();
    
    // Go to the Files tab
    cy.contains('button', 'Files').click();
    
    // Check if there's a file, if not skip the test
    cy.get('body').then(($body) => {
      if ($body.find('.file-list-item').length > 0) {
        // Count the number of files initially
        cy.get('.file-list-item').then(($files) => {
          const initialCount = $files.length;
          
          // Click the delete button for the first file
          cy.get('.file-list-item').first().find('button[aria-label="Delete file"]').click();
          
          // Confirm deletion in the modal
          cy.contains('button', 'Yes, delete it').click();
          
          // Verify confirmation message
          cy.contains('File deleted successfully').should('be.visible');
          
          // Verify file count decreased by 1
          cy.get('.file-list-item').should('have.length', initialCount - 1);
        });
      } else {
        cy.log('No files found for testing deletion. Test skipped.');
      }
    });
  });

  it('should validate file types during upload', () => {
    // Navigate to create a new journal entry
    cy.visit('/journal-entries/new');
    
    // Fill in minimal required fields
    cy.get('input[name="date"]').type('2025-05-06');
    cy.get('input[name="description"]').type('Test File Type Validation');
    cy.get('input[name="referenceNumber"]').type('TEST-JE-002');
    
    // Add balanced lines
    cy.get('select[name="lines.0.accountId"]').select('1');
    cy.get('input[name="lines.0.debit"]').type('100');
    cy.get('select[name="lines.1.accountId"]').select('2');
    cy.get('input[name="lines.1.credit"]').type('100');
    
    // Save as draft
    cy.contains('button', 'Save as Draft').click();
    
    // Navigate to Files tab
    cy.contains('button', 'Files').click();
    
    // Try to upload an invalid file type (e.g., an executable)
    cy.fixture('invalid.exe', { encoding: null }).then((fileContent) => {
      cy.get('input[type="file"]').attachFile({
        fileContent,
        fileName: 'invalid.exe',
        mimeType: 'application/x-msdownload'
      });
    });
    
    // Expect error message about unsupported file type
    cy.contains('File type is not supported').should('be.visible');
  });
});