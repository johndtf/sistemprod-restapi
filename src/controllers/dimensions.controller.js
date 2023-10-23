import { pool } from "../db.js";

//----------Listado de Dimensiones---------------------------------

export const getDimensions = async (req, res) => {
  try {
    const [rows] = await pool.query("SELECT * FROM dimensiones");
    res.json(rows);
  } catch (error) {
    return res.status(500).json({ message: "Something goes wrong" });
  }
};

//---------------Buscar Dimensión por id -----------------------
export const getDimension = async (req, res) => {
  try {
    const [rows] = await pool.query(
      "SELECT * FROM dimensiones WHERE id_dimension = ?",
      [req.params.id]
    );
    if (rows.length <= 0)
      return res.status(404).json({ message: "Dimensión no encontrada" });
    res.send(rows[0]);
  } catch (error) {
    return res.status(500).json({ message: "Something goes wrong" });
  }
};

//-----------------Crear Dimensión ---------------------------------
export const createDimension = async (req, res) => {
  try {
    const { dimension } = req.body;

    // Verificar si la dimensión ya existe
    const [existingDimensions] = await pool.query(
      "SELECT id_dimension FROM dimensiones WHERE dimension = ?",
      [dimension]
    );

    if (existingDimensions.length > 0) {
      // La dimensión ya existe, responder con un mensaje de error
      return res.status(400).json({ message: "La dimensión ya existe" });
    }

    // La dimensión no existe, proceder a la inserción
    const [rows] = await pool.query(
      "INSERT INTO dimensiones(dimension) VALUES (?)",
      [dimension]
    );

    res.send({ id: rows.insertId, dimension });
  } catch (error) {
    return res.status(500).json({ message: "Something goes wrong" });
  }
};

//------------------Actualizar Dimensión ----------------------------
export const updateDimension = async (req, res) => {
  try {
    const { id } = req.params;
    const { dimension } = req.body;

    const [result] = await pool.query(
      "UPDATE dimensiones SET dimension = IFNULL(?, dimension) WHERE id_dimension = ?",
      [dimension, id]
      /* IFNULL se usa junto con la petición PATCH, si no le pasa valor lo deja como estaba */
    );

    console.log(result);

    if (result.affectedRows <= 0)
      return res.status(404).json({ message: "Dimension not found" });

    const [rows] = await pool.query(
      "SELECT * FROM dimensiones WHERE id_dimension = ?",
      [id]
    );

    res.json(rows[0]);
  } catch (error) {
    return res.status(500).json({ message: "Something goes wrong" });
  }
};

//--------------------Borrar Dimensión ----------------------------------
export const deleteDimension = async (req, res) => {
  try {
    const [result] = await pool.query(
      "DELETE FROM dimensiones WHERE id_dimension = ?",
      [req.params.id]
    );
    if (result.affectedRows <= 0)
      return res.status(404).json({ message: "Dimension not found" });

    res.sendStatus(204);
  } catch (error) {
    return res.status(500).json({ message: "Something goes wrong" });
  }
};
