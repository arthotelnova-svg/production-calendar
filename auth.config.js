import Google from "next-auth/providers/google";
import Credentials from "next-auth/providers/credentials";

// Edge-compatible config (no DB imports).
// Used by middleware; auth.js extends this with DB callbacks.
export const authConfig = {
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    }),
    Credentials({
      name: "Test User",
      credentials: {},
      async authorize() {
        return {
          id: "test-user-id",
          name: "Тестовый Пользователь",
          email: "test@example.com",
          image: "https://api.dicebear.com/7.x/bottts/svg?seed=test",
        };
      },
    }),
  ],
  pages: {
    signIn: "/login",
  },
  trustHost: true,
  callbacks: {
    authorized({ auth }) {
      return !!auth?.user;
    },
    async session({ session, token }) {
      if (token?.sub && session?.user) {
        session.user.id = token.sub;
      }
      return session;
    },
    async jwt({ token, user, profile }) {
      if (profile?.sub) {
        token.sub = profile.sub;
      } else if (user?.id) {
        token.sub = user.id;
      }
      return token;
    },
  },
};
