import { pool } from "../db.js";
import { getCompletedSubprocessIds } from "../services/tireProcesses.service.js";

// ==================== IDENTIFICADORES DEL NEGOCIO ====================
// Relleno es el subproceso 5. Para poder entrar, la llanta debe estar APTA y
// tener al menos una Preparacion aprobada. Reparacion es opcional.
const FILLING_SUBPROCESS_ID = 5;
const PREPARATION_SUBPROCESS_ID = 3;
const REPAIR_SUBPROCESS_ID = 4;
const APT_STATE_ID = 1;
const REJECTED_STATE_ID = 2;
const APT_RESOLUTION_ID = 1;
const DRYING_TIME_KEY = "tiempo_secado_relleno_minutos";

// ==================== NORMALIZACION ====================
// Los valores llegan desde HTML como texto; estas funciones concentran la
// validacion para que las rutas de completar y rechazar usen la misma regla.
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

const getDryingTimeParameter = async (connection) => {
  const [rows] = await connection.query(
    `SELECT valor_numero
     FROM parametros_planta
     WHERE codigo = ?`,
    [DRYING_TIME_KEY],
  );

  return Number(rows[0]?.valor_numero ?? 0);
};

// ==================== ELEGIBILIDAD ====================
// La reparacion no es obligatoria, por eso se consulta aparte. Si existe, la
// diferencia de secado se calcula desde esa fecha; si no, desde Preparacion.
const validateEligibleTire = async (connection, ticket, lock = false) => {
  const [tires] = await connection.query(
    `SELECT id_llanta, id_estado, nivel_reenc
     FROM llantas
     WHERE id_llanta = ?${lock ? " FOR UPDATE" : ""}`,
    [ticket],
  );

  if (tires.length === 0) return { status: 404, message: "Llanta no encontrada" };
  if (tires[0].id_estado !== APT_STATE_ID) {
    return { status: 409, message: "Solo las llantas APTAS pueden ingresar a Relleno" };
  }

  const [preparation] = await connection.query(
    `SELECT MAX(fecha) AS fecha_preparacion
     FROM procesos
     WHERE id_llanta = ?
       AND id_subproceso = ?
       AND id_estado_resultado = ?`,
    [ticket, PREPARATION_SUBPROCESS_ID, APT_STATE_ID],
  );

  if (!preparation[0].fecha_preparacion) {
    return { status: 409, message: "La llanta no tiene Preparacion aprobada" };
  }

  return {
    tire: tires[0],
    preparationDate: preparation[0].fecha_preparacion,
  };
};

// ==================== CATALOGOS DEL FORMULARIO ====================
export const getActiveFillingOperators = async (_req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT id_empleado, nombre, apellido
       FROM empleados
       WHERE estado = 'A'
       ORDER BY nombre, apellido`,
    );
    res.json(rows);
  } catch (error) {
    console.error("Error en getActiveFillingOperators:", error);
    res.status(500).json({ message: "No se pudieron consultar los operarios" });
  }
};

export const getFillingRejectionReasons = async (_req, res) => {
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
    console.error("Error en getFillingRejectionReasons:", error);
    res.status(500).json({ message: "No se pudieron consultar los motivos" });
  }
};

// ==================== CONSULTA DE LLANTA ====================
// Ademas de la informacion general, esta ruta devuelve las fechas de secado y
// la diferencia en minutos para orientar al usuario antes de registrar Relleno.
export const getFillingTire = async (req, res) => {
  const ticket = parsePositiveInteger(req.params.ticket);
  if (ticket === null) return res.status(400).json({ message: "Tiquete invalido" });

  try {
    const eligibility = await validateEligibleTire(pool, ticket);
    if (eligibility.message) {
      return res.status(eligibility.status).json({ message: eligibility.message });
    }

    const [rows] = await pool.query(
      `SELECT l.id_llanta, l.serie, l.nivel_reenc, l.fecha_relleno,
              e.descripcion AS estado,
              CONCAT(o.numero_orden, ' - ', LPAD(l.consec_orden, 2, '0')) AS orden,
              TRIM(CONCAT(c.nombre, ' ', COALESCE(c.apellido, ''))) AS cliente,
              m.marca, d.dimension, b.banda AS diseno,
              CASE WHEN ef.id_empleado IS NULL THEN NULL
                   ELSE TRIM(CONCAT(ef.id_empleado, ' - ', ef.nombre, ' ', COALESCE(ef.apellido, '')))
              END AS ultimo_operario
       FROM llantas l
       JOIN ordenes o ON l.id_orden = o.id_orden
       JOIN clientes c ON o.id_cliente = c.id_cliente
       JOIN estados_llanta e ON l.id_estado = e.id_estado
       LEFT JOIN marcas m ON l.id_marca = m.id_marca
       LEFT JOIN dimensiones d ON l.id_dimension = d.id_dimension
       LEFT JOIN bandas b ON l.id_banda = b.id_banda
       LEFT JOIN empleados ef ON l.id_operario_relleno = ef.id_empleado
       WHERE l.id_llanta = ?`,
      [ticket],
    );

    const [timingRows] = await pool.query(
      `SELECT
         MAX(CASE WHEN id_subproceso = ? AND id_estado_resultado = ? THEN fecha END) AS fecha_preparacion,
         MAX(CASE WHEN id_subproceso = ? AND id_estado_resultado = ? THEN fecha END) AS fecha_reparacion,
         NOW() AS fecha_actual
       FROM procesos
       WHERE id_llanta = ?
         AND id_subproceso IN (?, ?)`,
      [
        PREPARATION_SUBPROCESS_ID,
        APT_STATE_ID,
        REPAIR_SUBPROCESS_ID,
        APT_STATE_ID,
        ticket,
        PREPARATION_SUBPROCESS_ID,
        REPAIR_SUBPROCESS_ID,
      ],
    );

    const timing = timingRows[0];
    const baseDate = timing.fecha_reparacion || timing.fecha_preparacion;
    const differenceMinutes = Math.floor(
      (new Date(timing.fecha_actual).getTime() - new Date(baseDate).getTime()) / 60000,
    );
    const minimumMinutes = await getDryingTimeParameter(pool);

    const [history] = await pool.query(
      `SELECT COUNT(*) AS total
       FROM procesos
       WHERE id_llanta = ? AND id_subproceso = ?`,
      [ticket, FILLING_SUBPROCESS_ID],
    );
    const subprocesos = await getCompletedSubprocessIds(pool, ticket);

    res.json({
      ...rows[0],
      fecha_preparacion_secado: timing.fecha_preparacion,
      fecha_reparacion_secado: timing.fecha_reparacion,
      fecha_actual_secado: timing.fecha_actual,
      diferencia_secado_minutos: differenceMinutes,
      tiempo_minimo_secado_minutos: minimumMinutes,
      secado_cumplido: differenceMinutes >= minimumMinutes,
      rellenos_registrados: history[0].total,
      subprocesos,
    });
  } catch (error) {
    console.error("Error en getFillingTire:", error);
    res.status(500).json({ message: "No se pudo consultar la llanta" });
  }
};

// ==================== REGISTRO TRANSACCIONAL ====================
// Relleno no captura datos tecnicos propios. Aun asi se guarda una fila en
// procesos para conservar trazabilidad y permitir reprocesos.
const registerFillingResult = async ({ req, res, resolutionId, resultStateId, successMessage }) => {
  const ticket = parsePositiveInteger(req.params.ticket);
  const operator = parsePositiveInteger(req.body.id_operario);
  const processDate = normalizeDateTime(req.body.fecha_relleno);

  if (ticket === null || operator === null || processDate === null) {
    return res.status(400).json({ message: "Datos de relleno invalidos o incompletos" });
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
      [ticket, FILLING_SUBPROCESS_ID],
    );
    const reprocess = history[0].total > 0 ? 1 : 0;
    const registrationDate = new Date();

    await connection.query(
      `UPDATE llantas
       SET fecha_relleno = ?,
           fecha_registro_relleno = ?,
           id_operario_relleno = ?,
           id_resolucion_relleno = ?,
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
        FILLING_SUBPROCESS_ID,
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
    console.error("Error en registerFillingResult:", error);
    res.status(500).json({ message: "Error interno al registrar el relleno" });
  } finally {
    connection?.release();
  }
};

export const completeFilling = (req, res) =>
  registerFillingResult({
    req,
    res,
    resolutionId: APT_RESOLUTION_ID,
    resultStateId: APT_STATE_ID,
    successMessage: "Relleno registrado correctamente",
  });

export const rejectTireDuringFilling = (req, res) => {
  const resolutionId = parsePositiveInteger(req.body.id_resolucion);
  if (resolutionId === null) {
    return res.status(400).json({ message: "Debe seleccionar un motivo de rechazo" });
  }
  return registerFillingResult({
    req,
    res,
    resolutionId,
    resultStateId: REJECTED_STATE_ID,
    successMessage: "Llanta rechazada durante el relleno",
  });
};
