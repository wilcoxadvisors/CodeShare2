/**
 * Migration to add JE_FILES_ADMIN role
 * 
 * This role grants permission to delete any journal entry file
 * regardless of who created the associated journal entry.
 */
import { Pool } from 'pg';
import { db } from '../db';

export async function migrateAddJeFilesAdminRole() {
  try {
    console.log('Running migration to add JE_FILES_ADMIN role...');

    // Check if the roles table exists
    const rolesTableExists = await db.execute(
      `SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'roles'
      )`
    );

    if (!rolesTableExists.rows[0].exists) {
      console.log('Creating roles table...');
      await db.execute(`
        CREATE TABLE roles (
          code VARCHAR(50) PRIMARY KEY,
          name VARCHAR(100) NOT NULL,
          description TEXT,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        )
      `);
    }

    // Check if user_roles table exists
    const userRolesTableExists = await db.execute(
      `SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'user_roles'
      )`
    );

    if (!userRolesTableExists.rows[0].exists) {
      console.log('Creating user_roles table...');
      await db.execute(`
        CREATE TABLE user_roles (
          user_id INTEGER NOT NULL,
          role_code VARCHAR(50) NOT NULL,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          PRIMARY KEY (user_id, role_code),
          FOREIGN KEY (role_code) REFERENCES roles(code)
        )
      `);
    }

    // Check if JE_FILES_ADMIN role already exists
    const roleExists = await db.execute(
      `SELECT EXISTS (
        SELECT FROM roles 
        WHERE code = 'JE_FILES_ADMIN'
      )`
    );

    if (!roleExists.rows[0].exists) {
      console.log('Adding JE_FILES_ADMIN role...');
      await db.execute(`
        INSERT INTO roles (code, name, description)
        VALUES (
          'JE_FILES_ADMIN', 
          'Journal Entry Files Administrator', 
          'Can delete any journal entry file attachment regardless of who created the journal entry'
        )
      `);
      
      // Grant the role to all admin users by default
      await db.execute(`
        INSERT INTO user_roles (user_id, role_code)
        SELECT id, 'JE_FILES_ADMIN'
        FROM users
        WHERE role = 'admin'
        ON CONFLICT (user_id, role_code) DO NOTHING
      `);
    } else {
      console.log('JE_FILES_ADMIN role already exists, skipping...');
    }

    console.log('JE_FILES_ADMIN role migration completed successfully');
  } catch (error) {
    console.error('Error in JE_FILES_ADMIN role migration:', error);
    throw error;
  }
}