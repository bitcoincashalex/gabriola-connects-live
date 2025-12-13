// Path: components/ImageLightbox.tsx
// Version: 1.0.0 - Reusable image lightbox for viewing images full-screen
// Date: 2024-12-13

'use client';

import { X, Download, ZoomIn, ZoomOut } from 'lucide-react';
import { useState } from 'react';

interface ImageLightboxProps {
  src: string;
  alt: string;
  onClose: () => void;
}

export default function ImageLightbox({ src, alt, onClose }: ImageLightboxProps) {
  const [zoom, setZoom] = useState(100);

  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = src;
    link.download = alt || 'image';
    link.click();
  };

  const zoomIn = () => setZoom(Math.min(zoom + 25, 200));
  const zoomOut = () => setZoom(Math.max(zoom - 25, 50));

  return (
    <div 
      className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      {/* Close button */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 p-3 bg-white/10 hover:bg-white/20 rounded-full text-white transition z-10"
        title="Close (ESC)"
      >
        <X className="w-6 h-6" />
      </button>

      {/* Zoom controls */}
      <div className="absolute top-4 left-4 flex gap-2 z-10">
        <button
          onClick={(e) => { e.stopPropagation(); zoomOut(); }}
          className="p-3 bg-white/10 hover:bg-white/20 rounded-full text-white transition"
          title="Zoom Out"
        >
          <ZoomOut className="w-5 h-5" />
        </button>
        <div className="px-4 py-3 bg-white/10 rounded-full text-white font-medium">
          {zoom}%
        </div>
        <button
          onClick={(e) => { e.stopPropagation(); zoomIn(); }}
          className="p-3 bg-white/10 hover:bg-white/20 rounded-full text-white transition"
          title="Zoom In"
        >
          <ZoomIn className="w-5 h-5" />
        </button>
      </div>

      {/* Download button */}
      <button
        onClick={(e) => { e.stopPropagation(); handleDownload(); }}
        className="absolute bottom-4 right-4 px-4 py-3 bg-gabriola-green hover:bg-gabriola-green-dark rounded-full text-white transition z-10 flex items-center gap-2 font-medium"
        title="Download Image"
      >
        <Download className="w-5 h-5" />
        Download
      </button>

      {/* Image container */}
      <div 
        className="relative max-w-[95vw] max-h-[95vh] overflow-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <img
          src={src}
          alt={alt}
          className="max-w-none transition-transform duration-200"
          style={{ 
            transform: `scale(${zoom / 100})`,
            transformOrigin: 'center center'
          }}
        />
      </div>

      {/* Instructions */}
      <div className="absolute bottom-4 left-4 text-white/70 text-sm">
        Click outside or press ESC to close
      </div>
    </div>
  );
}
