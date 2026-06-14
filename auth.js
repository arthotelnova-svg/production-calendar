import NextAuth from "next-auth";
import { authConfig } from "./auth.config";
import { getDb } from "./lib/db";

export const { handlers, signIn, signOut, auth } = NextAuth({
  ...authConfig,
  callbacks: {
    ...authConfig.callbacks,
    async signIn({ profile, user }) {
      const id = profile?.sub || user?.id;
      const email = profile?.email || user?.email;
      const name = profile?.name || user?.name;
      const picture = profile?.picture || user?.image;
      if (!id) return false;
      const db = getDb();
      const upsert = db.transaction((id, email, name, picture) => {
        const existing = db.prepare("SELECT id FROM users WHERE id = ?").get(id);
        if (!existing) {
          db.prepare(
            "INSERT INTO users (id, email, name, avatar) VALUES (?, ?, ?, ?)"
          ).run(id, email, name, picture);
          db.prepare("INSERT INTO settings (user_id) VALUES (?)").run(id);

          // Populate demo data for test user
          if (id === "test-user-id") {
            try {
              const currentYear = new Date().getFullYear();
              const currentMonth = new Date().getMonth();
              const insOT = db.prepare("INSERT INTO overtime (user_id, year, month, day, hours) VALUES (?, ?, ?, ?, ?)");
              insOT.run(id, currentYear, currentMonth, 5, 2.0);
              insOT.run(id, currentYear, currentMonth, 12, 2.0);
              insOT.run(id, currentYear, currentMonth, 15, 2.0);
              insOT.run(id, currentYear, currentMonth, 22, 2.0);
              insOT.run(id, currentYear, currentMonth, 26, 2.0);
              insOT.run(id, currentYear, currentMonth, 10, 8.0);
              insOT.run(id, currentYear, currentMonth, 17, 8.0);

              const insAbs = db.prepare("INSERT INTO absences (user_id, year, month, day) VALUES (?, ?, ?, ?)");
              insAbs.run(id, currentYear, currentMonth, 19);
            } catch (err) {
              console.error("Failed to populate demo data:", err);
            }
          }
        } else {
          db.prepare(
            "UPDATE users SET email = ?, name = ?, avatar = ? WHERE id = ?"
          ).run(email, name, picture, id);
        }
      });
      upsert(id, email, name, picture);
      return true;
    },
  },
});
