import { pool } from "../db.js";

// ==================== VALIDACION DEL PESO PROMEDIO ====================
// El catalogo usa las llaves de dimensiones y bandas para evitar que se creen
// textos libres distintos a los catalogos maestros. El peso se guarda con tres
// decimales porque sera la base del costeo por kg en las salidas.
const parseTreadWeight = (body) => {
  const dimensionId = Number(body.id_dimension);
  const treadId = Number(body.id_banda);
  const averageWeight = Number(body.peso_promedio);

  if (
    !Number.isSafeInteger(dimensionId) ||
    dimensionId <= 0 ||
    !Number.isSafeInteger(treadId) ||
    treadId <= 0 ||
    !Number.isFinite(averageWeight) ||
    averageWeight <= 0 ||
    averageWeight > 9999.999
  ) {
    return null;
  }

  return {
    dimensionId,
    treadId,
    averageWeight: Number(averageWeight.toFixed(3)),
  };
};

// ==================== LISTADO Y BUSQUEDA ====================
// La busqueda se hace por dimension o diseno para que el usuario pueda ubicar
// rapidamente una combinacion antes de modificar su peso promedio.
export const listTreadWeights = async (req, res) => {
  const query = typeof req.query.q === "string" ? req.query.q.trim() : "";

  try {
    const [rows] = await pool.query(
      `SELECT pb.id_peso_banda,
              pb.id_dimension,
              d.dimension,
              pb.id_banda,
              b.banda AS diseno,
              pb.peso_promedio
       FROM pesos_banda pb
       INNER JOIN dimensiones d ON pb.id_dimension = d.id_dimension
       INNER JOIN bandas b ON pb.id_banda = b.id_banda
       WHERE d.dimension LIKE ? OR b.banda LIKE ?
       ORDER BY d.dimension, b.banda`,
      [`%${query}%`, `%${query}%`],
    );
    res.json(rows);
  } catch (error) {
    console.error("Error en listTreadWeights:", error);
    res.status(500).json({ message: "No se pudo consultar el catalogo de pesos" });
  }
};

// ==================== CREAR COMBINACION ====================
// Cada dimension + diseno debe existir una sola vez. Si se necesita corregir el
// peso promedio, se selecciona la fila y se modifica para conservar el ID.
export const createTreadWeight = async (req, res) => {
  const treadWeight = parseTreadWeight(req.body);
  if (!treadWeight) {
    return res.status(400).json({ message: "Datos de peso de banda invalidos" });
  }

  try {
    const [dimension] = await pool.query(
      "SELECT id_dimension FROM dimensiones WHERE id_dimension = ?",
      [treadWeight.dimensionId],
    );
    const [tread] = await pool.query("SELECT id_banda FROM bandas WHERE id_banda = ?", [
      treadWeight.treadId,
    ]);
    if (dimension.length === 0 || tread.length === 0) {
      return res.status(404).json({ message: "Dimension o diseno no encontrado" });
    }

    const [duplicate] = await pool.query(
      `SELECT id_peso_banda
       FROM pesos_banda
       WHERE id_dimension = ? AND id_banda = ?`,
      [treadWeight.dimensionId, treadWeight.treadId],
    );
    if (duplicate.length > 0) {
      return res.status(409).json({ message: "Esta combinacion ya existe" });
    }

    const [result] = await pool.query(
      `INSERT INTO pesos_banda (id_dimension, id_banda, peso_promedio)
       VALUES (?, ?, ?)`,
      [treadWeight.dimensionId, treadWeight.treadId, treadWeight.averageWeight],
    );

    res.status(201).json({
      id_peso_banda: result.insertId,
      id_dimension: treadWeight.dimensionId,
      id_banda: treadWeight.treadId,
      peso_promedio: treadWeight.averageWeight,
    });
  } catch (error) {
    console.error("Error en createTreadWeight:", error);
    res.status(500).json({ message: "No se pudo crear el peso promedio" });
  }
};

// ==================== MODIFICAR PESO PROMEDIO ====================
// Se permite cambiar la combinacion completa por si el usuario selecciono una
// dimension o diseno equivocado, manteniendo siempre la regla de no duplicar.
export const updateTreadWeight = async (req, res) => {
  const id = Number(req.params.id);
  const treadWeight = parseTreadWeight(req.body);
  if (!Number.isSafeInteger(id) || id <= 0 || !treadWeight) {
    return res.status(400).json({ message: "Datos de peso de banda invalidos" });
  }

  try {
    const [existing] = await pool.query(
      "SELECT id_peso_banda FROM pesos_banda WHERE id_peso_banda = ?",
      [id],
    );
    if (existing.length === 0) {
      return res.status(404).json({ message: "Peso promedio no encontrado" });
    }

    const [dimension] = await pool.query(
      "SELECT id_dimension FROM dimensiones WHERE id_dimension = ?",
      [treadWeight.dimensionId],
    );
    const [tread] = await pool.query("SELECT id_banda FROM bandas WHERE id_banda = ?", [
      treadWeight.treadId,
    ]);
    if (dimension.length === 0 || tread.length === 0) {
      return res.status(404).json({ message: "Dimension o diseno no encontrado" });
    }

    const [duplicate] = await pool.query(
      `SELECT id_peso_banda
       FROM pesos_banda
       WHERE id_dimension = ? AND id_banda = ? AND id_peso_banda <> ?`,
      [treadWeight.dimensionId, treadWeight.treadId, id],
    );
    if (duplicate.length > 0) {
      return res.status(409).json({ message: "Esta combinacion ya existe" });
    }

    await pool.query(
      `UPDATE pesos_banda
       SET id_dimension = ?, id_banda = ?, peso_promedio = ?
       WHERE id_peso_banda = ?`,
      [treadWeight.dimensionId, treadWeight.treadId, treadWeight.averageWeight, id],
    );

    res.json({
      id_peso_banda: id,
      id_dimension: treadWeight.dimensionId,
      id_banda: treadWeight.treadId,
      peso_promedio: treadWeight.averageWeight,
    });
  } catch (error) {
    console.error("Error en updateTreadWeight:", error);
    res.status(500).json({ message: "No se pudo actualizar el peso promedio" });
  }
};
