// components/ImageGallery.tsx
// Version: 1.0.0 - Display multiple images in grid with click-to-enlarge
// Date: 2025-12-20

'use client';

import { useState } from 'react';
import { Image as ImageIcon } from 'lucide-react';
import ImageCarousel from './ImageCarousel';

interface Image {
  id: string;
  image_url: string;
  caption?: string | null;
  display_order: number;
}

interface Props {
  images: Image[];
  initialIndex?: number;
}

export default function ImageGallery({ images, initialIndex = 0 }: Props) {
  const [showCarousel, setShowCarousel] = useState(false);
  const [carouselIndex, setCarouselIndex] = useState(initialIndex);

  if (!images || images.length === 0) return null;

  // Sort by display_order
  const sortedImages = [...images].sort((a, b) => a.display_order - b.display_order);

  const handleImageClick = (index: number) => {
    setCarouselIndex(index);
    setShowCarousel(true);
  };

  // Grid layout logic based on image count
  const getGridClass = () => {
    const count = sortedImages.length;
    if (count === 1) return 'grid-cols-1';
    if (count === 2) return 'grid-cols-2';
    if (count === 3) return 'grid-cols-3';
    if (count === 4) return 'grid-cols-2';
    return 'grid-cols-3'; // 5+ images
  };

  return (
    <>
      <div className={`grid ${getGridClass()} gap-2`}>
        {sortedImages.map((image, index) => (
          <div
            key={image.id}
            onClick={() => handleImageClick(index)}
            className="relative cursor-pointer group rounded-lg overflow-hidden border-2 border-gray-200 hover:border-gabriola-green transition-colors"
            style={{
              aspectRatio: sortedImages.length === 1 ? 'auto' : '1',
              maxHeight: sortedImages.length === 1 ? '500px' : 'auto'
            }}
          >
            <img
              src={image.image_url}
              alt={image.caption || `Image ${index + 1}`}
              className="w-full h-full object-cover"
            />
            
            {/* Overlay on hover */}
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center">
              <div className="opacity-0 group-hover:opacity-100 transition-opacity bg-white/90 px-3 py-2 rounded-full flex items-center gap-2">
                <ImageIcon className="w-4 h-4 text-gabriola-green" />
                <span className="text-xs font-medium text-gray-800">
                  {sortedImages.length > 1 ? `View ${index + 1}/${sortedImages.length}` : 'Click to enlarge'}
                </span>
              </div>
            </div>

            {/* Image counter for galleries with 3+ images */}
            {sortedImages.length > 2 && (
              <div className="absolute top-2 right-2 bg-black/70 text-white px-2 py-1 rounded text-xs font-bold">
                {index + 1}/{sortedImages.length}
              </div>
            )}

            {/* Caption overlay (if exists) */}
            {image.caption && sortedImages.length === 1 && (
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-3">
                <p className="text-white text-sm">{image.caption}</p>
              </div>
            )}
          </div>
        ))}

        {/* "+X more" indicator for 5+ images */}
        {sortedImages.length > 6 && (
          <div
            onClick={() => handleImageClick(6)}
            className="relative cursor-pointer group rounded-lg overflow-hidden border-2 border-gray-200 hover:border-gabriola-green transition-colors aspect-square bg-gray-900 flex items-center justify-center"
          >
            <div className="text-center text-white">
              <p className="text-3xl font-bold">+{sortedImages.length - 6}</p>
              <p className="text-sm">more</p>
            </div>
            {sortedImages[6] && (
              <img
                src={sortedImages[6].image_url}
                alt=""
                className="absolute inset-0 w-full h-full object-cover opacity-30"
              />
            )}
          </div>
        )}
      </div>

      {/* Carousel Modal */}
      {showCarousel && (
        <ImageCarousel
          images={sortedImages.map(img => ({
            url: img.image_url,
            caption: img.caption || undefined
          }))}
          initialIndex={carouselIndex}
          onClose={() => setShowCarousel(false)}
        />
      )}
    </>
  );
}
