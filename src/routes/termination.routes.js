import { Router } from "express";
import {
  completeTermination,
  getActiveTerminationOperators,
  getTerminationRejectionReasons,
  getTerminationTire,
  rejectTireDuringTermination,
} from "../controllers/termination.controller.js";
import { verifyPermission } from "../middlewares/verifypermission.myddlewares.js";

const router = Router();

router.get("/operators", verifyPermission("terminacion"), getActiveTerminationOperators);
router.get("/rejection-reasons", verifyPermission("terminacion"), getTerminationRejectionReasons);
router.get("/tires/:ticket", verifyPermission("terminacion"), getTerminationTire);
router.post("/:ticket/complete", verifyPermission("terminacion"), completeTermination);
router.post("/:ticket/reject", verifyPermission("terminacion"), rejectTireDuringTermination);

export default router;
