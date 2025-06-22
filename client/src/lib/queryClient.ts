import { QueryClient } from "@tanstack/react-query";

export const queryClient = new QueryClient();

export async function apiRequest(url: string, options: RequestInit = {}) {
  const { method = "GET", data, ...restOptions } = options as any;

  const config: RequestInit = {
    method,
    headers: {
      "Content-Type": "application/json",
      ...restOptions.headers,
    },
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