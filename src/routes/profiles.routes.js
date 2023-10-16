import { Router } from "express";
import {
  getProfiles,
  getProfile,
  createProfile,
  updateProfile,
  deleteProfile,
} from "../controllers/profiles.controller.js";

const router = Router();

router.get("/profiles", getProfiles);
router.get("/profiles/:id", getProfile);
router.post("/profiles", createProfile);
/* se usa patch en lugar de put para poder actualizar algunos datos o todos */
router.patch("/profiles/:id", updateProfile);
router.delete("/profiles/:id", deleteProfile);

export default router;
