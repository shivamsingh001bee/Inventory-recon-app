export { default } from "next-auth/middleware";

export const config = {
  matcher: [
    /*
     * Protect everything except:
     * - /login
     * - /api/auth/*  (NextAuth's own routes)
     * - static assets
     */
    "/((?!login|api/auth|_next/static|_next/image|favicon.ico).*)"
  ]
};
