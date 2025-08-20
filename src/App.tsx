import "./App.css";
import { Suspense, lazy, useEffect, useState } from "react";
import { Routes, Route, useNavigate } from "react-router-dom";
import { useCurrentDirectory, useDirectoryStore } from "./stores/directoryStore";
import { cacheUtils } from "./utils/localStorage";
import { UpdateNotification } from "./components/updater/UpdateNotification";
import { useUpdater } from "./hooks/useUpdater";
import { ErrorProvider } from "./contexts/ErrorContext";

const HomePage = lazy(() => import("./pages/HomePage"));
const EditorPage = lazy(() => import("./pages/EditorPage"));

const LoadingSpinner = () => (
  <div
    className="h-screen flex items-center justify-center"
    style={{ backgroundColor: "var(--theme-background)" }}
  >
    <div
      className="animate-spin rounded-full h-8 w-8 border-b-2"
      style={{ borderColor: "var(--theme-primary)" }}
    />
  </div>
);

function AppRouter() {
  const currentDirectory = useCurrentDirectory();
  const { initializeWorkspace } = useDirectoryStore();
  const navigate = useNavigate();
  const [initializing, setInitializing] = useState(true);

  useEffect(() => {
    const initApp = async () => {
      const cachedWorkspace = cacheUtils.getWorkspacePath();
      
      if (cachedWorkspace) {
        navigate("/editor", { replace: true });
      }
      
      await initializeWorkspace();
      setInitializing(false);
    };

    initApp();
  }, [navigate, initializeWorkspace]);

  useEffect(() => {
    if (!initializing && currentDirectory && window.location.pathname === "/") {
      navigate("/editor", { replace: true });
    }
  }, [currentDirectory, navigate, initializing]);

  if (initializing) {
    return <LoadingSpinner />;
  }

  return (
    <Suspense fallback={<LoadingSpinner />}>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/editor" element={<EditorPage />} />
        <Route path="*" element={<HomePage />} />
      </Routes>
    </Suspense>
  );
}

function App() {
  const { autoCheck } = useUpdater();

  useEffect(() => {
    // Auto-check para atualizações na inicialização
    autoCheck();
  }, [autoCheck]);

  return (
    <ErrorProvider>
      <AppRouter />
      <UpdateNotification />
    </ErrorProvider>
  );
}

export default App;
