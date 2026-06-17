import { Router, Request, Response } from "express";
import { AuthService } from "../services/auth.service.js";
import { requireAdmin } from "../middleware/requireAdmin.js";

const router = Router();

/**
 * POST /api/auth/login
 * Body: { email, password } -> { token, admin }
 */
router.post("/login", async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    const result = await AuthService.login(email, password);
    return res.json({ success: true, ...result });
  } catch (error: any) {
    // Invalid credentials and validation errors both surface as 401 to avoid
    // leaking which part failed.
    return res.status(401).json({ error: error.message || "Authentication failed." });
  }
});

/**
 * GET /api/auth/me
 * Returns the authenticated admin. Replaces the old `admins/{uid}` existence
 * check + onAuthStateChanged flow on the frontend.
 */
router.get("/me", requireAdmin, (req: Request, res: Response) => {
  return res.json({ admin: { id: req.admin!.adminId, email: req.admin!.email } });
});

export default router;
