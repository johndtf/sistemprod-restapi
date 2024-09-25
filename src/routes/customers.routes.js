import { Router } from "express";
import {
  getCustomers,
  getCustomer,
  createCustomer,
  updateCustomer,
  updateData,
  getCompany,
} from "../controllers/customers.controller.js";
import { verifyPermission } from "../middlewares/verifypermission.myddlewares.js";

const router = Router();

router.post("/api/customers/customerslist", getCustomers);
router.get("/api/customers/company", getCompany);
router.patch(
  "/api/customers/updatedata",
  verifyPermission("empresa"),
  updateData
); //ruta para actualizar empresa
router.get(
  "/api/customers/:cedula_nit",
  verifyPermission("empresa"),
  getCustomer
);
router.post("/api/customers", createCustomer);
/* se usa patch en lugar de put para poder actualizar algunos datos o todos */
router.patch("/api/customers/:id", updateCustomer);
//router.delete("/api/customers/:id", deleteCustomer);

export default router;
