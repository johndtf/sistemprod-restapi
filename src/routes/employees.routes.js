import { Router } from "express";
import {
  getEmployees,
  //getEmployee,
  createEmployee,
  updateEmployee,
  //deleteEmployee,
} from "../controllers/employees.controller.js";

import { verifyPermission } from "../middlewares/verifypermission.myddlewares.js";

const router = Router();

router.post(
  "/api/employees/employeeslist",
  verifyPermission("empleados"),
  getEmployees
);
//router.get("/api/employees/:cedula", getEmployee);
router.post("/api/employees", verifyPermission("empleados"), createEmployee);
/* se usa patch en lugar de put para poder actualizar algunos datos o todos */
router.patch(
  "/api/employees/:id",
  verifyPermission("empleados"),
  updateEmployee
);
//router.delete("/api/employees/:id", deleteEmployee);

export default router;
