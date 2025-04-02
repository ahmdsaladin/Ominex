import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { ethers } from "ethers";

const createNFTSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().min(1).max(1000),
  imageUrl: z.string().url(),
  collectionId: z.string().optional(),
});

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const body = await req.json();
    const { name, description, imageUrl, collectionId } = createNFTSchema.parse(body);

    // Generate a random token ID
    const tokenId = ethers.BigNumber.from(ethers.utils.randomBytes(32)).toString();

    // Create NFT metadata
    const metadata = {
      name,
      description,
      image: imageUrl,
      attributes: [],
    };

    // Create NFT in database
    const nft = await prisma.nft.create({
      data: {
        tokenId,
        contractAddress: process.env.NFT_CONTRACT_ADDRESS!,
        metadata: metadata as any,
        userId: session.user.id,
        collectionId,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
          },
        },
        collection: true,
      },
    });

    return NextResponse.json(nft);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return new NextResponse(
        JSON.stringify({ message: "Invalid input data", errors: error.errors }),
        { status: 400 }
      );
    }

    console.error("[NFT_CREATE_ERROR]", error);
    return new NextResponse(
      JSON.stringify({ message: "Internal server error" }),
      { status: 500 }
    );
  }
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("userId");
    const collectionId = searchParams.get("collectionId");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "12");

    const where = {
      ...(userId && { userId }),
      ...(collectionId && { collectionId }),
    };

    const [nfts, total] = await Promise.all([
      prisma.nft.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              name: true,
            },
          },
          collection: true,
        },
        orderBy: {
          createdAt: "desc",
        },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.nft.count({ where }),
    ]);

    return NextResponse.json({
      items: nfts,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error("[NFT_GET_ERROR]", error);
    return new NextResponse("Internal error", { status: 500 });
  }
} 