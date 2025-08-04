import React from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import { DirectoryProvider } from "./contexts/DirectoryContext";
import { EditingProvider } from "./contexts/EditingContext";
import { AppearanceProvider } from "./contexts/AppearanceContext";

createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <BrowserRouter>
      <AppearanceProvider>
        <DirectoryProvider>
          <EditingProvider>
            <App />
          </EditingProvider>
        </DirectoryProvider>
      </AppearanceProvider>
    </BrowserRouter>
  </React.StrictMode>,
);
