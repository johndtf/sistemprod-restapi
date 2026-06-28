import { Router } from "express";
import {
  getTireByTicket,
  // getAllTires, // opcional si luego se quiere listar
} from "../controllers/tires.controller.js";

import { verifyPermission } from "../middlewares/verifypermission.myddlewares.js";

const router = Router();

// Ruta base: /api/tires

// Buscar llanta por número de tiquete
router.get("/:ticket", verifyPermission("inspeccioni"), getTireByTicket);

export default router;
