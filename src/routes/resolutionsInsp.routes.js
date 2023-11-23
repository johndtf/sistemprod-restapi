import { Router } from "express";
import {
  getResolutionsInsp,
  getResolutionInsp,
  createResolutionInsp,
  updateResolutionInsp,
  /*  deleteResolutionInsp, */
} from "../controllers/resolutionsInsp.controller.js";

const router = Router();

router.get("/api/resolutionsInsp", getResolutionsInsp);
router.get("/api/resolutionsInsp/:codigo", getResolutionInsp);
router.post("/api/resolutionsInsp", createResolutionInsp);
/* se usa patch en lugar de put para poder actualizar algunos datos o todos */
router.patch("/api/resolutionsInsp/:id", updateResolutionInsp);
//router.delete("/api/resolutionsInsp/:id", deleteResolutionInsp);

export default router;
