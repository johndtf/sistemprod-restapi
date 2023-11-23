import { Router } from "express";
import {
  getDimensions,
  getDimension,
  createDimension,
  updateDimension,
  //deleteDimension,
} from "../controllers/dimensions.controller.js";

const router = Router();

router.get("/api/dimensions", getDimensions);
router.get("/api/dimensions/:dimension", getDimension);
router.post("/api/dimensions", createDimension);
/* se usa patch en lugar de put para poder actualizar algunos datos o todos */
router.patch("/api/dimensions/:id", updateDimension);
//router.delete("/api/dimensions/:id", deleteDimension);

export default router;
