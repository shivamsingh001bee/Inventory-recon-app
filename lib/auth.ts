import type { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import { getBigQuery, table } from "./bigquery";
import type { AppUser } from "./types";

async function lookupUser(email: string): Promise<AppUser | null> {
  const bq = getBigQuery();
  const query = `
    SELECT user_id, name, role, categories, active
    FROM ${table("users")}
    WHERE user_id = @email AND active = TRUE
    LIMIT 1
  `;
  const [rows] = await bq.query({ query, params: { email } });
  if (!rows.length) return null;
  return rows[0] as AppUser;
}

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!
    })
  ],
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
    error: "/login"
  },
  callbacks: {
    // Reject anyone whose email isn't an active row in `users`.
    async signIn({ user }) {
      if (!user.email) return false;
      const appUser = await lookupUser(user.email);
      return appUser !== null;
    },
    // Attach role/categories to the token on first sign-in.
    async jwt({ token, user }) {
      if (user?.email) {
        const appUser = await lookupUser(user.email);
        if (appUser) {
          token.role = appUser.role;
          token.categories = appUser.categories;
          token.name = appUser.name;
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).role = token.role;
        (session.user as any).categories = token.categories;
      }
      return session;
    }
  }
};
