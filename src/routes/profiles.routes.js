import { Router } from "express";
import {
  getProfiles,
  getProfilesList,
  createProfile,
  updateProfile,
  //deleteProfile,
} from "../controllers/profiles.controller.js";
import { verifyPermission } from "../middlewares/verifypermission.myddlewares.js";

const router = Router();

router.post(
  "/api/profiles/profileslist",
  verifyPermission("perfiles"),
  getProfiles
);
router.get("/api/profiles/list", getProfilesList);
router.post("/api/profiles", verifyPermission("perfiles"), createProfile);
/* se usa patch en lugar de put para poder actualizar algunos datos o todos */
router.patch("/api/profiles/:id", verifyPermission("perfiles"), updateProfile);
//router.delete("/api/profiles/:id", deleteProfile);

export default router;
