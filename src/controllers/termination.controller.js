import { pool } from "../db.js";
import { getCompletedSubprocessIds } from "../services/tireProcesses.service.js";

// ==================== IDENTIFICADORES DEL NEGOCIO ====================
// Terminacion cierra el flujo productivo. La llanta debe venir de Inspeccion
// Final y su estado actual debe ser REPARADA o REENCAUCHADA.
const TERMINATION_SUBPROCESS_ID = 10;
const FINAL_INSPECTION_SUBPROCESS_ID = 9;
const REJECTED_STATE_ID = 2;
const REPAIRED_STATE_ID = 3;
const RETREADED_STATE_ID = 4;
const APT_RESOLUTION_ID = 1;
const ALLOWED_FINAL_STATES = [REPAIRED_STATE_ID, RETREADED_STATE_ID];

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

// ==================== ELEGIBILIDAD ====================
const validateEligibleTire = async (connection, ticket, lock = false) => {
  const [tires] = await connection.query(
    `SELECT id_llanta, id_estado, nivel_reenc
     FROM llantas
     WHERE id_llanta = ?${lock ? " FOR UPDATE" : ""}`,
    [ticket],
  );

  if (tires.length === 0) return { status: 404, message: "Llanta no encontrada" };
  if (!ALLOWED_FINAL_STATES.includes(tires[0].id_estado)) {
    return {
      status: 409,
      message: "Solo las llantas REENCAUCHADAS o REPARADAS pueden ingresar a Terminacion",
    };
  }

  const [finalInspection] = await connection.query(
    `SELECT MAX(fecha_registro) AS fecha_registro_inspeccion_final
     FROM procesos
     WHERE id_llanta = ?
       AND id_subproceso = ?
       AND id_estado_resultado IN (?, ?)`,
    [ticket, FINAL_INSPECTION_SUBPROCESS_ID, REPAIRED_STATE_ID, RETREADED_STATE_ID],
  );

  if (!finalInspection[0].fecha_registro_inspeccion_final) {
    return { status: 409, message: "La llanta no tiene Inspeccion Final aprobada" };
  }

  return { tire: tires[0] };
};

// ==================== CATALOGOS DEL FORMULARIO ====================
export const getActiveTerminationOperators = async (_req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT id_empleado, nombre, apellido
       FROM empleados
       WHERE estado = 'A'
       ORDER BY nombre, apellido`,
    );
    res.json(rows);
  } catch (error) {
    console.error("Error en getActiveTerminationOperators:", error);
    res.status(500).json({ message: "No se pudieron consultar los operarios" });
  }
};

export const getTerminationRejectionReasons = async (_req, res) => {
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
    console.error("Error en getTerminationRejectionReasons:", error);
    res.status(500).json({ message: "No se pudieron consultar los motivos" });
  }
};

// ==================== CONSULTA DE LLANTA ====================
export const getTerminationTire = async (req, res) => {
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
              CASE WHEN et.id_empleado IS NULL THEN NULL
                   ELSE TRIM(CONCAT(et.id_empleado, ' - ', et.nombre, ' ', COALESCE(et.apellido, '')))
              END AS ultimo_operario
       FROM llantas l
       JOIN ordenes o ON l.id_orden = o.id_orden
       JOIN clientes c ON o.id_cliente = c.id_cliente
       JOIN estados_llanta e ON l.id_estado = e.id_estado
       LEFT JOIN marcas m ON l.id_marca = m.id_marca
       LEFT JOIN dimensiones d ON l.id_dimension = d.id_dimension
       LEFT JOIN bandas b ON l.id_banda = b.id_banda
       LEFT JOIN empleados et ON l.id_operario_terminacion = et.id_empleado
       WHERE l.id_llanta = ?`,
      [ticket],
    );

    const [history] = await pool.query(
      `SELECT COUNT(*) AS total
       FROM procesos
       WHERE id_llanta = ? AND id_subproceso = ?`,
      [ticket, TERMINATION_SUBPROCESS_ID],
    );
    const subprocesos = await getCompletedSubprocessIds(pool, ticket);

    res.json({
      ...rows[0],
      terminaciones_registradas: history[0].total,
      subprocesos,
    });
  } catch (error) {
    console.error("Error en getTerminationTire:", error);
    res.status(500).json({ message: "No se pudo consultar la llanta" });
  }
};

// ==================== REGISTRO TRANSACCIONAL ====================
const registerTerminationResult = async ({
  req,
  res,
  resolutionId,
  getResultStateId,
  successMessage,
}) => {
  const ticket = parsePositiveInteger(req.params.ticket);
  const operator = parsePositiveInteger(req.body.id_operario);
  const processDate = normalizeDateTime(req.body.fecha_terminacion);

  if (ticket === null || operator === null || processDate === null) {
    return res.status(400).json({ message: "Datos de terminacion invalidos o incompletos" });
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
    if (operators.length === 0) return abort(400, "El operario no existe o no esta activo");

    const resultStateId = getResultStateId(eligibility.tire);

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
      [ticket, TERMINATION_SUBPROCESS_ID],
    );
    const reprocess = history[0].total > 0 ? 1 : 0;
    const registrationDate = new Date();

    await connection.query(
      `UPDATE llantas
       SET fecha_terminacion = ?,
           fecha_registro_terminacion = ?,
           id_operario_terminacion = ?,
           id_resolucion_terminacion = ?,
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
        TERMINATION_SUBPROCESS_ID,
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
    console.error("Error en registerTerminationResult:", error);
    res.status(500).json({ message: "Error interno al registrar la terminacion" });
  } finally {
    connection?.release();
  }
};

export const completeTermination = (req, res) =>
  registerTerminationResult({
    req,
    res,
    resolutionId: APT_RESOLUTION_ID,
    getResultStateId: (tire) => tire.id_estado,
    successMessage: "Terminacion registrada correctamente",
  });

export const rejectTireDuringTermination = (req, res) => {
  const resolutionId = parsePositiveInteger(req.body.id_resolucion);
  if (resolutionId === null) {
    return res.status(400).json({ message: "Debe seleccionar un motivo de rechazo" });
  }
  return registerTerminationResult({
    req,
    res,
    resolutionId,
    getResultStateId: () => REJECTED_STATE_ID,
    successMessage: "Llanta rechazada durante la terminacion",
  });
};
