import { Router } from "express";
import {
  completeProcessedOutput,
  getProcessedOutputCatalogs,
  getProcessedOutputPlantReport,
  getProcessedOutputTire,
  listProcessedOutputBlock,
} from "../controllers/processedOutputs.controller.js";
import { verifyPermission } from "../middlewares/verifypermission.myddlewares.js";

const router = Router();

// Todas las acciones de salida comparten el permiso: consultar disponibilidad
// y confirmar la salida son partes del mismo proceso.
router.get("/catalogs", verifyPermission("salidasprocesadas"), getProcessedOutputCatalogs);
// El reporte se declara antes de la ruta con parametro de tiquete para que la
// intencion de cada URL quede clara al leer las rutas de salidas procesadas.
router.get(
  "/reports/:documento/plant",
  verifyPermission("salidasprocesadas"),
  getProcessedOutputPlantReport,
);
router.get("/tires/:ticket", verifyPermission("salidasprocesadas"), getProcessedOutputTire);
router.get("/block", verifyPermission("salidasprocesadas"), listProcessedOutputBlock);
router.post(
  "/complete",
  verifyPermission("salidasprocesadas"),
  completeProcessedOutput,
);

export default router;
