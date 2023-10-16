import { pool } from "../db.js";

export const getProfiles = async (req, res) => {
  try {
    const [rows] = await pool.query("SELECT * FROM perfiles");
    res.json(rows);
  } catch (error) {
    return res.status(500).json({ message: "Something goes wrong" });
  }
};

export const getProfile = async (req, res) => {
  try {
    const [rows] = await pool.query(
      "SELECT * FROM perfiles WHERE id_perfil = ?",
      [req.params.id]
    );
    if (rows.length <= 0)
      return res.status(404).json({ message: "Perfil no encontrado" });
    res.send(rows[0]);
  } catch (error) {
    return res.status(500).json({ message: "Something goes wrong" });
  }
};

export const createProfile = async (req, res) => {
  try {
    const { perfil } = req.body;
    const [rows] = await pool.query("INSERT INTO perfiles(perfil) VALUES (?)", [
      perfil,
    ]);
    res.send({ id: rows.insertId, perfil });
  } catch (error) {
    return res.status(500).json({ message: "Something goes wrong" });
  }
};

export const updateProfile = async (req, res) => {
  try {
    const { id } = req.params;
    const { profile } = req.body;

    const [result] = await pool.query(
      "UPDATE perfiles SET perfil = IFNULL(?, perfil) WHERE id_perfil = ?",
      [profile, id]
      /* IFNULL se usa junto con la petición PATCH, si no le pasa valor lo deja como estaba */
    );

    console.log(result);

    if (result.affectedRows <= 0)
      return res.status(404).json({ message: "profile not found" });

    const [rows] = await pool.query(
      "SELECT * FROM perfiles WHERE id_perfil = ?",
      [id]
    );

    res.json(rows[0]);
  } catch (error) {
    return res.status(500).json({ message: "Something goes wrong" });
  }
};

export const deleteProfile = async (req, res) => {
  try {
    const [result] = await pool.query(
      "DELETE FROM perfiles WHERE id_perfil = ?",
      [req.params.id]
    );
    if (result.affectedRows <= 0)
      return res.status(404).json({ message: "profile not found" });

    res.sendStatus(204);
  } catch (error) {
    return res.status(500).json({ message: "Something goes wrong" });
  }
};
