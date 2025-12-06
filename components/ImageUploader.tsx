// components/ImageUploader.tsx  ← replace your current file with this exact code
'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';

export default function ImageUploader({ onUpload }: { onUpload: (urls: string[]) => void }) {
  const [uploading, setUploading] = useState(false);

  const upload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    const urls: string[] = [];

    // ← THIS IS THE FIX: Array.from() instead of for...of
    for (const file of Array.from(files)) {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random().toString(36)}.${fileExt}`;
      const filePath = `${fileName}`;

      const { error, data } = await supabase.storage
        .from('bbs-images')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false,
        });

      if (error) {
        console.error('Upload error:', error);
        continue;
      }

      const { data: { publicUrl } } = supabase.storage
        .from('bbs-images')
        .getPublicUrl(filePath);

      urls.push(publicUrl);
    }

    onUpload(urls);
    setUploading(false);
  };

  return (
    <div className="mb-6">
      <label className="block text-sm font-medium text-gray-700 mb-2">
        Attach images (optional)
      </label>
      <input
        type="file"
        multiple
        accept="image/*"
        onChange={upload}
        disabled={uploading}
        className="block w-full text-sm text-gray-600 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-gabriola-green file:text-white hover:file:bg-gabriola-green-dark"
      />
      {uploading && <p className="text-sm text-gray-600 mt-2">Uploading images...</p>}
    </div>
  );
}