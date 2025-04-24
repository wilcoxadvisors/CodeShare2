/**
 * Forecast Training Test
 * 
 * This test verifies that the Spark MLlib ARIMA model training process runs successfully
 * and outputs the expected message indicating that models were trained.
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import * as path from 'path';
import * as fs from 'fs';

const execPromise = promisify(exec);

describe('Spark MLlib ARIMA Training', () => {
  test('should train ARIMA models in sample mode and exit with code 0', async () => {
    // Set a reasonable timeout as the Spark job may take some time
    jest.setTimeout(60000); // 60 seconds

    try {
      // Run the training script with sample flag
      const { stdout, stderr } = await execPromise('./scripts/train_forecast.sh --sample');
      
      // Log output for debugging
      console.log('Training Output:', stdout);
      if (stderr) {
        console.error('Training Errors:', stderr);
      }
      
      // Check that output contains success message
      expect(stdout).toContain('trained');
      expect(stdout).toContain('model');
      
      // Check that model directories were created
      const modelDirExists = fs.existsSync('models/forecast');
      expect(modelDirExists).toBe(true);
      
      // At least one entity model should exist
      const entityDirs = fs.readdirSync('models/forecast');
      expect(entityDirs.length).toBeGreaterThan(0);
      
      // Success
      expect(true).toBe(true);
    } catch (error) {
      // If exec fails, the test should fail
      console.error('Test failed with error:', error);
      expect(error).toBeUndefined();
    }
  });
});