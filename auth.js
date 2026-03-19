import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { getDb } from "./lib/db";

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    }),
  ],
  callbacks: {
    async signIn({ profile }) {
      if (!profile?.sub) return false;
      const db = getDb();
      const existing = db.prepare("SELECT id FROM users WHERE id = ?").get(profile.sub);
      if (!existing) {
        db.prepare(
          "INSERT INTO users (id, email, name, avatar) VALUES (?, ?, ?, ?)"
        ).run(profile.sub, profile.email, profile.name, profile.picture);
        db.prepare("INSERT INTO settings (user_id) VALUES (?)").run(profile.sub);
      } else {
        db.prepare(
          "UPDATE users SET email = ?, name = ?, avatar = ? WHERE id = ?"
        ).run(profile.email, profile.name, profile.picture, profile.sub);
      }
      return true;
    },
    async session({ session, token }) {
      if (token?.sub && session?.user) {
        session.user.id = token.sub;
      }
      return session;
    },
    async jwt({ token, profile }) {
      if (profile?.sub) {
        token.sub = profile.sub;
      }
      return token;
    },
  },
  pages: {
    signIn: "/login",
  },
  trustHost: true,
});
