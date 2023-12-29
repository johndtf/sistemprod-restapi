import { pool } from "../db.js";

//----------Listado de Bandas---------------------------------

export const getTreads = async (req, res) => {
  try {
    const { banda } = req.body;
    const [rows] = await pool.query("SELECT * FROM bandas WHERE banda LIKE ?", [
      `%${banda}%`,
    ]);
    res.json(rows);
  } catch (error) {
    return res.status(500).json({ message: "Something goes wrong" });
  }
};

//---------------Buscar Banda por descripción -----------------------
/* export const getTread = async (req, res) => {
  try {
    const [rows] = await pool.query("SELECT * FROM bandas WHERE banda = ?", [
      req.params.banda,
    ]);
    if (rows.length <= 0)
      return res.status(404).json({ message: "Banda no encontrada" });
    res.send(rows[0]);
  } catch (error) {
    return res.status(500).json({ message: "Something goes wrong" });
  }
}; */

//-----------------Crear Banda ---------------------------------
export const createTread = async (req, res) => {
  try {
    const { banda } = req.body;

    //Validar tamaño de la banda
    if (banda.length < 2 || banda.length > 20) {
      return res.status(400).json({
        message: "La banda debe tener entre 2 y 20 caracteres",
      });
    }

    // Verificar si la Banda ya existe
    const [existingTreads] = await pool.query(
      "SELECT id_banda FROM bandas WHERE banda = ?",
      [banda]
    );

    if (existingTreads.length > 0) {
      // La Banda ya existe, responder con un mensaje de error
      return res.status(400).json({ message: "La Banda ya existe" });
    }

    // La Banda no existe, proceder a la inserción
    const [rows] = await pool.query("INSERT INTO bandas(banda) VALUES (?)", [
      banda,
    ]);

    res.send({ id: rows.insertId, banda });
  } catch (error) {
    return res.status(500).json({ message: "Something goes wrong" });
  }
};

//------------------Actualizar Banda ----------------------------
export const updateTread = async (req, res) => {
  try {
    const { id } = req.params;
    const { banda } = req.body;

    //Validar tamaño de la banda
    if (banda.length < 2 || banda.length > 20) {
      return res.status(400).json({
        message: "La banda debe tener entre 2 y 20 caracteres",
      });
    }

    //Verificar si el id de la banda existe
    const [existingTreadId] = await pool.query(
      "SELECT * FROM bandas WHERE id_banda = ?",
      [id]
    );

    if (existingTreadId.length === 0) {
      // La banda a actualizar no existe, responder con un mensaje de error
      return res.status(404).json({ message: "Banda no encontrada" });
    }

    //Verificar que la banda modificada no exista en la tabla
    const [existingTreadName] = await pool.query(
      "SELECT id_banda FROM bandas WHERE banda = ? AND id_banda != ?",
      [banda, id]
    );
    //Si la banda modificada está siendo usada por otro registro genera mensaje de error
    if (existingTreadName.length > 0) {
      return res
        .status(400)
        .json({ message: "Este nombre ya está asociado a otra banda" });
    }

    //Realiza la actualización en la tabla bandas
    const [result] = await pool.query(
      "UPDATE bandas SET banda = IFNULL(?, banda) WHERE id_banda = ?",
      [banda, id]
      /* IFNULL se usa junto con la petición PATCH, si no le pasa valor lo deja como estaba */
    );

    //Hace la busqueda del registro modificado para mostrarlo como respuesta;

    const [rows] = await pool.query("SELECT * FROM bandas WHERE id_banda = ?", [
      id,
    ]);

    res.json(rows[0]);
  } catch (error) {
    return res.status(500).json({ message: "Something goes wrong" });
  }
};

//--------------------Borrar Banda ----------------------------------
/* export const deleteTread = async (req, res) => {
  try {
    const [result] = await pool.query("DELETE FROM bandas WHERE id_banda = ?", [
      req.params.id,
    ]);
    if (result.affectedRows <= 0)
      return res.status(404).json({ message: "Tread not found" });

    res.sendStatus(204);
  } catch (error) {
    return res.status(500).json({ message: "Something goes wrong" });
  }
}; */
