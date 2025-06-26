import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import request from 'supertest';
import { app } from '../server/index';

describe('BatchProcessingService API Tests', () => {
  let authCookie: string;

  beforeAll(async () => {
    // Login to get authentication cookie
    const loginResponse = await request(app)
      .post('/api/auth/login')
      .send({
        username: 'admin',
        password: 'password123'
      });

    if (loginResponse.status === 200) {
      const cookies = loginResponse.get('Set-Cookie');
      authCookie = cookies ? cookies.join('; ') : '';
    }
  });

  it('should successfully create journal entries from batch processing', async () => {
    const testPayload = {
      approvedEntries: [
        {
          header: {
            Date: '2025-01-01',
            Description: 'Test Batch Entry 1',
            Reference: 'BATCH-TEST-001'
          },
          lines: [
            {
              accountId: 1,
              amount: 100,
              description: 'Test debit line',
              entityCode: '001'
            },
            {
              accountId: 2,
              amount: -100,
              description: 'Test credit line',
              entityCode: '001'
            }
          ]
        }
      ],
      entityId: 1,
      batchSettings: {
        isAccrual: false
      }
    };

    const response = await request(app)
      .post('/api/clients/1/journal-entries/batch-process')
      .set('Cookie', authCookie)
      .send(testPayload);

    console.log('Batch processing response:', response.status, response.body);

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.createdCount).toBe(1);
    expect(response.body.data.createdEntryIds).toHaveLength(1);
  });

  it('should return 400 for invalid payload', async () => {
    const invalidPayload = {
      approvedEntries: [],
      entityId: null
    };

    const response = await request(app)
      .post('/api/clients/1/journal-entries/batch-process')
      .set('Cookie', authCookie)
      .send(invalidPayload);

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
    expect(response.body.error.code).toBe('INVALID_PAYLOAD');
  });

  it('should return 401 for unauthenticated requests', async () => {
    const testPayload = {
      approvedEntries: [
        {
          header: { Date: '2025-01-01', Description: 'Test', Reference: 'TEST' },
          lines: []
        }
      ],
      entityId: 1
    };

    const response = await request(app)
      .post('/api/clients/1/journal-entries/batch-process')
      .send(testPayload);

    expect(response.status).toBe(401);
  });
});