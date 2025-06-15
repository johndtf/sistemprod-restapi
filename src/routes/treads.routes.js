import { Router } from "express";
import {
  getTreads,
  getListTreads,
  createTread,
  updateTread,
  /*  deleteTread, */
} from "../controllers/treads.controller.js";
import { verifyPermission } from "../middlewares/verifypermission.myddlewares.js";

const router = Router();

router.post("/api/treads/treadslist", verifyPermission("disenios"), getTreads);
router.get("/api/treads/treadlist", getListTreads);
router.post("/api/treads", verifyPermission("disenios"), createTread);
/* se usa patch en lugar de put para poder actualizar algunos datos o todos */
router.patch("/api/treads/:id", verifyPermission("disenios"), updateTread);
/* router.delete("/api/treads/:id", deleteTread); */

export default router;
