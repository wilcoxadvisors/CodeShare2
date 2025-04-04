/**
 * Script to identify and delete test clients and entities
 * 
 * This script will find all clients with names matching test patterns
 * and delete them along with their associated data (entities, accounts, journal entries, etc.).
 * It preserves a small set of specified test clients (IDs 1, 2, 7).
 * 
 * WARNING: This is a destructive operation and cannot be undone.
 * Always back up your database before running this script.
 */

import { db } from '../server/db';
import { 
  clients, 
  entities, 
  accounts, 
  userEntityAccess, 
  journalEntries, 
  journalEntryLines,
  journalEntryFiles,
  // journals, // Table not available yet in schema
  locations,
  budgets,
  budgetItems,
  budgetDocuments,
  forecasts,
  fixedAssets,
  savedReports,
  userActivityLogs,
  featureUsage,
  dataConsent,
  consolidationGroups,
  consolidationGroupEntities
} from '../shared/schema';
import { eq, inArray, not, like, or, and, sql } from 'drizzle-orm';
import chalk from 'chalk';

// These client IDs will be preserved (not deleted)
// ID 1: Admin, ID 2: OK, ID 7: Pepper
const CLIENT_IDS_TO_KEEP = [1, 2, 7];

/**
 * Main function to run the script
 */
async function main() {
  console.log(chalk.yellow('='.repeat(80)));
  console.log(chalk.yellow('TEST DATA CLEANUP SCRIPT'));
  console.log(chalk.yellow('='.repeat(80)));
  console.log(chalk.red('WARNING: This script will permanently delete test clients and all their associated data!'));
  console.log(chalk.red('This operation CANNOT be undone! Ensure you have a recent database backup.'));
  console.log(chalk.yellow('-'.repeat(80)));
  console.log(chalk.blue(`The following client IDs will be preserved: ${CLIENT_IDS_TO_KEEP.join(', ')}`));
  console.log(chalk.yellow('='.repeat(80)));
  
  // Step 1: Find test clients to delete
  console.log(chalk.blue('Finding test clients to delete...'));
  
  const testClients = await db
    .select({
      id: clients.id,
      name: clients.name
    })
    .from(clients)
    .where(
      and(
        not(inArray(clients.id, CLIENT_IDS_TO_KEEP)),
        or(
          like(clients.name, '%Test%'),
          like(clients.name, '%COA_%'),
          like(clients.name, '%Demo%'),
          like(clients.name, '%Example%'),
          like(clients.name, '%Sample%'),
          like(clients.name, '%Temp%')
        )
      )
    );
  
  if (testClients.length === 0) {
    console.log(chalk.green('No test clients found to delete. Exiting.'));
    return;
  }
  
  const clientIdsToDelete = testClients.map(client => client.id);
  
  console.log(chalk.blue(`Found ${testClients.length} test clients to delete:`));
  testClients.forEach(client => {
    console.log(chalk.yellow(`  - Client ID ${client.id}: "${client.name}"`));
  });
  
  // Step 2: Find entities associated with these clients
  console.log(chalk.blue('Finding entities associated with test clients...'));
  
  const entitiesToDelete = await db
    .select({
      id: entities.id,
      name: entities.name,
      clientId: entities.clientId
    })
    .from(entities)
    .where(inArray(entities.clientId, clientIdsToDelete));
  
  const entityIdsToDelete = entitiesToDelete.map(entity => entity.id);
  
  console.log(chalk.blue(`Found ${entitiesToDelete.length} entities to delete:`));
  entitiesToDelete.forEach(entity => {
    console.log(chalk.yellow(`  - Entity ID ${entity.id}: "${entity.name}" (Client ID: ${entity.clientId})`));
  });
  
  if (entityIdsToDelete.length === 0 && clientIdsToDelete.length > 0) {
    console.log(chalk.yellow('No entities found for test clients, but will still delete the clients.'));
  }
  
  // Step 3: Delete data within a transaction
  console.log(chalk.yellow('-'.repeat(80)));
  console.log(chalk.red('STARTING DELETION PROCESS...'));
  
  try {
    await db.transaction(async (tx) => {
      let deletionCounts: Record<string, number> = {
        userEntityAccess: 0,
        journalEntryFiles: 0,
        journalEntryLines: 0,
        accountRelatedLines: 0, // Track the journal entry lines deleted because they are linked to accounts
        journalEntries: 0,
        journals: 0,
        accounts: 0,
        locations: 0,
        budgetItems: 0,
        budgetDocuments: 0,
        budgets: 0,
        forecasts: 0,
        fixedAssets: 0,
        userActivityLogs: 0,
        featureUsage: 0,
        dataConsent: 0,
        savedReports: 0,
        consolidationGroupEntities: 0,
        entities: 0,
        clients: 0
      };
      
      // Delete in order of dependencies (child records first)
      
      // 1. User Entity Access
      if (entityIdsToDelete.length > 0) {
        const userAccessDeleted = await tx
          .delete(userEntityAccess)
          .where(inArray(userEntityAccess.entityId, entityIdsToDelete))
          .returning();
        
        deletionCounts.userEntityAccess = userAccessDeleted.length;
        console.log(chalk.blue(`Deleted ${userAccessDeleted.length} user entity access records`));
      }
      
      // 2. Journal Entry Files
      if (entityIdsToDelete.length > 0) {
        // First get journal entry IDs
        const journalEntryIds = await tx
          .select({ id: journalEntries.id })
          .from(journalEntries)
          .where(inArray(journalEntries.entityId, entityIdsToDelete));
        
        const jeIds = journalEntryIds.map(je => je.id);
        
        if (jeIds.length > 0) {
          // Delete journal entry files
          const filesDeleted = await tx
            .delete(journalEntryFiles)
            .where(inArray(journalEntryFiles.journalEntryId, jeIds))
            .returning();
          
          deletionCounts.journalEntryFiles = filesDeleted.length;
          console.log(chalk.blue(`Deleted ${filesDeleted.length} journal entry files`));
          
          // 3. Journal Entry Lines
          const linesDeleted = await tx
            .delete(journalEntryLines)
            .where(inArray(journalEntryLines.journalEntryId, jeIds))
            .returning();
          
          deletionCounts.journalEntryLines = linesDeleted.length;
          console.log(chalk.blue(`Deleted ${linesDeleted.length} journal entry lines`));
          
          // 4. Journal Entries
          const entriesDeleted = await tx
            .delete(journalEntries)
            .where(inArray(journalEntries.id, jeIds))
            .returning();
          
          deletionCounts.journalEntries = entriesDeleted.length;
          console.log(chalk.blue(`Deleted ${entriesDeleted.length} journal entries`));
        } else {
          console.log(chalk.blue('No journal entries found to delete'));
        }
      }
      
      // 5. Journals - table not available yet
      // if (entityIdsToDelete.length > 0) {
      //   const journalsDeleted = await tx
      //     .delete(journals)
      //     .where(inArray(journals.entityId, entityIdsToDelete))
      //     .returning();
      //   
      //   deletionCounts.journals = journalsDeleted.length;
      //   console.log(chalk.blue(`Deleted ${journalsDeleted.length} journals`));
      // }
      
      // Get any journal entry lines related to this client's accounts first
      // This step ensures we won't hit foreign key constraints when deleting accounts
      if (clientIdsToDelete.length > 0) {
        // First get all account IDs for these clients
        const clientAccounts = await tx
          .select({ id: accounts.id })
          .from(accounts)
          .where(inArray(accounts.clientId, clientIdsToDelete));
        
        const accountIds = clientAccounts.map(acc => acc.id);
        
        if (accountIds.length > 0) {
          // Check for any remaining journal entry lines that we might have missed
          const remainingJELines = await tx
            .select({ id: journalEntryLines.id })
            .from(journalEntryLines)
            .where(inArray(journalEntryLines.accountId, accountIds));
          
          if (remainingJELines.length > 0) {
            const lineIds = remainingJELines.map(line => line.id);
            
            // Delete these lines first
            const additionalLinesDeleted = await tx
              .delete(journalEntryLines)
              .where(inArray(journalEntryLines.id, lineIds))
              .returning();
            
            // Track account-related lines separately with proper type safety
            deletionCounts.accountRelatedLines = additionalLinesDeleted.length;
            // Add to total journal entry lines too
            deletionCounts.journalEntryLines += additionalLinesDeleted.length;
            console.log(chalk.blue(`Deleted ${additionalLinesDeleted.length} additional journal entry lines linked to client accounts`));
          }
        }
        
        // Now safe to delete accounts
        const accountsDeleted = await tx
          .delete(accounts)
          .where(inArray(accounts.clientId, clientIdsToDelete))
          .returning();
        
        deletionCounts.accounts = accountsDeleted.length;
        console.log(chalk.blue(`Deleted ${accountsDeleted.length} accounts`));
      }
      
      // 7. Locations
      if (clientIdsToDelete.length > 0) {
        const locationsDeleted = await tx
          .delete(locations)
          .where(inArray(locations.clientId, clientIdsToDelete))
          .returning();
        
        deletionCounts.locations = locationsDeleted.length;
        console.log(chalk.blue(`Deleted ${locationsDeleted.length} locations`));
      }
      
      // 8. Budget-related tables
      if (entityIdsToDelete.length > 0) {
        // Find budgets for entities to delete - using explicit SQL to avoid naming issues
        const budgetsToDelete = await tx.execute(
          sql`SELECT id FROM budgets WHERE "entityId" IN (${sql.join(entityIdsToDelete, sql`, `)})`
        );
        
        // The result from tx.execute is not guaranteed to be an array of objects
        // Let's ensure it's properly formatted
        const budgetResults = Array.isArray(budgetsToDelete) ? budgetsToDelete : [];
        
        // Extract budget IDs from the results, safely handling potentially malformed data
        const budgetIds = budgetResults
          .filter(b => b && typeof b === 'object' && 'id' in b)
          .map(b => b.id as number);
        
        if (budgetIds.length > 0) {
          // Delete budget items
          const budgetItemsDeleted = await tx
            .delete(budgetItems)
            .where(inArray(budgetItems.budgetId, budgetIds))
            .returning();
          
          deletionCounts.budgetItems = budgetItemsDeleted.length;
          console.log(chalk.blue(`Deleted ${budgetItemsDeleted.length} budget items`));
          
          // Delete budget documents
          const budgetDocsDeleted = await tx
            .delete(budgetDocuments)
            .where(inArray(budgetDocuments.budgetId, budgetIds))
            .returning();
          
          deletionCounts.budgetDocuments = budgetDocsDeleted.length;
          console.log(chalk.blue(`Deleted ${budgetDocsDeleted.length} budget documents`));
          
          // Delete budgets
          const budgetsDeleted = await tx
            .delete(budgets)
            .where(inArray(budgets.id, budgetIds))
            .returning();
          
          deletionCounts.budgets = budgetsDeleted.length;
          console.log(chalk.blue(`Deleted ${budgetsDeleted.length} budgets`));
        } else {
          console.log(chalk.blue('No budgets found to delete'));
        }
        
        // 9. Forecasts (using the actual column name in the database)
        // The actual column name in the database is 'entityId' (camelCase), not 'entity_id' (snake_case)
        const forecastsDeleted = await tx.execute(
          sql`DELETE FROM forecasts WHERE "entityId" IN (${sql.join(entityIdsToDelete, sql`, `)}) RETURNING *`
        );
        
        // Ensure we get an array result back for proper length calculation
        const forecastsArray = Array.isArray(forecastsDeleted) ? forecastsDeleted : [];
        deletionCounts.forecasts = forecastsArray.length;
        console.log(chalk.blue(`Deleted ${forecastsArray.length} forecasts`));
        
        // 10. Fixed Assets
        const assetsDeleted = await tx
          .delete(fixedAssets)
          .where(inArray(fixedAssets.entityId, entityIdsToDelete))
          .returning();
        
        deletionCounts.fixedAssets = assetsDeleted.length;
        console.log(chalk.blue(`Deleted ${assetsDeleted.length} fixed assets`));
        
        // 11. Saved Reports
        const reportsDeleted = await tx
          .delete(savedReports)
          .where(inArray(savedReports.entityId, entityIdsToDelete))
          .returning();
        
        deletionCounts.savedReports = reportsDeleted.length;
        console.log(chalk.blue(`Deleted ${reportsDeleted.length} saved reports`));
        
        // 12. User Activity Logs
        const userActivityDeleted = await tx
          .delete(userActivityLogs)
          .where(inArray(userActivityLogs.entityId, entityIdsToDelete))
          .returning();
        
        deletionCounts.userActivityLogs = userActivityDeleted.length;
        console.log(chalk.blue(`Deleted ${userActivityDeleted.length} user activity logs`));
        
        // 13. Feature Usage
        const featureUsageDeleted = await tx
          .delete(featureUsage)
          .where(inArray(featureUsage.entityId, entityIdsToDelete))
          .returning();
        
        deletionCounts.featureUsage = featureUsageDeleted.length;
        console.log(chalk.blue(`Deleted ${featureUsageDeleted.length} feature usage records`));
        
        // 14. Data Consent
        const dataConsentDeleted = await tx
          .delete(dataConsent)
          .where(inArray(dataConsent.entityId, entityIdsToDelete))
          .returning();
        
        deletionCounts.dataConsent = dataConsentDeleted.length;
        console.log(chalk.blue(`Deleted ${dataConsentDeleted.length} data consent records`));
        
        // 15. Consolidation Group Entities
        const consolGroupEntitiesDeleted = await tx
          .delete(consolidationGroupEntities)
          .where(inArray(consolidationGroupEntities.entityId, entityIdsToDelete))
          .returning();
        
        deletionCounts.consolidationGroupEntities = consolGroupEntitiesDeleted.length;
        console.log(chalk.blue(`Deleted ${consolGroupEntitiesDeleted.length} consolidation group entity records`));
      }
      
      // 16. Entities (now that all dependent records are deleted)
      if (entityIdsToDelete.length > 0) {
        const entitiesDeleted = await tx
          .delete(entities)
          .where(inArray(entities.id, entityIdsToDelete))
          .returning();
        
        deletionCounts.entities = entitiesDeleted.length;
        console.log(chalk.blue(`Deleted ${entitiesDeleted.length} entities`));
      }
      
      // Handle journal entries directly linked to client_id
      // We need to handle these specially since they cause foreign key constraint violations
      if (clientIdsToDelete.length > 0) {
        const clientJournalEntriesDeleted = await tx.execute(
          sql`DELETE FROM journal_entries WHERE client_id IN (${sql.join(clientIdsToDelete, sql`, `)}) RETURNING *`
        );
        
        const clientJEArray = Array.isArray(clientJournalEntriesDeleted) ? clientJournalEntriesDeleted : [];
        deletionCounts.clientJournalEntries = clientJEArray.length;
        console.log(chalk.blue(`Deleted ${clientJEArray.length} journal entries directly linked to clients`));
        
        // 17. Finally, delete the clients
        const clientsDeleted = await tx
          .delete(clients)
          .where(inArray(clients.id, clientIdsToDelete))
          .returning();
        
        deletionCounts.clients = clientsDeleted.length;
        console.log(chalk.blue(`Deleted ${clientsDeleted.length} clients`));
      }
      
      // Transaction summary
      console.log(chalk.yellow('-'.repeat(80)));
      console.log(chalk.green('Deletion Summary:'));
      Object.entries(deletionCounts).forEach(([table, count]) => {
        console.log(chalk.green(`  - ${table}: ${count} records deleted`));
      });
    });
    
    // Final confirmation
    console.log(chalk.yellow('='.repeat(80)));
    console.log(chalk.green('TEST DATA CLEANUP COMPLETED SUCCESSFULLY'));
    console.log(chalk.yellow('='.repeat(80)));
    
  } catch (error) {
    console.error(chalk.red('ERROR DURING DELETION:'));
    console.error(chalk.red(error));
    process.exit(1);
  }
}

// Execute main function
main()
  .catch(error => {
    console.error(chalk.red('Unhandled error:'));
    console.error(chalk.red(error));
    process.exit(1);
  })
  .finally(() => {
    // Ensure the process exits
    process.exit(0);
  });