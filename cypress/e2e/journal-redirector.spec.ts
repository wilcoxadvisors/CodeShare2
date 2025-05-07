describe('Journal redirector navigation flow', () => {
  beforeEach(() => {
    // Login before each test
    cy.visit('/login')
    cy.get('input[name="username"]').type('admin')
    cy.get('input[name="password"]').type('admin')
    cy.get('button[type="submit"]').click()
    cy.url().should('include', '/dashboard')
  })

  it('should show placeholder when no entity is selected', () => {
    // Visit journal entries page directly
    cy.visit('/journal-entries')
    
    // Check if placeholder is shown
    cy.contains('Select a Client & Entity').should('be.visible')
  })

  it('should load journal entries when client and entity are selected', () => {
    // Go to dashboard first
    cy.visit('/dashboard')
    
    // Select client and entity from context selector
    cy.get('[data-cy="client-selector"]').click()
    cy.get('[data-cy="client-option"]').first().click()
    cy.get('[data-cy="entity-selector"]').click()
    cy.get('[data-cy="entity-option"]').first().click()
    
    // Navigate to journal entries
    cy.visit('/journal-entries')
    
    // Verify journal entries list is shown (not the placeholder)
    cy.contains('Journal Entries').should('be.visible')
    cy.contains('Select a Client & Entity').should('not.exist')
  })
})