"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "../common/Button";
import { Input } from "../common/Input";
import { Label } from "../common/Label";
import { ImageUpload } from "./ImageUpload";

interface Collection {
  id: string;
  name: string;
}

export function NFTForm() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [isLoadingCollections, setIsLoadingCollections] = useState(true);

  useEffect(() => {
    async function fetchCollections() {
      try {
        const response = await fetch("/api/collections");
        if (!response.ok) {
          throw new Error("Failed to fetch collections");
        }
        const data = await response.json();
        setCollections(data.items);
      } catch (error) {
        console.error("Error fetching collections:", error);
      } finally {
        setIsLoadingCollections(false);
      }
    }

    fetchCollections();
  }, []);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsLoading(true);
    setError(null);

    const formData = new FormData(event.currentTarget);
    const name = formData.get("name") as string;
    const description = formData.get("description") as string;
    const collectionId = formData.get("collection") as string;

    if (!imageUrl) {
      setError("Please upload an image");
      setIsLoading(false);
      return;
    }

    try {
      const response = await fetch("/api/nfts", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name,
          description,
          imageUrl,
          collectionId: collectionId || undefined,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || "Failed to create NFT");
      }

      const nft = await response.json();
      router.push(`/nfts/${nft.id}`);
      router.refresh();
    } catch (error) {
      if (error instanceof Error) {
        setError(error.message);
      } else {
        setError("Something went wrong. Please try again.");
      }
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-8">
      <div className="space-y-6">
        <div>
          <Label>Image</Label>
          <div className="mt-2">
            <ImageUpload
              onUploadComplete={(url) => setImageUrl(url)}
              onUploadError={(error) => setError(error)}
            />
          </div>
          <p className="mt-2 text-sm text-gray-500">
            Upload a high-quality image for your NFT
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="name">Name</Label>
          <Input
            id="name"
            name="name"
            placeholder="My Awesome NFT"
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="description">Description</Label>
          <textarea
            id="description"
            name="description"
            rows={4}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            placeholder="Describe your NFT..."
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="collection">Collection (Optional)</Label>
          <select
            id="collection"
            name="collection"
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            disabled={isLoadingCollections}
          >
            <option value="">Select a collection</option>
            {collections.map((collection) => (
              <option key={collection.id} value={collection.id}>
                {collection.name}
              </option>
            ))}
          </select>
          {isLoadingCollections && (
            <p className="text-sm text-gray-500">Loading collections...</p>
          )}
        </div>
      </div>

      {error && (
        <div className="text-sm text-red-500">
          {error}
        </div>
      )}

      <Button
        type="submit"
        className="w-full"
        disabled={isLoading}
      >
        {isLoading ? "Creating NFT..." : "Create NFT"}
      </Button>
    </form>
  );
} 