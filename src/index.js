import express from "express";
import profilesRoutes from "./routes/profiles.routes.js";
import indexRoutes from "./routes/index.routes.js";

const app = express();
// para que entienda la información de tipo json que le llega del cliente
app.use(express.json());

app.use(indexRoutes);
app.use(profilesRoutes);

/* Manejo de rutas que no existen */
app.use((req, res, next) => {
  res.status(404).json({ message: "endpoint not found" });
});

app.listen(3000);
console.log("Server running on port 3000");
