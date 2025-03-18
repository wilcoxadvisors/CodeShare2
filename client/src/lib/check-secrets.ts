import { apiRequest } from './queryClient';

/**
 * Checks if a specific environment secret is available
 * @param secretName The name of the secret to check
 * @returns Promise resolving to a boolean indicating whether the secret exists
 */
export async function check(secretName: string): Promise<boolean> {
  try {
    const response = await apiRequest<{exists: boolean}>('/api/secrets/check', {
      method: 'POST',
      body: JSON.stringify({ secret: secretName }),
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    return response.exists;
  } catch (error) {
    console.error(`Failed to check if secret ${secretName} exists:`, error);
    return false;
  }
}