import { ExpressAuth, getSession } from "@auth/express";

import { fail } from "./response.js";

/**
 * Auth.js config (JWT cookie sessions). Roles ride the JWT via the callbacks.
 * @type {import("@auth/express").ExpressAuthConfig}
 */
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

/** Express middleware that handles the `/auth/*` endpoints. */
export const authHandler = ExpressAuth(authConfig);

/**
 * Guard: reject with 401 if there is no authenticated session, otherwise
 * populate `req.session` and continue.
 * @param {import("express").Request} req
 * @param {import("express").Response} res
 * @param {import("express").NextFunction} next
 * @returns {Promise<void>}
 */
export async function authenticatedUser(req, res, next) {
  const session = await getSession(req, authConfig);
  if (!session?.user) {
    return fail(res, 401, "Unauthorized");
  }
  req.session = session;
  next();
}

/**
 * Factory: guard that rejects with 403 unless the session user's role matches.
 * @param {"user"|"admin"} role Required role
 * @returns {import("express").RequestHandler}
 */
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

/**
 * Get the authenticated user from a request (after an auth guard ran), or null.
 * @param {import("express").Request} req
 * @returns {object|null} Session user
 */
export function getCurrentUser(req) {
  return req.session?.user ?? null;
}
