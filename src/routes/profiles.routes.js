import { Router } from "express";
import {
  getProfiles,
  getProfile,
  createProfile,
  updateProfile,
  deleteProfile,
} from "../controllers/profiles.controller.js";

const router = Router();

router.get("/api/profiles", getProfiles);
router.get("/api/profiles/:id", getProfile);
router.post("/api/profiles", createProfile);
/* se usa patch en lugar de put para poder actualizar algunos datos o todos */
router.patch("/api/profiles/:id", updateProfile);
//router.delete("/api/profiles/:id", deleteProfile);

export default router;
