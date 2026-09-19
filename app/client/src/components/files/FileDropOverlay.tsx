import React from 'react';
import { Upload } from 'lucide-react';

interface FileDropOverlayProps {
  active: boolean;
  currentPathString: string;
}

export function FileDropOverlay({ active, currentPathString }: FileDropOverlayProps) {
  if (!active) return null;

  return (
    <div className="fixed inset-0 z-50 bg-cyan-950/80 border-4 border-dashed border-cyan-400 backdrop-blur-md flex flex-col items-center justify-center pointer-events-none">
      <Upload size={64} className="text-cyan-300 animate-bounce mb-3" />
      <h2 className="text-2xl font-bold text-white">Drop files anywhere to upload</h2>
      <p className="text-sm text-cyan-200 mt-1">Uploading to: {currentPathString}</p>
    </div>
  );
}
