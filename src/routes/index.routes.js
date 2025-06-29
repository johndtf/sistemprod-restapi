import { Router } from "express";
import { ping } from "../controllers/index.controller.js";

const router = Router();

// Ruta base: /api
router.get("/ping", ping);

export default router;
// Esta ruta es un simple endpoint de prueba para verificar que el servidor está funcionando.
// se puede acceder a ella con una solicitud GET a /api/ping y debería devolver un mensaje de "pong".
// Es útil para comprobar que la API está activa y responde correctamente.
