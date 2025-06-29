import { Router } from "express";
import {
  getDimensions,
  getListDimensions,
  createDimension,
  updateDimension,
  // deleteDimension,
} from "../controllers/dimensions.controller.js";

import { verifyPermission } from "../middlewares/verifypermission.myddlewares.js";

const router = Router();

// Ruta base: /api/dimensions

// Buscar dimensiones con filtros
router.post("/list", verifyPermission("dimensiones"), getDimensions);

// Obtener todas las dimensiones (sin filtros)
router.get("/list", getListDimensions);

// Crear una nueva dimensión
router.post("/", verifyPermission("dimensiones"), createDimension);

// Actualizar una dimensión existente
router.patch("/:id", verifyPermission("dimensiones"), updateDimension);

// Eliminar (opcional, comentado)
// router.delete("/:id", deleteDimension);

export default router;
