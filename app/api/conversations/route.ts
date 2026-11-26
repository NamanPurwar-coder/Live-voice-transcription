import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/current-user";
import { prisma } from "@/lib/prisma";

const MAX_CONTENT_LENGTH = 50_000;

export async function GET() {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const conversations = await prisma.conversation.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    take: 20,
    select: {
      id: true,
      content: true,
      createdAt: true,
    },
  });

  return NextResponse.json({ conversations });
}

export async function POST(request: Request) {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  try {
    const body = await request.json();
    const content =
      typeof body.content === "string" ? body.content.trim() : "";

    if (!content) {
      return NextResponse.json(
        { error: "Transcript is empty." },
        { status: 400 }
      );
    }

    if (content.length > MAX_CONTENT_LENGTH) {
      return NextResponse.json(
        { error: "Transcript is too long to save." },
        { status: 400 }
      );
    }

    const conversation = await prisma.conversation.create({
      data: {
        content,
        userId: user.id,
      },
      select: {
        id: true,
        content: true,
        createdAt: true,
      },
    });

    return NextResponse.json({ conversation }, { status: 201 });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2003"
    ) {
      return NextResponse.json(
        { error: "Your session is no longer valid. Please sign in again." },
        { status: 401 }
      );
    }

    console.error("Save conversation error:", error);

    return NextResponse.json(
      { error: "Could not save the transcript." },
      { status: 500 }
    );
  }
}
