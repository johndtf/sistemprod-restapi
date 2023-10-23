import { Router } from "express";
import {
  getBrands,
  getBrand,
  createBrand,
  updateBrand,
  deleteBrand,
} from "../controllers/brands.controller.js";

const router = Router();

router.get("/brands", getBrands);
router.get("/brands/:id", getBrand);
router.post("/brands", createBrand);
/* se usa patch en lugar de put para poder actualizar algunos datos o todos */
router.patch("/brands/:id", updateBrand);
router.delete("/brands/:id", deleteBrand);

export default router;