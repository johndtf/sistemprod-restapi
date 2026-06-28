// routes/initialInspection.routes.js
import { Router } from "express";
import {
  updateInitialInspection,
  undoInitialInspection,
} from "../controllers/initialInspection.controller.js";
import { verifyPermission } from "../middlewares/verifypermission.myddlewares.js";

const router = Router();
// Ruta base: /api/initialInspection
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
