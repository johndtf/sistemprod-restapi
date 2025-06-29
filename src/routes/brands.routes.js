import { Router } from "express";
import {
  getBrands,
  getListBrands,
  createBrand,
  updateBrand,
  // deleteBrand,
} from "../controllers/brands.controller.js";

import { verifyPermission } from "../middlewares/verifypermission.myddlewares.js";

const router = Router();

// Ruta base: /api/brands

// Obtener marcas con filtros (POST)
router.post("/list", verifyPermission("marcas"), getBrands);

// Obtener listado simple (GET)
router.get("/list", getListBrands);

// Crear una nueva marca
router.post("/", verifyPermission("marcas"), createBrand);

// Actualizar una marca
router.patch("/:id", verifyPermission("marcas"), updateBrand);

// Eliminar marca (en caso de habilitarlo en el futuro)
// router.delete("/:id", deleteBrand);

export default router;
