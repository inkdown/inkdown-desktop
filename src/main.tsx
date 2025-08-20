import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import { DirectoryProvider } from "./contexts/DirectoryContext";
import { EditingProvider } from "./contexts/EditingContext";
import { AppearanceProvider } from "./contexts/AppearanceContext";
import { ErrorBoundary } from "./components/ErrorBoundary";

createRoot(document.getElementById("root") as HTMLElement).render(
    <ErrorBoundary>
      <BrowserRouter>
        <AppearanceProvider>
          <DirectoryProvider>
            <EditingProvider>
              <App />
            </EditingProvider>
          </DirectoryProvider>
        </AppearanceProvider>
      </BrowserRouter>
    </ErrorBoundary>
);
