import { Router } from "express";
import {
  completePreparation,
  getActivePreparationOperators,
  getPreparationRejectionReasons,
  getPreparationTire,
  rejectTireDuringPreparation,
} from "../controllers/preparation.controller.js";
import { verifyPermission } from "../middlewares/verifypermission.myddlewares.js";

const router = Router();

// Todas las rutas usan el permiso de Preparacion. Los catalogos se sirven
// aqui para no exigir permisos administrativos de empleados o resoluciones.
router.get(
  "/operators",
  verifyPermission("preparacion"),
  getActivePreparationOperators,
);
router.get(
  "/rejection-reasons",
  verifyPermission("preparacion"),
  getPreparationRejectionReasons,
);
router.get("/tires/:ticket", verifyPermission("preparacion"), getPreparationTire);
router.post(
  "/:ticket/complete",
  verifyPermission("preparacion"),
  completePreparation,
);
router.post(
  "/:ticket/reject",
  verifyPermission("preparacion"),
  rejectTireDuringPreparation,
);

export default router;
