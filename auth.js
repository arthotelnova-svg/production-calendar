import NextAuth from "next-auth";
import { authConfig } from "./auth.config";
import { getDb } from "./lib/db";

export const { handlers, signIn, signOut, auth } = NextAuth({
  ...authConfig,
  callbacks: {
    ...authConfig.callbacks,
    async signIn({ profile }) {
      if (!profile?.sub) return false;
      const db = getDb();
      const upsert = db.transaction((id, email, name, picture) => {
        const existing = db.prepare("SELECT id FROM users WHERE id = ?").get(id);
        if (!existing) {
          db.prepare(
            "INSERT INTO users (id, email, name, avatar) VALUES (?, ?, ?, ?)"
          ).run(id, email, name, picture);
          db.prepare("INSERT INTO settings (user_id) VALUES (?)").run(id);
        } else {
          db.prepare(
            "UPDATE users SET email = ?, name = ?, avatar = ? WHERE id = ?"
          ).run(email, name, picture, id);
        }
      });
      upsert(profile.sub, profile.email, profile.name, profile.picture);
      return true;
    },
  },
});
