// Support file for e2e tests
import './commands';

// Configure global behavior for all tests
beforeEach(() => {
  // Clear any existing cookies/session data before each test
  cy.clearCookies();
  cy.clearLocalStorage();
});

// Type definitions for custom commands
declare global {
  namespace Cypress {
    interface Chainable {
      // Add type definitions for custom commands here
    }
  }
}