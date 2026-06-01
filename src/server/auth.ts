import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { PrismaAdapter } from "@auth/prisma-adapter";

import { db } from "~/server/db";

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(db),
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      allowDangerousEmailAccountLinking: true,
    }),
  ],
  // JWT session strategy so middleware (Edge runtime) can verify the session
  // locally from the signed cookie, without a DB round-trip. PrismaAdapter still
  // persists Users + Accounts on sign-in; only the session itself is JWT.
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  callbacks: {
    async signIn({ user }) {
      if (!user.email) return false;
      return true;
    },

    async jwt({ token, user }) {
      // Persist the user id onto the JWT at sign-in. Subsequent requests get
      // it back via the session callback below.
      if (user?.id) token.id = user.id;
      return token;
    },

    async session({ session, token }) {
      // Hydrate session.user with DB fields not included on the token.
      const userId = typeof token.id === "string" ? token.id : null;
      const dbUser = userId
        ? await db.user
            .findUnique({
              where: { id: userId },
              select: { timezone: true, theme: true },
            })
            .catch(() => null)
        : null;

      return {
        ...session,
        user: {
          ...session.user,
          id: userId ?? "",
          timezone: dbUser?.timezone ?? "Asia/Tashkent",
          theme: dbUser?.theme ?? "system",
        },
      };
    },
  },
});
