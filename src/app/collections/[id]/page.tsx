import { Metadata } from "next";
import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { formatDistanceToNow } from "date-fns";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { CollectionActions } from "@/components/collection/CollectionActions";

interface CollectionPageProps {
  params: {
    id: string;
  };
}

export async function generateMetadata({
  params,
}: CollectionPageProps): Promise<Metadata> {
  const collection = await prisma.collection.findUnique({
    where: { id: params.id },
    include: {
      user: true,
    },
  });

  if (!collection) {
    return {
      title: "Collection Not Found",
    };
  }

  return {
    title: `${collection.name} - Ominex Collection`,
    description: collection.description,
    openGraph: {
      images: collection.imageUrl ? [collection.imageUrl] : [],
    },
  };
}

export default async function CollectionPage({ params }: CollectionPageProps) {
  const session = await getServerSession(authOptions);
  const collection = await prisma.collection.findUnique({
    where: { id: params.id },
    include: {
      user: {
        include: {
          profile: true,
        },
      },
      nfts: {
        include: {
          user: {
            select: {
              id: true,
              name: true,
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
      },
    },
  });

  if (!collection) {
    notFound();
  }

  const isOwner = session?.user?.id === collection.userId;

  return (
    <div className="max-w-7xl mx-auto py-8 px-4">
      <div className="space-y-8">
        <div className="flex flex-col md:flex-row gap-8">
          <div className="relative aspect-square w-full md:w-96 rounded-lg overflow-hidden">
            {collection.imageUrl ? (
              <Image
                src={collection.imageUrl}
                alt={collection.name}
                fill
                className="object-cover"
              />
            ) : (
              <div className="w-full h-full bg-gray-100 flex items-center justify-center">
                <span className="text-gray-400">No image</span>
              </div>
            )}
          </div>

          <div className="flex-1 space-y-6">
            <div className="flex justify-between items-start">
              <div>
                <h1 className="text-3xl font-bold">{collection.name}</h1>
                <div className="mt-2 flex items-center text-gray-500">
                  <span>Created by </span>
                  <Link
                    href={`/users/${collection.user.id}`}
                    className="ml-1 text-primary hover:underline"
                  >
                    {collection.user.name}
                  </Link>
                  <span className="mx-2">•</span>
                  <span>
                    {formatDistanceToNow(new Date(collection.createdAt), {
                      addSuffix: true,
                    })}
                  </span>
                </div>
              </div>
              {isOwner && (
                <CollectionActions collectionId={collection.id} />
              )}
            </div>

            <div>
              <h2 className="text-lg font-semibold">Description</h2>
              <p className="mt-2 text-gray-600 whitespace-pre-wrap">
                {collection.description}
              </p>
            </div>

            <div className="flex items-center gap-4">
              <div className="bg-gray-50 px-4 py-2 rounded-lg">
                <div className="text-sm text-gray-500">NFTs</div>
                <div className="text-lg font-semibold">
                  {collection.nfts.length}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div>
          <h2 className="text-2xl font-bold mb-6">NFTs in this Collection</h2>
          {collection.nfts.length === 0 ? (
            <div className="text-center py-12 bg-gray-50 rounded-lg">
              <p className="text-gray-500">No NFTs in this collection yet</p>
              <Link
                href="/create"
                className="mt-4 inline-block text-primary hover:underline"
              >
                Create an NFT
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {collection.nfts.map((nft) => {
                const metadata = nft.metadata as any;
                return (
                  <Link
                    key={nft.id}
                    href={`/nfts/${nft.id}`}
                    className="group"
                  >
                    <div className="relative aspect-square rounded-lg overflow-hidden bg-gray-100">
                      <Image
                        src={metadata.image}
                        alt={metadata.name}
                        fill
                        className="object-cover group-hover:scale-105 transition-transform duration-200"
                      />
                    </div>
                    <div className="mt-4">
                      <h3 className="font-semibold group-hover:text-primary">
                        {metadata.name}
                      </h3>
                      <p className="text-sm text-gray-500">
                        by {nft.user.name}
                      </p>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 