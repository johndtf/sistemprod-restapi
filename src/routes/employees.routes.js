import { Router } from "express";
import {
  getEmployees,
  // getEmployee,
  createEmployee,
  updateEmployee,
  // deleteEmployee,
} from "../controllers/employees.controller.js";

import { verifyPermission } from "../middlewares/verifypermission.myddlewares.js";

const router = Router();

// Ruta base: /api/employees

// Buscar empleados con filtros
router.post("/list", verifyPermission("empleados"), getEmployees);

// Crear nuevo empleado
router.post("/", verifyPermission("empleados"), createEmployee);

// Actualizar empleado
router.patch("/:id", verifyPermission("empleados"), updateEmployee);

// Obtener empleado por cédula (si se activa en el futuro)
// router.get("/:cedula", getEmployee);

// Eliminar empleado (si se necesita activarlo después)
// router.delete("/:id", deleteEmployee);

export default router;
