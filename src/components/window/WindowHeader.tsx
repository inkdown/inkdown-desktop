import { memo } from 'react';
import { FileText } from 'lucide-react';

interface WindowHeaderProps {
  selectedFile: string;
}

export const WindowHeader = memo(function WindowHeader({ selectedFile }: WindowHeaderProps) {
  const fileName = selectedFile.split('/').pop();

  return (
    <div 
      className="p-3 border-b"
      style={{
        backgroundColor: 'var(--theme-background)',
        borderBottomColor: 'var(--theme-border)',
      }}
    >
      <div className="flex items-center">
        <FileText 
          size={16} 
          className="mr-2" 
          style={{ color: 'var(--theme-muted-foreground)' }}
        />
        <h2 
          className="text-sm font-medium truncate"
          style={{ color: 'var(--theme-foreground)' }}
        >
          {fileName}
        </h2>
      </div>
    </div>
  );
});