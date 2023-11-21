import { Router } from "express";
import {
  getDimensions,
  getDimension,
  createDimension,
  updateDimension,
  //deleteDimension,
} from "../controllers/dimensions.controller.js";

const router = Router();

router.get("/dimensions", getDimensions);
router.get("/dimensions/:dimension", getDimension);
router.post("/dimensions", createDimension);
/* se usa patch en lugar de put para poder actualizar algunos datos o todos */
router.patch("/dimensions/:id", updateDimension);
//router.delete("/dimensions/:id", deleteDimension);

export default router;
