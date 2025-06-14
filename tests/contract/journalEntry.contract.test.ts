/**
 * API Contract Testing for Journal Entry Module
 * Using Pact to ensure frontend/backend API compatibility
 */

import { Pact } from '@pact-foundation/pact';
import { InteractionObject } from '@pact-foundation/pact';
import path from 'path';

const mockProvider = new Pact({
  consumer: 'JournalEntryFrontend',
  provider: 'JournalEntryAPI',
  port: 1234,
  log: path.resolve(process.cwd(), 'logs', 'pact.log'),
  dir: path.resolve(process.cwd(), 'pacts'),
  logLevel: 'INFO',
  spec: 2
});

describe('Journal Entry API Contract Tests', () => {
  
  beforeAll(() => mockProvider.setup());
  afterEach(() => mockProvider.verify());
  afterAll(() => mockProvider.finalize());

  describe('GET /api/clients/:clientId/entities/:entityId/journal-entries/:id', () => {
    const EXPECTED_JOURNAL_ENTRY_STRUCTURE: InteractionObject = {
      state: 'journal entry exists',
      uponReceiving: 'a request for a specific journal entry',
      withRequest: {
        method: 'GET',
        path: '/api/clients/251/entities/392/journal-entries/200',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      },
      willRespondWith: {
        status: 200,
        headers: {
          'Content-Type': 'application/json; charset=utf-8'
        },
        body: {
          id: 200,
          clientId: 251,
          entityId: 392,
          date: '2025-06-14',
          referenceNumber: 'JE-251-392-20250614-200',
          description: 'Test journal entry',
          status: 'draft',
          lines: [
            {
              id: 534,
              type: 'debit',
              amount: '100.0000',
              description: 'Test debit line'
            },
            {
              id: 535,
              type: 'credit',
              amount: '100.0000',
              description: 'Test credit line'
            }
          ]
        }
      }
    };

    it('should return the expected journal entry structure', async () => {
      await mockProvider.addInteraction(EXPECTED_JOURNAL_ENTRY_STRUCTURE);
      
      const response = await fetch(`${mockProvider.mockService.baseUrl}/api/clients/251/entities/392/journal-entries/200`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      });
      
      const data = await response.json();
      
      expect(response.status).toBe(200);
      expect(data).toHaveProperty('id', 200);
      expect(data).toHaveProperty('lines');
      expect(Array.isArray(data.lines)).toBe(true);
      expect(data.lines.length).toBeGreaterThan(0);
      
      const firstLine = data.lines[0];
      expect(firstLine).toHaveProperty('type');
      expect(['debit', 'credit']).toContain(firstLine.type);
    });
  });

  describe('POST /api/clients/:clientId/entities/:entityId/journal-entries', () => {
    const CREATE_JOURNAL_ENTRY_CONTRACT: InteractionObject = {
      state: 'client and entity exist',
      uponReceiving: 'a request to create a journal entry',
      withRequest: {
        method: 'POST',
        path: '/api/clients/251/entities/392/journal-entries',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        },
        body: {
          date: '2025-06-14',
          description: 'Contract test entry',
          lines: [
            {
              accountId: 7980,
              type: 'debit',
              amount: '100.00',
              description: 'Test debit'
            },
            {
              accountId: 8011,
              type: 'credit',
              amount: '100.00',
              description: 'Test credit'
            }
          ]
        }
      },
      willRespondWith: {
        status: 201,
        headers: {
          'Content-Type': 'application/json; charset=utf-8'
        },
        body: {
          id: 999,
          status: 'draft',
          lines: [
            {
              id: 1001,
              type: 'debit',
              amount: '100.0000'
            },
            {
              id: 1002,
              type: 'credit',
              amount: '100.0000'
            }
          ]
        }
      }
    };

    it('should create a journal entry with the expected response structure', async () => {
      await mockProvider.addInteraction(CREATE_JOURNAL_ENTRY_CONTRACT);
      
      const requestBody = {
        date: '2025-06-14',
        description: 'Contract test entry',
        lines: [
          {
            accountId: 7980,
            type: 'debit',
            amount: '100.00',
            description: 'Test debit'
          },
          {
            accountId: 8011,
            type: 'credit',
            amount: '100.00',
            description: 'Test credit'
          }
        ]
      };
      
      const response = await fetch(`${mockProvider.mockService.baseUrl}/api/clients/251/entities/392/journal-entries`, {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      });
      
      const data = await response.json();
      
      expect(response.status).toBe(201);
      expect(data).toHaveProperty('id');
      expect(data).toHaveProperty('status', 'draft');
    });
  });
});