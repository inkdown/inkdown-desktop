import { useNavigate } from "react-router-dom";
import { useDirectory } from "../contexts/DirectoryContext";
import { BenchmarkPage } from "../components/pages/BenchmarkPage";

export default function BenchPage() {
  const { currentDirectory } = useDirectory();
  const navigate = useNavigate();

  const handleBack = () => {
    navigate(currentDirectory ? "/editor" : "/", { replace: true });
  };

  return <BenchmarkPage onBack={handleBack} />;
}