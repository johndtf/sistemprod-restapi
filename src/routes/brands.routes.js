import { Router } from "express";
import {
  getBrands,
  //getBrand,
  createBrand,
  updateBrand,
  //deleteBrand,
} from "../controllers/brands.controller.js";

const router = Router();

router.post("/api/brands/brandslist", getBrands);
//router.get("/api/brands/:marca", getBrand);
router.post("/api/brands", createBrand);
/* se usa patch en lugar de put para poder actualizar algunos datos o todos */
router.patch("/api/brands/:id", updateBrand);
//router.delete("/api/brands/:id", deleteBrand);

export default router;
