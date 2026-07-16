import { Router } from "express";
import {
  getPlantParameters,
  updateDryingTimeParameter,
  updateRetreadAverageCostParameter,
} from "../controllers/plantParameters.controller.js";
import { verifyPermission } from "../middlewares/verifypermission.myddlewares.js";

const router = Router();

// Se actualizan por rutas separadas para que cada formulario modifique solo su
// parametro operativo y no pueda sobrescribir el otro valor por accidente.
router.get("/", verifyPermission("parametros"), getPlantParameters);
router.patch("/drying-time", verifyPermission("parametros"), updateDryingTimeParameter);
router.patch("/retread-average-cost", verifyPermission("parametros"), updateRetreadAverageCostParameter);

export default router;
