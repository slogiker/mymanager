import React from 'react';
import { Upload } from 'lucide-react';

interface FileDropOverlayProps {
  active: boolean;
  currentPathString: string;
}

export function FileDropOverlay({ active, currentPathString }: FileDropOverlayProps) {
  if (!active) return null;

  return (
    <div className="fixed inset-0 z-50 bg-[#111216]/90 border-4 border-dashed border-red-500 backdrop-blur-md flex flex-col items-center justify-center pointer-events-none">
      <Upload size={64} className="text-red-500 animate-bounce mb-3" />
      <h2 className="text-2xl font-bold text-white">Drop files anywhere to upload</h2>
      <p className="text-sm text-red-300 mt-1">Uploading to: {currentPathString}</p>
    </div>
  );
}
