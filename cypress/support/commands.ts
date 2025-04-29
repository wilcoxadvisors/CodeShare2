/// <reference types="cypress" />

// Login command for authentication
Cypress.Commands.add('login', (username: string, password: string) => {
  cy.session([username, password], () => {
    cy.visit('/login');
    cy.get('[data-cy=username]').type(username);
    cy.get('[data-cy=password]').type(password);
    cy.get('[data-cy=login-button]').click();
    cy.url().should('not.include', '/login');
  });
});

// File upload command (requires cypress-file-upload plugin)
Cypress.Commands.add('attachFile', (fileName: string) => {
  cy.get('[data-cy=file-upload]').attachFile(fileName);
});

// Add more custom commands here as needed