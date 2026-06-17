import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import prisma from "../config/prisma.js";

export interface AdminTokenPayload {
  adminId: string;
  email: string;
}

function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error("JWT_SECRET is not configured in environment variables.");
  }
  return secret;
}

export class AuthService {
  /**
   * Validates email/password against the admins table and returns a signed JWT.
   * Throws on invalid credentials (callers map to 401).
   */
  public static async login(
    email: string,
    password: string
  ): Promise<{ token: string; admin: { id: string; email: string } }> {
    if (!email || !password) {
      throw new Error("Email and password are required.");
    }

    const admin = await prisma.admin.findUnique({
      where: { email: email.trim().toLowerCase() },
    });

    // Constant-ish comparison: still run bcrypt even when admin is missing to
    // avoid trivially leaking which emails exist.
    const hash = admin?.passwordHash ?? "$2a$10$invalidinvalidinvalidinvalidinvalidinvalidinvalidinv";
    const ok = await bcrypt.compare(password, hash);

    if (!admin || !ok) {
      throw new Error("Invalid email or password.");
    }

    const payload: AdminTokenPayload = { adminId: admin.id, email: admin.email };
    const token = jwt.sign(payload, getJwtSecret(), { expiresIn: "7d" });

    return { token, admin: { id: admin.id, email: admin.email } };
  }

  /**
   * Verifies a JWT and returns its payload. Throws if invalid/expired.
   */
  public static verifyToken(token: string): AdminTokenPayload {
    return jwt.verify(token, getJwtSecret()) as AdminTokenPayload;
  }

  /**
   * Hashes a plaintext password (used by the seed script and admin creation).
   */
  public static async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, 10);
  }
}
