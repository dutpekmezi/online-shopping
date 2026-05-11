const HOME_IMAGE_QUALITY = 0.82;
const HERO_MAX_WIDTH = 1800;
const CATEGORY_MAX_WIDTH = 900;

type HomeImageSlot = 'hero' | 'category';

type ImageDimensions = {
  width: number;
  height: number;
};

function getTargetWidth(slot: HomeImageSlot) {
  return slot === 'hero' ? HERO_MAX_WIDTH : CATEGORY_MAX_WIDTH;
}

function getOptimizedFileName(fileName: string, mimeType: string) {
  const extension = mimeType === 'image/webp' ? 'webp' : 'jpg';
  const nameWithoutExtension = fileName.replace(/\.[^.]+$/, '') || 'home-image';

  return `${nameWithoutExtension}-optimized.${extension}`;
}

async function canEncodeWebp() {
  const canvas = document.createElement('canvas');
  canvas.width = 1;
  canvas.height = 1;

  return new Promise<boolean>((resolve) => {
    canvas.toBlob((blob) => resolve(blob?.type === 'image/webp'), 'image/webp', HOME_IMAGE_QUALITY);
  });
}

async function loadImageBitmap(file: File) {
  if ('createImageBitmap' in window) {
    return createImageBitmap(file, { imageOrientation: 'from-image' });
  }

  const objectUrl = URL.createObjectURL(file);

  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const nextImage = new Image();
      nextImage.onload = () => resolve(nextImage);
      nextImage.onerror = () => reject(new Error('Selected image could not be loaded for optimization.'));
      nextImage.src = objectUrl;
    });

    return image;
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

function getImageDimensions(image: ImageBitmap | HTMLImageElement): ImageDimensions {
  if (image instanceof ImageBitmap) {
    return { width: image.width, height: image.height };
  }

  return { width: image.naturalWidth || image.width, height: image.naturalHeight || image.height };
}

function closeImage(image: ImageBitmap | HTMLImageElement) {
  if (image instanceof ImageBitmap) {
    image.close();
  }
}

function canvasToBlob(canvas: HTMLCanvasElement, mimeType: string) {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) {
          resolve(blob);
          return;
        }

        reject(new Error('Selected image could not be optimized.'));
      },
      mimeType,
      HOME_IMAGE_QUALITY,
    );
  });
}

export async function optimizeHomeImageFile(file: File, slot: HomeImageSlot) {
  if (!file.type.startsWith('image/')) {
    return file;
  }

  const image = await loadImageBitmap(file);

  try {
    const { width, height } = getImageDimensions(image);
    const maxWidth = getTargetWidth(slot);
    const scale = width > maxWidth ? maxWidth / width : 1;
    const targetWidth = Math.max(1, Math.round(width * scale));
    const targetHeight = Math.max(1, Math.round(height * scale));
    const canvas = document.createElement('canvas');
    canvas.width = targetWidth;
    canvas.height = targetHeight;

    const context = canvas.getContext('2d');

    if (!context) {
      return file;
    }

    context.imageSmoothingEnabled = true;
    context.imageSmoothingQuality = 'high';
    context.drawImage(image, 0, 0, targetWidth, targetHeight);

    const mimeType = (await canEncodeWebp()) ? 'image/webp' : 'image/jpeg';
    const optimizedBlob = await canvasToBlob(canvas, mimeType);

    if (optimizedBlob.size >= file.size && width <= maxWidth) {
      return file;
    }

    return new File([optimizedBlob], getOptimizedFileName(file.name, mimeType), {
      type: mimeType,
      lastModified: Date.now(),
    });
  } finally {
    closeImage(image);
  }
}
