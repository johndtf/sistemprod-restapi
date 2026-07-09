import { Router } from "express";
import {
  getPlantParameters,
  updatePlantParameters,
} from "../controllers/plantParameters.controller.js";
import { verifyPermission } from "../middlewares/verifypermission.myddlewares.js";

const router = Router();

router.get("/", verifyPermission("parametros"), getPlantParameters);
router.patch("/", verifyPermission("parametros"), updatePlantParameters);

export default router;
