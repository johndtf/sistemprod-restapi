import { pool } from "../db.js";

//----------Listado de Marcas---------------------------------

export const getBrands = async (req, res) => {
  try {
    const [rows] = await pool.query("SELECT * FROM marcas");
    res.json(rows);
  } catch (error) {
    return res.status(500).json({ message: "Something goes wrong" });
  }
};

//---------------Buscar Marca por id -----------------------
export const getBrand = async (req, res) => {
  try {
    const [rows] = await pool.query("SELECT * FROM marcas WHERE id_marca = ?", [
      req.params.id,
    ]);
    if (rows.length <= 0)
      return res.status(404).json({ message: "Marca no encontrada" });
    res.send(rows[0]);
  } catch (error) {
    return res.status(500).json({ message: "Something goes wrong" });
  }
};

//-----------------Crear Marca ---------------------------------
export const createBrand = async (req, res) => {
  try {
    const { marca } = req.body;

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

    const [result] = await pool.query(
      "UPDATE marcas SET marca = IFNULL(?, marca) WHERE id_marca = ?",
      [marca, id]
      /* IFNULL se usa junto con la petición PATCH, si no le pasa valor lo deja como estaba */
    );

    console.log(result);

    if (result.affectedRows <= 0)
      return res.status(404).json({ message: "Brand not found" });

    const [rows] = await pool.query("SELECT * FROM marcas WHERE id_marca = ?", [
      id,
    ]);

    res.json(rows[0]);
  } catch (error) {
    return res.status(500).json({ message: "Something goes wrong" });
  }
};

//--------------------Borrar marca ----------------------------------
export const deleteBrand = async (req, res) => {
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
};
