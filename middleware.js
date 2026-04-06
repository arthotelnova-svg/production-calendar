import NextAuth from "next-auth";
import { authConfig } from "./auth.config";

export const { auth: middleware } = NextAuth(authConfig);

// Only protect dashboard; API routes handle auth themselves via auth()
export const config = {
  matcher: ["/dashboard/:path*"],
};
