describe('Journal Entry end-to-end', () => {
  it('creates, posts and reopens an entry with attachments and exact date', () => {
    cy.login('admin', 'adminpassword');
    const date = Cypress.moment().format('YYYY-MM-DD');

    cy.visit('/journal-entries/new');
    cy.get('[data-cy=entry-date]').clear().type(date);
    cy.attachFile('sample.pdf');          // uses cypress-file-upload plugin
    cy.get('[data-cy=debit-0]').type('1');
    cy.get('[data-cy=credit-1]').type('1');
    cy.contains('Post').click();

    cy.contains('Entry posted').should('be.visible');
    cy.reload();                          // go back to list
    cy.contains(date).click();            // open the same entry
    cy.contains('sample.pdf');            // attachment present
    cy.get('[data-cy=entry-date]').should('have.value', date);
  });
});