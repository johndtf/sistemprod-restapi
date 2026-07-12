import { Router } from "express";
import {
  completeTreadCuts,
  getActiveTreadCutOperators,
  getCutTire,
  getPendingTreadCuts,
  reprocessTreadCut,
  undoTreadCut,
} from "../controllers/treadCut.controller.js";
import { verifyPermission } from "../middlewares/verifypermission.myddlewares.js";

const router = Router();

// Corte de banda conserva el permiso histórico "corteb" porque ya existe en
// el formulario de permisos del frontend.
router.get("/operators", verifyPermission("corteb"), getActiveTreadCutOperators);
router.get("/pending", verifyPermission("corteb"), getPendingTreadCuts);
router.post("/complete", verifyPermission("corteb"), completeTreadCuts);
router.get("/tires/:ticket/cut", verifyPermission("corteb"), getCutTire);
router.post("/:ticket/undo", verifyPermission("corteb"), undoTreadCut);
router.post("/:ticket/reprocess", verifyPermission("corteb"), reprocessTreadCut);

export default router;
