type CompressOptions = {
  maxWidth?: number;
  maxHeight?: number;
  maxBytes?: number;
  initialQuality?: number;
  minQuality?: number;
  qualityStep?: number;
};

const defaultOptions: Required<CompressOptions> = {
  maxWidth: 1600,
  maxHeight: 1600,
  maxBytes: 500 * 1024,
  initialQuality: 0.82,
  minQuality: 0.52,
  qualityStep: 0.08,
};

const toBlob = (canvas: HTMLCanvasElement, type: string, quality: number) =>
  new Promise<Blob | null>((resolve) => {
    canvas.toBlob((blob) => resolve(blob), type, quality);
  });

const loadImage = (file: File) =>
  new Promise<HTMLImageElement>((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Image could not be loaded."));
    };
    image.src = url;
  });

const buildName = (fileName: string, extension: string) => {
  const dotIndex = fileName.lastIndexOf(".");
  const baseName = dotIndex > 0 ? fileName.slice(0, dotIndex) : fileName;
  return `${baseName}.${extension}`;
};

export const compressImageForUpload = async (
  file: File,
  options: CompressOptions = {}
): Promise<File> => {
  if (!file.type.startsWith("image/")) return file;
  if (file.type === "image/gif" || file.type === "image/svg+xml") return file;

  const config = { ...defaultOptions, ...options };

  try {
    const image = await loadImage(file);
    const scale = Math.min(
      1,
      config.maxWidth / image.naturalWidth,
      config.maxHeight / image.naturalHeight
    );

    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
    canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));

    const context = canvas.getContext("2d");
    if (!context) return file;
    context.drawImage(image, 0, 0, canvas.width, canvas.height);

    const mimeType = "image/jpeg";
    let quality = config.initialQuality;
    let blob = await toBlob(canvas, mimeType, quality);
    if (!blob) return file;

    while (blob.size > config.maxBytes && quality > config.minQuality) {
      quality = Math.max(config.minQuality, quality - config.qualityStep);
      const candidate = await toBlob(canvas, mimeType, quality);
      if (!candidate) break;
      blob = candidate;
    }

    if (blob.size >= file.size) return file;

    return new File([blob], buildName(file.name, "jpg"), {
      type: mimeType,
      lastModified: Date.now(),
    });
  } catch {
    return file;
  }
};

