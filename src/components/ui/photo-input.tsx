"use client";

import * as React from "react";
import { Camera, ImagePlus, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface PhotoInputProps {
  /** Aynı handler her iki input (galeri + kamera) için çağrılır */
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  accept?: string;
  multiple?: boolean;
  disabled?: boolean;
  loading?: boolean;
  /** Galeri butonu metni */
  labelGallery?: string;
  /** Kamera butonu metni */
  labelCamera?: string;
  /** Inline butonlar (varsayılan). false ise sadece ikonlu küçük butonlar */
  variant?: "inline" | "cards";
  className?: string;
  /** Buton wrapper class (inline modda iki buton yan yana) */
  buttonClassName?: string;
}

/**
 * Hem galeriden seçim hem tablet/mobilde kameradan fotoğraf çekme seçeneği sunar.
 * Dashboard'daki tüm fotoğraf yükleme alanlarında kullanılır.
 */
const PhotoInput = React.forwardRef<HTMLInputElement, PhotoInputProps>(
  (
    {
      onChange,
      accept = "image/*",
      multiple = false,
      disabled = false,
      loading = false,
      labelGallery = "Galeriden seç",
      labelCamera = "Fotoğraf çek",
      variant = "inline",
      className,
      buttonClassName,
    },
    _ref
  ) => {
    const galleryRef = React.useRef<HTMLInputElement>(null);
    const cameraRef = React.useRef<HTMLInputElement>(null);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      onChange(e);
      e.target.value = "";
    };

    const triggerGallery = () => galleryRef.current?.click();
    const triggerCamera = () => cameraRef.current?.click();

    const isDisabled = disabled || loading;

    if (variant === "cards") {
      return (
        <div className={cn("grid grid-cols-2 gap-4", className)}>
          <button
            type="button"
            className={cn(
              "flex flex-col items-center justify-center aspect-square bg-slate-100 rounded-lg border-2 border-dashed border-slate-300 cursor-pointer hover:bg-slate-50 disabled:opacity-60 disabled:cursor-not-allowed",
              buttonClassName
            )}
            onClick={triggerCamera}
            disabled={isDisabled}
          >
            {loading ? (
              <Loader2 className="w-8 h-8 animate-spin text-slate-500" />
            ) : (
              <Camera className="w-8 h-8 text-slate-400" />
            )}
            <span className="text-xs mt-2 font-medium text-slate-600">{labelCamera}</span>
          </button>
          <button
            type="button"
            className={cn(
              "flex flex-col items-center justify-center aspect-square bg-slate-100 rounded-lg border-2 border-dashed border-slate-300 cursor-pointer hover:bg-slate-50 disabled:opacity-60 disabled:cursor-not-allowed",
              buttonClassName
            )}
            onClick={triggerGallery}
            disabled={isDisabled}
          >
            {loading ? (
              <Loader2 className="w-8 h-8 animate-spin text-slate-500" />
            ) : (
              <ImagePlus className="w-8 h-8 text-slate-400" />
            )}
            <span className="text-xs mt-2 font-medium text-slate-600">{labelGallery}</span>
          </button>
          <input
            ref={galleryRef}
            type="file"
            accept={accept}
            multiple={multiple}
            className="hidden"
            onChange={handleChange}
            disabled={disabled}
          />
          <input
            ref={cameraRef}
            type="file"
            accept={accept}
            capture="environment"
            multiple={multiple}
            className="hidden"
            onChange={handleChange}
            disabled={disabled}
          />
        </div>
      );
    }

    return (
      <div className={cn("flex flex-wrap items-center gap-2", className)}>
        <input
          ref={galleryRef}
          type="file"
          accept={accept}
          multiple={multiple}
          className="hidden"
          onChange={handleChange}
          disabled={disabled}
        />
        <input
          ref={cameraRef}
          type="file"
          accept={accept}
          capture="environment"
          multiple={multiple}
          className="hidden"
          onChange={handleChange}
          disabled={disabled}
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          className={buttonClassName}
          disabled={isDisabled}
          onClick={triggerCamera}
        >
          {loading ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Camera className="mr-2 h-4 w-4" />
          )}
          {labelCamera}
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className={buttonClassName}
          disabled={isDisabled}
          onClick={triggerGallery}
        >
          {loading ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <ImagePlus className="mr-2 h-4 w-4" />
          )}
          {labelGallery}
        </Button>
      </div>
    );
  }
);
PhotoInput.displayName = "PhotoInput";

export { PhotoInput };
