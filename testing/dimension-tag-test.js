#!/usr/bin/env node

/**
 * Dimension Tag Update Test
 * Tests the complete data flow of dimension tags during journal entry updates
 */

import axios from 'axios';
import chalk from 'chalk';

const BASE_URL = 'http://localhost:5000';
let cookieHeader = '';

async function authenticate() {
  console.log(chalk.blue('🔑 Authenticating...'));
  
  try {
    const response = await axios.post(`${BASE_URL}/api/auth/login`, {
      username: 'admin',
      password: 'admin123'
    }, {
      withCredentials: true,
      validateStatus: () => true
    });

    if (response.status === 200 && response.headers['set-cookie']) {
      cookieHeader = response.headers['set-cookie'].join('; ');
      console.log(chalk.green('✅ Authentication successful'));
      return true;
    }
    
    console.log(chalk.red('❌ Authentication failed'));
    return false;
  } catch (error) {
    console.error(chalk.red('❌ Authentication error:'), error.message);
    return false;
  }
}

async function createJournalEntryWithDimensionTags() {
  console.log(chalk.blue('📝 Creating journal entry with dimension tags...'));
  
  const journalEntry = {
    date: '2025-06-16',
    description: 'Test entry with dimension tags',
    referenceNumber: 'DIM-TEST-001',
    journalType: 'JE',
    status: 'draft',
    lines: [
      {
        accountId: 7980,
        type: 'debit',
        amount: '100.00',
        description: 'Test debit with tags',
        entityCode: 'TEST',
        tags: [
          {
            dimensionId: 1,
            dimensionValueId: 1,
            dimensionName: 'Department',
            dimensionValueName: 'Sales'
          },
          {
            dimensionId: 2,
            dimensionValueId: 3,
            dimensionName: 'Project',
            dimensionValueName: 'Alpha'
          }
        ]
      },
      {
        accountId: 8011,
        type: 'credit',
        amount: '100.00',
        description: 'Test credit with tags',
        entityCode: 'TEST',
        tags: [
          {
            dimensionId: 1,
            dimensionValueId: 2,
            dimensionName: 'Department',
            dimensionValueName: 'Marketing'
          }
        ]
      }
    ]
  };

  try {
    console.log(chalk.yellow('📤 Sending journal entry data:'));
    console.log(JSON.stringify(journalEntry, null, 2));
    
    const response = await axios.post(`${BASE_URL}/api/clients/251/entities/392/journal-entries`, journalEntry, {
      headers: { 
        Cookie: cookieHeader,
        'Content-Type': 'application/json'
      }
    });

    if (response.status === 201) {
      console.log(chalk.green('✅ Journal entry created successfully'));
      console.log(chalk.yellow('📥 Response:'), JSON.stringify(response.data, null, 2));
      return response.data.id || response.data.entry?.id;
    } else {
      console.log(chalk.red('❌ Failed to create journal entry'));
      console.log('Response:', response.data);
      return null;
    }
  } catch (error) {
    console.error(chalk.red('❌ Error creating journal entry:'), error.response?.data || error.message);
    return null;
  }
}

async function updateJournalEntryWithDimensionTags(entryId) {
  console.log(chalk.blue(`📝 Updating journal entry ${entryId} with dimension tags...`));
  
  const updateData = {
    description: 'Updated entry with dimension tags',
    lines: [
      {
        accountId: 7980,
        type: 'debit',
        amount: '150.00',
        description: 'Updated debit with NEW tags',
        entityCode: 'TEST',
        tags: [
          {
            dimensionId: 1,
            dimensionValueId: 3,
            dimensionName: 'Department',
            dimensionValueName: 'Engineering'
          },
          {
            dimensionId: 2,
            dimensionValueId: 1,
            dimensionName: 'Project',
            dimensionValueName: 'Beta'
          }
        ]
      },
      {
        accountId: 8011,
        type: 'credit',
        amount: '150.00',
        description: 'Updated credit with NEW tags',
        entityCode: 'TEST',
        tags: [
          {
            dimensionId: 1,
            dimensionValueId: 4,
            dimensionName: 'Department',
            dimensionValueName: 'Finance'
          },
          {
            dimensionId: 2,
            dimensionValueId: 2,
            dimensionName: 'Project',
            dimensionValueName: 'Gamma'
          }
        ]
      }
    ]
  };

  try {
    console.log(chalk.yellow('📤 Sending update data with dimension tags:'));
    console.log(JSON.stringify(updateData, null, 2));
    
    const response = await axios.patch(`${BASE_URL}/api/clients/251/entities/392/journal-entries/${entryId}`, updateData, {
      headers: { 
        Cookie: cookieHeader,
        'Content-Type': 'application/json'
      }
    });

    if (response.status === 200) {
      console.log(chalk.green('✅ Journal entry updated successfully'));
      console.log(chalk.yellow('📥 Update response:'), JSON.stringify(response.data, null, 2));
      return true;
    } else {
      console.log(chalk.red('❌ Failed to update journal entry'));
      console.log('Response:', response.data);
      return false;
    }
  } catch (error) {
    console.error(chalk.red('❌ Error updating journal entry:'), error.response?.data || error.message);
    return false;
  }
}

async function verifyDimensionTags(entryId) {
  console.log(chalk.blue(`🔍 Verifying dimension tags for entry ${entryId}...`));
  
  try {
    const response = await axios.get(`${BASE_URL}/api/clients/251/entities/392/journal-entries/${entryId}`, {
      headers: { Cookie: cookieHeader }
    });

    if (response.status === 200) {
      const entry = response.data;
      console.log(chalk.yellow('📥 Retrieved entry data:'));
      console.log(JSON.stringify(entry, null, 2));
      
      // Check if lines have dimension tags
      if (entry.lines && entry.lines.length > 0) {
        let totalTags = 0;
        entry.lines.forEach((line, index) => {
          const tags = line.tags || [];
          totalTags += tags.length;
          console.log(chalk.cyan(`Line ${index + 1}: ${tags.length} dimension tags`));
          if (tags.length > 0) {
            tags.forEach(tag => {
              console.log(chalk.gray(`  - ${tag.dimensionName}: ${tag.dimensionValueName}`));
            });
          }
        });
        
        if (totalTags > 0) {
          console.log(chalk.green(`✅ Found ${totalTags} dimension tags in total`));
          return true;
        } else {
          console.log(chalk.red('❌ No dimension tags found in journal entry lines'));
          return false;
        }
      } else {
        console.log(chalk.red('❌ No lines found in journal entry'));
        return false;
      }
    }
  } catch (error) {
    console.error(chalk.red('❌ Error verifying dimension tags:'), error.response?.data || error.message);
    return false;
  }
}

async function runDimensionTagTest() {
  console.log(chalk.magenta('🧪 Starting Dimension Tag Update Test'));
  console.log(chalk.magenta('='.repeat(50)));
  
  // Step 1: Authenticate
  const authenticated = await authenticate();
  if (!authenticated) {
    process.exit(1);
  }
  
  // Step 2: Create journal entry with dimension tags
  const entryId = await createJournalEntryWithDimensionTags();
  if (!entryId) {
    process.exit(1);
  }
  
  // Step 3: Update journal entry with new dimension tags
  const updateSuccess = await updateJournalEntryWithDimensionTags(entryId);
  if (!updateSuccess) {
    process.exit(1);
  }
  
  // Step 4: Verify dimension tags were saved
  const verifySuccess = await verifyDimensionTags(entryId);
  
  console.log(chalk.magenta('='.repeat(50)));
  if (verifySuccess) {
    console.log(chalk.green('🎉 Dimension Tag Test PASSED - Tags were properly saved during update'));
  } else {
    console.log(chalk.red('💥 Dimension Tag Test FAILED - Tags were not saved during update'));
    process.exit(1);
  }
}

// Run the test
runDimensionTagTest().catch(console.error);