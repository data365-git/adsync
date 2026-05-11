import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { PrismaAdapter } from "@auth/prisma-adapter";

import { db } from "~/server/db";

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(db),
  providers: [
    Google({
      clientId: process.env.AUTH_GOOGLE_ID,
      clientSecret: process.env.AUTH_GOOGLE_SECRET,
    }),
  ],
  pages: {
    signIn: "/login",
    error: "/login",
  },
  callbacks: {
    async signIn({ user }) {
      const raw = process.env.ALLOWLIST_EMAIL ?? "";
      const allowed = raw
        .split(",")
        .map((e) => e.trim().toLowerCase())
        .filter(Boolean);

      if (!user.email) return false;
      if (!allowed.includes(user.email.toLowerCase())) return false;

      // Mark the user as allowlisted in the DB so the UI can reflect it.
      if (user.id) {
        await db.user
          .update({
            where: { id: user.id },
            data: { allowlisted: true },
          })
          .catch(() => null);
      }

      return true;
    },

    async session({ session, user }) {
      // Hydrate session.user with DB fields not included by default.
      const dbUser = await db.user
        .findUnique({
          where: { id: user.id },
          select: { timezone: true, theme: true },
        })
        .catch(() => null);

      return {
        ...session,
        user: {
          ...session.user,
          id: user.id,
          timezone: dbUser?.timezone ?? "Asia/Tashkent",
          theme: dbUser?.theme ?? "system",
        },
      };
    },
  },
});
