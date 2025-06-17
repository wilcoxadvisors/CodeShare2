// Custom commands for Cypress tests
/// <reference types="cypress" />

// Login command using API request for better reliability
Cypress.Commands.add('login', (username = 'admin', password = 'password123') => {
  cy.request({
    method: 'POST',
    url: '/api/auth/login',
    body: {
      username,
      password
    },
    failOnStatusCode: false
  }).then((response) => {
    expect(response.status).to.eq(200);
    expect(response.body).to.have.property('success', true);
    
    // The session cookie should be automatically handled by Cypress
    // Verify we received authentication
    cy.getCookie('connect.sid').should('exist');
  });
});

// Command to upload files
Cypress.Commands.add('attachFile', { prevSubject: 'element' }, (subject, fileName) => {
  cy.fixture(fileName, 'base64').then(content => {
    const testFile = new File([Cypress.Blob.base64StringToBlob(content)], fileName);
    const dataTransfer = new DataTransfer();
    dataTransfer.items.add(testFile);
    
    subject[0].files = dataTransfer.files;
    return cy.wrap(subject).trigger('change', { force: true });
  });
});

// Add more custom commands as needed

declare global {
  namespace Cypress {
    interface Chainable {
      login(username?: string, password?: string): Chainable<void>
      attachFile(fileName: string): Chainable<Element>
    }
  }
}