// In scripts/seed-system-dimensions.ts
import { db } from '../server/db';
import { dimensions, clients } from '../shared/schema';
import { eq, and, inArray } from 'drizzle-orm';

const SYSTEM_DIMENSIONS = [
  { code: 'DEPARTMENT', name: 'Department', description: 'Departments for tracking costs and revenue.', isRequired: false, allowCustomValues: false },
  { code: 'LOCATION', name: 'Location', description: 'Geographic locations or branches.', isRequired: false, allowCustomValues: false },
  { code: 'CUSTOMER', name: 'Customer', description: 'Customers for tracking sales.', isRequired: false, allowCustomValues: false },
  { code: 'VENDOR', name: 'Vendor', description: 'Vendors for tracking purchases.', isRequired: false, allowCustomValues: false },
  { code: 'EMPLOYEE', name: 'Employee', description: 'Employees for tracking payroll and expenses.', isRequired: false, allowCustomValues: false },
  { code: 'PROJECT', name: 'Project', description: 'Projects for tracking project-specific financials.', isRequired: false, allowCustomValues: false },
  { code: 'CLASS', name: 'Class', description: 'A flexible segment for reporting, similar to QuickBooks Classes.', isRequired: false, allowCustomValues: false },
  { code: 'ITEM', name: 'Item', description: 'Products or services sold or purchased.', isRequired: false, allowCustomValues: false },
];

async function seedSystemDimensions() {
  console.log('Starting to seed system dimensions...');

  try {
    const allClients = await db.select().from(clients).where(eq(clients.active, true));

    if (allClients.length === 0) {
      console.log('No active clients found. Skipping dimension seeding.');
      return;
    }

    console.log(`Found ${allClients.length} active clients to process.`);

    for (const client of allClients) {
      console.log(`\nProcessing client: ${client.name} (ID: ${client.id})...`);

      const existingDimensions = await db
        .select({ code: dimensions.code })
        .from(dimensions)
        .where(and(
          eq(dimensions.clientId, client.id),
          inArray(dimensions.code, SYSTEM_DIMENSIONS.map(d => d.code))
        ));

      const existingDimensionCodes = new Set(existingDimensions.map(d => d.code));
      console.log(`Found ${existingDimensionCodes.size} existing system dimensions for this client.`);

      const dimensionsToInsert = SYSTEM_DIMENSIONS
        .filter((dim) => !existingDimensionCodes.has(dim.code))
        .map(dim => ({
          ...dim,
          clientId: client.id,
        }));

      if (dimensionsToInsert.length === 0) {
        console.log('All system dimensions already exist for this client. Nothing to seed.');
        continue;
      }

      console.log(`Inserting ${dimensionsToInsert.length} new system dimensions for this client...`);
      await db.insert(dimensions).values(dimensionsToInsert);
      console.log('Successfully inserted new dimensions.');
    }

    console.log('\nSystem dimension seeding completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Error during dimension seeding:', error);
    process.exit(1);
  }
}

seedSystemDimensions();