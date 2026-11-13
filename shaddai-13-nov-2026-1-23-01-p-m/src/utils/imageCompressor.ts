/**
 * Image compressor utility for Shaddai Papelería
 * Resizes high-resolution mobile photos and exports high-quality, lightweight WebP/JPEG data URLs
 * Prevents memory bloat, localStorage quota exceeded errors, and white screen crashes.
 */

export async function compressImage(
  file: File | Blob,
  maxWidth = 1000,
  maxHeight = 1000,
  quality = 0.78
): Promise<string> {
  return new Promise((resolve, reject) => {
    // If it's an SVG, don't rasterize it
    if (file.type === 'image/svg+xml') {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
      return;
    }

    const reader = new FileReader();
    reader.onerror = reject;
    reader.onload = (e) => {
      const img = new Image();
      img.onerror = () => {
        // Fallback to original data URL if image cannot be loaded into canvas
        resolve(e.target?.result as string);
      };
      img.onload = () => {
        try {
          let { width, height } = img;

          // Calculate new dimensions preserving aspect ratio
          if (width > height) {
            if (width > maxWidth) {
              height = Math.round((height * maxWidth) / width);
              width = maxWidth;
            }
          } else {
            if (height > maxHeight) {
              width = Math.round((width * maxHeight) / height);
              height = maxHeight;
            }
          }

          const canvas = document.createElement('canvas');
          canvas.width = Math.max(1, width);
          canvas.height = Math.max(1, height);

          const ctx = canvas.getContext('2d');
          if (!ctx) {
            resolve(e.target?.result as string);
            return;
          }

          // Use high quality image smoothing
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';

          // White background in case of transparent png converted to jpeg
          ctx.fillStyle = '#FFFFFF';
          ctx.fillRect(0, 0, canvas.width, canvas.height);

          ctx.drawImage(img, 0, 0, width, height);

          // Try webp first, fallback to jpeg
          let compressedUrl = canvas.toDataURL('image/webp', quality);
          if (!compressedUrl.startsWith('data:image/webp')) {
            compressedUrl = canvas.toDataURL('image/jpeg', quality);
          }

          resolve(compressedUrl);
        } catch (err) {
          console.warn('Canvas compression error, using raw file:', err);
          resolve(e.target?.result as string);
        }
      };
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  });
}
