/**
 * SQL Tool Utility Module
 * 
 * This module provides a simple way to execute SQL queries directly
 * from route handlers when debugging or implementing fallback behavior.
 */

import { db } from "./db";

/**
 * Execute a raw SQL query and return the results
 * 
 * @param query - SQL query string to execute
 * @returns Query result object with rows array
 */
export async function execute_sql_tool(query: string) {
  if (!query || typeof query !== 'string') {
    throw new Error('Invalid SQL query provided');
  }
  
  try {
    console.log(`Executing raw SQL query: ${query}`);
    const result = await db.execute(query);
    return result;
  } catch (error) {
    console.error('Error executing SQL query:', error);
    throw error;
  }
}