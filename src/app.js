import express from "express";
// import cookieParser from "cookie-parser";
import cors from "cors";

// Importar rutas por módulo
import indexRoutes from "./routes/index.routes.js";
import profilesRoutes from "./routes/profiles.routes.js";
import employeesRoutes from "./routes/employees.routes.js";
import customersRoutes from "./routes/customers.routes.js";
import brandsRoutes from "./routes/brands.routes.js";
import dimensionsRoutes from "./routes/dimensions.routes.js";
import treadsRoutes from "./routes/treads.routes.js";
import resolutionsInspRoutes from "./routes/resolutionsInsp.routes.js";
import resolutionsWarrantyRoutes from "./routes/resolutionsWarranty.routes.js";
import authRoutes from "./routes/auth.routes.js";
import permissionsRoutes from "./routes/permissions.routes.js";
import ordersRoutes from "./routes/orders.routes.js";
import initialInspectionRoutes from "./routes/initialInspection.routes.js";
import tiresRoutes from "./routes/tires.routes.js";
import scrapingRoutes from "./routes/scraping.routes.js";
import preparationRoutes from "./routes/preparation.routes.js";
import repairsCatalogRoutes from "./routes/repairsCatalog.routes.js";
import repairRoutes from "./routes/repair.routes.js";
import fillingRoutes from "./routes/filling.routes.js";
import plantParametersRoutes from "./routes/plantParameters.routes.js";
import treadCutRoutes from "./routes/treadCut.routes.js";
import bandingRoutes from "./routes/banding.routes.js";
import vulcanizationRoutes from "./routes/vulcanization.routes.js";
import finalInspectionRoutes from "./routes/finalInspection.routes.js";
import terminationRoutes from "./routes/termination.routes.js";
import treadWeightsRoutes from "./routes/treadWeights.routes.js";
import processedOutputsRoutes from "./routes/processedOutputs.routes.js";
import warehousesRoutes from "./routes/warehouses.routes.js";

const app = express();

// Middleware para parsear JSON
app.use(express.json());

// CORS para desarrollo
const allowedOrigins = ["otradireccion", "http://127.0.0.1:5501"];
const corsOptions = {
  origin: allowedOrigins,
  credentials: true,
  optionsSuccessStatus: 200,
};
app.use(cors(corsOptions));

// Montar rutas con prefijos REST
app.use("/api", indexRoutes); // rutas generales
app.use("/api/profiles", profilesRoutes);
app.use("/api/employees", employeesRoutes);
app.use("/api/customers", customersRoutes);
app.use("/api/brands", brandsRoutes);
app.use("/api/dimensions", dimensionsRoutes);
app.use("/api/treads", treadsRoutes);
app.use("/api/resolutionsInsp", resolutionsInspRoutes);
app.use("/api/resolutionsWarranty", resolutionsWarrantyRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/permisos", permissionsRoutes);
app.use("/api/orders", ordersRoutes);
app.use("/api/initialInspection", initialInspectionRoutes);
app.use("/api/tires", tiresRoutes);
app.use("/api/scraping", scrapingRoutes);
app.use("/api/preparation", preparationRoutes);
app.use("/api/repairs", repairsCatalogRoutes);
app.use("/api/repair", repairRoutes);
app.use("/api/filling", fillingRoutes);
app.use("/api/plant-parameters", plantParametersRoutes);
app.use("/api/tread-cut", treadCutRoutes);
app.use("/api/banding", bandingRoutes);
app.use("/api/vulcanization", vulcanizationRoutes);
app.use("/api/final-inspection", finalInspectionRoutes);
app.use("/api/termination", terminationRoutes);
app.use("/api/tread-weights", treadWeightsRoutes);
// Catalogos y salidas se mantienen separados: Bodegas puede administrarse sin
// conceder permiso para mover llantas fuera de planta.
app.use("/api/processed-outputs", processedOutputsRoutes);
app.use("/api/warehouses", warehousesRoutes);

// Middleware para rutas no encontradas
app.use((req, res) => {
  res.status(404).json({ message: "Endpoint not found" });
});

export default app;
