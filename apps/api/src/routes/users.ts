import express, { Response } from "express";
import { UserRoleModel } from "../models/Role";
import { requireAuth } from "../middleware/auth";

const router = express.Router();

// ─── GET /api/users/me/role ────────────────────────────────────────────────
router.get("/me/role", requireAuth, async (req, res: Response) => {
  try {
    const userId = (req as any).auth?.userId;
    
    if (!userId) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const userRole = await UserRoleModel.findOne({ userId });
    res.json({ role: userRole?.role || "candidate" });
  } catch (err) {
    res.status(500).json({ role: "candidate" });
  }
});

export default router;