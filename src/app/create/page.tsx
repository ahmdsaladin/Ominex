import { Metadata } from "next";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { NFTForm } from "@/components/nft/NFTForm";

export const metadata: Metadata = {
  title: "Create NFT - Ominex",
  description: "Create a new NFT on Ominex",
};

export default async function CreatePage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/login");
  }

  return (
    <div className="max-w-4xl mx-auto py-8 px-4">
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Create New NFT</h1>
          <p className="mt-2 text-gray-600">
            Create a unique NFT to share and trade on Ominex
          </p>
        </div>

        <NFTForm />
      </div>
    </div>
  );
} 