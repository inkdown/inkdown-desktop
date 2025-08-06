import { useState, useCallback, memo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDirectory } from '../../contexts/DirectoryContext'
import { useSidebarResize } from '../../hooks/useSidebarResize';
import { Sidebar, SidebarResizer } from '../sidebar';
import { MainWindow } from '../window';

export const WorkspacePage = memo(function WorkspacePage() {
  const { fileTree, currentDirectory } = useDirectory();
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const { sidebarWidth, handleMouseDown } = useSidebarResize(280);
  const navigate = useNavigate();

  const handleFileSelect = useCallback((filePath: string) => {
    setSelectedFile(filePath);
  }, []);

  const handleFilePathChange = useCallback((newPath: string) => {
    setSelectedFile(newPath);
  }, []);


  if (!fileTree || !currentDirectory) {
    return (
      <div className="h-screen flex items-center justify-center theme-card relative">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-2" style={{ color: 'var(--theme-foreground)' }}>
            Nenhum diretório selecionado
          </h2>
          <p className="theme-text-muted mb-4">
            Selecione um diretório para começar a editar
          </p>
          <button
            onClick={() => navigate('/')}
            className="theme-button px-4 py-2 rounded-lg"
          >
            Voltar ao Início
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex theme-card relative">
      
      <Sidebar
        width={sidebarWidth}
        fileTree={fileTree}
        selectedFile={selectedFile}
        onFileSelect={handleFileSelect}
      />
      
      <SidebarResizer onMouseDown={handleMouseDown} />
      
      <MainWindow selectedFile={selectedFile} onFilePathChange={handleFilePathChange} />
    </div>
  );
});