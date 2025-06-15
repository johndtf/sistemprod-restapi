import { Router } from "express";
import {
  getBrands,
  getListBrands,
  createBrand,
  updateBrand,
  //deleteBrand,
} from "../controllers/brands.controller.js";
import { verifyPermission } from "../middlewares/verifypermission.myddlewares.js";

const router = Router();

router.post("/api/brands/brandslist", verifyPermission("marcas"), getBrands);
router.get("/api/brands/brandslist", getListBrands);
router.post("/api/brands", verifyPermission("marcas"), createBrand);
/* se usa patch en lugar de put para poder actualizar algunos datos o todos */
router.patch("/api/brands/:id", verifyPermission("marcas"), updateBrand);
//router.delete("/api/brands/:id", deleteBrand);

export default router;
