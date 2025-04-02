"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "../common/Button";
import { Input } from "../common/Input";
import { Label } from "../common/Label";
import { ImageUpload } from "../nft/ImageUpload";
import { Collection } from "@prisma/client";

interface CollectionFormProps {
  collection?: Collection;
}

export function CollectionForm({ collection }: CollectionFormProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(collection?.imageUrl || null);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsLoading(true);
    setError(null);

    const formData = new FormData(event.currentTarget);
    const name = formData.get("name") as string;
    const description = formData.get("description") as string;

    try {
      const url = collection
        ? `/api/collections/${collection.id}`
        : "/api/collections";
      const method = collection ? "PATCH" : "POST";

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name,
          description,
          imageUrl,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || "Failed to save collection");
      }

      const savedCollection = await response.json();
      router.push(`/collections/${savedCollection.id}`);
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

  async function handleDelete() {
    if (!collection) return;

    if (!confirm("Are you sure you want to delete this collection? This action cannot be undone.")) {
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/collections/${collection.id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || "Failed to delete collection");
      }

      router.push("/collections");
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
          <Label>Collection Image</Label>
          <div className="mt-2">
            <ImageUpload
              onUploadComplete={(url) => setImageUrl(url)}
              onUploadError={(error) => setError(error)}
            />
          </div>
          <p className="mt-2 text-sm text-gray-500">
            Upload an image to represent your collection
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="name">Name</Label>
          <Input
            id="name"
            name="name"
            placeholder="My Awesome Collection"
            defaultValue={collection?.name}
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
            placeholder="Describe your collection..."
            defaultValue={collection?.description}
            required
          />
        </div>
      </div>

      {error && (
        <div className="text-sm text-red-500">
          {error}
        </div>
      )}

      <div className="flex gap-4">
        <Button
          type="submit"
          className="flex-1"
          disabled={isLoading}
        >
          {isLoading
            ? collection
              ? "Saving Changes..."
              : "Creating Collection..."
            : collection
              ? "Save Changes"
              : "Create Collection"}
        </Button>

        {collection && (
          <Button
            type="button"
            variant="destructive"
            onClick={handleDelete}
            disabled={isLoading}
          >
            Delete Collection
          </Button>
        )}
      </div>
    </form>
  );
} 