'use client';

import { useEffect, useCallback } from 'react';

export interface UseImagePasteOptions {
  onImagesPasted: (files: File[]) => void;
  enabled?: boolean;
  maxSizeMB?: number;
}

export function extractImagesFromClipboard(
  clipboardData: DataTransfer | null,
  maxSizeMB: number = 15
): File[] {
  if (!clipboardData) return [];

  const foundFiles: File[] = [];

  // 1. Check clipboardData.files
  if (clipboardData.files && clipboardData.files.length > 0) {
    for (let i = 0; i < clipboardData.files.length; i++) {
      const file = clipboardData.files[i];
      if (file.type.startsWith('image/')) {
        foundFiles.push(file);
      }
    }
  }

  // 2. If no files in files list, check clipboardData.items (standard for screenshot snippet paste)
  if (foundFiles.length === 0 && clipboardData.items) {
    for (let i = 0; i < clipboardData.items.length; i++) {
      const item = clipboardData.items[i];
      if (item.type.startsWith('image/')) {
        const file = item.getAsFile();
        if (file) {
          foundFiles.push(file);
        }
      }
    }
  }

  // Filter by size and give helpful names to snippet screenshots
  const validFiles: File[] = [];
  const maxSizeBytes = maxSizeMB * 1024 * 1024;

  foundFiles.forEach((file, index) => {
    if (file.size > maxSizeBytes) {
      console.warn(`Pasted image ${file.name} exceeds max size of ${maxSizeMB}MB.`);
      return;
    }

    let fileName = file.name;
    // Snipping tool and browser clipboard typically name captured images "image.png"
    if (!fileName || fileName === 'image.png') {
      const now = new Date();
      const dateStr = now.toISOString().replace(/[-:T]/g, '').slice(0, 14);
      const ext = file.type.split('/')[1] || 'png';
      fileName = `snippet_${dateStr}${index > 0 ? `_${index + 1}` : ''}.${ext}`;
    }

    validFiles.push(new File([file], fileName, { type: file.type || 'image/png' }));
  });

  return validFiles;
}

export function useImagePaste({
  onImagesPasted,
  enabled = true,
  maxSizeMB = 15,
}: UseImagePasteOptions) {
  const handlePasteEvent = useCallback(
    (e: ClipboardEvent) => {
      if (!enabled) return;

      const clipboardData = e.clipboardData;
      if (!clipboardData) return;

      const images = extractImagesFromClipboard(clipboardData, maxSizeMB);

      if (images.length > 0) {
        // Intercept paste event so binary image data is not inserted into inputs
        e.preventDefault();
        onImagesPasted(images);
      }
    },
    [enabled, maxSizeMB, onImagesPasted]
  );

  useEffect(() => {
    if (!enabled) return;

    window.addEventListener('paste', handlePasteEvent);
    return () => {
      window.removeEventListener('paste', handlePasteEvent);
    };
  }, [enabled, handlePasteEvent]);

  // Also return an onPaste handler for explicit element binding if needed
  const onPaste = useCallback(
    (e: React.ClipboardEvent) => {
      if (!enabled) return;
      const images = extractImagesFromClipboard(e.clipboardData, maxSizeMB);
      if (images.length > 0) {
        e.preventDefault();
        onImagesPasted(images);
      }
    },
    [enabled, maxSizeMB, onImagesPasted]
  );

  return { onPaste };
}

