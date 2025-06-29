import { Router } from "express";
import {
  getResolutionsInsp,
  getResolutionInsp,
  createResolutionInsp,
  updateResolutionInsp,
  // deleteResolutionInsp,
} from "../controllers/resolutionsInsp.controller.js";

import { verifyPermission } from "../middlewares/verifypermission.myddlewares.js";

const router = Router();

// Ruta base: /api/resolutionsInsp

// Buscar resoluciones de inspección
router.post("/list", verifyPermission("rinspeccion"), getResolutionsInsp);

// Obtener una resolución específica por código (opcional)
// router.get("/:codigo", getResolutionInsp);

// Crear resolución
router.post("/", verifyPermission("rinspeccion"), createResolutionInsp);

// Actualizar resolución
router.patch("/:id", verifyPermission("rinspeccion"), updateResolutionInsp);

// Eliminar resolución (si se implementa en el futuro)
// router.delete("/:id", deleteResolutionInsp);

export default router;
