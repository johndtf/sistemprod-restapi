import { pool } from "../db.js";

//----------Listado de Marcas por descripción ---------------------------------

export const getBrands = async (req, res) => {
  try {
    const { marca } = req.body;
    const [rows] = await pool.query("SELECT * FROM marcas WHERE marca LIKE ?", [
      `%${marca}%`,
    ]);
    res.json(rows);
  } catch (error) {
    return res.status(500).json({ message: "Something goes wrong" });
  }
};

//---------------Listado de todas las marcas -----------------------
export const getListBrands = async (req, res) => {
  try {
    const [rows] = await pool.query("SELECT * FROM marcas");
    res.json(rows);
  } catch (error) {
    return res.status(500).json({ message: "Ocurrió un problema obteniendo el listado de marcas" });
  }
};

//-----------------Crear Marca ---------------------------------
export const createBrand = async (req, res) => {
  try {
    const { marca } = req.body;

    if (marca.length < 2 || marca.length > 20) {
      return res
        .status(400)
        .json({ message: "La marca debe tener entre 2 y 20 caracteres" });
    }

    // Verificar si la marca ya existe
    const [existingBrands] = await pool.query(
      "SELECT id_marca FROM marcas WHERE marca = ?",
      [marca]
    );

    if (existingBrands.length > 0) {
      // La marca ya existe, responder con un mensaje de error
      return res.status(400).json({ message: "La marca ya existe" });
    }

    // La marca no existe, proceder a la inserción
    const [rows] = await pool.query("INSERT INTO marcas(marca) VALUES (?)", [
      marca,
    ]);

    res.send({ id: rows.insertId, marca });
  } catch (error) {
    return res.status(500).json({ message: "Something goes wrong" });
  }
};

//------------------Actualizar marca ----------------------------
export const updateBrand = async (req, res) => {
  try {
    const { id } = req.params;
    const { marca } = req.body;

    if (marca.length < 2 || marca.length > 20) {
      return res
        .status(400)
        .json({ message: "La marca debe tener entre 2 y 20 caracteres" });
    }
    //Verificar si el id de la marca existe
    const [existingBrandId] = await pool.query(
      "SELECT * FROM marcas WHERE id_marca = ?",
      [id]
    );

    if (existingBrandId.length === 0) {
      // La marca a actualizar no existe, responder con un mensaje de error
      return res.status(404).json({ message: "Marca no encontrada" });
    }

    //Verificar que la marca modificada no exista en la tabla
    const [existingBrandName] = await pool.query(
      "SELECT id_marca FROM marcas WHERE marca = ? AND id_marca != ?",
      [marca, id]
    );
    //Si la marca modificada está siendo usada por otro registro genera mensaje de error
    if (existingBrandName.length > 0) {
      return res
        .status(400)
        .json({ message: "Este nombre ya está asociado a otra marca" });
    }

    //Realiza la actualización en la tabla marcas
    const [result] = await pool.query(
      "UPDATE marcas SET marca = IFNULL(?, marca) WHERE id_marca = ?",
      [marca, id]
      /* IFNULL se usa junto con la petición PATCH, si no le pasa valor lo deja como estaba */
    );

    //Hace la busqueda del registro modificado para mostrarlo como respuesta;

    const [rows] = await pool.query("SELECT * FROM marcas WHERE id_marca = ?", [
      id,
    ]);

    res.json(rows[0]);
  } catch (error) {
    return res.status(500).json({ message: "Something goes wrong" });
  }
};

//--------------------Borrar marca ----------------------------------
/* export const deleteBrand = async (req, res) => {
  try {
    const [result] = await pool.query("DELETE FROM marcas WHERE id_marca = ?", [
      req.params.id,
    ]);
    if (result.affectedRows <= 0)
      return res.status(404).json({ message: "Brand not found" });

    res.sendStatus(204);
  } catch (error) {
    return res.status(500).json({ message: "Something goes wrong" });
  }
}; */
