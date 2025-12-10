// Path: lib/imageCompression.ts
// Version: 1.0.0 - Client-side image compression utility
// Date: 2024-12-09

/**
 * Compresses an image file in the browser before upload
 * No server processing needed!
 * 
 * How it works:
 * 1. Reads image file
 * 2. Creates canvas element
 * 3. Resizes if too large (max 1920px width)
 * 4. Adjusts quality (85%)
 * 5. Returns compressed blob
 * 
 * Example:
 * - Input: 10 MB photo (4000x3000px)
 * - Output: 2 MB photo (1920x1440px, 85% quality)
 * - Savings: 80% smaller!
 */

interface CompressionOptions {
  maxWidth?: number;      // Default: 1920px
  maxHeight?: number;     // Default: 1920px
  quality?: number;       // Default: 0.85 (85%)
  maxSizeMB?: number;     // Default: 10MB
}

export async function compressImage(
  file: File,
  options: CompressionOptions = {}
): Promise<{ success: true; file: File; originalSize: number; compressedSize: number } | { success: false; error: string }> {
  
  const {
    maxWidth = 1920,
    maxHeight = 1920,
    quality = 0.85,
    maxSizeMB = 10,
  } = options;

  // Check if file is an image
  if (!file.type.startsWith('image/')) {
    return { success: false, error: 'File is not an image' };
  }

  // Check max size (before compression)
  const maxBytes = maxSizeMB * 1024 * 1024;
  if (file.size > maxBytes) {
    return { success: false, error: `Image must be smaller than ${maxSizeMB}MB` };
  }

  const originalSize = file.size;

  try {
    // Read image
    const img = await loadImage(file);

    // Calculate new dimensions (maintain aspect ratio)
    let { width, height } = img;
    
    if (width > maxWidth || height > maxHeight) {
      const ratio = Math.min(maxWidth / width, maxHeight / height);
      width = Math.round(width * ratio);
      height = Math.round(height * ratio);
    }

    // Create canvas and draw resized image
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      return { success: false, error: 'Failed to create canvas context' };
    }

    ctx.drawImage(img, 0, 0, width, height);

    // Convert to blob with compression
    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob(
        (blob) => resolve(blob),
        file.type === 'image/png' ? 'image/png' : 'image/jpeg',
        quality
      );
    });

    if (!blob) {
      return { success: false, error: 'Failed to compress image' };
    }

    // Convert blob to File
    const compressedFile = new File([blob], file.name, {
      type: file.type,
      lastModified: Date.now(),
    });

    const compressedSize = compressedFile.size;

    console.log('Image compression:', {
      original: `${(originalSize / 1024 / 1024).toFixed(2)} MB`,
      compressed: `${(compressedSize / 1024 / 1024).toFixed(2)} MB`,
      saved: `${(((originalSize - compressedSize) / originalSize) * 100).toFixed(1)}%`,
      dimensions: `${width}x${height}`,
    });

    return {
      success: true,
      file: compressedFile,
      originalSize,
      compressedSize,
    };

  } catch (err) {
    console.error('Image compression error:', err);
    return { success: false, error: 'Failed to compress image' };
  }
}

// Helper: Load image from file
function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Failed to load image'));
    
    const reader = new FileReader();
    reader.onload = (e) => {
      img.src = e.target?.result as string;
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
}

// Quick helper for common use case
export async function compressForUpload(file: File): Promise<File> {
  const result = await compressImage(file, {
    maxWidth: 1920,
    maxHeight: 1920,
    quality: 0.85,
    maxSizeMB: 10,
  });

  if (!result.success) {
    throw new Error(result.error);
  }

  return result.file;
}
