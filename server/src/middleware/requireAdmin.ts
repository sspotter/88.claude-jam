import { Request, Response, NextFunction } from "express";
import { AuthService, AdminTokenPayload } from "../services/auth.service.js";

// Attach the decoded admin to the request for downstream handlers.
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      admin?: AdminTokenPayload;
    }
  }
}

/**
 * Express guard replacing the old firestore.rules `isAdmin()` check.
 * Requires a valid `Authorization: Bearer <jwt>` header; otherwise 401.
 */
export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization || "";
  const [scheme, token] = header.split(" ");

  if (scheme !== "Bearer" || !token) {
    return res.status(401).json({ error: "Authentication required." });
  }

  try {
    req.admin = AuthService.verifyToken(token);
    return next();
  } catch {
    return res.status(401).json({ error: "Invalid or expired token." });
  }
}
