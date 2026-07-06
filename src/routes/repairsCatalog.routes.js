import { Router } from "express";
import {
  createRepair,
  listRepairs,
  updateRepair,
} from "../controllers/repairsCatalog.controller.js";
import { verifyPermission } from "../middlewares/verifypermission.myddlewares.js";

const router = Router();

// Este grupo administra el catálogo y por eso utiliza un permiso separado del
// permiso productivo "reparacion".
router.get("/", verifyPermission("reparaciones"), listRepairs);
router.post("/", verifyPermission("reparaciones"), createRepair);
router.patch("/:id", verifyPermission("reparaciones"), updateRepair);

export default router;
