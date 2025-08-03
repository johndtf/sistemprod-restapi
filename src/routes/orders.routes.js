import { Router } from "express";
import {
  getLastOrder,
  createOrder,
  getOrderByNumber,
  addTireToOrder,
  updateTireInOrder,
  reassignMultipleTires,
  updateOrder,
  // getAllOrders, // si se decide implementarlo
} from "../controllers/orders.controller.js";

import { verifyPermission } from "../middlewares/verifypermission.myddlewares.js";

const router = Router();

// Ruta base: /api/orders

// Obtener la última orden ingresada
router.get("/last", verifyPermission("ordenes"), getLastOrder);

// Buscar orden por número (puede ampliarse a búsqueda avanzada)
router.get("/:numeroOrden", verifyPermission("ordenes"), getOrderByNumber);

// Crear una nueva orden
router.post("/", verifyPermission("ordenes"), createOrder);

// Agregar una llanta a una orden
router.post("/:numeroOrden/tires", verifyPermission("ordenes"), addTireToOrder);

// Modificar una llanta de una orden
router.patch(
  "/tires/:idLlanta",
  verifyPermission("ordenes"),
  updateTireInOrder
);

// Reasignar llanta a otra orden
router.patch(
  "/reassign-tires",
  verifyPermission("ordenes"),
  reassignMultipleTires
);

// Modificar una orden (actualizar fecha, cliente etc.)
router.patch("/:id", verifyPermission("ordenes"), updateOrder);

export default router;
