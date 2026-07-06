import { Router } from "express";
import {
  completeRepair,
  getActiveRepairOperators,
  getRepairCatalog,
  getRepairRejectionReasons,
  getRepairTire,
  rejectTireDuringRepair,
} from "../controllers/repair.controller.js";
import { verifyPermission } from "../middlewares/verifypermission.myddlewares.js";

const router = Router();

// Catálogos necesarios por el formulario productivo. Todos requieren el
// permiso "reparacion", no los permisos administrativos de cada entidad.
router.get("/operators", verifyPermission("reparacion"), getActiveRepairOperators);
router.get("/rejection-reasons", verifyPermission("reparacion"), getRepairRejectionReasons);
router.get("/catalog", verifyPermission("reparacion"), getRepairCatalog);

// Consulta de llanta y operaciones que escriben una nueva ejecución histórica.
router.get("/tires/:ticket", verifyPermission("reparacion"), getRepairTire);
router.post("/:ticket/complete", verifyPermission("reparacion"), completeRepair);
router.post("/:ticket/reject", verifyPermission("reparacion"), rejectTireDuringRepair);

export default router;
