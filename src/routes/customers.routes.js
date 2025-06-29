import { Router } from "express";
import {
  getCustomers,
  getCustomer,
  createCustomer,
  updateCustomer,
  updateData,
  getCompany,
  searchCustomers,
} from "../controllers/customers.controller.js";

import { verifyPermission } from "../middlewares/verifypermission.myddlewares.js";

const router = Router();

// Buscar clientes por nombre/cédula (Tom Select)
router.get("/search", verifyPermission("ordenes"), searchCustomers);

// Listado general de clientes
router.post("/customerslist", verifyPermission("clientes"), getCustomers);

// Obtener info de la empresa
router.get("/company", getCompany);

// Actualizar info de la empresa
router.patch("/updatedata", verifyPermission("empresa"), updateData);

// Obtener cliente por cédula/nit
router.get("/:cedula_nit", verifyPermission("empresa"), getCustomer);

// Crear nuevo cliente
router.post("/", verifyPermission("clientes"), createCustomer);

// Modificar cliente existente
router.patch("/:id", verifyPermission("clientes"), updateCustomer);

// (Eliminación comentada por ahora)
// router.delete("/:id", deleteCustomer);

export default router;
