import { Router } from "express";
import {
  getResolutionsInsp,
  getResolutionInsp,
  createResolutionInsp,
  updateResolutionInsp,
  /*  deleteResolutionInsp, */
} from "../controllers/resolutionsInsp.controller.js";

const router = Router();

router.get("/resolutionsInsp", getResolutionsInsp);
router.get("/resolutionsInsp/:codigo", getResolutionInsp);
router.post("/resolutionsInsp", createResolutionInsp);
/* se usa patch en lugar de put para poder actualizar algunos datos o todos */
router.patch("/resolutionsInsp/:id", updateResolutionInsp);
//router.delete("/resolutionsInsp/:id", deleteResolutionInsp);

export default router;
