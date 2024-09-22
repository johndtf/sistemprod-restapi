// permissions.routes.js

import { Router } from "express";
import {
  getPermissionsByProfile,
  updatePermissionsByProfile,
} from "../controllers/permissions.controller.js";

import { verifyPermission } from "../middlewares/verifypermission.myddlewares.js";

const router = Router();

router.get(
  "/api/permisos/:perfil",
  verifyPermission("permisos"),
  getPermissionsByProfile
);
router.post(
  "/api/permisos",
  verifyPermission("permisos"),
  updatePermissionsByProfile
);

export default router;
