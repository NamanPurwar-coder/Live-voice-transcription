import { randomBytes, randomUUID } from "node:crypto";
import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";

import { hashPassword, verifyPassword } from "@/lib/password";
import { prisma } from "@/lib/prisma";

export const authOptions: NextAuthOptions = {
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: "/login",
  },
  providers: [
    CredentialsProvider({
      id: "credentials",
      name: "Email and password",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const email = credentials?.email?.trim().toLowerCase();
        const password = credentials?.password;

        if (!email || !password) {
          return null;
        }

        const user = await prisma.user.findUnique({ where: { email } });

        // Guest accounts cannot be signed into with an email/password.
        if (!user || user.isGuest || !verifyPassword(password, user.password)) {
          return null;
        }

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          isGuest: false,
        };
      },
    }),
    CredentialsProvider({
      id: "guest",
      name: "Guest",
      credentials: {},
      async authorize() {
        const suffix = randomUUID().slice(0, 8);
        const password = randomBytes(32).toString("hex");

        const user = await prisma.user.create({
          data: {
            name: `Guest ${suffix}`,
            email: `guest-${randomUUID()}@guest.local`,
            password: hashPassword(password),
            isGuest: true,
          },
        });

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          isGuest: true,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.isGuest = user.isGuest ?? false;
      }

      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.isGuest = token.isGuest ?? false;
      }

      return session;
    },
  },
  secret: process.env.NEXTAUTH_SECRET ?? process.env.AUTH_SECRET,
};
