import { Router } from "express";
import {
  createWarehouse,
  listWarehouses,
  updateWarehouse,
} from "../controllers/warehouses.controller.js";
import { verifyPermission } from "../middlewares/verifypermission.myddlewares.js";

const router = Router();

// No se expone DELETE: inactivar conserva la relacion entre bodegas y las
// salidas historicas que ya fueron registradas.
router.get("/", verifyPermission("bodegas"), listWarehouses);
router.post("/", verifyPermission("bodegas"), createWarehouse);
router.patch("/:id", verifyPermission("bodegas"), updateWarehouse);

export default router;
