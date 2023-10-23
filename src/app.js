import express from "express";
import indexRoutes from "./routes/index.routes.js";
import profilesRoutes from "./routes/profiles.routes.js";
import employeesRoutes from "./routes/employees.routes.js";
import customersRoutes from "./routes/customers.routes.js";
import brandsRoutes from "./routes/brands.routes.js";
import dimensionsRoutes from "./routes/dimensions.routes.js";
import treadsRoutes from "./routes/treads.routes.js";
import resolutionsInspRoutes from "./routes/resolutionsInsp.routes.js"

const app = express();
// para que entienda la información de tipo json que llega
app.use(express.json());

app.use(indexRoutes);
app.use(profilesRoutes);
app.use(employeesRoutes);
app.use(customersRoutes);
app.use(brandsRoutes);
app.use(dimensionsRoutes);
app.use(treadsRoutes);
app.use(resolutionsInspRoutes);

/* Manejo de rutas que no existen */
app.use((req, res, next) => {
  res.status(404).json({ message: "Endpoint not found" });
});

export default app;
