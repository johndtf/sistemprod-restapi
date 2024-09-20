// permissions.controller.js

import { pool } from "../db.js";

export const getPermissionsByProfile = async (req, res) => {
  const perfil = req.params.perfil;

  try {
    // Realiza una consulta a la base de datos para obtener los nombres de los permisos del perfil
    const [result] = await pool.query(
      "SELECT p.nombre_permiso FROM permisos_perfiles pp JOIN permisos p ON pp.permiso = p.id_permisos WHERE pp.perfil = ?",
      [perfil]
    );

    const permisos = result.map((row) => row.nombre_permiso);

    // Envía los permisos al frontend
    res.json({ permisos });
  } catch (error) {
    console.error("Error al obtener permisos del perfil:", error);
    res.status(500).json({ error: "Error al obtener permisos del perfil" });
  }
};

export const updatePermissionsByProfile = async (req, res) => {
  const { perfil, permisos } = req.body;

  try {
    // Elimina los permisos existentes para el perfil
    await pool.query("DELETE FROM permisos_perfiles WHERE perfil = ?", [
      perfil,
    ]);

    // Inserta los nuevos permisos para el perfil
    for (const permiso of permisos) {
      await pool.query(
        "INSERT INTO permisos_perfiles (perfil, permiso) VALUES (?, (SELECT id_permisos FROM permisos WHERE nombre_permiso = ?))",
        [perfil, permiso]
      );
    }

    res.json({ message: "Permisos actualizados con éxito" });
  } catch (error) {
    console.error("Error al actualizar permisos:", error);
    res.status(500).json({ error: "Error al actualizar permisos" });
  }
};
