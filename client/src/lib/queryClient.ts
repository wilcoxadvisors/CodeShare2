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
  },
): Promise<ApiResponse> {
  const method = options?.method || 'GET';
  const data = options?.data;
  
  // Handle file uploads with FormData differently
  const isFormData = data instanceof FormData;
  
  const res = await fetch(url, {
    method,
    headers: isFormData ? {} : (data ? { "Content-Type": "application/json" } : {}),
    body: isFormData ? data : (data ? JSON.stringify(data) : undefined),
    credentials: "include",
  });

  await throwIfResNotOk(res);
  
  // Parse the JSON response if it's not a file download
  if (res.headers.get('content-type')?.includes('application/json')) {
    const jsonData = await res.json();
    // Enhance the response with the parsed JSON data
    Object.assign(res, jsonData);
  }
  
  return res as ApiResponse;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const res = await fetch(queryKey[0] as string, {
      credentials: "include",
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
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
