import { Router } from "express";
import {
  getResolutionsWarranty,
  getResolutionWarranty,
  createResolutionWarranty,
  updateResolutionWarranty,
} from "../controllers/resolutionsWarranty.controller.js";

const router = Router();

router.get("/resolutionsWarranty", getResolutionsWarranty);
router.get("/resolutionsWarranty/:id", getResolutionWarranty);
router.post("/resolutionsWarranty", createResolutionWarranty);
/* se usa patch en lugar de put para poder actualizar algunos datos o todos */
router.patch("/resolutionsWarranty/:id", updateResolutionWarranty);
//router.delete("/resolutionsWarranty/:id", deleteResolutionWarranty);

export default router;
