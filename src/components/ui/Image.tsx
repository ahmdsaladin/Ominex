"use client";

import * as React from "react";
import NextImage, { type ImageProps as NextImageProps } from "next/image";
import { cn } from "@/lib/utils";

interface ImageProps extends Omit<NextImageProps, "alt"> {
  alt: string;
  fallback?: string;
  aspectRatio?: "square" | "video" | "portrait" | "landscape";
}

export function Image({
  className,
  alt,
  fallback = "/placeholder.png",
  aspectRatio = "square",
  ...props
}: ImageProps) {
  const [error, setError] = React.useState(false);

  return (
    <div
      className={cn(
        "overflow-hidden rounded-lg bg-muted",
        {
          "aspect-square": aspectRatio === "square",
          "aspect-video": aspectRatio === "video",
          "aspect-[3/4]": aspectRatio === "portrait",
          "aspect-[4/3]": aspectRatio === "landscape",
        },
        className
      )}
    >
      <NextImage
        className={cn("h-full w-full object-cover transition-all", {
          "scale-105 blur-lg": error,
        })}
        alt={alt}
        onError={() => setError(true)}
        src={error ? fallback : props.src}
        {...props}
      />
    </div>
  );
} 