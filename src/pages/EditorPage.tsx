import { lazy, Suspense } from "react";
import { useNavigate } from "react-router-dom";
import { useCurrentDirectory } from "../stores/directoryStore";

const WorkspacePage = lazy(() => import("../components/pages/WorkspacePage"));

const LoadingSpinner = () => (
  <div className="h-screen flex items-center justify-center" style={{ backgroundColor: "var(--theme-background)" }}>
    <div className="animate-spin rounded-full h-8 w-8 border-b-2" style={{ borderColor: "var(--theme-primary)" }} />
  </div>
);

export default function EditorPage() {
  const currentDirectory = useCurrentDirectory();
  const navigate = useNavigate();

  if (!currentDirectory) {
    navigate("/", { replace: true });
    return null;
  }

  return (
    <Suspense fallback={<LoadingSpinner />}>
      <WorkspacePage />
    </Suspense>
  );
}