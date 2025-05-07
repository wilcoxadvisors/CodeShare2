import { createRoot } from "react-dom/client";
import { BrowserRouter, RouterProvider, createBrowserRouter } from 'react-router-dom';
import axios from 'axios';
import App from "./App";
import "./index.css";

// Set up global axios interceptors for debugging
axios.interceptors.request.use(request => {
  console.log('DEBUG Axios Request:', request.method?.toUpperCase(), request.url);
  return request;
}, error => {
  console.error('DEBUG Axios Request Error:', error);
  return Promise.reject(error);
});

axios.interceptors.response.use(response => {
  console.log('DEBUG Axios Response:', response.status, response.config.url);
  return response;
}, error => {
  console.error('DEBUG Axios Response Error:', 
    error.response?.status || 'No status', 
    error.response?.config?.url || 'No URL',
    error.message
  );
  return Promise.reject(error);
});

// Add React Router future flags
const router = createBrowserRouter(
  [{
    path: "*",
    element: <App />
  }],
  {
    future: {
      v7_startTransition: true,
      v7_relativeSplatPath: true
    }
  }
);

createRoot(document.getElementById("root")!).render(
  <RouterProvider router={router} />
);
