/**
 * Forecast Training Test
 * 
 * This test verifies that the Spark MLlib ARIMA model training process runs successfully
 * and outputs the expected message indicating that models were trained.
 */

const { exec } = require('child_process');
const { promisify } = require('util');
const path = require('path');
const fs = require('fs');

const execPromise = promisify(exec);

describe('Spark MLlib ARIMA Training', () => {
  test('should train ARIMA models in sample mode and exit with code 0', async () => {
    // Set a reasonable timeout as the Spark job may take some time
    jest.setTimeout(60000); // 60 seconds

    try {
      let stdout = '';
      let stderr = '';
      
      try {
        // Try running the shell script first (will work in CI)
        const result = await execPromise('./scripts/train_forecast.sh --sample');
        stdout = result.stdout;
        stderr = result.stderr;
      } catch (shellError) {
        console.log('Shell script failed, falling back to direct Python execution');
        // If shell script fails (no spark-submit), fall back to direct Python execution
        const result = await execPromise('python3 ml/train_forecast_spark.py --sample');
        stdout = result.stdout;
        stderr = result.stderr;
      }
      
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
      // If all execution attempts fail, the test should fail
      console.error('Test failed with error:', error);
      expect(error).toBeUndefined();
    }
  });
});