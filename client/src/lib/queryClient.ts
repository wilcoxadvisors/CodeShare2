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
    credentials: "include",
  });

  // Get response data
  let responseData;
  try {
    // Parse the JSON response if it's not a file download
    if (response.headers.get('content-type')?.includes('application/json')) {
      responseData = await response.json();
    } else {
      responseData = await response.text();
    }
  } catch (error) {
    console.warn('Failed to parse response data:', error);
    responseData = {};
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

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const response = await fetch(queryKey[0] as string, {
      credentials: "include",
    });

    if (unauthorizedBehavior === "returnNull" && response.status === 401) {
      return null;
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
      queryFn: getQueryFn({ on401: "throw" }),
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
