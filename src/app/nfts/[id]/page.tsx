import { Metadata } from "next";
import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { formatDistanceToNow } from "date-fns";

interface NFTPageProps {
  params: {
    id: string;
  };
}

export async function generateMetadata({
  params,
}: NFTPageProps): Promise<Metadata> {
  const nft = await prisma.nft.findUnique({
    where: { id: params.id },
    include: {
      user: true,
    },
  });

  if (!nft) {
    return {
      title: "NFT Not Found",
    };
  }

  const metadata = nft.metadata as any;

  return {
    title: `${metadata.name} - Ominex NFT`,
    description: metadata.description,
    openGraph: {
      images: [metadata.image],
    },
  };
}

export default async function NFTPage({ params }: NFTPageProps) {
  const nft = await prisma.nft.findUnique({
    where: { id: params.id },
    include: {
      user: {
        include: {
          profile: true,
        },
      },
      collection: true,
    },
  });

  if (!nft) {
    notFound();
  }

  const metadata = nft.metadata as any;

  return (
    <div className="max-w-7xl mx-auto py-8 px-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="relative aspect-square rounded-lg overflow-hidden">
          <Image
            src={metadata.image}
            alt={metadata.name}
            fill
            className="object-cover"
          />
        </div>

        <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-bold">{metadata.name}</h1>
            <div className="mt-2 flex items-center text-gray-500">
              <span>Owned by </span>
              <Link
                href={`/users/${nft.user.id}`}
                className="ml-1 text-primary hover:underline"
              >
                {nft.user.name}
              </Link>
            </div>
          </div>

          {nft.collection && (
            <div>
              <h2 className="text-lg font-semibold">Collection</h2>
              <Link
                href={`/collections/${nft.collection.id}`}
                className="text-primary hover:underline"
              >
                {nft.collection.name}
              </Link>
            </div>
          )}

          <div>
            <h2 className="text-lg font-semibold">Description</h2>
            <p className="mt-2 text-gray-600 whitespace-pre-wrap">
              {metadata.description}
            </p>
          </div>

          <div>
            <h2 className="text-lg font-semibold">Details</h2>
            <dl className="mt-2 space-y-2">
              <div className="flex">
                <dt className="w-32 text-gray-500">Token ID</dt>
                <dd className="text-gray-900">{nft.tokenId}</dd>
              </div>
              <div className="flex">
                <dt className="w-32 text-gray-500">Contract</dt>
                <dd className="text-gray-900 truncate">
                  {nft.contractAddress}
                </dd>
              </div>
              <div className="flex">
                <dt className="w-32 text-gray-500">Created</dt>
                <dd className="text-gray-900">
                  {formatDistanceToNow(new Date(nft.createdAt), {
                    addSuffix: true,
                  })}
                </dd>
              </div>
            </dl>
          </div>

          {metadata.attributes && metadata.attributes.length > 0 && (
            <div>
              <h2 className="text-lg font-semibold">Attributes</h2>
              <div className="mt-2 grid grid-cols-2 gap-4">
                {metadata.attributes.map((attr: any, index: number) => (
                  <div
                    key={index}
                    className="p-3 bg-gray-50 rounded-lg"
                  >
                    <dt className="text-sm text-gray-500">
                      {attr.trait_type}
                    </dt>
                    <dd className="mt-1 text-sm font-medium">
                      {attr.value}
                    </dd>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 