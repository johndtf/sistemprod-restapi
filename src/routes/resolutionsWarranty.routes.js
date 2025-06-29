import { Router } from "express";
import {
  getResolutionsWarranty,
  createResolutionWarranty,
  updateResolutionWarranty,
  // deleteResolutionWarranty,
} from "../controllers/resolutionsWarranty.controller.js";

import { verifyPermission } from "../middlewares/verifypermission.myddlewares.js";

const router = Router();

// Ruta base: /api/resolutionsWarranty

// Buscar resoluciones de garantía
router.post("/list", verifyPermission("rgarantia"), getResolutionsWarranty);

// Crear nueva resolución de garantía
router.post("/", verifyPermission("rgarantia"), createResolutionWarranty);

// Actualizar resolución
router.patch("/:id", verifyPermission("rgarantia"), updateResolutionWarranty);

// Eliminar resolución (comentado)
// router.delete("/:id", deleteResolutionWarranty);

export default router;
