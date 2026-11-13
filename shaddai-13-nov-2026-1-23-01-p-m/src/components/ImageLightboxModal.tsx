import React, { useState, useEffect } from 'react';
import { X, ChevronLeft, ChevronRight, ZoomIn } from 'lucide-react';

interface ImageLightboxModalProps {
  images: string[];
  initialIndex?: number;
  productName: string;
  onClose: () => void;
}

export const ImageLightboxModal: React.FC<ImageLightboxModalProps> = ({
  images,
  initialIndex = 0,
  productName,
  onClose,
}) => {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft') {
        setCurrentIndex((prev) => (prev > 0 ? prev - 1 : images.length - 1));
      }
      if (e.key === 'ArrowRight') {
        setCurrentIndex((prev) => (prev < images.length - 1 ? prev + 1 : 0));
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [images.length, onClose]);

  if (!images || images.length === 0) return null;

  return (
    <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-black/90 backdrop-blur-md animate-in fade-in duration-200 select-none">
      {/* Top Bar */}
      <div className="w-full flex items-center justify-between px-4 py-3 bg-black/40 text-white z-10 shrink-0">
        <div className="flex items-center gap-2">
          <span className="font-serif-brand font-bold text-sm sm:text-base text-pink-300 truncate max-w-[220px] sm:max-w-md">
            {productName}
          </span>
          <span className="text-xs text-stone-400 bg-white/10 px-2 py-0.5 rounded-full">
            {currentIndex + 1} / {images.length}
          </span>
        </div>

        <button
          onClick={onClose}
          className="p-2 bg-white/10 hover:bg-white/25 text-white rounded-full transition-all cursor-pointer"
          title="Cerrar (Esc)"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Main Image Stage */}
      <div className="relative flex-1 w-full flex items-center justify-center p-3 sm:p-6 overflow-hidden">
        <img
          src={images[currentIndex]}
          alt={`${productName} - Imagen ${currentIndex + 1}`}
          className="max-h-[78vh] sm:max-h-[82vh] max-w-[95vw] w-auto h-auto object-contain rounded-2xl shadow-2xl transition-all duration-300"
        />

        {/* Navigation Arrows */}
        {images.length > 1 && (
          <>
            <button
              onClick={() =>
                setCurrentIndex((prev) => (prev > 0 ? prev - 1 : images.length - 1))
              }
              className="absolute left-2 sm:left-6 top-1/2 -translate-y-1/2 p-2.5 sm:p-3 bg-black/50 hover:bg-black/80 text-white rounded-full shadow-lg transition-all cursor-pointer"
              title="Anterior"
            >
              <ChevronLeft className="w-5 h-5 sm:w-6 sm:h-6" />
            </button>
            <button
              onClick={() =>
                setCurrentIndex((prev) => (prev < images.length - 1 ? prev + 1 : 0))
              }
              className="absolute right-2 sm:right-6 top-1/2 -translate-y-1/2 p-2.5 sm:p-3 bg-black/50 hover:bg-black/80 text-white rounded-full shadow-lg transition-all cursor-pointer"
              title="Siguiente"
            >
              <ChevronRight className="w-5 h-5 sm:w-6 sm:h-6" />
            </button>
          </>
        )}
      </div>

      {/* Bottom Thumbnail Strip */}
      {images.length > 1 && (
        <div className="w-full bg-black/60 px-4 py-3 flex justify-center items-center gap-2 overflow-x-auto no-scrollbar shrink-0">
          {images.map((img, idx) => (
            <button
              key={idx}
              onClick={() => setCurrentIndex(idx)}
              className={`w-12 h-12 sm:w-14 sm:h-14 rounded-xl overflow-hidden border-2 transition-all cursor-pointer shrink-0 ${
                currentIndex === idx
                  ? 'border-pink-500 scale-105 shadow-md shadow-pink-500/30'
                  : 'border-transparent opacity-50 hover:opacity-100'
              }`}
            >
              <img src={img} alt="" className="w-full h-full object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
