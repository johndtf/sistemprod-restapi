import { pool } from "../db.js";

// Recibe los nombres que usa el formulario y devuelve un objeto con nombres
// internos consistentes para las consultas SQL.
const parseWarehouse = (body) => {
  const code = typeof body.codigo === "string" ? body.codigo.trim().toUpperCase() : "";
  const name = typeof body.nombre === "string" ? body.nombre.trim() : "";
  const active = body.activa === false || body.activa === 0 || body.activa === "0" ? 0 : 1;

  if (code.length < 1 || code.length > 10 || name.length < 2 || name.length > 80) {
    return null;
  }

  return { code, name, active };
};

// La busqueda sirve tanto para cargar el catalogo completo como para filtrar
// por codigo o nombre desde el mismo formulario.
export const listWarehouses = async (req, res) => {
  const query = typeof req.query.q === "string" ? req.query.q.trim() : "";

  try {
    const [rows] = await pool.query(
      `SELECT id_bodega, codigo, nombre, activa
       FROM bodegas
       WHERE codigo LIKE ? OR nombre LIKE ?
       ORDER BY nombre`,
      [`%${query}%`, `%${query}%`],
    );
    res.json(rows);
  } catch (error) {
    console.error("Error en listWarehouses:", error);
    res.status(500).json({ message: "No se pudo consultar el catalogo de bodegas" });
  }
};

// Las bodegas no se eliminan porque una salida historica puede quedar ligada a
// ellas. Si dejan de usarse, se marcan como inactivas desde este mismo catalogo.
export const createWarehouse = async (req, res) => {
  const warehouse = parseWarehouse(req.body);
  if (!warehouse) return res.status(400).json({ message: "Datos de bodega invalidos" });

  try {
    const [duplicate] = await pool.query(
      "SELECT id_bodega FROM bodegas WHERE codigo = ?",
      [warehouse.code],
    );
    if (duplicate.length > 0) return res.status(409).json({ message: "El codigo ya existe" });

    const [result] = await pool.query(
      "INSERT INTO bodegas (codigo, nombre, activa) VALUES (?, ?, ?)",
      [warehouse.code, warehouse.name, warehouse.active],
    );

    res.status(201).json({
      id_bodega: result.insertId,
      codigo: warehouse.code,
      nombre: warehouse.name,
      activa: warehouse.active,
    });
  } catch (error) {
    console.error("Error en createWarehouse:", error);
    res.status(500).json({ message: "No se pudo crear la bodega" });
  }
};

export const updateWarehouse = async (req, res) => {
  const id = Number(req.params.id);
  const warehouse = parseWarehouse(req.body);
  if (!Number.isSafeInteger(id) || id <= 0 || !warehouse) {
    return res.status(400).json({ message: "Datos de bodega invalidos" });
  }

  try {
    // Se valida primero la existencia y luego un posible codigo duplicado para
    // responder al usuario con un mensaje que corresponda a su accion.
    const [existing] = await pool.query(
      "SELECT id_bodega FROM bodegas WHERE id_bodega = ?",
      [id],
    );
    if (existing.length === 0) return res.status(404).json({ message: "Bodega no encontrada" });

    const [duplicate] = await pool.query(
      "SELECT id_bodega FROM bodegas WHERE codigo = ? AND id_bodega <> ?",
      [warehouse.code, id],
    );
    if (duplicate.length > 0) return res.status(409).json({ message: "El codigo ya existe" });

    await pool.query(
      "UPDATE bodegas SET codigo = ?, nombre = ?, activa = ? WHERE id_bodega = ?",
      [warehouse.code, warehouse.name, warehouse.active, id],
    );

    res.json({
      id_bodega: id,
      codigo: warehouse.code,
      nombre: warehouse.name,
      activa: warehouse.active,
    });
  } catch (error) {
    console.error("Error en updateWarehouse:", error);
    res.status(500).json({ message: "No se pudo actualizar la bodega" });
  }
};
