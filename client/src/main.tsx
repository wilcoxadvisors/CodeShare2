import { createRoot } from "react-dom/client";
import { BrowserRouter, RouterProvider, createBrowserRouter } from 'react-router-dom';
import App from "./App";
import "./index.css";

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
