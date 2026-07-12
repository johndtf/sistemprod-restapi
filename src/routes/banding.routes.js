import { Router } from "express";
import {
  completeBanding,
  getActiveBandingOperators,
  getBandingRejectionReasons,
  getBandingTire,
  rejectTireDuringBanding,
} from "../controllers/banding.controller.js";
import { verifyPermission } from "../middlewares/verifypermission.myddlewares.js";

const router = Router();

router.get("/operators", verifyPermission("embandado"), getActiveBandingOperators);
router.get("/rejection-reasons", verifyPermission("embandado"), getBandingRejectionReasons);
router.get("/tires/:ticket", verifyPermission("embandado"), getBandingTire);
router.post("/:ticket/complete", verifyPermission("embandado"), completeBanding);
router.post("/:ticket/reject", verifyPermission("embandado"), rejectTireDuringBanding);

export default router;
