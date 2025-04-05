/**
 * Special routes for verification testing
 */

import express from 'express';
import { db } from '../db';
import { users } from '../../shared/schema';
import bcrypt from 'bcryptjs';
import { userStorage } from '../storage/userStorage';

export const verificationRouter = express.Router();

/**
 * Register a test admin user for verification purposes
 * This route is only for development/testing and would be disabled in production
 */
verificationRouter.post('/setup-test-admin', async (req, res) => {
  try {
    console.log('Verifying if test admin exists...');
    
    // Check if admin already exists
    const existingAdmin = await userStorage.getUserByEmail('admin@example.com');
    
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
      name: 'Test Admin',
      email: 'admin@example.com',
      password: hashedPassword,
      role: 'admin',
      createdAt: new Date(),
      updatedAt: new Date()
    }).returning();
    
    console.log('Test admin created successfully');
    
    // Return success with user info (excluding password)
    return res.status(201).json({
      message: 'Test admin created successfully',
      user: {
        id: newAdmin.id,
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