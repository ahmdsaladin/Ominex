"use client";

import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import Image from "next/image";
import { Button } from "../common/Button";

interface ImageUploadProps {
  onUploadComplete: (url: string) => void;
  onUploadError: (error: string) => void;
}

export function ImageUpload({ onUploadComplete, onUploadError }: ImageUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0];

    if (!file) {
      return;
    }

    // Create preview
    const objectUrl = URL.createObjectURL(file);
    setPreview(objectUrl);

    setIsUploading(true);

    try {
      // Get presigned URL
      const response = await fetch("/api/upload");
      const { url, fields } = await response.json();

      // Create form data with required fields
      const formData = new FormData();
      Object.entries(fields).forEach(([key, value]) => {
        formData.append(key, value as string);
      });
      formData.append("file", file);

      // Upload to S3
      const uploadResponse = await fetch(url, {
        method: "POST",
        body: formData,
      });

      if (!uploadResponse.ok) {
        throw new Error("Upload failed");
      }

      // Get the public URL
      const imageUrl = `${url}/${fields.key}`;
      onUploadComplete(imageUrl);
    } catch (error) {
      URL.revokeObjectURL(objectUrl);
      setPreview(null);
      onUploadError("Failed to upload image. Please try again.");
    } finally {
      setIsUploading(false);
    }
  }, [onUploadComplete, onUploadError]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "image/*": [".png", ".jpg", ".jpeg", ".gif"],
    },
    maxSize: 5 * 1024 * 1024, // 5MB
    multiple: false,
  });

  return (
    <div className="space-y-4">
      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
          isDragActive ? "border-primary bg-primary/5" : "border-gray-300"
        }`}
      >
        <input {...getInputProps()} />
        {preview ? (
          <div className="relative aspect-square w-full max-w-sm mx-auto">
            <Image
              src={preview}
              alt="Preview"
              fill
              className="object-cover rounded-lg"
            />
          </div>
        ) : (
          <div>
            {isDragActive ? (
              <p>Drop the file here...</p>
            ) : (
              <div className="space-y-2">
                <p>Drag and drop an image here, or click to select</p>
                <p className="text-sm text-gray-500">
                  PNG, JPG, GIF up to 5MB
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {preview && (
        <Button
          type="button"
          variant="outline"
          onClick={() => {
            URL.revokeObjectURL(preview);
            setPreview(null);
          }}
          disabled={isUploading}
        >
          Remove image
        </Button>
      )}

      {isUploading && (
        <div className="text-center text-sm text-gray-500">
          Uploading...
        </div>
      )}
    </div>
  );
} 