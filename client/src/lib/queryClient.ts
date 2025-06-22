import { QueryClient, QueryFunction } from "@tanstack/react-query";

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

    // ARCHITECT'S SURGICAL FIX: Return parsed JSON directly, not response object
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({
        message: `Request failed with status: ${response.status}`,
      }));
      throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
    }

    if (response.status === 204) {
      return null;
    }

    return response.json();
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

export async function apiRequest(url: string, options: any = {}) {
  const { method = "GET", data, ...restOptions } = options;

  const config: RequestInit = {
    method,
    headers: {
      "Content-Type": "application/json",
      ...restOptions.headers,
    },
    credentials: "include",
    ...restOptions,
  };

  if (data) {
    config.body = JSON.stringify(data);
  }

  console.log(`DEBUG apiRequest: isFormData: false data type: ${typeof data} url: ${url} method: ${method}`);

  const response = await fetch(url, config);

  // ARCHITECT'S SURGICAL FIX: Properly handle the response.
  // If the response is not OK, throw an error with the response body.
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({
      message: `Request failed with status: ${response.status}`,
    }));
    throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
  }

  // If the response is successful but has no content (e.g., a 204), return null.
  if (response.status === 204) {
    return null;
  }

  // If the response is successful and has content, parse and return the JSON body.
  return response.json();
}