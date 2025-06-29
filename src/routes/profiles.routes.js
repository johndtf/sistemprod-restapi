import { Router } from "express";
import {
  getProfiles,
  getProfilesList,
  createProfile,
  updateProfile,
  // deleteProfile,
} from "../controllers/profiles.controller.js";

import { verifyPermission } from "../middlewares/verifypermission.myddlewares.js";

const router = Router();

// Ruta base: /api/profiles

// Buscar perfiles con filtros
router.post("/list", verifyPermission("perfiles"), getProfiles);

// Obtener lista simple de perfiles (sin filtros)
router.get("/list", getProfilesList);

// Crear perfil
router.post("/", verifyPermission("perfiles"), createProfile);

// Actualizar perfil
router.patch("/:id", verifyPermission("perfiles"), updateProfile);

// Eliminar perfil (opcional, si decides habilitarlo)
// router.delete("/:id", deleteProfile);

export default router;
