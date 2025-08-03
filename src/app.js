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
app.use("/api/resolutions-insp", resolutionsInspRoutes);
app.use("/api/resolutions-warranty", resolutionsWarrantyRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/permissions", permissionsRoutes);
app.use("/api/orders", ordersRoutes);

// Middleware para rutas no encontradas
app.use((req, res) => {
  res.status(404).json({ message: "Endpoint not found" });
});

export default app;
