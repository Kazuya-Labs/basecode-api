import { ExpressAuth, getSession } from "@auth/express";

import { fail } from "./response.js";

export const authConfig = {
  secret: process.env.AUTH_SECRET,
  trustHost: true,
  session: { strategy: "jwt" },
  providers: [
    // Add Auth.js providers here, e.g. GitHub from "@auth/express/providers/github"
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user) token.role = user.role;
      return token;
    },
    session({ session, token }) {
      session.user.role = token.role ?? "user";
      return session;
    },
  },
};

export const authHandler = ExpressAuth(authConfig);

export async function authenticatedUser(req, res, next) {
  const session = await getSession(req, authConfig);
  if (!session?.user) {
    return fail(res, 401, "Unauthorized");
  }
  req.session = session;
  next();
}

export function requireRole(role) {
  return async (req, res, next) => {
    const session = req.session ?? (await getSession(req, authConfig));
    if (!session?.user || session.user.role !== role) {
      return fail(res, 403, "Forbidden");
    }
    req.session = session;
    next();
  };
}

export function getCurrentUser(req) {
  return req.session?.user ?? null;
}
