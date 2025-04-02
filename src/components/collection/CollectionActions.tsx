"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "../common/Button";

interface CollectionActionsProps {
  collectionId: string;
}

export function CollectionActions({ collectionId }: CollectionActionsProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  async function handleDelete() {
    if (!confirm("Are you sure you want to delete this collection? This action cannot be undone.")) {
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch(`/api/collections/${collectionId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || "Failed to delete collection");
      }

      router.push("/collections");
      router.refresh();
    } catch (error) {
      console.error("Error deleting collection:", error);
      alert("Failed to delete collection. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="flex gap-2">
      <Button
        variant="outline"
        onClick={() => router.push(`/collections/${collectionId}/edit`)}
        disabled={isLoading}
      >
        Edit Collection
      </Button>
      <Button
        variant="destructive"
        onClick={handleDelete}
        disabled={isLoading}
      >
        Delete Collection
      </Button>
    </div>
  );
} 