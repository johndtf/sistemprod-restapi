import { Router } from "express";
import {
  completeFinalInspection,
  getActiveFinalInspectionOperators,
  getFinalInspectionRejectionReasons,
  getFinalInspectionTire,
  rejectTireDuringFinalInspection,
  undoFinalInspection,
} from "../controllers/finalInspection.controller.js";
import { verifyPermission } from "../middlewares/verifypermission.myddlewares.js";

const router = Router();

router.get("/operators", verifyPermission("inspeccionf"), getActiveFinalInspectionOperators);
router.get(
  "/rejection-reasons",
  verifyPermission("inspeccionf"),
  getFinalInspectionRejectionReasons,
);
router.get("/tires/:ticket", verifyPermission("inspeccionf"), getFinalInspectionTire);
router.post("/:ticket/complete", verifyPermission("inspeccionf"), completeFinalInspection);
router.post(
  "/:ticket/reject",
  verifyPermission("inspeccionf"),
  rejectTireDuringFinalInspection,
);
router.post("/:ticket/undo", verifyPermission("inspeccionf"), undoFinalInspection);

export default router;
