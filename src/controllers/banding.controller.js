import { pool } from "../db.js";
import { getCompletedSubprocessIds } from "../services/tireProcesses.service.js";

// ==================== IDENTIFICADORES DEL NEGOCIO ====================
// Embandado requiere que la llanta este APTA, tenga Relleno aprobado y un
// Corte de Banda vigente. El tiempo de secado usa el mismo parametro de Relleno.
const BANDING_SUBPROCESS_ID = 7;
const FILLING_SUBPROCESS_ID = 5;
const TREAD_CUT_SUBPROCESS_ID = 6;
const APT_STATE_ID = 1;
const REJECTED_STATE_ID = 2;
const APT_RESOLUTION_ID = 1;
const DRYING_TIME_KEY = "tiempo_secado_relleno_minutos";

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
// Corte no cambia estado ni resolucion, por eso se valida por existencia del
// ultimo proceso de Corte de Banda. Si el corte fue deshecho, no habra proceso.
const validateEligibleTire = async (connection, ticket, lock = false) => {
  const [tires] = await connection.query(
    `SELECT id_llanta, id_estado, nivel_reenc
     FROM llantas
     WHERE id_llanta = ?${lock ? " FOR UPDATE" : ""}`,
    [ticket],
  );

  if (tires.length === 0) return { status: 404, message: "Llanta no encontrada" };
  if (tires[0].id_estado !== APT_STATE_ID) {
    return { status: 409, message: "Solo las llantas APTAS pueden ingresar a Embandado" };
  }

  const [filling] = await connection.query(
    `SELECT MAX(fecha_registro) AS fecha_registro_relleno
     FROM procesos
     WHERE id_llanta = ?
       AND id_subproceso = ?
       AND id_estado_resultado = ?`,
    [ticket, FILLING_SUBPROCESS_ID, APT_STATE_ID],
  );

  if (!filling[0].fecha_registro_relleno) {
    return { status: 409, message: "La llanta no tiene Relleno aprobado" };
  }

  const [cut] = await connection.query(
    `SELECT fecha, fecha_registro
     FROM procesos
     WHERE id_llanta = ?
       AND id_subproceso = ?
     ORDER BY fecha_registro DESC, id_proceso DESC
     LIMIT 1`,
    [ticket, TREAD_CUT_SUBPROCESS_ID],
  );

  if (cut.length === 0) {
    return { status: 409, message: "La llanta no tiene Corte de Banda registrado" };
  }

  if (cut[0].fecha_registro < filling[0].fecha_registro_relleno) {
    return {
      status: 409,
      message: "La llanta requiere un Corte de Banda posterior al ultimo Relleno",
    };
  }

  return {
    tire: tires[0],
    cutDate: cut[0].fecha,
  };
};

// ==================== CATALOGOS DEL FORMULARIO ====================
export const getActiveBandingOperators = async (_req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT id_empleado, nombre, apellido
       FROM empleados
       WHERE estado = 'A'
       ORDER BY nombre, apellido`,
    );
    res.json(rows);
  } catch (error) {
    console.error("Error en getActiveBandingOperators:", error);
    res.status(500).json({ message: "No se pudieron consultar los operarios" });
  }
};

export const getBandingRejectionReasons = async (_req, res) => {
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
    console.error("Error en getBandingRejectionReasons:", error);
    res.status(500).json({ message: "No se pudieron consultar los motivos" });
  }
};

// ==================== CONSULTA DE LLANTA ====================
export const getBandingTire = async (req, res) => {
  const ticket = parsePositiveInteger(req.params.ticket);
  if (ticket === null) return res.status(400).json({ message: "Tiquete invalido" });

  try {
    const eligibility = await validateEligibleTire(pool, ticket);
    if (eligibility.message) {
      return res.status(eligibility.status).json({ message: eligibility.message });
    }

    const [rows] = await pool.query(
      `SELECT l.id_llanta, l.serie, l.nivel_reenc, l.ancho, l.perimetro AS largo,
              e.descripcion AS estado,
              CONCAT(o.numero_orden, ' - ', LPAD(l.consec_orden, 2, '0')) AS orden,
              TRIM(CONCAT(c.nombre, ' ', COALESCE(c.apellido, ''))) AS cliente,
              m.marca, d.dimension, b.banda AS diseno,
              CASE WHEN ec.id_empleado IS NULL THEN NULL
                   ELSE TRIM(CONCAT(ec.id_empleado, ' - ', ec.nombre, ' ', COALESCE(ec.apellido, '')))
              END AS operario_corte
       FROM llantas l
       JOIN ordenes o ON l.id_orden = o.id_orden
       JOIN clientes c ON o.id_cliente = c.id_cliente
       JOIN estados_llanta e ON l.id_estado = e.id_estado
       LEFT JOIN marcas m ON l.id_marca = m.id_marca
       LEFT JOIN dimensiones d ON l.id_dimension = d.id_dimension
       LEFT JOIN bandas b ON l.id_banda = b.id_banda
       LEFT JOIN empleados ec ON l.id_operario_corte = ec.id_empleado
       WHERE l.id_llanta = ?`,
      [ticket],
    );

    const [timingRows] = await pool.query("SELECT NOW() AS fecha_actual");
    const currentDate = timingRows[0].fecha_actual;
    const differenceMinutes = Math.floor(
      (new Date(currentDate).getTime() - new Date(eligibility.cutDate).getTime()) / 60000,
    );
    const minimumMinutes = await getDryingTimeParameter(pool);

    const [history] = await pool.query(
      `SELECT COUNT(*) AS total
       FROM procesos
       WHERE id_llanta = ? AND id_subproceso = ?`,
      [ticket, BANDING_SUBPROCESS_ID],
    );
    const subprocesos = await getCompletedSubprocessIds(pool, ticket);

    res.json({
      ...rows[0],
      fecha_corte_secado: eligibility.cutDate,
      fecha_actual_secado: currentDate,
      diferencia_secado_minutos: differenceMinutes,
      tiempo_minimo_secado_minutos: minimumMinutes,
      secado_cumplido: differenceMinutes >= minimumMinutes,
      embandados_registrados: history[0].total,
      subprocesos,
    });
  } catch (error) {
    console.error("Error en getBandingTire:", error);
    res.status(500).json({ message: "No se pudo consultar la llanta" });
  }
};

// ==================== REGISTRO TRANSACCIONAL ====================
const registerBandingResult = async ({ req, res, resolutionId, resultStateId, successMessage }) => {
  const ticket = parsePositiveInteger(req.params.ticket);
  const operator = parsePositiveInteger(req.body.id_operario);
  const processDate = normalizeDateTime(req.body.fecha_embandado);

  if (ticket === null || operator === null || processDate === null) {
    return res.status(400).json({ message: "Datos de embandado invalidos o incompletos" });
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
      [ticket, BANDING_SUBPROCESS_ID],
    );
    const reprocess = history[0].total > 0 ? 1 : 0;
    const registrationDate = new Date();

    await connection.query(
      `UPDATE llantas
       SET fecha_embandado = ?,
           fecha_registro_embandado = ?,
           id_operario_embandado = ?,
           id_resolucion_embandado = ?,
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
        BANDING_SUBPROCESS_ID,
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
    console.error("Error en registerBandingResult:", error);
    res.status(500).json({ message: "Error interno al registrar el embandado" });
  } finally {
    connection?.release();
  }
};

export const completeBanding = (req, res) =>
  registerBandingResult({
    req,
    res,
    resolutionId: APT_RESOLUTION_ID,
    resultStateId: APT_STATE_ID,
    successMessage: "Embandado registrado correctamente",
  });

export const rejectTireDuringBanding = (req, res) => {
  const resolutionId = parsePositiveInteger(req.body.id_resolucion);
  if (resolutionId === null) {
    return res.status(400).json({ message: "Debe seleccionar un motivo de rechazo" });
  }
  return registerBandingResult({
    req,
    res,
    resolutionId,
    resultStateId: REJECTED_STATE_ID,
    successMessage: "Llanta rechazada durante el embandado",
  });
};
