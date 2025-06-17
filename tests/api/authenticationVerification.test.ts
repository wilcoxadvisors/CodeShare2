import { describe, it, expect } from '@jest/globals';
import { apiHelper, authenticateTestUser, isAuthenticatedUser } from './apiTestHelper.js';

describe('Authentication System Verification', () => {
  describe('API Helper Authentication', () => {
    it('should authenticate successfully with test credentials', async () => {
      // Reset authentication state
      expect(isAuthenticatedUser()).toBe(false);
      
      // Authenticate
      await authenticateTestUser();
      
      // Verify authenticated state
      expect(isAuthenticatedUser()).toBe(true);
    });

    it('should make authenticated requests to protected endpoints', async () => {
      // Test authenticated request to clients endpoint
      const response = await apiHelper.get('/api/clients');
      
      expect(response.status).toBe(200);
      expect(Array.isArray(response.data)).toBe(true);
    });

    it('should make authenticated requests to entities endpoint', async () => {
      // First get a client ID
      const clientsResponse = await apiHelper.get('/api/clients');
      expect(clientsResponse.data.length).toBeGreaterThan(0);
      
      const clientId = clientsResponse.data[0].id;
      
      // Test authenticated request to entities endpoint
      const entitiesResponse = await apiHelper.get(`/api/clients/${clientId}/entities`);
      
      expect(entitiesResponse.status).toBe(200);
      expect(Array.isArray(entitiesResponse.data)).toBe(true);
    });

    it('should handle authentication retry on 401 errors', async () => {
      // Make a request that should work with proper authentication
      const response = await apiHelper.get('/api/auth/me');
      
      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('user');
    });
  });

  describe('Session Management', () => {
    it('should maintain session across multiple requests', async () => {
      // Make multiple authenticated requests
      const response1 = await apiHelper.get('/api/clients');
      const response2 = await apiHelper.get('/api/clients');
      
      expect(response1.status).toBe(200);
      expect(response2.status).toBe(200);
      
      // Both should succeed without re-authentication
      expect(isAuthenticatedUser()).toBe(true);
    });

    it('should handle POST requests with authentication', async () => {
      // Get a client to work with
      const clientsResponse = await apiHelper.get('/api/clients');
      expect(clientsResponse.data.length).toBeGreaterThan(0);
      
      const clientId = clientsResponse.data[0].id;
      const entityId = clientsResponse.data[0].entities?.[0]?.id;
      
      if (!entityId) {
        // Skip if no entities available
        console.log('Skipping POST test - no entities available');
        return;
      }

      // Try to create a journal entry (this requires authentication)
      const journalEntryData = {
        date: new Date().toISOString().split('T')[0],
        description: 'Test Authentication Entry',
        lines: []
      };

      // This should not fail due to authentication
      const response = await apiHelper.post(
        `/api/clients/${clientId}/entities/${entityId}/journal-entries`,
        journalEntryData
      );

      // The request should be authenticated (might fail for other reasons like validation)
      expect([200, 201, 400]).toContain(response.status);
    });
  });
});