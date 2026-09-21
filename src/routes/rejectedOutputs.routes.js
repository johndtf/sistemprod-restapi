import { Router } from "express";
import { completeRejectedOutput, getRejectedOutputCatalogs, getRejectedOutputReport, getRejectedOutputTire, listRejectedOutputBlock } from "../controllers/rejectedOutputs.controller.js";
import { verifyPermission } from "../middlewares/verifypermission.myddlewares.js";

const router = Router();
router.get("/catalogs", verifyPermission("salidasrechazos"), getRejectedOutputCatalogs);
router.get("/reports/:documento", verifyPermission("salidasrechazos"), getRejectedOutputReport);
router.get("/tires/:ticket", verifyPermission("salidasrechazos"), getRejectedOutputTire);
router.get("/block", verifyPermission("salidasrechazos"), listRejectedOutputBlock);
router.post("/complete", verifyPermission("salidasrechazos"), completeRejectedOutput);
export default router;
