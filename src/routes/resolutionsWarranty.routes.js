import { Router } from "express";
import {
  getResolutionsWarranty,
  createResolutionWarranty,
  updateResolutionWarranty,
} from "../controllers/resolutionsWarranty.controller.js";

const router = Router();

router.post("/api/resolutionsWarranty/resolutionslist", getResolutionsWarranty);
router.post("/api/resolutionsWarranty", createResolutionWarranty);
/* se usa patch en lugar de put para poder actualizar algunos datos o todos */
router.patch("/api/resolutionsWarranty/:id", updateResolutionWarranty);
//router.delete("/api/resolutionsWarranty/:id", deleteResolutionWarranty);

export default router;
