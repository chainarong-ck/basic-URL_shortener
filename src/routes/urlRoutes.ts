import { Router } from "express";
import {
  shorten,
  getOne,
  list,
  updateOne,
  remove,
  stats,
} from "../controllers/urlController";

/**
 * API Routes for URL shortening service
 */

const router = Router();

router.post("/shorten", shorten);
router.get("/urls/:id", getOne);
router.get("/urls", list);
router.put("/urls/:id", updateOne);
router.delete("/urls/:id", remove);
router.get("/stats/:id", stats);
router.get("/health", (_req, res) => res.json({ status: "ok" }));

export default router;
