import { Metadata } from "next";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { CollectionForm } from "@/components/collection/CollectionForm";

export const metadata: Metadata = {
  title: "Create Collection - Ominex",
  description: "Create a new NFT collection on Ominex",
};

export default async function CreateCollectionPage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/login");
  }

  return (
    <div className="max-w-4xl mx-auto py-8 px-4">
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Create New Collection</h1>
          <p className="mt-2 text-gray-600">
            Create a collection to organize and showcase your NFTs
          </p>
        </div>

        <CollectionForm />
      </div>
    </div>
  );
} 