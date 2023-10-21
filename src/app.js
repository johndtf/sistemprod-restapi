import express from "express";
import indexRoutes from "./routes/index.routes.js";
import profilesRoutes from "./routes/profiles.routes.js";
import employeesRoutes from "./routes/employees.routes.js";

const app = express();
// para que entienda la información de tipo json que le llega del cliente
app.use(express.json());

app.use(indexRoutes);
app.use(profilesRoutes);
app.use(employeesRoutes);

/* Manejo de rutas que no existen */
app.use((req, res, next) => {
  res.status(404).json({ message: "endpoint not found" });
});

export default app;
