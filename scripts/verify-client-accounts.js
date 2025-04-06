#!/usr/bin/env tsx
/**
 * Verification script to identify clients without Chart of Accounts
 * Run with: npx tsx scripts/verify-client-accounts.js
 */
import { db } from '../server/db';
import { clients, accounts } from '../shared/schema';
import { sql, eq } from 'drizzle-orm';

async function verifyClientAccounts() {
  try {
    console.log('Verifying clients without Chart of Accounts...');
    
    // Get all active clients
    const allClients = await db.select({
      id: clients.id,
      name: clients.name,
      createdAt: clients.createdAt
    })
    .from(clients)
    .where(eq(clients.active, true));
    
    console.log(`Found ${allClients.length} active clients`);
    
    // Get counts of accounts per client
    const accountCounts = await db.select({
      clientId: accounts.clientId,
      count: sql`count(${accounts.id})`
    })
    .from(accounts)
    .groupBy(accounts.clientId);
    
    // Convert to a map for easier lookup
    const accountCountMap = new Map();
    accountCounts.forEach(item => {
      accountCountMap.set(item.clientId, parseInt(String(item.count)));
    });
    
    // Find clients with no accounts
    const clientsWithoutAccounts = allClients.filter(client => 
      !accountCountMap.has(client.id) || accountCountMap.get(client.id) === 0
    );
    
    console.log(`\nFound ${clientsWithoutAccounts.length} clients without any accounts:`);
    
    if (clientsWithoutAccounts.length > 0) {
      console.log('\nClient ID | Name | Created At');
      console.log('---------|------|------------');
      
      clientsWithoutAccounts.forEach(client => {
        console.log(`${client.id.toString().padEnd(9)} | ${(client.name || '').padEnd(20)} | ${new Date(client.createdAt).toISOString()}`);
      });
      
      console.log('\nTo seed accounts for these clients, run:');
      console.log('npx tsx scripts/seed-missing-coa.js');
    } else {
      console.log('All clients have accounts in the Chart of Accounts. No action needed.');
    }
    
  } catch (error) {
    console.error('Error verifying client accounts:', error);
  } finally {
    // Close the database connection
    process.exit(0);
  }
}

verifyClientAccounts();