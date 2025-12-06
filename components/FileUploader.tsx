// components/FileUploader.tsx
'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';

const MAX_FILE_SIZE_MB = 25;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

export default function FileUploader({ onUpload }: { onUpload: (urls: string[]) => void }) {
  const [uploading, setUploading] = useState(false);

  const upload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    // BLOCK OVERSIZED FILES EARLY
    const oversized = Array.from(files).find(file => file.size > MAX_FILE_SIZE_BYTES);
    if (oversized) {
      alert(
        `File "${oversized.name}" is too big!\n` +
        `Max size: ${MAX_FILE_SIZE_MB} MB\n` +
        `Size: ${(oversized.size / 1024 / 1024).toFixed(1)} MB`
      );
      return;
    }

    setUploading(true);
    const urls: string[] = [];

    for (const file of Array.from(files)) {
      const fileExt = file.name.split('.').pop() || '';
      const fileName = `${Math.random().toString(36)}.${fileExt}`;
      const filePath = `bbs-attachments/${fileName}`;

      const { error } = await supabase.storage
        .from('bbs-files')
        .upload(filePath, file, { upsert: false });

      if (error) {
        console.error('Upload failed:', error);
        alert(`Failed to upload "${file.name}"`);
        continue;
      }

      const { data: { publicUrl } } = supabase.storage
        .from('bbs-files')
        .getPublicUrl(filePath);

      urls.push(publicUrl);
    }

    onUpload(urls);
    setUploading(false);
  };

  return (
    <div className="mb-6">
      <label className="block text-sm font-medium text-gray-700 mb-2">
        Attach files (PDF, DOCX, images, ZIP, audio — up to 25 MB each)
      </label>

      <input
        type="file"
        multiple
        accept="*/*"
        onChange={upload}
        disabled={uploading}
        className="block w-full text-sm text-gray-600 
                   file:mr-4 file:py-3 file:px-6 file:rounded-full 
                   file:border-0 file:text-sm file:font-semibold 
                   file:bg-gabriola-green file:text-white 
                   hover:file:bg-gabriola-green-dark cursor-pointer"
      />

      {uploading && (
        <p className="text-sm text-gabriola-green font-medium mt-2">Uploading files...</p>
      )}

      <div className="mt-3 p-4 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800">
        <strong>Note:</strong> Maximum file size is <strong>25 MB</strong> per file. 
        Perfect for ferry schedules, meeting minutes, posters, or photo packs.
      </div>
    </div>
  );
}