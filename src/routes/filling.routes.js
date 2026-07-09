import { Router } from "express";
import {
  completeFilling,
  getActiveFillingOperators,
  getFillingRejectionReasons,
  getFillingTire,
  rejectTireDuringFilling,
} from "../controllers/filling.controller.js";
import { verifyPermission } from "../middlewares/verifypermission.myddlewares.js";

const router = Router();

// Catalogos propios del formulario productivo de Relleno.
router.get("/operators", verifyPermission("relleno"), getActiveFillingOperators);
router.get("/rejection-reasons", verifyPermission("relleno"), getFillingRejectionReasons);

// Consulta de llanta y registro historico del subproceso.
router.get("/tires/:ticket", verifyPermission("relleno"), getFillingTire);
router.post("/:ticket/complete", verifyPermission("relleno"), completeFilling);
router.post("/:ticket/reject", verifyPermission("relleno"), rejectTireDuringFilling);

export default router;
