import { Router } from "express";
import {
  getResolutionsInsp,
  getResolutionInsp,
  createResolutionInsp,
  updateResolutionInsp,
  /*  deleteResolutionInsp, */
} from "../controllers/resolutionsInsp.controller.js";
import { verifyPermission } from "../middlewares/verifypermission.myddlewares.js";

const router = Router();

router.post(
  "/api/resolutionsInsp/resolutionslist",
  verifyPermission("rinspeccion"),
  getResolutionsInsp
);
//router.get("/api/resolutionsInsp/:codigo", getResolutionInsp);
router.post(
  "/api/resolutionsInsp",
  verifyPermission("rinspeccion"),
  createResolutionInsp
);
/* se usa patch en lugar de put para poder actualizar algunos datos o todos */
router.patch(
  "/api/resolutionsInsp/:id",
  verifyPermission("rinspeccion"),
  updateResolutionInsp
);
//router.delete("/api/resolutionsInsp/:id", deleteResolutionInsp);

export default router;
