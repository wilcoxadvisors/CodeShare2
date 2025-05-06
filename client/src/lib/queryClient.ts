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
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
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
  // Bug fix #7: Check both instanceof FormData and explicit isFormData flag
  const isFormData = data instanceof FormData || options?.isFormData === true;
  console.log("DEBUG apiRequest: isFormData:", isFormData, "data type:", typeof data);
  
  const response = await fetch(url, {
    method,
    // Bug fix #7: For FormData, don't set Content-Type header at all
    // Let the browser set it automatically with the correct boundary
    headers: isFormData ? {} : (data ? { "Content-Type": "application/json" } : {}),
    body: isFormData ? data : (data ? JSON.stringify(data) : undefined),
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
    // First check if response is OK (status 200-299)
    if (!response.ok) {
      // If not OK, throw an error immediately with status code
      throw new Error(`API request failed with status ${response.status} ${response.statusText}`);
    }
    
    // Only try to parse JSON if the content-type is application/json
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      responseData = await response.json();
      
      // Additional validation: Check that we actually got a proper JSON response
      if (responseData === null || typeof responseData !== 'object') {
        throw new Error('Invalid JSON response: expected an object but got ' + typeof responseData);
      }
    } else {
      // For non-JSON responses, just get the text
      responseData = await response.text();
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
    ...responseData // Spread any properties from the JSON body
  };

  if (!response.ok) {
    // Check if we need to throw with custom error message
    await throwIfResNotOk(response);
    // If throwIfResNotOk doesn't throw, throw our formatted response
    throw formattedResponse;
  }

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
      // Only attempt to parse JSON if we have a response with content
      if (response.headers.get('content-type')?.includes('application/json')) {
        responseData = await response.json();
      } else {
        responseData = null;
      }
    } catch (error) {
      console.warn('Failed to parse response data in queryFn:', error);
      responseData = null;
    }

    // Check for errors
    if (!response.ok) {
      await throwIfResNotOk(response);
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
