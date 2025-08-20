import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { initializeStores, cleanupStores } from "./stores";

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
  cleanupStores();
});

// Initialize stores before rendering
initializeStores().then(() => {
  createRoot(document.getElementById("root") as HTMLElement).render(
    <ErrorBoundary>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </ErrorBoundary>
  );
}).catch((error) => {
  console.error("Failed to initialize application:", error);
  
  // Render app anyway with error state
  createRoot(document.getElementById("root") as HTMLElement).render(
    <ErrorBoundary>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </ErrorBoundary>
  );
});
