import { Router } from "express";
import {
  getCustomers,
  getCustomer,
  createCustomer,
  updateCustomer,
  //deleteCustomer,
} from "../controllers/customers.controller.js";

const router = Router();

router.get("/customers", getCustomers);
router.get("/customers/:cedula_nit", getCustomer);
router.post("/customers", createCustomer);
/* se usa patch en lugar de put para poder actualizar algunos datos o todos */
router.patch("/customers/:id", updateCustomer);
//router.delete("/customers/:id", deleteCustomer);

export default router;
