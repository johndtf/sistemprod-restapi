import { Router } from "express";
import {
  createTreadWeight,
  listTreadWeights,
  updateTreadWeight,
} from "../controllers/treadWeights.controller.js";
import { verifyPermission } from "../middlewares/verifypermission.myddlewares.js";

const router = Router();

// El permiso "pesos_banda" protege el catalogo que alimentara el costeo de
// llantas reencauchadas durante la salida a bodega.
router.get("/", verifyPermission("pesos_banda"), listTreadWeights);
router.post("/", verifyPermission("pesos_banda"), createTreadWeight);
router.patch("/:id", verifyPermission("pesos_banda"), updateTreadWeight);

export default router;
