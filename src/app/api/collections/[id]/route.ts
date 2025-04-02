import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const updateCollectionSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().min(1).max(1000),
  imageUrl: z.string().url().optional(),
});

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    // Check if collection exists and user owns it
    const existingCollection = await prisma.collection.findUnique({
      where: { id: params.id },
    });

    if (!existingCollection) {
      return new NextResponse("Collection not found", { status: 404 });
    }

    if (existingCollection.userId !== session.user.id) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const body = await req.json();
    const { name, description, imageUrl } = updateCollectionSchema.parse(body);

    // Update collection in database
    const collection = await prisma.collection.update({
      where: { id: params.id },
      data: {
        name,
        description,
        imageUrl,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    return NextResponse.json(collection);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return new NextResponse(
        JSON.stringify({ message: "Invalid input data", errors: error.errors }),
        { status: 400 }
      );
    }

    console.error("[COLLECTION_UPDATE_ERROR]", error);
    return new NextResponse(
      JSON.stringify({ message: "Internal server error" }),
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    // Check if collection exists and user owns it
    const existingCollection = await prisma.collection.findUnique({
      where: { id: params.id },
    });

    if (!existingCollection) {
      return new NextResponse("Collection not found", { status: 404 });
    }

    if (existingCollection.userId !== session.user.id) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    // Delete collection
    await prisma.collection.delete({
      where: { id: params.id },
    });

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error("[COLLECTION_DELETE_ERROR]", error);
    return new NextResponse(
      JSON.stringify({ message: "Internal server error" }),
      { status: 500 }
    );
  }
} 