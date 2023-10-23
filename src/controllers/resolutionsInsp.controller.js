import { pool } from "../db.js";

//----------Listado de Resoluciones de inspección---------------------------------

export const getResolutionsInsp = async (req, res) => {
  try {
    const [rows] = await pool.query("SELECT * FROM resoluciones_i");
    res.json(rows);
  } catch (error) {
    return res.status(500).json({ message: "Something goes wrong" });
  }
};

//---------------Buscar Resoluciones de inspección por id -----------------------
export const getResolutionInsp = async (req, res) => {
  try {
    const [rows] = await pool.query(
      "SELECT * FROM resoluciones_i WHERE id_inspec = ?",
      [req.params.id]
    );
    if (rows.length <= 0)
      return res.status(404).json({ message: "Resolución no encontrada" });
    res.send(rows[0]);
  } catch (error) {
    return res.status(500).json({ message: "Something goes wrong" });
  }
};

//-----------------Crear Resoluciones de inspección ---------------------------------
export const createResolutionInsp = async (req, res) => {
  try {
    const { resol_inspec } = req.body;

    // Verificar si la resolución ya existe
    const [existingResolutionsInsp] = await pool.query(
      "SELECT id_inspec FROM resoluciones_i WHERE resol_inspec = ?",
      [resol_inspec]
    );

    if (existingResolutionsInsp.length > 0) {
      // La resolución ya existe, responder con un mensaje de error
      return res.status(400).json({ message: "La resolución ya existe" });
    }

    // La resolución no existe, proceder a la inserción
    const [rows] = await pool.query(
      "INSERT INTO resoluciones_i(resol_inspec) VALUES (?)",
      [resol_inspec]
    );

    res.send({ id: rows.insertId, resol_inspec });
  } catch (error) {
    console.error("Error en resolutionInsp:", error);
    return res.status(500).json({ message: "Something goes wrong" });
  }
};

//------------------Actualizar Resoluciones de inspección ----------------------------
export const updateResolutionInsp = async (req, res) => {
  try {
    const { id } = req.params;
    const { resol_inspec } = req.body;

    const [result] = await pool.query(
      "UPDATE resoluciones_i SET resol_inspec = IFNULL(?, resol_inspec) WHERE id_inspec = ?",
      [resol_inspec, id]
      /* IFNULL se usa junto con la petición PATCH, si no le pasa valor lo deja como estaba */
    );

    console.log(result);

    if (result.affectedRows <= 0)
      return res
        .status(404)
        .json({ message: "Inspection Resolution not found" });

    const [rows] = await pool.query(
      "SELECT * FROM resoluciones_i WHERE id_inspec = ?",
      [id]
    );

    res.json(rows[0]);
  } catch (error) {
    return res.status(500).json({ message: "Something goes wrong" });
  }
};

//--------------------Borrar Resoluciones de inspección -------------------------------
export const deleteResolutionInsp = async (req, res) => {
  try {
    const [result] = await pool.query(
      "DELETE FROM resoluciones_i WHERE id_inspec = ?",
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
};
