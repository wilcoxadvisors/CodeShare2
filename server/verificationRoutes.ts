/**
 * Routes for verification testing
 */
import express, { type Express } from "express";
import { db } from './db';
import { users, UserRole } from '../shared/schema';
import bcrypt from 'bcryptjs';
import { userStorage } from './storage/userStorage';
import { IStorage } from './storage';

// Do NOT import verificationRouter from routes/verificationRoutes.ts to avoid circular dependencies

export function registerVerificationRoutes(app: Express, storage: IStorage) {
  // Verify storage is passed and available
  if (!storage) {
    console.error("ERROR: Storage not provided to registerVerificationRoutes");
    throw new Error("Storage not provided to registerVerificationRoutes");
  }
  
  // Make a new router for admin verification endpoints
  const adminVerificationRouter = express.Router();

  /**
   * Register a test admin user for verification purposes
   * This route is only for development/testing and would be disabled in production
   */
  adminVerificationRouter.post('/setup-test-admin', async (req, res) => {
    try {
      console.log('Verifying if test admin exists...');
      
      // Check if admin already exists - use passed storage instead
      const existingAdmin = await storage.users.getUserByUsername('admin');
      
      if (existingAdmin) {
        console.log('Test admin already exists, using existing admin');
        return res.status(200).json({ 
          message: 'Test admin already exists',
          user: {
            id: existingAdmin.id,
            name: existingAdmin.name,
            email: existingAdmin.email,
            role: existingAdmin.role
          }
        });
      }
      
      // Create a new admin user
      console.log('Creating test admin user for verification...');
      
      // Hash the password
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash('adminpass', salt);
      
      // Insert the admin user
      const [newAdmin] = await db.insert(users).values({
        username: 'admin',
        name: 'Test Admin',
        email: 'admin@example.com',
        password: hashedPassword,
        role: UserRole.ADMIN,
        active: true,
        createdAt: new Date(),
        updatedAt: new Date()
      }).returning();
      
      console.log('Test admin created successfully');
      
      // Return success with user info (excluding password)
      return res.status(201).json({
        message: 'Test admin created successfully',
        user: {
          id: newAdmin.id,
          username: newAdmin.username,
          name: newAdmin.name,
          email: newAdmin.email,
          role: newAdmin.role
        }
      });
    } catch (error: any) {
      console.error('Error creating test admin:', error);
      return res.status(500).json({ 
        message: 'Failed to create test admin',
        error: error.message
      });
    }
  });

  // Mount the verification admin router - DON'T mount the API router here
  // This prevents duplicate mounting of verification routes
  app.use('/api/verification', adminVerificationRouter);
  
  console.log('Verification admin routes registered at /api/verification');
}