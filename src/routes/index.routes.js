import { Router } from "express";
import { ping } from "../controllers/index.controller.js";

const router = Router();

router.get("/ping", ping);
/* como se exporta por default, se puede poner otro nombre donde se importa */
export default router;
