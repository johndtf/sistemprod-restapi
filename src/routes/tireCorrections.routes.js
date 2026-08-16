import { Router } from "express";
import {
  getTireCorrectionCatalogs,
  getTireForCorrection,
  updateTireInProcess,
} from "../controllers/tireCorrections.controller.js";
import { verifyPermission } from "../middlewares/verifypermission.myddlewares.js";

const router = Router();

// Corregir datos de una llanta es una extension controlada de Ordenes. Usa el
// mismo permiso para que quienes administran el ingreso puedan corregir un
// error detectado despues, sin conceder acceso al costeo o a las salidas.
router.get("/catalogs", verifyPermission("ordenes"), getTireCorrectionCatalogs);
router.get("/tires/:ticket", verifyPermission("ordenes"), getTireForCorrection);
router.patch("/tires/:ticket", verifyPermission("ordenes"), updateTireInProcess);

export default router;
