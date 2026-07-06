import { Router } from "express";
import {
  completeScraping,
  getActiveScrapingOperators,
  getScrapingRejectionReasons,
  getScrapingTire,
  rejectTireDuringScraping,
} from "../controllers/scraping.controller.js";
import { verifyPermission } from "../middlewares/verifypermission.myddlewares.js";

const router = Router();

// Todas las rutas exigen el permiso "raspado". Los catálogos se exponen desde
// este módulo para que el operario no necesite permisos administrativos.

// Lista de empleados activos disponibles como operarios.
router.get("/operators", verifyPermission("raspado"), getActiveScrapingOperators);

// Motivos de inspección permitidos para rechazar durante Raspado.
router.get(
  "/rejection-reasons",
  verifyPermission("raspado"),
  getScrapingRejectionReasons,
);

// Consulta y valida una llanta antes de habilitar el formulario.
router.get("/tires/:ticket", verifyPermission("raspado"), getScrapingTire);

// Registra un Raspado apto y mantiene el estado actual de la llanta.
router.post("/:ticket/complete", verifyPermission("raspado"), completeScraping);

// Registra el rechazo durante Raspado y cambia la llanta a RECHAZADA.
router.post(
  "/:ticket/reject",
  verifyPermission("raspado"),
  rejectTireDuringScraping,
);

export default router;
