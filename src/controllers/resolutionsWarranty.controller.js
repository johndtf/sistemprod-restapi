import { pool } from "../db.js";

//----------Listado de Resoluciones de garantías---------------------------------

export const getResolutionsWarranty = async (req, res) => {
  try {
    const [rows] = await pool.query("SELECT * FROM resoluciones_g");
    res.json(rows);
  } catch (error) {
    return res.status(500).json({ message: "Something goes wrong" });
  }
};

//---------------Buscar Resoluciones de garantías por código -----------------------
export const getResolutionWarranty = async (req, res) => {
  try {
    const [rows] = await pool.query(
      "SELECT * FROM resoluciones_g WHERE codigo = ?",
      [req.params.codigo]
    );
    if (rows.length <= 0)
      return res.status(404).json({ message: "Resolución no encontrada" });
    res.send(rows[0]);
  } catch (error) {
    return res.status(500).json({ message: "Something goes wrong" });
  }
};

//-----------------Crear Resoluciones de garantías ---------------------------------
export const createResolutionWarranty = async (req, res) => {
  try {
    const { resol_garan, codigo } = req.body;

    // Verificar si la resolución ya existe
    const [existingResolutionsWarranty] = await pool.query(
      "SELECT id_resol_g FROM resoluciones_g WHERE resol_garan = ?",
      [resol_garan]
    );

    if (existingResolutionsWarranty.length > 0) {
      // La resolución ya existe, responder con un mensaje de error
      return res.status(400).json({ message: "La resolución ya existe" });
    }

    // Verificar si el código de la resolución ya existe
    const [existingResolutionsCode] = await pool.query(
      "SELECT id_resol_g FROM resoluciones_g WHERE codigo = ?",
      [codigo]
    );

    if (existingResolutionsCode.length > 0) {
      // El código ya existe, responder con un mensaje de error
      return res
        .status(400)
        .json({ message: "El código de la resolución ya existe" });
    }

    // La resolución no existe, proceder a la inserción
    const [rows] = await pool.query(
      "INSERT INTO resoluciones_g(resol_garan, codigo) VALUES (?, ?)",
      [resol_garan, codigo]
    );

    res.send({ id: rows.insertId, codigo, resol_garan });
  } catch (error) {
    console.error("Error en resolutionWarranty:", error);
    return res.status(500).json({ message: "Something goes wrong" });
  }
};

//------------------Actualizar Resoluciones de garantías ----------------------------
export const updateResolutionWarranty = async (req, res) => {
  try {
    const { id } = req.params;
    const { resol_garan, codigo } = req.body;

    //Verificar si el id de la resolución existe
    const [existingResolutionId] = await pool.query(
      "SELECT * FROM resoluciones_g WHERE id_resol_g = ?",
      [id]
    );

    if (existingResolutionId.length === 0) {
      //El id de la resolución de garantías no existe, se responde con un mensaje de error
      return res
        .status(404)
        .json({ message: "Resolución de Garantías no encontrada" });
    }

    //Verificar que la resolución modificada no exista en la tabla
    const [existingResolutionName] = await pool.query(
      "SELECT id_resol_g FROM resoluciones_g WHERE resol_garan = ? AND id_resol_g != ?",
      [resol_garan, id]
    );

    //Si esta descripción de resolución está siendo usada por otra resolución, genera mensaje de error

    if (existingResolutionName.length > 0) {
      return res
        .status(400)
        .json({ message: "Esta resolución de garantías ya existe" });
    }

    //Verificar que el código de la resolución modificada no exista en la tabla
    const [existingResolutionCode] = await pool.query(
      "SELECT id_resol_g FROM resoluciones_g WHERE codigo = ? AND id_resol_g != ?",
      [codigo, id]
    );

    //Si este código de resolución está siendo usada por otra resolución, genera mensaje de error

    if (existingResolutionCode.length > 0) {
      return res
        .status(400)
        .json({ message: "Este código de resolución ya existe" });
    }

    //Realiza la actualización en la tabla resoluciones_g
    const [result] = await pool.query(
      "UPDATE resoluciones_g SET resol_garan = IFNULL(?, resol_garan), codigo = IFNULL(?, codigo) WHERE id_resol_g = ?",
      [resol_garan, codigo, id]
      /* IFNULL se usa junto con la petición PATCH, si no le pasa valor lo deja como estaba */
    );

    //Hace la busqueda del registro modificado para mostrarlo como respuesta

    const [rows] = await pool.query(
      "SELECT * FROM resoluciones_g WHERE id_resol_g = ?",
      [id]
    );

    res.json(rows[0]);
  } catch (error) {
    return res.status(500).json({ message: "Something goes wrong" });
  }
};

//--------------------Borrar Resoluciones de garantías -------------------------------
/* export const deleteResolutionWarranty = async (req, res) => {
  try {
    const [result] = await pool.query(
      "DELETE FROM resoluciones_g WHERE id_resol_g = ?",
      [req.params.id]
    );
    if (result.affectedRows <= 0)
      return res
        .status(404)
        .json({ message: "Inspection Resolution not found" });

    res.sendStatus(204);
  } catch (error) {
    return res.status(500).json({ message: "Something goes wrong" });
  }
}; */
