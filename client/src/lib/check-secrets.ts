import { apiRequest } from './queryClient';

interface SecretCheckResponse {
  exists: boolean;
}

/**
 * Checks if a specific environment secret is available
 * @param secretName The name of the secret to check
 * @returns Promise resolving to a boolean indicating whether the secret exists
 */
export async function check(secretName: string): Promise<boolean> {
  try {
    const response = await fetch('/api/secrets/check', {
      method: 'POST',
      body: JSON.stringify({ secret: secretName }),
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      throw new Error(`Failed to check secret: ${response.statusText}`);
    }
    
    const data = await response.json() as SecretCheckResponse;
    return data.exists;
  } catch (error) {
    console.error(`Failed to check if secret ${secretName} exists:`, error);
    return false;
  }
}

/**
 * Check multiple secrets at once
 * @param secretNames Array of secret names to check
 * @returns Promise resolving to an object with secret names as keys and boolean values
 */
export async function checkMultiple(secretNames: string[]): Promise<Record<string, boolean>> {
  const results: Record<string, boolean> = {};
  
  await Promise.all(
    secretNames.map(async (name) => {
      results[name] = await check(name);
    })
  );
  
  return results;
}

/**
 * Check if XAI API key is available
 * @returns Promise resolving to a boolean indicating if XAI API key exists
 */
export async function checkXaiApiKey(): Promise<boolean> {
  return await check('XAI_API_KEY');
}