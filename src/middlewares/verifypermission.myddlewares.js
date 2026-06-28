//verifypermission.middlewares.js
// src/middlewares/verifypermission.myddlewares.js
// Middleware para verificar el token de autorización y los permisos del empleado
import { pool } from "../db.js";
import { JWT_SECRET_KEY } from "../config.js";
import jwt from "jsonwebtoken";

export const verifyPermission = (permisoRequerido) => {
  return async (req, res, next) => {
    const headerAuth = req.headers["authorization"];
    if (!headerAuth || !headerAuth.startsWith("Bearer ")) {
      return res
        .status(401)
        .json({ message: "Token de autorización no proporcionado" });
    }
    const token = headerAuth.split(" ")[1];

    try {
      const decoded = jwt.verify(token, JWT_SECRET_KEY);

      try {
        const tienePermiso = await verificarPermisoEnBD(
          decoded.userId,
          permisoRequerido
        );
        if (!tienePermiso) {
          return res
            .status(403)
            .json({ message: "No tiene permiso para acceder a esta opción" });
        }
        req.user = decoded;
        next();
      } catch (error) {
        console.error("Error al verificar permiso en la base de datos:", error);
        return res
          .status(500)
          .json({ message: "Error interno al verificar permisos" });
      }
    } catch (error) {
      if (error.name === "TokenExpiredError") {
        return res.status(401).json({
          message: "Tu sesión ha expirado, vuelve a acceder al sistema",
        });
      }
      if (error.name === "JsonWebTokenError") {
        return res
          .status(401)
          .json({ message: "Credenciales de autenticación no válidas" });
      }
      console.error("Error al verificar el token:", error.message);
      return res.status(401).json({ message: "Error al verificar el token" });
    }
  };
};

// Función para verificar los permisos del empleado en la base de datos

/* const verificarPermisoEnBD = async (userId, permisoRequerido) => {
  try {
    const [perfilResult] = await pool.query(
      "SELECT id_perfil FROM empleados WHERE id_empleado = ?",
      [userId]
    );
    if (!perfilResult.length) return false;
    const perfilId = perfilResult[0].id_perfil;

    const [permisoResult] = await pool.query(
      "SELECT id_permisos FROM permisos WHERE nombre_permiso = ?",
      [permisoRequerido]
    );
    if (!permisoResult.length) return false;
    const permisoId = permisoResult[0].id_permisos;

    const [permisoPerfilResult] = await pool.query(
      "SELECT COUNT(*) AS count FROM permisos_perfiles WHERE perfil = ? AND permiso = ?",
      [perfilId, permisoId]
    );
    if (!permisoPerfilResult.length) return false;

    return permisoPerfilResult[0].count > 0;
  } catch (error) {
    console.error("Error al verificar permiso en la base de datos:", error);
    throw error;
  }
};
 */
const verificarPermisoEnBD = async (userId, permisoRequerido) => {
  try {
    const [result] = await pool.query(
      `SELECT COUNT(*) AS count
       FROM empleados e
       JOIN permisos_perfiles pp ON e.id_perfil = pp.perfil
       JOIN permisos p ON pp.permiso = p.id_permisos
       WHERE e.id_empleado = ? AND p.nombre_permiso = ?`,
      [userId, permisoRequerido]
    );

    if (!result.length) return false;

    return result[0].count > 0;
  } catch (error) {
    console.error("Error al verificar permiso en la base de datos:", error);
    throw error;
  }
};
