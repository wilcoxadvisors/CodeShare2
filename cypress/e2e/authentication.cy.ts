/**
 * Cypress Authentication System Verification
 * 
 * This test suite validates that the custom cy.login() command works properly
 * and enables authenticated E2E testing throughout the application.
 */

describe('Authentication System E2E Verification', () => {
  beforeEach(() => {
    // Clear any existing session data
    cy.clearCookies();
    cy.clearLocalStorage();
  });

  describe('Custom Login Command', () => {
    it('should authenticate successfully using cy.login()', () => {
      cy.login();
      
      // Verify authentication cookie exists
      cy.getCookie('connect.sid').should('exist');
      
      // Verify we can access protected content
      cy.request('/api/auth/me').then((response) => {
        expect(response.status).to.eq(200);
        expect(response.body).to.have.property('user');
      });
    });

    it('should maintain session across page visits', () => {
      cy.login();
      
      // Visit different pages and verify authentication persists
      cy.visit('/');
      cy.getCookie('connect.sid').should('exist');
      
      // Try to access a protected API endpoint via browser
      cy.request('/api/clients').then((response) => {
        expect(response.status).to.eq(200);
        expect(response.body).to.be.an('array');
      });
    });

    it('should work with custom credentials', () => {
      cy.login('admin', 'password');
      
      cy.getCookie('connect.sid').should('exist');
      
      cy.request('/api/auth/me').then((response) => {
        expect(response.status).to.eq(200);
        expect(response.body.user.username).to.eq('admin');
      });
    });
  });

  describe('Protected Routes Access', () => {
    beforeEach(() => {
      cy.login();
    });

    it('should access clients API with authentication', () => {
      cy.request('GET', '/api/clients').then((response) => {
        expect(response.status).to.eq(200);
        expect(response.body).to.be.an('array');
      });
    });

    it('should access entities API with authentication', () => {
      // First get a client
      cy.request('GET', '/api/clients').then((clientsResponse) => {
        expect(clientsResponse.body.length).to.be.greaterThan(0);
        
        const clientId = clientsResponse.body[0].id;
        
        // Then get entities for that client
        cy.request('GET', `/api/clients/${clientId}/entities`).then((entitiesResponse) => {
          expect(entitiesResponse.status).to.eq(200);
          expect(entitiesResponse.body).to.be.an('array');
        });
      });
    });

    it('should access journal entries API with authentication', () => {
      // Get client and entity first
      cy.request('GET', '/api/clients').then((clientsResponse) => {
        const clientId = clientsResponse.body[0]?.id;
        
        if (clientId) {
          cy.request('GET', `/api/clients/${clientId}/entities`).then((entitiesResponse) => {
            const entityId = entitiesResponse.body[0]?.id;
            
            if (entityId) {
              cy.request('GET', `/api/clients/${clientId}/entities/${entityId}/journal-entries`).then((jeResponse) => {
                expect(jeResponse.status).to.eq(200);
                expect(jeResponse.body).to.be.an('array');
              });
            }
          });
        }
      });
    });
  });

  describe('Authentication Error Handling', () => {
    it('should handle invalid credentials gracefully', () => {
      cy.request({
        method: 'POST',
        url: '/api/auth/login',
        body: {
          username: 'invalid',
          password: 'invalid'
        },
        failOnStatusCode: false
      }).then((response) => {
        expect(response.status).to.eq(401);
      });
    });

    it('should require authentication for protected endpoints', () => {
      // Without login, should get 401
      cy.request({
        method: 'GET',
        url: '/api/clients',
        failOnStatusCode: false
      }).then((response) => {
        expect(response.status).to.eq(401);
      });
    });
  });

  describe('Session Persistence', () => {
    it('should maintain authentication across multiple test operations', () => {
      cy.login();
      
      // Make multiple requests to verify session persistence
      cy.request('/api/auth/me').then((response) => {
        expect(response.status).to.eq(200);
      });
      
      cy.request('/api/clients').then((response) => {
        expect(response.status).to.eq(200);
      });
      
      // Wait a moment and try again
      cy.wait(1000);
      
      cy.request('/api/auth/me').then((response) => {
        expect(response.status).to.eq(200);
      });
    });
  });
});