import { memo, useMemo } from 'react';
import { ChevronRight } from 'lucide-react';

interface NotePathProps {
  filePath: string;
  workspacePath?: string;
  className?: string;
}

export const NotePath = memo(function NotePath({ 
  filePath, 
  workspacePath,
  className = '' 
}: NotePathProps) {
  const { pathSegments, fileName, directoryPath } = useMemo(() => {
    if (!filePath) return { pathSegments: [], fileName: '', directoryPath: '' };
    
    let pathToProcess = filePath;
    
    // Make path relative to workspace if workspace path is provided
    if (workspacePath) {
      const normalizedFilePath = filePath.replace(/\\/g, '/');
      const normalizedWorkspacePath = workspacePath.replace(/\\/g, '/');
      
      if (normalizedFilePath.startsWith(normalizedWorkspacePath)) {
        // Remove workspace path and leading slash to get relative path
        pathToProcess = normalizedFilePath.slice(normalizedWorkspacePath.length).replace(/^\//, '');
      }
    }
    
    const normalizedPath = pathToProcess.replace(/\\/g, '/');
    const segments = normalizedPath.split('/').filter(segment => segment.length > 0);
    const fileName = segments[segments.length - 1] || '';
    const directorySegments = segments.slice(0, -1);
    const directoryPath = directorySegments.join('/');
    
    // Limit the number of segments shown to prevent overflow
    const maxSegments = 4;
    let displaySegments = directorySegments;
    
    if (directorySegments.length > maxSegments) {
      displaySegments = [
        directorySegments[0],
        '...',
        ...directorySegments.slice(-maxSegments + 2)
      ];
    }
    
    return {
      pathSegments: displaySegments,
      fileName,
      directoryPath
    };
  }, [filePath, workspacePath]);

  if (!filePath) return null;

  return (
    <div 
      className={`flex items-center text-xs gap-1 truncate ${className}`}
      style={{ 
        color: 'var(--theme-muted-foreground)',
        maxWidth: '100%'
      }}
      title={directoryPath ? `${directoryPath}/${fileName}` : fileName}
    >
      {pathSegments.map((segment, index) => (
        <div key={index} className="flex items-center gap-1 flex-shrink-0">
          <span className="truncate max-w-24">{segment}</span>
          <ChevronRight size={10} className="flex-shrink-0 opacity-50" />
        </div>
      ))}
      <span 
        className="font-medium truncate"
        style={{ color: 'var(--theme-foreground)' }}
      >
        {fileName}
      </span>
    </div>
  );
});