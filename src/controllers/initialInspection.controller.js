// controllers/initialInspection.controller.js
import { pool } from "../db.js";

// =========Actualizar inspección inicial=============
export const updateInitialInspection = async (req, res) => {
  const { tiquete } = req.params; // es id_llanta
  let {
    nivel_reenc,
    id_inspec,
    observaciones_inicial,
    id_inspector,
    fecha_inspeccion_inicial,
  } = req.body;

  // Parsear valores numéricos
  const ticket = Number(tiquete);
  const nivel = Number(nivel_reenc);
  const codigo = Number(id_inspec);
  const inspector = Number(id_inspector);

  // Validaciones básicas
  if (
    !Number.isInteger(ticket) ||
    ticket <= 0 ||
    !Number.isInteger(codigo) ||
    codigo <= 0 || // puede ser  1 o >=2
    !Number.isInteger(inspector) ||
    inspector <= 0 ||
    !Number.isInteger(nivel) ||
    nivel < 0
  ) {
    return res.status(400).json({ message: "Datos inválidos o incompletos" });
  }

  // Validar fecha de inspección inicial
  if (!fecha_inspeccion_inicial) {
    return res.status(400).json({
      message: "Debe indicar la fecha y hora de inspección",
    });
  }

  // Validar observación como string o nulo
  if (
    observaciones_inicial !== undefined &&
    observaciones_inicial !== null &&
    typeof observaciones_inicial !== "string"
  ) {
    return res
      .status(400)
      .json({ message: "La observación debe ser texto o vacía" });
  }
  observaciones_inicial = observaciones_inicial?.trim() || null;

  // Determinar estado según el código de inspección
  let estado;

  if (codigo === 1)
    estado = 1; // APTA
  else estado = 2; // RECHAZADA

  // Establecer fecha y hora del registro de la inspección inicial
  const fechaRegistro = new Date();
  const subproceso = 1; // Inspección inicial

  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    // Validar empleado inspector
    const [empleados] = await connection.query(
      `SELECT estado
        FROM empleados
        WHERE id_empleado = ?`,
      [inspector],
    );

    if (empleados.length === 0) {
      return res.status(400).json({
        message: "Empleado no encontrado",
      });
    }

    if (empleados[0].estado !== "A") {
      return res.status(400).json({
        message: "El empleado no se encuentra activo",
      });
    }

    // Ejecutar actualización en llantas
    const [result] = await connection.query(
      `UPDATE llantas
       SET nivel_reenc = ?, 
           id_inspec = ?, 
           observaciones_inicial = ?, 
           id_inspector_inicial = ?, 
           fecha_inspeccion_inicial = ?,
           fecha_registro_inspinicial = ?,
           id_estado = ?
       WHERE id_llanta = ?`,
      [
        nivel,
        codigo,
        observaciones_inicial,
        inspector,
        fecha_inspeccion_inicial,
        fechaRegistro,
        estado,
        ticket,
      ],
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Llanta no encontrada" });
    }

    // Insertar registro en procesos

    //Contultar si es reproceso
    const [rows] = await connection.query(
      `SELECT COUNT(*) AS veces
      FROM procesos
      WHERE id_llanta = ?
      AND id_subproceso = 1`,
      [ticket],
    );

    const reproceso = rows[0].veces > 0 ? 1 : 0;

    await connection.query(
      `INSERT INTO procesos
        (
          id_llanta,
          id_subproceso,
          fecha,
          fecha_registro,
          observacion,
          id_resolucion,
          id_estado_resultado,
          reproceso,
          id_operario,
          nivel_reenc
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        ticket,
        subproceso,
        fecha_inspeccion_inicial,
        fechaRegistro,
        observaciones_inicial,
        codigo,
        estado,
        reproceso,
        inspector,
        nivel,
      ],
    );

    await connection.commit();

    res.json({ message: "Inspección inicial actualizada correctamente" });
  } catch (error) {
    await connection.rollback();

    console.error("Error en updateInitialInspection:", error);

    res.status(500).json({ message: "Error interno del servidor" });
  } finally {
    connection.release();
  }
};

// =========Deshacer inspección inicial=============
export const undoInitialInspection = async (req, res) => {
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const ticket = Number(req.params.tiquete);

    if (!Number.isInteger(ticket) || ticket <= 0) {
      return res.status(400).json({
        message: "Tiquete inválido",
      });
    }

    // Verificar si la llanta tiene inspección inicial registrada
    const [tieneinspeccion] = await connection.query(
      `SELECT count(*) AS total
       FROM procesos
       WHERE id_llanta = ? AND id_subproceso = 1`,
      [ticket],
    );

    if (tieneinspeccion[0].total === 0) {
      return res.status(404).json({
        message: "La llanta no tiene una inspección inicial registrada",
      });
    }

    // Verificar procesos posteriores
    const [posteriores] = await connection.query(
      `SELECT COUNT(*) AS total
       FROM procesos
       WHERE id_llanta = ?
       AND id_subproceso > 1`,
      [ticket],
    );

    if (posteriores[0].total > 0) {
      return res.status(400).json({
        message:
          "No es posible deshacer la inspección inicial porque existen procesos posteriores registrados.",
      });
    }

    // Restaurar llanta
    const [result] = await connection.query(
      `UPDATE llantas
       SET nivel_reenc = 0,
           id_inspec = 0,
           observaciones_inicial = NULL,
           id_inspector_inicial = NULL,
           fecha_inspeccion_inicial = NULL,
           fecha_registro_inspinicial = NULL,
           id_estado = 0
       WHERE id_llanta = ?`,
      [ticket],
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        message: "Llanta no encontrada",
      });
    }

    // Eliminar registros de inspección inicial
    await connection.query(
      `DELETE
       FROM procesos
       WHERE id_llanta = ?
       AND id_subproceso = 1`,
      [ticket],
    );

    await connection.commit();

    res.json({
      message: "Inspección inicial deshecha correctamente",
    });
  } catch (error) {
    await connection.rollback();

    console.error("Error en undoInitialInspection:", error);

    res.status(500).json({
      message: "Error interno del servidor",
    });
  } finally {
    connection.release();
  }
};
