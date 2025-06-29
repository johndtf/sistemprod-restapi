// Este archivo define las rutas de autenticación para el sistema.
import { Router } from "express";
import {
  login,
  recoverPassword,
  resetPassword,
  validateToken,
} from "../controllers/auth.controller.js";

const router = Router();

// Ruta base: /api/auth
router.post("/login", login);
router.post("/recover-password", recoverPassword);
router.post("/reset-password", resetPassword);
router.post("/validate-token", validateToken);

export default router;

// Nota: Las rutas de autenticación no requieren verificación de permisos,
// ya que son accesibles para cualquier usuario que intente autenticarse o recuperar su contraseña.
