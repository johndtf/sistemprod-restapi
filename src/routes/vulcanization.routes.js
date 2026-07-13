import { Router } from "express";
import {
  completeVulcanization,
  getActiveVulcanizationOperators,
  getVulcanizationRejectionReasons,
  getVulcanizationTire,
  rejectTireDuringVulcanization,
} from "../controllers/vulcanization.controller.js";
import { verifyPermission } from "../middlewares/verifypermission.myddlewares.js";

const router = Router();

router.get("/operators", verifyPermission("vulcanizacion"), getActiveVulcanizationOperators);
router.get(
  "/rejection-reasons",
  verifyPermission("vulcanizacion"),
  getVulcanizationRejectionReasons,
);
router.get("/tires/:ticket", verifyPermission("vulcanizacion"), getVulcanizationTire);
router.post("/:ticket/complete", verifyPermission("vulcanizacion"), completeVulcanization);
router.post(
  "/:ticket/reject",
  verifyPermission("vulcanizacion"),
  rejectTireDuringVulcanization,
);

export default router;
