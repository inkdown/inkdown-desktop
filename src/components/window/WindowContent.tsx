import { memo } from 'react';

interface WindowContentProps {
  selectedFile: string;
}

export const WindowContent = memo(function WindowContent({ selectedFile }: WindowContentProps) {
  return (
    <div className="flex-1 p-4 bg-white">
      <div className="h-full border border-gray-200 rounded-lg p-4 bg-gray-50">
        <p className="text-gray-500 text-center">
          Editor de markdown será implementado aqui
        </p>
        <p className="text-xs text-gray-400 text-center mt-2">
          Arquivo: {selectedFile}
        </p>
      </div>
    </div>
  );
});