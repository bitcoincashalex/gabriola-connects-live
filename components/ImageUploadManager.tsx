// components/ImageUploadManager.tsx
// Version: 1.0.0 - Multi-image upload with paste, drag-to-reorder, and previews
// Date: 2025-12-20

'use client';

import { useState, useRef } from 'react';
import { X, Upload, Image as ImageIcon, GripVertical, Loader2 } from 'lucide-react';
import { compressImage } from '@/lib/imageCompression';

interface ImageData {
  id: string;
  url: string;
  file?: File;
  caption?: string;
  compressing?: boolean;
}

interface Props {
  images: ImageData[];
  onImagesChange: (images: ImageData[]) => void;
  maxImages?: number;
  showCaptions?: boolean;
}

export default function ImageUploadManager({ 
  images, 
  onImagesChange, 
  maxImages = 10,
  showCaptions = false 
}: Props) {
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const processImageFile = async (file: File): Promise<ImageData | null> => {
    try {
      // Create temporary ID
      const tempId = `temp-${Date.now()}-${Math.random()}`;
      
      // Add placeholder while compressing
      const placeholder: ImageData = {
        id: tempId,
        url: '',
        compressing: true
      };
      
      onImagesChange([...images, placeholder]);

      // Compress image
      const result = await compressImage(file, {
        maxWidth: 1920,
        maxHeight: 1920,
        quality: 0.85,
        maxSizeMB: 10,
      });

      if (!result.success) {
        // Remove placeholder on error
        onImagesChange(images.filter(img => img.id !== tempId));
        alert(result.error);
        return null;
      }

      // Read compressed file as base64
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          const imageData: ImageData = {
            id: tempId,
            url: reader.result as string,
            file: result.file,
            compressing: false
          };
          
          // Replace placeholder with actual image
          onImagesChange(images.map(img => 
            img.id === tempId ? imageData : img
          ).concat(images.find(img => img.id === tempId) ? [] : [imageData]));
          
          resolve(imageData);
        };
        reader.readAsDataURL(result.file);
      });
    } catch (err) {
      console.error('Image processing error:', err);
      return null;
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const remainingSlots = maxImages - images.length;
    
    if (files.length > remainingSlots) {
      alert(`You can only add ${remainingSlots} more image(s). Maximum is ${maxImages}.`);
      return;
    }

    for (const file of files.slice(0, remainingSlots)) {
      await processImageFile(file);
    }

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handlePaste = async (e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      
      if (item.type.indexOf('image') !== -1) {
        e.preventDefault();
        
        if (images.length >= maxImages) {
          alert(`Maximum ${maxImages} images allowed.`);
          return;
        }

        const file = item.getAsFile();
        if (file) {
          await processImageFile(file);
        }
      }
    }
  };

  const removeImage = (id: string) => {
    onImagesChange(images.filter(img => img.id !== id));
  };

  const updateCaption = (id: string, caption: string) => {
    onImagesChange(images.map(img => 
      img.id === id ? { ...img, caption } : img
    ));
  };

  // Drag and drop reordering
  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    setDragOverIndex(index);
  };

  const handleDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    
    if (draggedIndex === null) return;
    
    const newImages = [...images];
    const [draggedImage] = newImages.splice(draggedIndex, 1);
    newImages.splice(dropIndex, 0, draggedImage);
    
    onImagesChange(newImages);
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  return (
    <div 
      className="space-y-4"
      onPaste={handlePaste}
      tabIndex={0}
    >
      {/* Upload Area */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
          <ImageIcon className="w-4 h-4" />
          Images (optional, up to {maxImages})
        </label>
        
        <div className="relative">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            onChange={handleFileSelect}
            disabled={images.length >= maxImages}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gabriola-green focus:border-transparent disabled:bg-gray-100"
          />
          <p className="text-xs text-gray-500 mt-1">
            Or paste images with Ctrl+V (Cmd+V on Mac) • Max 10MB per image
          </p>
        </div>
      </div>

      {/* Image Grid */}
      {images.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {images.map((image, index) => (
            <div
              key={image.id}
              draggable={!image.compressing}
              onDragStart={() => handleDragStart(index)}
              onDragOver={(e) => handleDragOver(e, index)}
              onDrop={(e) => handleDrop(e, index)}
              onDragEnd={handleDragEnd}
              className={`relative group rounded-lg overflow-hidden border-2 transition-all ${
                dragOverIndex === index ? 'border-gabriola-green scale-105' : 'border-gray-200'
              } ${draggedIndex === index ? 'opacity-50' : ''} ${
                image.compressing ? 'bg-gray-100' : ''
              }`}
            >
              {/* Drag handle */}
              {!image.compressing && (
                <div className="absolute top-2 left-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity cursor-move">
                  <div className="bg-black/50 p-1 rounded">
                    <GripVertical className="w-4 h-4 text-white" />
                  </div>
                </div>
              )}

              {/* Remove button */}
              {!image.compressing && (
                <button
                  type="button"
                  onClick={() => removeImage(image.id)}
                  className="absolute top-2 right-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity bg-red-500 hover:bg-red-600 text-white p-1.5 rounded-full"
                >
                  <X className="w-4 h-4" />
                </button>
              )}

              {/* Image or loading state */}
              {image.compressing ? (
                <div className="aspect-square flex items-center justify-center">
                  <div className="text-center">
                    <Loader2 className="w-8 h-8 animate-spin text-gabriola-green mx-auto mb-2" />
                    <p className="text-xs text-gray-600">Compressing...</p>
                  </div>
                </div>
              ) : (
                <img
                  src={image.url}
                  alt={`Upload ${index + 1}`}
                  className="w-full aspect-square object-cover"
                />
              )}

              {/* Order number */}
              {!image.compressing && (
                <div className="absolute bottom-2 left-2 bg-black/70 text-white px-2 py-1 rounded text-xs font-bold">
                  #{index + 1}
                </div>
              )}

              {/* Caption input (optional) */}
              {showCaptions && !image.compressing && (
                <div className="p-2 bg-gray-50">
                  <input
                    type="text"
                    value={image.caption || ''}
                    onChange={(e) => updateCaption(image.id, e.target.value)}
                    placeholder="Caption (optional)"
                    className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-gabriola-green"
                  />
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Images count */}
      {images.length > 0 && (
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-600">
            {images.length} image{images.length !== 1 ? 's' : ''} added
          </span>
          {images.length < maxImages && (
            <span className="text-gray-500">
              {maxImages - images.length} more allowed
            </span>
          )}
        </div>
      )}

      {/* Drag hint */}
      {images.length > 1 && (
        <p className="text-xs text-gray-500 italic">
          💡 Drag images to reorder them
        </p>
      )}
    </div>
  );
}
