import { QueryClient, QueryFunction } from "@tanstack/react-query";

// Define enhanced Response type to include common API response fields
export interface ApiResponse extends Response {
  id?: number;
  entry?: {
    id: number;
    [key: string]: any;
  };
  [key: string]: any;
}

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    let errorPayload;
    try {
      // The server often sends detailed validation errors in a JSON body
      errorPayload = await res.json();
      console.error("SERVER REJECTED PAYLOAD:", errorPayload);
    } catch (e) {
      // If the body is not JSON, use the raw text
      errorPayload = await res.text();
    }
    // Throw an error that includes the detailed payload
    throw new Error(`${res.status} ${res.statusText}: ${JSON.stringify(errorPayload, null, 2)}`);
  }
}

export async function apiRequest(
  url: string,
  options?: {
    method?: string;
    data?: unknown;
    onUploadProgress?: (progressEvent: any) => void;
    isFormData?: boolean; // Bug fix #7: Explicit flag to handle FormData properly
  },
): Promise<any> {
  const method = options?.method || 'GET';
  const data = options?.data;
  
  // Handle file uploads with FormData differently
  const isFormData = data instanceof FormData || options?.isFormData === true;
  console.log("DEBUG apiRequest: isFormData:", isFormData, "data type:", typeof data, 
              "url:", url, "method:", method);
  
  if (isFormData) {
    console.log("DEBUG apiRequest: Processing FormData submission with FormData object");
    // We can't easily iterate over FormData keys in all TypeScript configurations
    // Just indicate that we're processing FormData without trying to list the keys
    console.log("DEBUG apiRequest: FormData is being transmitted properly");
  }
  
  // For FormData, don't set Content-Type - let browser handle the multipart boundary
  const headers: Record<string, string> = {};
  if (!isFormData && data) {
    headers["Content-Type"] = "application/json";
  }
  
  const response = await fetch(url, {
    method,
    headers,
    body: isFormData ? (data as FormData) : (data ? JSON.stringify(data) : undefined),
    credentials: "include",  // critical: keep cookie / session on PUT, PATCH, DELETE
    redirect: "manual"      // don't follow redirects - stay on JSON response
  });
  
  // Handle 401 Unauthorized responses by redirecting to login page
  if (response.status === 401) {
    console.log("Unauthorized request detected, redirecting to login...");
    window.location.assign('/login');
    return Promise.reject(new Error('Unauthenticated'));
  }

  // Get response data
  let responseData;
  try {
    // Check content type first - always try to read the response regardless of status
    const contentType = response.headers.get('content-type');
    
    // Clone the response so we can read it multiple ways if needed
    const clonedResponse = response.clone();
    
    if (contentType && contentType.includes('application/json')) {
      try {
        // Try to parse as JSON regardless of status code
        responseData = await response.json();
        
        // If we're here and not OK, prepare a detailed error with the JSON error details
        if (!response.ok && responseData) {
          console.error('API Error Details:', responseData);
        }
      } catch (jsonError) {
        // If JSON parsing fails, fall back to text
        console.warn('Failed to parse error response as JSON:', jsonError);
        responseData = await clonedResponse.text();
      }
    } else {
      // For non-JSON responses, just get the text
      responseData = await response.text();
    }
    
    // Now handle error status after we've read the response
    if (!response.ok) {
      let errorMessage = `API request failed with status ${response.status} ${response.statusText}`;
      
      // Add detailed error message if we have one
      if (typeof responseData === 'object' && responseData !== null) {
        // Format the error object for better display
        const errorDetails = JSON.stringify(responseData, null, 2);
        errorMessage += `\nDetails: ${errorDetails}`;
      } else if (typeof responseData === 'string' && responseData.length > 0) {
        errorMessage += `\nDetails: ${responseData}`;
      }
      
      throw new Error(errorMessage);
    }
    
    // Success case - additional validation for JSON responses
    if (contentType && contentType.includes('application/json')) {
      if (responseData === null || typeof responseData !== 'object') {
        throw new Error('Invalid JSON response: expected an object but got ' + typeof responseData);
      }
    }
  } catch (error) {
    console.error('Failed to process API response:', error);
    throw error;
  }

  // Create a completely new object with the response properties we need
  const formattedResponse = {
    status: response.status,
    ok: response.ok,
    statusText: response.statusText,
    // Manually extract key headers instead of using entries() which has TS compatibility issues
    headers: {
      'content-type': response.headers.get('content-type'),
      'content-length': response.headers.get('content-length')
    },
    ...(typeof responseData === 'object' ? responseData : {}) // Spread any properties from the JSON body, only if it's an object
  };

  return formattedResponse;
}

type UnauthorizedBehavior = "returnNull" | "throw" | "redirect";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const response = await fetch(queryKey[0] as string, {
      credentials: "include",
    });

    if (response.status === 401) {
      // Check if we're on the home page, which allows guest access
      const isHomePage = window.location.pathname === '/';
      const isBlogPage = window.location.pathname === '/blog' || window.location.pathname.startsWith('/blog/');
      
      if (isHomePage || isBlogPage) {
        // On home or blog page, just return null for unauthorized queries
        return null;
      }
      
      if (unauthorizedBehavior === "returnNull") {
        return null;
      } else if (unauthorizedBehavior === "redirect") {
        console.log("Unauthorized query detected, redirecting to login...");
        window.location.assign('/login');
        return Promise.reject(new Error('Unauthenticated'));
      }
      // Otherwise continue to throw error
    }

    // Process the response
    let responseData;
    try {
      const contentType = response.headers.get('content-type');
      const clonedResponse = response.clone();
      
      // Always try to parse the response first
      if (contentType?.includes('application/json')) {
        try {
          responseData = await response.json();
          
          // If not OK, log the error details
          if (!response.ok && responseData) {
            console.error('API Query Error Details:', responseData);
          }
        } catch (jsonError) {
          console.warn('Failed to parse error response as JSON:', jsonError);
          responseData = await clonedResponse.text();
        }
      } else {
        responseData = await response.text();
      }
      
      // Handle error after reading the response
      if (!response.ok) {
        let errorMessage = `API query failed with status ${response.status} ${response.statusText}`;
        
        // Add detailed error message if we have one
        if (typeof responseData === 'object' && responseData !== null) {
          const errorDetails = JSON.stringify(responseData, null, 2);
          errorMessage += `\nDetails: ${errorDetails}`;
        } else if (typeof responseData === 'string' && responseData.length > 0) {
          errorMessage += `\nDetails: ${responseData}`;
        }
        
        throw new Error(errorMessage);
      }
    } catch (error) {
      console.error('Failed to process query response:', error);
      throw error;
    }

    // Return the parsed data
    return responseData;
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "redirect" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
