import express from "express";
import indexRoutes from "./routes/index.routes.js";
import profilesRoutes from "./routes/profiles.routes.js";
import employeesRoutes from "./routes/employees.routes.js";
import customersRoutes from "./routes/customers.routes.js";
import brandsRoutes from "./routes/brands.routes.js";
import dimensionsRoutes from "./routes/dimensions.routes.js";
import treadsRoutes from "./routes/treads.routes.js";
import resolutionsInspRoutes from "./routes/resolutionsInsp.routes.js";
import resolutionsWarrantyRoutes from "./routes/resolutionsWarranty.routes.js";
import cors from "cors";

const app = express();

// para que entienda la información de tipo json que llega
app.use(express.json());

// Configurar CORS para permitir el acceso desde múltiples dominios, en este caso desde el servidor local de vscode que levanta con Go Live para desarrollo

const allowedOrigins = ["otradireccion", "http://127.0.0.1:5501"];
const corsOptions = {
  origin: allowedOrigins,
  optionsSuccessStatus: 200, // Algunos navegadores antiguos pueden requerir esto
};

app.use(cors(corsOptions));

app.use(indexRoutes);
app.use(profilesRoutes);
app.use(employeesRoutes);
app.use(customersRoutes);
app.use(brandsRoutes);
app.use(dimensionsRoutes);
app.use(treadsRoutes);
app.use(resolutionsInspRoutes);
app.use(resolutionsWarrantyRoutes);

/* Manejo de rutas que no existen */
app.use((req, res, next) => {
  res.status(404).json({ message: "Endpoint not found" });
});

export default app;
