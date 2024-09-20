// permissions.routes.js

import { Router } from "express";
import {
  getPermissionsByProfile,
  updatePermissionsByProfile,
} from "../controllers/permissions.controller.js";

const router = Router();

router.get("/api/permisos/:perfil", getPermissionsByProfile);
router.post("/api/permisos", updatePermissionsByProfile);

export default router;
