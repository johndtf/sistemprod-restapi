import { Router } from "express";
import {
  completeRejectedDelivery,
  getRejectedDeliveryCatalogs,
  getRejectedDeliveryReport,
  getRejectedDeliveryTire,
  listRejectedDeliveryBlock,
} from "../controllers/rejectedDeliveries.controller.js";
import { verifyPermission } from "../middlewares/verifypermission.myddlewares.js";

const router = Router();

// "entregar" ya representa el permiso del catalogo para entregar rechazos a
// cliente. Se mantiene separado de salidasrechazos, que mueve P -> B.
router.get("/catalogs", verifyPermission("entregar"), getRejectedDeliveryCatalogs);
router.get("/reports/:documento", verifyPermission("entregar"), getRejectedDeliveryReport);
router.get("/tires/:ticket", verifyPermission("entregar"), getRejectedDeliveryTire);
router.get("/block", verifyPermission("entregar"), listRejectedDeliveryBlock);
router.post("/complete", verifyPermission("entregar"), completeRejectedDelivery);

export default router;
