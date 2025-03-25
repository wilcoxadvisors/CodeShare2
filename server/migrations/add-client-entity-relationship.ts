/**
 * Migration script to add client-entity relationships
 * 
 * This migration:
 * 1. Creates a new clients table
 * 2. Adds a clientId column to the entities table
 */
import { db, withTransaction } from "../db";
import { sql } from "drizzle-orm";

export async function addClientEntityRelationship() {
  console.log("Starting migration to add client-entity relationship...");

  try {
    // Use a transaction to ensure all operations succeed or fail together
    await withTransaction(db, async (tx) => {
      // First, check if the clients table already exists
      const clientsTableExists = await tx.execute(sql`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = 'clients'
        );
      `);
      
      // Create clients table if it doesn't exist
      if (!clientsTableExists.rows[0].exists) {
        console.log("Creating clients table...");
        await tx.execute(sql`
          CREATE TABLE clients (
            id SERIAL PRIMARY KEY,
            user_id INTEGER NOT NULL REFERENCES users(id) UNIQUE,
            name TEXT NOT NULL,
            contact_name TEXT,
            contact_email TEXT,
            contact_phone TEXT,
            industry TEXT,
            address TEXT,
            city TEXT,
            state TEXT,
            country TEXT,
            postal_code TEXT,
            website TEXT,
            notes TEXT,
            active BOOLEAN NOT NULL DEFAULT true,
            referral_source TEXT,
            created_at TIMESTAMP NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMP DEFAULT NOW()
          );
        `);
        console.log("✅ Clients table created successfully");
      } else {
        console.log("✅ Clients table already exists, skipping creation");
      }

      // Check if the clientId column already exists in the entities table
      const clientIdColumnExists = await tx.execute(sql`
        SELECT EXISTS (
          SELECT FROM information_schema.columns 
          WHERE table_schema = 'public' 
          AND table_name = 'entities'
          AND column_name = 'client_id'
        );
      `);

      // Add clientId column to entities table if it doesn't exist
      if (!clientIdColumnExists.rows[0].exists) {
        console.log("Adding client_id column to entities table...");
        await tx.execute(sql`
          ALTER TABLE entities 
          ADD COLUMN client_id INTEGER REFERENCES clients(id);
        `);
        console.log("✅ Added client_id column to entities table");
      } else {
        console.log("✅ client_id column already exists in entities table, skipping addition");
      }

      // Create a client for admin user if doesn't exist
      console.log("Creating default client for admin user if needed...");
      const adminUser = await tx.execute(sql`
        SELECT id FROM users WHERE role = 'admin' LIMIT 1;
      `);
      
      if (adminUser.rows.length > 0) {
        const adminId = adminUser.rows[0].id;
        
        // Check if admin already has a client record
        const adminClientExists = await tx.execute(sql`
          SELECT id FROM clients WHERE user_id = ${adminId};
        `);
        
        if (adminClientExists.rows.length === 0) {
          console.log(`Creating default client for admin user (id: ${adminId})...`);
          const result = await tx.execute(sql`
            INSERT INTO clients (user_id, name, contact_name, contact_email, active)
            VALUES (${adminId}, 'Admin Client', 'Admin User', 'admin@example.com', true)
            RETURNING id;
          `);
          const clientId = result.rows[0].id;
          console.log(`✅ Created default client for admin with id: ${clientId}`);
          
          // Update existing entities to associate with this admin client
          console.log("Updating existing entities to associate with admin client...");
          await tx.execute(sql`
            UPDATE entities
            SET client_id = ${clientId}
            WHERE owner_id = ${adminId} AND client_id IS NULL;
          `);
          console.log("✅ Updated existing entities to associate with admin client");
        } else {
          const clientId = adminClientExists.rows[0].id;
          console.log(`✅ Admin user already has client with id: ${clientId}`);
          
          // Update any unassociated entities
          console.log("Updating any unassociated entities owned by admin...");
          await tx.execute(sql`
            UPDATE entities
            SET client_id = ${clientId}
            WHERE owner_id = ${adminId} AND client_id IS NULL;
          `);
          console.log("✅ Updated any unassociated entities owned by admin");
        }
      }
    });
    
    console.log("✅ Client-entity relationship migration completed successfully");
    return true;
  } catch (error) {
    console.error("Error in client-entity relationship migration:", error);
    throw error;
  }
}