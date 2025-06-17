import { authenticateTestUser } from './apiTestHelper.js';

/**
 * Global setup for API tests
 * This runs once before all API tests to establish authentication
 */
export default async function globalSetup() {
  console.log('🔧 Setting up API test authentication...');
  
  try {
    // Wait a moment for the server to be ready
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Authenticate the test user
    await authenticateTestUser();
    
    console.log('✅ API test authentication setup complete');
  } catch (error) {
    console.error('❌ Failed to setup API test authentication:', error);
    throw error;
  }
}