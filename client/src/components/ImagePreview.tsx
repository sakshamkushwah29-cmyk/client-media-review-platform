import React, { useState } from 'react';
import { ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';

interface ImagePreviewProps {
  src: string;
  alt?: string;
  onCoordinateClick?: (xPercent: number, yPercent: number) => void;
}

export const ImagePreview: React.FC<ImagePreviewProps> = ({ src, alt = 'Asset Preview', onCoordinateClick }) => {
  const [zoom, setZoom] = useState<number>(1);

  const handleImageClick = (e: React.MouseEvent<HTMLImageElement>) => {
    if (!onCoordinateClick) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    onCoordinateClick(parseFloat(x.toFixed(1)), parseFloat(y.toFixed(1)));
  };

  return (
    <div className="relative w-full bg-slate-950 rounded-2xl overflow-hidden border border-slate-800 flex flex-col items-center justify-center p-4 min-h-[400px]">
      {/* Zoom controls */}
      <div className="absolute top-4 right-4 z-10 flex items-center gap-1.5 bg-slate-900/80 backdrop-blur-md p-1.5 rounded-lg border border-slate-800">
        <button
          onClick={() => setZoom(prev => Math.min(3, prev + 0.25))}
          title="Zoom In"
          className="p-1.5 hover:bg-slate-800 rounded text-slate-300 hover:text-white transition-colors"
        >
          <ZoomIn className="w-4 h-4" />
        </button>
        <button
          onClick={() => setZoom(prev => Math.max(0.5, prev - 0.25))}
          title="Zoom Out"
          className="p-1.5 hover:bg-slate-800 rounded text-slate-300 hover:text-white transition-colors"
        >
          <ZoomOut className="w-4 h-4" />
        </button>
        <button
          onClick={() => setZoom(1)}
          title="Reset Zoom"
          className="p-1.5 hover:bg-slate-800 rounded text-slate-300 hover:text-white transition-colors"
        >
          <RotateCcw className="w-4 h-4" />
        </button>
        <span className="text-[11px] font-mono text-slate-400 px-1">{Math.round(zoom * 100)}%</span>
      </div>

      <div className="w-full h-full overflow-auto flex items-center justify-center">
        <img
          src={src}
          alt={alt}
          onClick={handleImageClick}
          style={{ transform: `scale(${zoom})`, transformOrigin: 'center center' }}
          className="max-h-[70vh] object-contain rounded-lg transition-transform duration-200 cursor-crosshair shadow-lg"
        />
      </div>
    </div>
  );
};
