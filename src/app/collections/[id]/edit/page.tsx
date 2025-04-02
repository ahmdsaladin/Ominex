import { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { CollectionForm } from "@/components/collection/CollectionForm";

interface EditCollectionPageProps {
  params: {
    id: string;
  };
}

export async function generateMetadata({
  params,
}: EditCollectionPageProps): Promise<Metadata> {
  const collection = await prisma.collection.findUnique({
    where: { id: params.id },
  });

  if (!collection) {
    return {
      title: "Collection Not Found",
    };
  }

  return {
    title: `Edit ${collection.name} - Ominex`,
    description: "Edit your NFT collection",
  };
}

export default async function EditCollectionPage({
  params,
}: EditCollectionPageProps) {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/login");
  }

  const collection = await prisma.collection.findUnique({
    where: { id: params.id },
  });

  if (!collection) {
    notFound();
  }

  if (collection.userId !== session.user.id) {
    redirect("/collections");
  }

  return (
    <div className="max-w-4xl mx-auto py-8 px-4">
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Edit Collection</h1>
          <p className="mt-2 text-gray-600">
            Update your collection details
          </p>
        </div>

        <CollectionForm collection={collection} />
      </div>
    </div>
  );
} 