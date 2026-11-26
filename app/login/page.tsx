import { redirect } from "next/navigation";
import { connection } from "next/server";

import AuthForm from "@/components/AuthForm";
import ProjectInfo from "@/components/ProjectInfo";
import { getCurrentUser } from "@/lib/current-user";

// Auth pages need the request before rendering, so they are allowed to block.
export const instant = false;

export default async function LoginPage() {
  await connection();

  const user = await getCurrentUser();

  if (user) {
    redirect("/");
  }

  return (
    <main className="min-h-screen bg-[#0b1020] px-4 py-10">
      <div className="mx-auto grid w-full max-w-6xl items-center gap-10 lg:grid-cols-[1fr_420px] lg:gap-16">
        <div className="order-2 lg:order-1">
          <ProjectInfo />
        </div>

        <div className="order-1 w-full max-w-md justify-self-center lg:order-2">
          <AuthForm />
        </div>
      </div>
    </main>
  );
}
