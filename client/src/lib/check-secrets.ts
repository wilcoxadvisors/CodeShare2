interface ApiCheckResponse {
  exists: boolean;
}

/**
 * Checks if a specific API key is available
 * @param apiName The name of the API key to check
 * @returns Promise resolving to a boolean indicating whether the API key exists
 */
export async function check(apiName: string): Promise<boolean> {
  try {
    const response = await fetch('/api/public/check-api', {
      method: 'POST',
      body: JSON.stringify({ api: apiName }),
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      throw new Error(`Failed to check API key: ${response.statusText}`);
    }
    
    const data = await response.json() as ApiCheckResponse;
    return data.exists;
  } catch (error) {
    console.error(`Failed to check if API ${apiName} is available:`, error);
    return false;
  }
}

/**
 * Check multiple API keys at once
 * @param apiNames Array of API names to check
 * @returns Promise resolving to an object with API names as keys and boolean values
 */
export async function checkMultiple(apiNames: string[]): Promise<Record<string, boolean>> {
  const results: Record<string, boolean> = {};
  
  await Promise.all(
    apiNames.map(async (name) => {
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

/**
 * Check if OpenAI API key is available
 * @returns Promise resolving to a boolean indicating if OpenAI API key exists
 */
export async function checkOpenAiApiKey(): Promise<boolean> {
  return await check('OPENAI_API_KEY');
}