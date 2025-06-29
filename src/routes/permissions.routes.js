import { Router } from "express";
import {
  getPermissionsByProfile,
  updatePermissionsByProfile,
} from "../controllers/permissions.controller.js";

import { verifyPermission } from "../middlewares/verifypermission.myddlewares.js";

const router = Router();

// Ruta base: /api/permissions

// Obtener permisos de un perfil
router.get("/:perfil", verifyPermission("permisos"), getPermissionsByProfile);

// Actualizar permisos de un perfil
router.post("/", verifyPermission("permisos"), updatePermissionsByProfile);

export default router;
