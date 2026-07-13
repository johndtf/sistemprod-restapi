import { pool } from "../db.js";
import { getCompletedSubprocessIds } from "../services/tireProcesses.service.js";

// ==================== IDENTIFICADORES DEL NEGOCIO ====================
// Vulcanizado ocupa la posicion 8 del flujo productivo. No captura datos
// tecnicos propios: solo valida que exista Embandado aprobado y registra la
// trazabilidad del operario, fecha, resolucion y posible rechazo.
const VULCANIZATION_SUBPROCESS_ID = 8;
const BANDING_SUBPROCESS_ID = 7;
const APT_STATE_ID = 1;
const REJECTED_STATE_ID = 2;
const APT_RESOLUTION_ID = 1;

// ==================== NORMALIZACION ====================
// Los datos llegan desde el HTML como texto. Centralizar esta validacion evita
// que completar y rechazar apliquen reglas distintas para el mismo formulario.
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
// La llanta debe seguir APTA y tener Embandado aprobado. Si Embandado rechazo
// la llanta, el estado actual ya no sera APTA y esta validacion la bloquea.
const validateEligibleTire = async (connection, ticket, lock = false) => {
  const [tires] = await connection.query(
    `SELECT id_llanta, id_estado, nivel_reenc
     FROM llantas
     WHERE id_llanta = ?${lock ? " FOR UPDATE" : ""}`,
    [ticket],
  );

  if (tires.length === 0) return { status: 404, message: "Llanta no encontrada" };
  if (tires[0].id_estado !== APT_STATE_ID) {
    return { status: 409, message: "Solo las llantas APTAS pueden ingresar a Vulcanizado" };
  }

  const [banding] = await connection.query(
    `SELECT MAX(fecha_registro) AS fecha_registro_embandado
     FROM procesos
     WHERE id_llanta = ?
       AND id_subproceso = ?
       AND id_estado_resultado = ?`,
    [ticket, BANDING_SUBPROCESS_ID, APT_STATE_ID],
  );

  if (!banding[0].fecha_registro_embandado) {
    return { status: 409, message: "La llanta no tiene Embandado aprobado" };
  }

  return { tire: tires[0] };
};

// ==================== CATALOGOS DEL FORMULARIO ====================
export const getActiveVulcanizationOperators = async (_req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT id_empleado, nombre, apellido
       FROM empleados
       WHERE estado = 'A'
       ORDER BY nombre, apellido`,
    );
    res.json(rows);
  } catch (error) {
    console.error("Error en getActiveVulcanizationOperators:", error);
    res.status(500).json({ message: "No se pudieron consultar los operarios" });
  }
};

export const getVulcanizationRejectionReasons = async (_req, res) => {
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
    console.error("Error en getVulcanizationRejectionReasons:", error);
    res.status(500).json({ message: "No se pudieron consultar los motivos" });
  }
};

// ==================== CONSULTA DE LLANTA ====================
// La consulta devuelve solo el contexto operativo necesario para confirmar que
// se esta registrando la llanta correcta antes de vulcanizar o rechazar.
export const getVulcanizationTire = async (req, res) => {
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
              CASE WHEN ev.id_empleado IS NULL THEN NULL
                   ELSE TRIM(CONCAT(ev.id_empleado, ' - ', ev.nombre, ' ', COALESCE(ev.apellido, '')))
              END AS ultimo_operario
       FROM llantas l
       JOIN ordenes o ON l.id_orden = o.id_orden
       JOIN clientes c ON o.id_cliente = c.id_cliente
       JOIN estados_llanta e ON l.id_estado = e.id_estado
       LEFT JOIN marcas m ON l.id_marca = m.id_marca
       LEFT JOIN dimensiones d ON l.id_dimension = d.id_dimension
       LEFT JOIN bandas b ON l.id_banda = b.id_banda
       LEFT JOIN empleados ev ON l.id_operario_vulcanizado = ev.id_empleado
       WHERE l.id_llanta = ?`,
      [ticket],
    );

    const [history] = await pool.query(
      `SELECT COUNT(*) AS total
       FROM procesos
       WHERE id_llanta = ? AND id_subproceso = ?`,
      [ticket, VULCANIZATION_SUBPROCESS_ID],
    );
    const subprocesos = await getCompletedSubprocessIds(pool, ticket);

    res.json({
      ...rows[0],
      vulcanizados_registrados: history[0].total,
      subprocesos,
    });
  } catch (error) {
    console.error("Error en getVulcanizationTire:", error);
    res.status(500).json({ message: "No se pudo consultar la llanta" });
  }
};

// ==================== REGISTRO TRANSACCIONAL ====================
// Tanto aprobar como rechazar crean historial en procesos. La tabla llantas
// conserva solamente la ultima actualizacion de Vulcanizado para consultas
// rapidas del estado vigente.
const registerVulcanizationResult = async ({
  req,
  res,
  resolutionId,
  resultStateId,
  successMessage,
}) => {
  const ticket = parsePositiveInteger(req.params.ticket);
  const operator = parsePositiveInteger(req.body.id_operario);
  const processDate = normalizeDateTime(req.body.fecha_vulcanizado);

  if (ticket === null || operator === null || processDate === null) {
    return res.status(400).json({ message: "Datos de vulcanizado invalidos o incompletos" });
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
      [ticket, VULCANIZATION_SUBPROCESS_ID],
    );
    const reprocess = history[0].total > 0 ? 1 : 0;
    const registrationDate = new Date();

    await connection.query(
      `UPDATE llantas
       SET fecha_vulcanizado = ?,
           fecha_registro_vulcanizado = ?,
           id_operario_vulcanizado = ?,
           id_resolucion_vulcanizado = ?,
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
        VULCANIZATION_SUBPROCESS_ID,
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
    console.error("Error en registerVulcanizationResult:", error);
    res.status(500).json({ message: "Error interno al registrar el vulcanizado" });
  } finally {
    connection?.release();
  }
};

export const completeVulcanization = (req, res) =>
  registerVulcanizationResult({
    req,
    res,
    resolutionId: APT_RESOLUTION_ID,
    resultStateId: APT_STATE_ID,
    successMessage: "Vulcanizado registrado correctamente",
  });

export const rejectTireDuringVulcanization = (req, res) => {
  const resolutionId = parsePositiveInteger(req.body.id_resolucion);
  if (resolutionId === null) {
    return res.status(400).json({ message: "Debe seleccionar un motivo de rechazo" });
  }
  return registerVulcanizationResult({
    req,
    res,
    resolutionId,
    resultStateId: REJECTED_STATE_ID,
    successMessage: "Llanta rechazada durante el vulcanizado",
  });
};
