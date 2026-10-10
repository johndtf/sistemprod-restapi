import { Router } from "express";
import {
  createCasingPurchase,
  createWarehouseCasingPurchase,
  getCasingPurchaseReport,
  getEligibleCasing,
  getEligibleWarehouseCasing,
  getPurchaseCatalogs,
  getWarehouseCasingPurchaseReport,
  getWarehousePurchaseCatalogs,
} from "../controllers/casingPurchases.controller.js";
import { verifyPermission } from "../middlewares/verifypermission.myddlewares.js";
const router = Router();
router.get("/catalogs", verifyPermission("comprascascos"), getPurchaseCatalogs);
router.get("/reports/:documento", verifyPermission("comprascascos"), getCasingPurchaseReport);
router.get("/warehouse/catalogs", verifyPermission("comprac"), getWarehousePurchaseCatalogs);
router.get("/warehouse/reports/:documento", verifyPermission("comprac"), getWarehouseCasingPurchaseReport);
router.get("/warehouse/tires/:ticket", verifyPermission("comprac"), getEligibleWarehouseCasing);
router.get("/tires/:ticket", verifyPermission("comprascascos"), getEligibleCasing);
router.post("/", verifyPermission("comprascascos"), createCasingPurchase);
router.post("/warehouse", verifyPermission("comprac"), createWarehouseCasingPurchase);
export default router;
