// routes/initialInspection.routes.js
import { Router } from "express";
import {
  getActiveInitialInspectionOperators,
  updateInitialInspection,
  undoInitialInspection,
} from "../controllers/initialInspection.controller.js";
import { verifyPermission } from "../middlewares/verifypermission.myddlewares.js";

const router = Router();
// Ruta base: /api/initialInspection

// Lista de empleados activos para el selector buscable del formulario.
router.get(
  "/operators",
  verifyPermission("inspeccioni"),
  getActiveInitialInspectionOperators,
);

// Registrar inspección inicial

router.patch(
  "/:tiquete",
  verifyPermission("inspeccioni"),
  updateInitialInspection,
);

router.delete(
  "/:tiquete",
  verifyPermission("inspeccioni"),
  undoInitialInspection,
);

export default router;
