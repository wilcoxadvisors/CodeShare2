// Custom commands for Cypress tests
/// <reference types="cypress" />

// Login command
Cypress.Commands.add('login', (email, password) => {
  cy.visit('/login');
  cy.get('input[name="email"]').type(email);
  cy.get('input[name="password"]').type(password);
  cy.get('form').submit();
  cy.url().should('not.include', '/login');
  cy.getCookie('connect.sid').should('exist');
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
      login(email: string, password: string): Chainable<void>
      attachFile(fileName: string): Chainable<Element>
    }
  }
}