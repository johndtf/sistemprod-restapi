import { Router } from "express";
import {
  getInventoryQuery,
  getInventoryQueryCatalogs,
} from "../controllers/inventoryQuery.controller.js";
import { verifyPermission } from "../middlewares/verifypermission.myddlewares.js";

const router = Router();

// La consulta general reemplaza la antigua pantalla estatica de inventarios y
// conserva su mismo permiso para no cambiar los perfiles ya configurados.
router.get("/catalogs", verifyPermission("cinventarios"), getInventoryQueryCatalogs);
router.get("/", verifyPermission("cinventarios"), getInventoryQuery);

export default router;
