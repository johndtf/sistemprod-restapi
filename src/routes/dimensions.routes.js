import { Router } from "express";
import {
  getDimensions,
  // getDimension,
  createDimension,
  updateDimension,
  //deleteDimension,
} from "../controllers/dimensions.controller.js";
import { verifyPermission } from "../middlewares/verifypermission.myddlewares.js";
const router = Router();

router.post(
  "/api/dimensions/dimensionslist",
  verifyPermission("dimensiones"),
  getDimensions
);
//router.post("/api/dimensions/dimension", getDimension);
router.post(
  "/api/dimensions",
  verifyPermission("dimensiones"),
  createDimension
);
/* se usa patch en lugar de put para poder actualizar algunos datos o todos */
router.patch(
  "/api/dimensions/:id",
  verifyPermission("dimensiones"),
  updateDimension
);
//router.delete("/api/dimensions/:id", deleteDimension);

export default router;
