import { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { prisma } from "@/lib/prisma";
import { Button } from "@/components/common/Button";

export const metadata: Metadata = {
  title: "Collections - Ominex",
  description: "Browse NFT collections on Ominex",
};

export default async function CollectionsPage() {
  const collections = await prisma.collection.findMany({
    include: {
      user: {
        select: {
          id: true,
          name: true,
        },
      },
      _count: {
        select: {
          nfts: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  return (
    <div className="max-w-7xl mx-auto py-8 px-4">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold">Collections</h1>
          <p className="mt-2 text-gray-600">
            Discover and explore NFT collections
          </p>
        </div>
        <Link href="/collections/create">
          <Button>Create Collection</Button>
        </Link>
      </div>

      {collections.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <p className="text-gray-500">No collections found</p>
          <Link
            href="/collections/create"
            className="mt-4 inline-block text-primary hover:underline"
          >
            Create the first collection
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {collections.map((collection) => (
            <Link
              key={collection.id}
              href={`/collections/${collection.id}`}
              className="group"
            >
              <div className="relative aspect-square rounded-lg overflow-hidden bg-gray-100">
                {collection.imageUrl ? (
                  <Image
                    src={collection.imageUrl}
                    alt={collection.name}
                    fill
                    className="object-cover group-hover:scale-105 transition-transform duration-200"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <span className="text-gray-400">No image</span>
                  </div>
                )}
              </div>
              <div className="mt-4">
                <h3 className="font-semibold group-hover:text-primary">
                  {collection.name}
                </h3>
                <div className="mt-1 flex items-center text-sm text-gray-500">
                  <span>by {collection.user.name}</span>
                  <span className="mx-2">•</span>
                  <span>{collection._count.nfts} NFTs</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
} 