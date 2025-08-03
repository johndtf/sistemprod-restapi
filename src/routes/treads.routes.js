import { Router } from "express";
import {
  getTreads,
  getListTreads,
  createTread,
  updateTread,
  // deleteTread,
} from "../controllers/treads.controller.js";

import { verifyPermission } from "../middlewares/verifypermission.myddlewares.js";

const router = Router();

// Ruta base: /api/treads

// Buscar diseños con filtros
router.post("/list", verifyPermission("disenios"), getTreads);

// Listado general de diseños (sin filtros)
router.get("/treadlist", getListTreads);

// Crear nuevo diseño
router.post("/", verifyPermission("disenios"), createTread);

// Actualizar diseño existente
router.patch("/:id", verifyPermission("disenios"), updateTread);

// Eliminar diseño (opcional)
// router.delete("/:id", deleteTread);

export default router;
