import { useNavigate } from "react-router-dom";
import { useDirectory } from "../contexts/DirectoryContext";
import { BenchmarkPage } from "../components/BenchmarkPage";

export default function BenchPage() {
  const { currentDirectory } = useDirectory();
  const navigate = useNavigate();

  const handleBack = () => {
    // Volta para editor se tem diretório, senão para home
    navigate(currentDirectory ? "/editor" : "/", { replace: true });
  };

  return <BenchmarkPage onBack={handleBack} />;
}