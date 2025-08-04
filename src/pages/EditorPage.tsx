import { useNavigate } from "react-router-dom";
import { useDirectory } from "../contexts/DirectoryContext";
import { WorkspacePage } from "../components/WorkspacePage";

export default function EditorPage() {
  const { currentDirectory } = useDirectory();
  const navigate = useNavigate();

  if (!currentDirectory) {
    navigate("/", { replace: true });
    return null;
  }

  return <WorkspacePage />;
}