import { pool } from "../db.js";
import { getCompletedSubprocessIds } from "../services/tireProcesses.service.js";

// ==================== IDENTIFICADORES DEL NEGOCIO ====================
// Inspeccion Final clasifica la llanta despues de Vulcanizado. A diferencia de
// los subprocesos anteriores, un resultado aprobado puede dejar la llanta como
// REENCAUCHADA o REPARADA, segun el flujo por el que haya pasado.
const FINAL_INSPECTION_SUBPROCESS_ID = 9;
const VULCANIZATION_SUBPROCESS_ID = 8;
const TERMINATION_SUBPROCESS_ID = 10;
const APT_STATE_ID = 1;
const REJECTED_STATE_ID = 2;
const REPAIRED_STATE_ID = 3;
const RETREADED_STATE_ID = 4;
const APT_RESOLUTION_ID = 1;
const ALLOWED_CURRENT_STATES = [APT_STATE_ID, REPAIRED_STATE_ID, RETREADED_STATE_ID];
const FINAL_RESULTS = {
  reparada: REPAIRED_STATE_ID,
  reencauchada: RETREADED_STATE_ID,
};

// ==================== NORMALIZACION ====================
const parsePositiveInteger = (value) => {
  const number = Number(value);
  return Number.isSafeInteger(number) && number > 0 ? number : null;
};

const normalizeDateTime = (value) => {
  if (typeof value !== "string" || !value.trim()) return null;
  const normalized = value.trim().replace("T", " ");
  return /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}(:\d{2})?$/.test(normalized)
    ? normalized
    : null;
};

const normalizeFinalResult = (value) => {
  if (typeof value !== "string") return null;
  const normalized = value.trim().toLowerCase();
  return FINAL_RESULTS[normalized] ? normalized : null;
};

// ==================== CONSULTAS DE APOYO ====================
const hasTermination = async (connection, ticket) => {
  const [rows] = await connection.query(
    `SELECT COUNT(*) AS total
     FROM procesos
     WHERE id_llanta = ? AND id_subproceso = ?`,
    [ticket, TERMINATION_SUBPROCESS_ID],
  );
  return rows[0].total > 0;
};

const validateEligibleTire = async (connection, ticket, lock = false) => {
  const [tires] = await connection.query(
    `SELECT id_llanta, id_estado, nivel_reenc
     FROM llantas
     WHERE id_llanta = ?${lock ? " FOR UPDATE" : ""}`,
    [ticket],
  );

  if (tires.length === 0) return { status: 404, message: "Llanta no encontrada" };
  if (!ALLOWED_CURRENT_STATES.includes(tires[0].id_estado)) {
    return {
      status: 409,
      message: "Solo las llantas APTAS, REENCAUCHADAS o REPARADAS pueden ingresar a Inspeccion Final",
    };
  }

  const [vulcanization] = await connection.query(
    `SELECT MAX(fecha_registro) AS fecha_registro_vulcanizado
     FROM procesos
     WHERE id_llanta = ?
       AND id_subproceso = ?
       AND id_estado_resultado = ?`,
    [ticket, VULCANIZATION_SUBPROCESS_ID, APT_STATE_ID],
  );

  if (!vulcanization[0].fecha_registro_vulcanizado) {
    return { status: 409, message: "La llanta no tiene Vulcanizado aprobado" };
  }

  if (await hasTermination(connection, ticket)) {
    return {
      status: 409,
      message: "La llanta ya tiene Terminacion registrada y no puede modificar Inspeccion Final",
    };
  }

  return { tire: tires[0] };
};

const setCurrentFinalInspectionFromLatestProcess = async (connection, ticket) => {
  const [rows] = await connection.query(
    `SELECT fecha, fecha_registro, id_operario, id_resolucion, id_estado_resultado
     FROM procesos
     WHERE id_llanta = ?
       AND id_subproceso = ?
     ORDER BY fecha_registro DESC, id_proceso DESC
     LIMIT 1`,
    [ticket, FINAL_INSPECTION_SUBPROCESS_ID],
  );

  if (rows.length === 0) {
    await connection.query(
      `UPDATE llantas
       SET fecha_inspeccion_final = NULL,
           fecha_registro_inspeccion_final = NULL,
           id_operario_inspeccion_final = NULL,
           id_resolucion_inspeccion_final = NULL,
           id_estado = ?
       WHERE id_llanta = ?`,
      [APT_STATE_ID, ticket],
    );
    return;
  }

  await connection.query(
    `UPDATE llantas
     SET fecha_inspeccion_final = ?,
         fecha_registro_inspeccion_final = ?,
         id_operario_inspeccion_final = ?,
         id_resolucion_inspeccion_final = ?,
         id_estado = ?
     WHERE id_llanta = ?`,
    [
      rows[0].fecha,
      rows[0].fecha_registro,
      rows[0].id_operario,
      rows[0].id_resolucion,
      rows[0].id_estado_resultado,
      ticket,
    ],
  );
};

// ==================== CATALOGOS DEL FORMULARIO ====================
export const getActiveFinalInspectionOperators = async (_req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT id_empleado, nombre, apellido
       FROM empleados
       WHERE estado = 'A'
       ORDER BY nombre, apellido`,
    );
    res.json(rows);
  } catch (error) {
    console.error("Error en getActiveFinalInspectionOperators:", error);
    res.status(500).json({ message: "No se pudieron consultar los inspectores" });
  }
};

export const getFinalInspectionRejectionReasons = async (_req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT id_inspec, codigo, resol_inspec
       FROM resoluciones_i
       WHERE id_inspec NOT IN (0, ?)
       ORDER BY codigo, resol_inspec`,
      [APT_RESOLUTION_ID],
    );
    res.json(rows);
  } catch (error) {
    console.error("Error en getFinalInspectionRejectionReasons:", error);
    res.status(500).json({ message: "No se pudieron consultar los motivos" });
  }
};

// ==================== CONSULTA DE LLANTA ====================
export const getFinalInspectionTire = async (req, res) => {
  const ticket = parsePositiveInteger(req.params.ticket);
  if (ticket === null) return res.status(400).json({ message: "Tiquete invalido" });

  try {
    const eligibility = await validateEligibleTire(pool, ticket);
    if (eligibility.message) {
      return res.status(eligibility.status).json({ message: eligibility.message });
    }

    const [rows] = await pool.query(
      `SELECT l.id_llanta, l.serie, l.nivel_reenc,
              e.descripcion AS estado,
              CONCAT(o.numero_orden, ' - ', LPAD(l.consec_orden, 2, '0')) AS orden,
              TRIM(CONCAT(c.nombre, ' ', COALESCE(c.apellido, ''))) AS cliente,
              m.marca, d.dimension, b.banda AS diseno,
              CASE WHEN ei.id_empleado IS NULL THEN NULL
                   ELSE TRIM(CONCAT(ei.id_empleado, ' - ', ei.nombre, ' ', COALESCE(ei.apellido, '')))
              END AS ultimo_operario
       FROM llantas l
       JOIN ordenes o ON l.id_orden = o.id_orden
       JOIN clientes c ON o.id_cliente = c.id_cliente
       JOIN estados_llanta e ON l.id_estado = e.id_estado
       LEFT JOIN marcas m ON l.id_marca = m.id_marca
       LEFT JOIN dimensiones d ON l.id_dimension = d.id_dimension
       LEFT JOIN bandas b ON l.id_banda = b.id_banda
       LEFT JOIN empleados ei ON l.id_operario_inspeccion_final = ei.id_empleado
       WHERE l.id_llanta = ?`,
      [ticket],
    );

    const [history] = await pool.query(
      `SELECT COUNT(*) AS total
       FROM procesos
       WHERE id_llanta = ? AND id_subproceso = ?`,
      [ticket, FINAL_INSPECTION_SUBPROCESS_ID],
    );
    const subprocesos = await getCompletedSubprocessIds(pool, ticket);

    res.json({
      ...rows[0],
      inspecciones_finales_registradas: history[0].total,
      subprocesos,
    });
  } catch (error) {
    console.error("Error en getFinalInspectionTire:", error);
    res.status(500).json({ message: "No se pudo consultar la llanta" });
  }
};

// ==================== REGISTRO TRANSACCIONAL ====================
const registerFinalInspectionResult = async ({
  req,
  res,
  resolutionId,
  resultStateId,
  successMessage,
}) => {
  const ticket = parsePositiveInteger(req.params.ticket);
  const operator = parsePositiveInteger(req.body.id_operario);
  const processDate = normalizeDateTime(req.body.fecha_inspeccion_final);

  if (ticket === null || operator === null || processDate === null) {
    return res.status(400).json({ message: "Datos de inspeccion final invalidos o incompletos" });
  }

  const observation =
    typeof req.body.observacion === "string" ? req.body.observacion.trim() || null : null;
  let connection;

  try {
    connection = await pool.getConnection();
    await connection.beginTransaction();

    const abort = async (status, message) => {
      await connection.rollback();
      return res.status(status).json({ message });
    };

    const eligibility = await validateEligibleTire(connection, ticket, true);
    if (eligibility.message) return abort(eligibility.status, eligibility.message);

    const [operators] = await connection.query(
      "SELECT id_empleado FROM empleados WHERE id_empleado = ? AND estado = 'A'",
      [operator],
    );
    if (operators.length === 0) return abort(400, "El inspector no existe o no esta activo");

    if (resultStateId === REJECTED_STATE_ID) {
      const [reasons] = await connection.query(
        `SELECT id_inspec
         FROM resoluciones_i
         WHERE id_inspec = ? AND id_inspec NOT IN (0, ?)`,
        [resolutionId, APT_RESOLUTION_ID],
      );
      if (reasons.length === 0) return abort(400, "Motivo de rechazo invalido");
    }

    const [history] = await connection.query(
      `SELECT COUNT(*) AS total
       FROM procesos
       WHERE id_llanta = ? AND id_subproceso = ?`,
      [ticket, FINAL_INSPECTION_SUBPROCESS_ID],
    );
    const reprocess = history[0].total > 0 ? 1 : 0;
    const registrationDate = new Date();

    await connection.query(
      `UPDATE llantas
       SET fecha_inspeccion_final = ?,
           fecha_registro_inspeccion_final = ?,
           id_operario_inspeccion_final = ?,
           id_resolucion_inspeccion_final = ?,
           id_estado = ?
       WHERE id_llanta = ?`,
      [processDate, registrationDate, operator, resolutionId, resultStateId, ticket],
    );

    await connection.query(
      `INSERT INTO procesos
        (id_llanta, id_subproceso, fecha, fecha_registro, observacion,
         id_resolucion, reproceso, id_operario, id_estado_resultado, nivel_reenc)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        ticket,
        FINAL_INSPECTION_SUBPROCESS_ID,
        processDate,
        registrationDate,
        observation,
        resolutionId,
        reprocess,
        operator,
        resultStateId,
        eligibility.tire.nivel_reenc,
      ],
    );

    await connection.commit();
    res.status(201).json({ message: successMessage, reproceso: reprocess });
  } catch (error) {
    if (connection) await connection.rollback();
    console.error("Error en registerFinalInspectionResult:", error);
    res.status(500).json({ message: "Error interno al registrar la inspeccion final" });
  } finally {
    connection?.release();
  }
};

export const completeFinalInspection = (req, res) => {
  const finalResult = normalizeFinalResult(req.body.resultado_final);
  if (!finalResult) {
    return res.status(400).json({ message: "Debe seleccionar si la llanta queda reparada o reencauchada" });
  }

  return registerFinalInspectionResult({
    req,
    res,
    resolutionId: APT_RESOLUTION_ID,
    resultStateId: FINAL_RESULTS[finalResult],
    successMessage: "Inspeccion final registrada correctamente",
  });
};

export const rejectTireDuringFinalInspection = (req, res) => {
  const resolutionId = parsePositiveInteger(req.body.id_resolucion);
  if (resolutionId === null) {
    return res.status(400).json({ message: "Debe seleccionar un motivo de rechazo" });
  }
  return registerFinalInspectionResult({
    req,
    res,
    resolutionId,
    resultStateId: REJECTED_STATE_ID,
    successMessage: "Llanta rechazada durante la inspeccion final",
  });
};

// ==================== DESHACER ====================
// La reversa elimina la ultima Inspeccion Final y restaura el resumen vigente
// desde la ejecucion anterior. Si no hay anterior, la llanta vuelve a APTA
// porque el ultimo proceso valido previo es Vulcanizado aprobado.
export const undoFinalInspection = async (req, res) => {
  const ticket = parsePositiveInteger(req.params.ticket);
  if (ticket === null) return res.status(400).json({ message: "Tiquete invalido" });

  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const abort = async (status, message) => {
      await connection.rollback();
      return res.status(status).json({ message });
    };

    const [tires] = await connection.query(
      `SELECT id_llanta
       FROM llantas
       WHERE id_llanta = ?
       FOR UPDATE`,
      [ticket],
    );
    if (tires.length === 0) return abort(404, "Llanta no encontrada");

    if (await hasTermination(connection, ticket)) {
      return abort(
        409,
        "No es posible deshacer la inspeccion final porque la llanta ya tiene Terminacion registrada",
      );
    }

    const [latest] = await connection.query(
      `SELECT id_proceso
       FROM procesos
       WHERE id_llanta = ?
         AND id_subproceso = ?
       ORDER BY fecha_registro DESC, id_proceso DESC
       LIMIT 1`,
      [ticket, FINAL_INSPECTION_SUBPROCESS_ID],
    );

    if (latest.length === 0) {
      return abort(404, "La llanta no tiene Inspeccion Final registrada");
    }

    await connection.query("DELETE FROM procesos WHERE id_proceso = ?", [latest[0].id_proceso]);
    await setCurrentFinalInspectionFromLatestProcess(connection, ticket);

    await connection.commit();
    res.json({ message: "Inspeccion final deshecha correctamente" });
  } catch (error) {
    await connection.rollback();
    console.error("Error en undoFinalInspection:", error);
    res.status(500).json({ message: "Error interno al deshacer la inspeccion final" });
  } finally {
    connection.release();
  }
};
