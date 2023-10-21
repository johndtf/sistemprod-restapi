import { Router } from "express";
import {
  getEmployees,
  getEmployee,
  createEmployee,
  updateEmployee,
  //deleteEmployee,
} from "../controllers/employees.controller.js";

const router = Router();

router.get("/employees", getEmployees);
router.get("/employees/:cedula", getEmployee);
router.post("/employees", createEmployee);
/* se usa patch en lugar de put para poder actualizar algunos datos o todos */
router.patch("/employees/:id", updateEmployee);
//router.delete("/employees/:id", deleteEmployee);

export default router;
