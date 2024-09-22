// Middleware para verificar el token de autorización y los permisos del empleado
import { pool } from "../db.js";
import { JWT_SECRET_KEY } from "../config.js";
import jwt from "jsonwebtoken";

export const verifyPermission = (permisoRequerido) => {
  return async (req, res, next) => {
    // Obtener la cabecera de autorización
    const headerAuth = req.headers["authorization"];

    // Verificar si la cabecera de autorización está presente y tiene el formato correcto
    if (headerAuth && headerAuth.startsWith("Bearer ")) {
      // Extraer el token JWT de la cabecera de autorización
      const token = headerAuth.split(" ")[1];

      try {
        // Verificar y decodificar el token JWT
        const decoded = jwt.verify(token, JWT_SECRET_KEY);

        // Verificar si el usuario tiene permiso para acceder a la opción requerida de forma asíncrona
        const tienePermiso = await verificarPermisoEnBD(
          decoded.userId,
          permisoRequerido
        );

        if (tienePermiso) {
          // Almacenar la información del usuario en el objeto de solicitud para su uso posterior
          req.user = decoded;

          // Pasar al siguiente middleware o ruta
          next();
        } else {
          // Si el usuario no tiene permiso, responder con un código de estado 403 (Prohibido)
          //console.log("No tiene permiso.");
          res
            .status(403)
            .json({ message: "No tiene permiso para acceder a esta opción" });
        }
      } catch (error) {
        // Si el token no es válido, responder deacuerdo a la causa

        if (error.name === "TokenExpiredError") {
          res
            .status(401)
            .json({
              message: "Tu sesión ha expirado, vuelve a acceder al sistema",
            });
        } else if (error.name === "JsonWebTokenError") {
          res
            .status(401)
            .json({ message: "Credenciales de autenticación no validas" });
        } else {
          console.log("Error al verificar el token:", error.message);
        }
      }
    } else {
      // Si no se proporciona la cabecera de autorización, responder con un código de estado 401 (No autorizado)
      res
        .status(401)
        .json({ message: "Token de autorización no proporcionado" });
    }
  };
};

// Función para verificar los permisos del empleado en la base de datos

const verificarPermisoEnBD = async (userId, permisoRequerido) => {
  try {
    // Obtener el ID del perfil del empleado a partir de su ID de empleado
    const [perfilResult] = await pool.query(
      "SELECT id_perfil FROM empleados WHERE id_empleado = ?",
      [userId]
    );

    const perfilId = perfilResult[0].id_perfil;

    // Obtener el ID del permiso requerido a partir de su nombre_permiso
    const [permisoResult] = await pool.query(
      "SELECT id_permisos FROM permisos WHERE nombre_permiso = ?",
      [permisoRequerido]
    );

    const permisoId = permisoResult[0].id_permisos;

    // Consultar la tabla permisos_perfiles para verificar si el perfil tiene el permiso requerido
    const [permisoPerfilResult] = await pool.query(
      "SELECT COUNT(*) AS count FROM permisos_perfiles WHERE perfil = ? AND permiso = ?",
      [perfilId, permisoId]
    );

    const tienePermiso = permisoPerfilResult[0].count > 0;

    return tienePermiso;
  } catch (error) {
    console.error("Error al verificar permiso en la base de datos:", error);
    throw error; // manejo de error
  }
};
