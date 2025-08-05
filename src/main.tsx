import React from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import { DirectoryProvider } from "./contexts/DirectoryContext";
import { EditingProvider } from "./contexts/EditingContext";
import { AppearanceProvider } from "./contexts/AppearanceContext";
import { ThemeProvider } from "./contexts/ThemeContext";
import { ErrorBoundary } from "./components/ErrorBoundary";

createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <ErrorBoundary>
      <BrowserRouter>
        <ThemeProvider>
          <AppearanceProvider>
            <DirectoryProvider>
              <EditingProvider>
                <App />
              </EditingProvider>
            </DirectoryProvider>
          </AppearanceProvider>
        </ThemeProvider>
      </BrowserRouter>
    </ErrorBoundary>
  </React.StrictMode>,
);
