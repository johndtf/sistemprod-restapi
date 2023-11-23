import { Router } from "express";
import {
  getCustomers,
  getCustomer,
  createCustomer,
  updateCustomer,
  //deleteCustomer,
} from "../controllers/customers.controller.js";

const router = Router();

router.get("/api/customers", getCustomers);
router.get("/api/customers/:cedula_nit", getCustomer);
router.post("/api/customers", createCustomer);
/* se usa patch en lugar de put para poder actualizar algunos datos o todos */
router.patch("/api/customers/:id", updateCustomer);
//router.delete("/api/customers/:id", deleteCustomer);

export default router;
