// Script to clean up test clients and ensure client names are unique
import '../server/dotenv-config.js';
import { db } from '../server/db.js';
import { eq, and, not, inArray } from 'drizzle-orm';
import { clients, entities, accounts } from '../shared/schema.js';
import chalk from 'chalk';

// Clients to preserve (important clients)
const CLIENTS_TO_KEEP = [1, 2, 7, 73]; // Admin Client, OK, Pepper, ONE1

async function cleanupTestClients() {
  console.log(chalk.blue('Starting test client cleanup...'));
  
  try {
    // Get all clients
    const allClients = await db.query.clients.findMany();
    console.log(chalk.green(`Found ${allClients.length} clients in total`));
    
    // Get all test clients (excluding the ones to keep)
    const testClients = allClients.filter(client => 
      !CLIENTS_TO_KEEP.includes(client.id) &&
      (
        client.name.toLowerCase().includes('test') ||
        client.name.toLowerCase().includes('coa_') ||
        client.name.toLowerCase().includes('api_') ||
        /\d{10,}/.test(client.name) // Contains a long number (timestamp)
      )
    );
    
    console.log(chalk.yellow(`Identified ${testClients.length} test clients to process`));
    
    // Check for clients with entities
    const clientsWithEntities = [];
    for (const client of testClients) {
      const entityCount = await db.query.entities.findMany({
        where: eq(entities.clientId, client.id)
      });
      
      if (entityCount.length > 0) {
        clientsWithEntities.push({
          clientId: client.id,
          clientName: client.name,
          entityCount: entityCount.length
        });
      }
    }
    
    if (clientsWithEntities.length > 0) {
      console.log(chalk.yellow('The following test clients have entities and will NOT be deleted:'));
      for (const client of clientsWithEntities) {
        console.log(chalk.yellow(`  - ID: ${client.clientId}, Name: ${client.clientName}, Entities: ${client.entityCount}`));
      }
      
      // Remove these clients from our deletion list
      const clientIdsWithEntities = clientsWithEntities.map(c => c.clientId);
      const filteredTestClients = testClients.filter(c => !clientIdsWithEntities.includes(c.id));
      console.log(chalk.green(`Proceeding with ${filteredTestClients.length} clients that have no entities`));
      
      // Delete clients with no entities
      for (const client of filteredTestClients) {
        // First delete any accounts for this client
        const accountDeleteResult = await db.delete(accounts)
          .where(eq(accounts.clientId, client.id));
        
        console.log(chalk.green(`Deleted accounts for client ${client.name} (ID: ${client.id})`));
        
        // Now delete the client
        const deleteResult = await db.delete(clients)
          .where(eq(clients.id, client.id));
        
        console.log(chalk.green(`Deleted client ${client.name} (ID: ${client.id})`));
      }
    } else {
      console.log(chalk.green('No test clients have entities, proceeding with deletion...'));
      
      // Delete all test clients
      for (const client of testClients) {
        // First delete any accounts for this client
        const accountDeleteResult = await db.delete(accounts)
          .where(eq(accounts.clientId, client.id));
        
        console.log(chalk.green(`Deleted accounts for client ${client.name} (ID: ${client.id})`));
        
        // Now delete the client
        const deleteResult = await db.delete(clients)
          .where(eq(clients.id, client.id));
        
        console.log(chalk.green(`Deleted client ${client.name} (ID: ${client.id})`));
      }
    }
    
    // Check for duplicate client names in remaining clients
    const remainingClients = await db.query.clients.findMany();
    const clientNameMap = new Map();
    
    remainingClients.forEach(client => {
      const normalizedName = client.name.toLowerCase().trim();
      if (!clientNameMap.has(normalizedName)) {
        clientNameMap.set(normalizedName, []);
      }
      clientNameMap.get(normalizedName).push(client);
    });
    
    // Find duplicates
    const duplicates = [];
    for (const [name, clientsList] of clientNameMap.entries()) {
      if (clientsList.length > 1) {
        duplicates.push({
          name,
          clients: clientsList
        });
      }
    }
    
    if (duplicates.length > 0) {
      console.log(chalk.yellow(`Found ${duplicates.length} duplicate client name groups:`));
      
      // Rename duplicates to make them unique
      for (const group of duplicates) {
        console.log(chalk.yellow(`  - Name: "${group.name}" has ${group.clients.length} clients`));
        
        // Keep the first one as is, rename the rest
        for (let i = 1; i < group.clients.length; i++) {
          const client = group.clients[i];
          const newName = `${client.name} ${i}`;
          
          await db.update(clients)
            .set({ name: newName })
            .where(eq(clients.id, client.id));
          
          console.log(chalk.green(`    Renamed client ID ${client.id} from "${client.name}" to "${newName}"`));
        }
      }
    } else {
      console.log(chalk.green('No duplicate client names found.'));
    }
    
    console.log(chalk.blue('Client cleanup completed successfully!'));
    
  } catch (error) {
    console.error(chalk.red('Error during client cleanup:'), error);
  }
}

// Run the script
cleanupTestClients();