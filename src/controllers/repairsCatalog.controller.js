import { pool } from "../db.js";

// ==================== VALIDACION DEL CATALOGO ====================
// Las referencias se normalizan en mayusculas para evitar duplicados que solo
// cambien por capitalizacion. El nombre conserva el texto descriptivo recibido.
const parseRepair = (body) => {
  const reference =
    typeof body.referencia === "string" ? body.referencia.trim().toUpperCase() : "";
  const name = typeof body.nombre === "string" ? body.nombre.trim() : "";

  if (
    reference.length < 1 ||
    reference.length > 20 ||
    name.length < 2 ||
    name.length > 80
  ) {
    return null;
  }

  return { reference, name };
};

export const listRepairs = async (req, res) => {
  const query = typeof req.query.q === "string" ? req.query.q.trim() : "";

  try {
    const [rows] = await pool.query(
      `SELECT id_reparacion, referencia, nombre
       FROM reparaciones
       WHERE referencia LIKE ? OR nombre LIKE ?
       ORDER BY referencia`,
      [`%${query}%`, `%${query}%`],
    );
    res.json(rows);
  } catch (error) {
    console.error("Error en listRepairs:", error);
    res.status(500).json({ message: "No se pudo consultar el catálogo" });
  }
};

// ==================== CREAR REFERENCIA ====================
// La referencia es única. No se ofrece eliminación porque podría estar ligada
// a procesos históricos mediante reparaciones_proceso.
export const createRepair = async (req, res) => {
  const repair = parseRepair(req.body);
  if (!repair) {
    return res.status(400).json({ message: "Referencia o nombre inválidos" });
  }

  try {
    const [existing] = await pool.query(
      "SELECT id_reparacion FROM reparaciones WHERE referencia = ?",
      [repair.reference],
    );
    if (existing.length > 0) {
      return res.status(409).json({ message: "La referencia ya existe" });
    }

    const [result] = await pool.query(
      "INSERT INTO reparaciones (referencia, nombre) VALUES (?, ?)",
      [repair.reference, repair.name],
    );

    res.status(201).json({ id_reparacion: result.insertId, ...repair });
  } catch (error) {
    console.error("Error en createRepair:", error);
    res.status(500).json({ message: "No se pudo crear la reparación" });
  }
};

// ==================== MODIFICAR REFERENCIA ====================
// El ID permanece estable aunque se corrijan la referencia o su descripción,
// por lo que las relaciones históricas no pierden su llave foránea.
export const updateRepair = async (req, res) => {
  const id = Number(req.params.id);
  const repair = parseRepair(req.body);
  if (!Number.isSafeInteger(id) || id <= 0 || !repair) {
    return res.status(400).json({ message: "Datos de reparación inválidos" });
  }

  try {
    const [existing] = await pool.query(
      "SELECT id_reparacion FROM reparaciones WHERE id_reparacion = ?",
      [id],
    );
    if (existing.length === 0) {
      return res.status(404).json({ message: "Reparación no encontrada" });
    }

    const [duplicate] = await pool.query(
      `SELECT id_reparacion FROM reparaciones
       WHERE referencia = ? AND id_reparacion <> ?`,
      [repair.reference, id],
    );
    if (duplicate.length > 0) {
      return res.status(409).json({ message: "La referencia ya existe" });
    }

    await pool.query(
      "UPDATE reparaciones SET referencia = ?, nombre = ? WHERE id_reparacion = ?",
      [repair.reference, repair.name, id],
    );
    res.json({ id_reparacion: id, ...repair });
  } catch (error) {
    console.error("Error en updateRepair:", error);
    res.status(500).json({ message: "No se pudo actualizar la reparación" });
  }
};
