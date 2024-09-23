import { Router } from "express";

import {
  login,
  recoverPassword,
  resetPassword,
  validateToken,
} from "../controllers/auth.controller.js";

const router = Router();

router.post("/api/auth/login", login);
router.post("/api/auth/recover-password", recoverPassword);
router.post("/api/auth/reset-password", resetPassword);
router.post("/api/auth/validate-token", validateToken);

export default router;
