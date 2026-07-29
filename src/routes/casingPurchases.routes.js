import { Router } from "express";
import {
  createCasingPurchase,
  getCasingPurchaseReport,
  getEligibleCasing,
  getPurchaseCatalogs,
} from "../controllers/casingPurchases.controller.js";
import { verifyPermission } from "../middlewares/verifypermission.myddlewares.js";
const router = Router();
router.get("/catalogs", verifyPermission("comprascascos"), getPurchaseCatalogs);
router.get("/reports/:documento", verifyPermission("comprascascos"), getCasingPurchaseReport);
router.get("/tires/:ticket", verifyPermission("comprascascos"), getEligibleCasing);
router.post("/", verifyPermission("comprascascos"), createCasingPurchase);
export default router;
