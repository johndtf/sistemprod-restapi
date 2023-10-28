import { Router } from "express";
import {
  getTreads,
  getTread,
  createTread,
  updateTread,
  /*  deleteTread, */
} from "../controllers/treads.controller.js";

const router = Router();

router.get("/treads", getTreads);
router.get("/treads/:id", getTread);
router.post("/treads", createTread);
/* se usa patch en lugar de put para poder actualizar algunos datos o todos */
router.patch("/treads/:id", updateTread);
/* router.delete("/treads/:id", deleteTread); */

export default router;
