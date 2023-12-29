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

//------------Buscar Resoluciones de inspección por código y descripción -----------
export const getResolutionInsp = async (req, res) => {
  try {
    const { codigo, resol_inspec } = req.body;
    const [rows] = await pool.query(
      "SELECT * FROM resoluciones_i WHERE codigo LIKE ? AND resol_inspec LIKE ? ",
      [`%${codigo}%`, `%${resol_inspec}%`]
    );
    res.json(rows);
  } catch (error) {
    return res.status(500).json({ message: "Something goes wrong" });
  }
};

//-----------------Crear Resoluciones de inspección ---------------------------------
export const createResolutionInsp = async (req, res) => {
  try {
    const { resol_inspec, codigo } = req.body;

    //Validar tamaño del código
    if (codigo.length < 1 || codigo.length > 2) {
      return res.status(400).json({
        message: "El código debe tener de 1 a 2 caracteres",
      });
    }

    //Validar tamaño de la resolución
    if (resol_inspec.length < 4 || resol_inspec.length > 45) {
      return res.status(400).json({
        message: "La resolución debe tener entre 4 y 45 caracteres",
      });
    }

    // Verificar si la resolución ya existe
    const [existingResolutionsInsp] = await pool.query(
      "SELECT id_inspec FROM resoluciones_i WHERE resol_inspec = ?",
      [resol_inspec]
    );

    if (existingResolutionsInsp.length > 0) {
      // La resolución ya existe, responder con un mensaje de error
      return res.status(400).json({ message: "La resolución ya existe" });
    }

    // Verificar si el código de la resolución ya existe
    const [existingResolutionsCode] = await pool.query(
      "SELECT id_inspec FROM resoluciones_i WHERE codigo = ?",
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
      "INSERT INTO resoluciones_i(resol_inspec, codigo) VALUES (?, ?)",
      [resol_inspec, codigo]
    );

    res.send({ id: rows.insertId, codigo, resol_inspec });
  } catch (error) {
    console.error("Error en resolutionInsp:", error);
    return res.status(500).json({ message: "Something goes wrong" });
  }
};

//------------------Actualizar Resoluciones de inspección ----------------------------
export const updateResolutionInsp = async (req, res) => {
  try {
    const { id } = req.params;
    const { resol_inspec, codigo } = req.body;

    //Verificar que no se intente modificar los códigos 1 y 2 "PENDIENTE" y "APTA"

    if (id <= 2) {
      //Se está intentando modificar las resoluciones Pendiente o Apta
      return res.status(400).json({
        message:
          "Las resoluciones del sistéma APTA O PENDIENTE no deben ser modificadas",
      });
    }

    //Validar tamaño del código
    if (codigo.length < 1 || codigo.length > 2) {
      return res.status(400).json({
        message: "El código debe tener de 1 a 2 caracteres",
      });
    }

    //Validar tamaño de la resolución
    if (resol_inspec.length < 4 || resol_inspec.length > 45) {
      return res.status(400).json({
        message: "La resolución debe tener entre 4 y 45 caracteres",
      });
    }
    //Verificar si el id de la resolución existe
    const [existingResolutionId] = await pool.query(
      "SELECT * FROM resoluciones_i WHERE id_inspec = ?",
      [id]
    );

    if (existingResolutionId.length === 0) {
      //El id de la resolución de inspección no existe, se responde con un mensaje de error
      return res
        .status(404)
        .json({ message: "Resolución de Inspección no encontrada" });
    }

    //Verificar que la resolución modificada no exista en la tabla
    const [existingResolutionName] = await pool.query(
      "SELECT id_inspec FROM resoluciones_i WHERE resol_inspec = ? AND id_inspec != ?",
      [resol_inspec, id]
    );

    //Si esta descripción de resolución está siendo usada por otra resolución, genera mensaje de error

    if (existingResolutionName.length > 0) {
      return res
        .status(400)
        .json({ message: "Esta resolución de inspección ya existe" });
    }

    //Verificar que el código de la resolución modificada no exista en la tabla
    const [existingResolutionCode] = await pool.query(
      "SELECT id_inspec FROM resoluciones_i WHERE codigo = ? AND id_inspec != ?",
      [codigo, id]
    );

    //Si este código de resolución está siendo usada por otra resolución, genera mensaje de error

    if (existingResolutionCode.length > 0) {
      return res
        .status(400)
        .json({ message: "Este código de resolución ya existe" });
    }

    //Realiza la actualización en la tabla resoluciones_i
    const [result] = await pool.query(
      "UPDATE resoluciones_i SET resol_inspec = IFNULL(?, resol_inspec), codigo = IFNULL(?, codigo) WHERE id_inspec = ?",
      [resol_inspec, codigo, id]
      /* IFNULL se usa junto con la petición PATCH, si no le pasa valor lo deja como estaba */
    );

    //Hace la busqueda del registro modificado para mostrarlo como respuesta

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
/* export const deleteResolutionInsp = async (req, res) => {
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
}; */
