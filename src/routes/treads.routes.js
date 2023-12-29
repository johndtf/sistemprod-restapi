import { Router } from "express";
import {
  getTreads,
  //getTread,
  createTread,
  updateTread,
  /*  deleteTread, */
} from "../controllers/treads.controller.js";

const router = Router();

router.post("/api/treads/treadslist", getTreads);
//router.get("/api/treads/:banda", getTread);
router.post("/api/treads", createTread);
/* se usa patch en lugar de put para poder actualizar algunos datos o todos */
router.patch("/api/treads/:id", updateTread);
/* router.delete("/api/treads/:id", deleteTread); */

export default router;
