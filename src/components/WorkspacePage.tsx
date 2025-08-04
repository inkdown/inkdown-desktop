import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDirectory } from '../contexts/DirectoryContext';
import { useSidebarResize } from '../hooks/useSidebarResize';
import { Sidebar, SidebarResizer } from './sidebar';
import { MainWindow } from './window';

export function WorkspacePage() {
  const { fileTree, currentDirectory } = useDirectory();
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const { sidebarWidth, handleMouseDown } = useSidebarResize(280);
  const navigate = useNavigate();

  const handleFileSelect = useCallback((filePath: string) => {
    setSelectedFile(filePath);
  }, []);


  if (!fileTree || !currentDirectory) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-700 mb-2">
            Nenhum diretório selecionado
          </h2>
          <p className="text-gray-500 mb-4">
            Selecione um diretório para começar a editar
          </p>
          <button
            onClick={() => navigate('/')}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg"
          >
            Voltar ao Início
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex bg-gray-50">
      <Sidebar
        width={sidebarWidth}
        fileTree={fileTree}
        selectedFile={selectedFile}
        onFileSelect={handleFileSelect}
      />
      
      <SidebarResizer onMouseDown={handleMouseDown} />
      
      <MainWindow selectedFile={selectedFile} />
    </div>
  );
}