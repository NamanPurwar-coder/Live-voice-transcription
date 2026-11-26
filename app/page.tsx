import { redirect } from "next/navigation";
import { connection } from "next/server";

import Transcription from "@/components/Transcription";
import { getCurrentUser } from "@/lib/current-user";
import { prisma } from "@/lib/prisma";

// Auth pages need the request before rendering, so they are allowed to block.
export const instant = false;

export default async function Home() {
  await connection();

  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  const conversations = await prisma.conversation.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    take: 10,
    select: {
      id: true,
      content: true,
      createdAt: true,
    },
  });

  return (
    <main className="flex flex-1 flex-col">
      <Transcription
        user={{
          name: user.name,
          email: user.email,
          isGuest: user.isGuest,
        }}
        conversations={conversations.map((conversation) => ({
          id: conversation.id,
          content: conversation.content,
          createdAt: conversation.createdAt.toISOString(),
        }))}
      />
    </main>
  );
}
