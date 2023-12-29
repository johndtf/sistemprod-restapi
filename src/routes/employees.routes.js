import { Router } from "express";
import {
  getEmployees,
  //getEmployee,
  createEmployee,
  updateEmployee,
  //deleteEmployee,
} from "../controllers/employees.controller.js";

const router = Router();

router.post("/api/employees/employeeslist", getEmployees);
//router.get("/api/employees/:cedula", getEmployee);
router.post("/api/employees", createEmployee);
/* se usa patch en lugar de put para poder actualizar algunos datos o todos */
router.patch("/api/employees/:id", updateEmployee);
//router.delete("/api/employees/:id", deleteEmployee);

export default router;
