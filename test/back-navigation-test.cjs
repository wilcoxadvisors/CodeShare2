/**
 * Back Navigation Test Script
 * This script simulates a user flow for testing back navigation issues in the setup process
 * 
 * Run with: node test/back-navigation-test.cjs
 */

const puppeteer = require('puppeteer');

// Helper to wait for a specific console message
async function waitForConsoleMessage(page, messageSubstring, maxWaitTime = 10000) {
  const startTime = Date.now();
  let found = false;
  
  // Set up console message listener
  const consoleListener = msg => {
    const text = msg.text();
    if (text.includes(messageSubstring)) {
      found = true;
    }
  };
  
  page.on('console', consoleListener);
  
  // Wait until message is found or timeout
  while (!found && (Date.now() - startTime < maxWaitTime)) {
    await page.waitForTimeout(100);
  }
  
  // Clean up listener
  page.off('console', consoleListener);
  
  return found;
}

async function run() {
  console.log("Starting browser for back navigation test...");
  const browser = await puppeteer.launch({
    headless: false,
    defaultViewport: { width: 1280, height: 800 },
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  try {
    const page = await browser.newPage();
    
    // Enable console logs from the browser
    page.on('console', msg => {
      const text = msg.text();
      if (text.includes('DEBUG')) {
        console.log(`BROWSER LOG: ${text}`);
      }
    });

    // Configure request timeout
    await page.setDefaultNavigationTimeout(30000);
    
    console.log("Navigating to login page...");
    await page.goto('http://localhost:3000/login', { waitUntil: 'networkidle0' });

    // Login
    console.log("Logging in...");
    await page.type('input[name="username"]', 'admin');
    await page.type('input[name="password"]', 'password123');
    await page.click('button[type="submit"]');
    
    // Wait for navigation to dashboard
    console.log("Waiting for dashboard...");
    await page.waitForSelector('h1:contains("Dashboard")', { timeout: 10000 });
    
    // Navigate to setup
    console.log("Navigating to /setup...");
    await page.goto('http://localhost:3000/setup', { waitUntil: 'networkidle0' });
    
    // Wait for setup page to load
    console.log("Waiting for setup page...");
    await page.waitForSelector('h2:contains("Account Setup")', { timeout: 10000 });
    
    // Fill in client information in Step 1
    console.log("Filling out client information (Step 1)...");
    await page.type('input[name="name"]', 'Test Client XYZ');
    await page.type('input[name="legalName"]', 'Test Client XYZ Legal');
    await page.type('input[name="taxId"]', '123-45-6789');
    await page.select('select[name="industry"]', 'technology');
    await page.type('input[name="email"]', 'test@example.com');
    
    // Click Next on Step 1
    console.log("Proceeding to Step 2...");
    await page.click('button:contains("Next")');
    
    // Wait for entities page (Step 2)
    console.log("Waiting for entities page (Step 2)...");
    await page.waitForSelector('h3:contains("Add New Entity")', { timeout: 10000 });
    
    // Add an entity
    console.log("Adding a test entity...");
    await page.type('input[name="name"]', 'Test Entity 1');
    await page.type('input[name="legalName"]', 'Test Entity 1 Legal');
    await page.select('select[name="entityType"]', 'llc');
    await page.select('select[name="industry"]', 'finance');
    await page.click('button:contains("Add Entity")');
    
    // Wait for entity to be added
    console.log("Waiting for entity to appear in list...");
    await page.waitForSelector('div:contains("Test Entity 1")', { timeout: 10000 });
    
    // Click Next on Step 2
    console.log("Proceeding to Step 3...");
    await page.click('button:contains("Next Step")');
    
    // Wait for summary page (Step 3)
    console.log("Waiting for summary page (Step 3)...");
    await page.waitForSelector('h3:contains("Review Your Setup")', { timeout: 10000 });
    
    // Log the state before clicking back
    console.log("Logging state before back navigation...");
    await page.evaluate(() => {
      console.log("DEBUG TEST: Local Storage before back navigation:", 
        Object.entries(localStorage).map(([k,v]) => `${k}: ${v}`).join(', '));
      
      if (typeof setupEntities !== 'undefined') {
        console.log("DEBUG TEST: setupEntities before back:", JSON.stringify(setupEntities));
      } else {
        console.log("DEBUG TEST: setupEntities not directly accessible in global scope");
      }
    });
    
    // Now trigger the back button to go from Step 3 to Step 2
    console.log("CRITICAL TEST: Navigating back from Step 3 to Step 2...");
    await page.click('button:contains("Go Back")');
    
    // Wait for entities page (Step 2) again
    console.log("Waiting for entities page (Step 2) after back navigation...");
    await page.waitForSelector('h3:contains("Add New Entity")', { timeout: 10000 });
    
    // Wait a bit for any state updates to process
    await page.waitForTimeout(1000);
    
    // Log the state after back navigation
    console.log("Logging state after back navigation...");
    await page.evaluate(() => {
      console.log("DEBUG TEST: Local Storage after back navigation:", 
        Object.entries(localStorage).map(([k,v]) => `${k}: ${v}`).join(', '));
      
      if (typeof setupEntities !== 'undefined') {
        console.log("DEBUG TEST: setupEntities after back:", JSON.stringify(setupEntities));
      } else {
        console.log("DEBUG TEST: setupEntities not directly accessible in global scope");
      }
    });
    
    // Add a second entity to check if state is preserved
    console.log("Adding a second test entity to verify state preservation...");
    await page.type('input[name="name"]', 'Test Entity 2');
    await page.type('input[name="legalName"]', 'Test Entity 2 Legal');
    await page.select('select[name="entityType"]', 'corporation');
    await page.select('select[name="industry"]', 'healthcare');
    await page.click('button:contains("Add Entity")');
    
    // Wait for second entity to be added
    console.log("Waiting for second entity to appear in list...");
    await page.waitForSelector('div:contains("Test Entity 2")', { timeout: 10000 });
    
    // Click Next on Step 2 again
    console.log("Proceeding to Step 3 again...");
    await page.click('button:contains("Next Step")');
    
    // Wait for summary page (Step 3) again
    console.log("Waiting for summary page (Step 3) again...");
    await page.waitForSelector('h3:contains("Review Your Setup")', { timeout: 10000 });
    
    // Verify both entities are in the summary
    console.log("Verifying both entities appear in the summary...");
    const entity1Exists = await page.evaluate(() => {
      return document.body.textContent.includes('Test Entity 1');
    });
    
    const entity2Exists = await page.evaluate(() => {
      return document.body.textContent.includes('Test Entity 2');
    });
    
    console.log(`Test Entity 1 in summary: ${entity1Exists ? 'YES' : 'NO'}`);
    console.log(`Test Entity 2 in summary: ${entity2Exists ? 'YES' : 'NO'}`);
    
    if (entity1Exists && entity2Exists) {
      console.log('✅ PASS: Both entities preserved during back navigation');
    } else if (!entity1Exists) {
      console.log('❌ FAIL: First entity lost during back navigation');
    } else if (!entity2Exists) {
      console.log('❌ FAIL: Second entity not properly added');
    }
    
    // Just to be sure, get a screenshot of the final state
    await page.screenshot({ path: 'test-back-navigation-results.png' });
    console.log("Screenshot saved to test-back-navigation-results.png");
    
  } catch (error) {
    console.error('Test error:', error);
  } finally {
    console.log("Closing browser...");
    await browser.close();
  }
}

run().catch(console.error);