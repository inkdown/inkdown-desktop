import { memo } from 'react';
import { FileText } from 'lucide-react';

interface WindowHeaderProps {
  selectedFile: string;
}

export const WindowHeader = memo(function WindowHeader({ selectedFile }: WindowHeaderProps) {
  const fileName = selectedFile.split('/').pop();

  return (
    <div className="p-3 border-b border-gray-200 bg-white">
      <div className="flex items-center">
        <FileText size={16} className="text-gray-500 mr-2" />
        <h2 className="text-sm font-medium text-gray-900 truncate">
          {fileName}
        </h2>
      </div>
    </div>
  );
});