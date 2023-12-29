import { Router } from "express";
import {
  getProfiles,
  getProfilesList,
  createProfile,
  updateProfile,
  //deleteProfile,
} from "../controllers/profiles.controller.js";

const router = Router();

router.post("/api/profiles/profileslist", getProfiles);
router.get("/api/profiles/list", getProfilesList);
router.post("/api/profiles", createProfile);
/* se usa patch en lugar de put para poder actualizar algunos datos o todos */
router.patch("/api/profiles/:id", updateProfile);
//router.delete("/api/profiles/:id", deleteProfile);

export default router;
