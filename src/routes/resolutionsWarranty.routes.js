import { Router } from "express";
import {
  getResolutionsWarranty,
  createResolutionWarranty,
  updateResolutionWarranty,
} from "../controllers/resolutionsWarranty.controller.js";
import { verifyPermission } from "../middlewares/verifypermission.myddlewares.js";

const router = Router();

router.post(
  "/api/resolutionsWarranty/resolutionslist",
  verifyPermission("rgarantia"),
  getResolutionsWarranty
);
router.post(
  "/api/resolutionsWarranty",
  verifyPermission("rgarantia"),
  createResolutionWarranty
);
/* se usa patch en lugar de put para poder actualizar algunos datos o todos */
router.patch(
  "/api/resolutionsWarranty/:id",
  verifyPermission("rgarantia"),
  updateResolutionWarranty
);
//router.delete("/api/resolutionsWarranty/:id", deleteResolutionWarranty);

export default router;
