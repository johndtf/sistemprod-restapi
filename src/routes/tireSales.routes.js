import { Router } from "express";
import {
  completeTireSale,
  getTireForSale,
  getTireSaleCatalogs,
  getTireSaleReport,
  listWarehouseTiresForSale,
} from "../controllers/tireSales.controller.js";
import { verifyPermission } from "../middlewares/verifypermission.myddlewares.js";

const router = Router();

// El permiso de Facturacion Procesadas ya existia en los perfiles y representa
// la actualizacion de la factura contable dentro del flujo de ventas.
router.get("/catalogs", verifyPermission("facturacion"), getTireSaleCatalogs);
router.get("/reports/:factura", verifyPermission("facturacion"), getTireSaleReport);
router.get("/tires/:ticket", verifyPermission("facturacion"), getTireForSale);
router.get("/block", verifyPermission("facturacion"), listWarehouseTiresForSale);
router.post("/complete", verifyPermission("facturacion"), completeTireSale);

export default router;
