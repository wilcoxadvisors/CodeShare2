/**
 * ETL Dry Run Test
 * 
 * This test verifies that the Dask ETL exporter runs successfully and outputs the expected
 * message indicating that data was written to Parquet files.
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import * as path from 'path';

const execPromise = promisify(exec);

describe('ETL Dask Export', () => {
  test('should run ETL script in dry-run mode and exit with code 0', async () => {
    // Set a reasonable timeout as the ETL script may take some time
    jest.setTimeout(30000);

    try {
      // Use the wrapper script with dry-run flag
      const { stdout, stderr } = await execPromise('./run-etl-je.sh --dry-run');
      
      // Log output for debugging
      console.log('ETL Output:', stdout);
      if (stderr) {
        console.error('ETL Errors:', stderr);
      }
      
      // Check that output contains success message
      expect(stdout).toContain('Wrote');
      expect(stdout).toContain('rows to Parquet');
      
      // Success
      expect(true).toBe(true);
    } catch (error) {
      // If exec fails, the test should fail
      console.error('Test failed with error:', error);
      expect(error).toBeUndefined();
    }
  });
});