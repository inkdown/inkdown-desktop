import "./App.css";
import { Suspense, lazy, useEffect } from "react";
import { Routes, Route, useNavigate } from "react-router-dom";
import { useDirectory } from "./contexts/DirectoryContext";

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
    ></div>
  </div>
);

function AppRouter() {
  const { currentDirectory } = useDirectory();
  const navigate = useNavigate();

  useEffect(() => {
    if (currentDirectory && window.location.pathname === "/") {
      navigate("/editor", { replace: true });
    }
  }, [currentDirectory, navigate]);

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
  return <AppRouter />;
}

export default App;
