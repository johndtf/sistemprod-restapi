import { pool } from "../db.js";
import { getCompletedSubprocessIds } from "../services/tireProcesses.service.js";

// ==================== CONSTANTES DEL SUBPROCESO ====================
// Estos identificadores provienen de los catálogos subprocesos,
// estados_llanta y resoluciones_i de la base de datos.
const SCRAPING_SUBPROCESS_ID = 2;
const APT_STATE_ID = 1;
const REJECTED_STATE_ID = 2;
const APT_RESOLUTION_ID = 1;

// ==================== VALIDACIÓN Y NORMALIZACIÓN ====================
// Convierte identificadores recibidos como texto a enteros positivos.
// Number.isSafeInteger evita aceptar decimales, Infinity o números inseguros.
const parsePositiveInteger = (value) => {
  const number = Number(value);
  return Number.isSafeInteger(number) && number > 0 ? number : null;
};

const parseMeasurement = (value) => {
  const number = parsePositiveInteger(value);
  return number !== null && number <= 65535 ? number : null;
};

// Los controles datetime-local envían "AAAA-MM-DDTHH:mm". MySQL espera
// el separador de fecha y hora como espacio, por eso se normaliza antes de usarlo.
const normalizeDateTime = (value) => {
  if (typeof value !== "string" || !value.trim()) return null;

  const normalized = value.trim().replace("T", " ");
  return /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}(:\d{2})?$/.test(normalized)
    ? normalized
    : null;
};

// Reúne y valida los datos comunes tanto para aprobar como para rechazar
// una llanta durante Raspado. Devuelve null cuando falta cualquier dato.
const parseScrapingData = (body) => {
  const radio = parseMeasurement(body.radio_r);
  const perimeter = parseMeasurement(body.perimetro);
  const width = parseMeasurement(body.ancho);
  const operator = parsePositiveInteger(body.id_operario);
  const beltRemoval = Number(body.retiro_cinturon);
  const processDate = normalizeDateTime(body.fecha_raspado);

  if (
    radio === null ||
    perimeter === null ||
    width === null ||
    operator === null ||
    ![0, 1].includes(beltRemoval) ||
    processDate === null
  ) {
    return null;
  }

  return {
    radio,
    perimeter,
    width,
    operator,
    beltRemoval,
    processDate,
  };
};

// ==================== REGLAS DE ELEGIBILIDAD ====================
// Una llanta solo puede ingresar a Raspado si está APTA y tiene una
// Inspección Inicial aprobada en procesos. Cuando lock=true se usa FOR UPDATE
// para impedir que dos solicitudes modifiquen la misma llanta simultáneamente.
const validateEligibleTire = async (connection, ticket, lock = false) => {
  const [tires] = await connection.query(
    `SELECT id_llanta, id_estado, nivel_reenc
     FROM llantas
     WHERE id_llanta = ?${lock ? " FOR UPDATE" : ""}`,
    [ticket],
  );

  if (tires.length === 0) {
    return { status: 404, message: "Llanta no encontrada" };
  }

  if (tires[0].id_estado !== APT_STATE_ID) {
    return {
      status: 409,
      message: "Solo las llantas APTAS pueden ingresar al subproceso de Raspado",
    };
  }

  const [initialInspection] = await connection.query(
    `SELECT COUNT(*) AS total
     FROM procesos
     WHERE id_llanta = ?
       AND id_subproceso = 1
       AND id_estado_resultado = ?`,
    [ticket, APT_STATE_ID],
  );

  if (initialInspection[0].total === 0) {
    return {
      status: 409,
      message: "La llanta no tiene una Inspección Inicial aprobada",
    };
  }

  return { tire: tires[0] };
};

// ==================== CATÁLOGO DE OPERARIOS ====================
// El formulario solo recibe empleados activos porque los empleados inactivos
// o retirados no pueden asignarse a nuevas ejecuciones de producción.
export const getActiveScrapingOperators = async (_req, res) => {
  try {
    const [operators] = await pool.query(
      `SELECT id_empleado, nombre, apellido
       FROM empleados
       WHERE estado = 'A'
       ORDER BY nombre, apellido`,
    );

    res.json(operators);
  } catch (error) {
    console.error("Error en getActiveScrapingOperators:", error);
    res.status(500).json({ message: "No se pudieron consultar los operarios" });
  }
};

// ==================== MOTIVOS DE RECHAZO ====================
// Raspado reutiliza resoluciones_i, pero excluye PENDIENTE (0) y APTA (1),
// ya que este endpoint alimenta exclusivamente el selector de rechazo.
export const getScrapingRejectionReasons = async (_req, res) => {
  try {
    const [resolutions] = await pool.query(
      `SELECT id_inspec, codigo, resol_inspec
       FROM resoluciones_i
       WHERE id_inspec NOT IN (0, ?)
       ORDER BY codigo, resol_inspec`,
      [APT_RESOLUTION_ID],
    );

    res.json(resolutions);
  } catch (error) {
    console.error("Error en getScrapingRejectionReasons:", error);
    res.status(500).json({ message: "No se pudieron consultar los motivos" });
  }
};

// ==================== CONSULTAR LLANTA PARA RASPADO ====================
// Además de los datos generales, devuelve las últimas medidas guardadas en
// llantas y la cantidad de raspados históricos para advertir sobre reprocesos.
export const getScrapingTire = async (req, res) => {
  const ticket = parsePositiveInteger(req.params.ticket);

  if (ticket === null) {
    return res.status(400).json({ message: "Tiquete inválido" });
  }

  try {
    const eligibility = await validateEligibleTire(pool, ticket);
    if (eligibility.message) {
      return res.status(eligibility.status).json({ message: eligibility.message });
    }

    const [rows] = await pool.query(
      `SELECT l.id_llanta, l.serie, l.nivel_reenc,
              l.radio_r, l.perimetro, l.ancho, l.retiro_cinturon,
              e.descripcion AS estado,
              CONCAT(o.numero_orden, ' - ', LPAD(l.consec_orden, 2, '0')) AS orden,
              TRIM(CONCAT(c.nombre, ' ', COALESCE(c.apellido, ''))) AS cliente,
              m.marca, d.dimension, b.banda AS diseno
       FROM llantas l
       JOIN ordenes o ON l.id_orden = o.id_orden
       JOIN clientes c ON o.id_cliente = c.id_cliente
       JOIN estados_llanta e ON l.id_estado = e.id_estado
       LEFT JOIN marcas m ON l.id_marca = m.id_marca
       LEFT JOIN dimensiones d ON l.id_dimension = d.id_dimension
       LEFT JOIN bandas b ON l.id_banda = b.id_banda
       WHERE l.id_llanta = ?`,
      [ticket],
    );

    const [history] = await pool.query(
      `SELECT COUNT(*) AS total
       FROM procesos
       WHERE id_llanta = ? AND id_subproceso = ?`,
      [ticket, SCRAPING_SUBPROCESS_ID],
    );

    const subprocesos = await getCompletedSubprocessIds(pool, ticket);

    res.json({
      ...rows[0],
      raspados_registrados: history[0].total,
      subprocesos,
    });
  } catch (error) {
    console.error("Error en getScrapingTire:", error);
    res.status(500).json({ message: "No se pudo consultar la llanta" });
  }
};

// ==================== REGISTRAR RESULTADO DE RASPADO ====================
// Esta función concentra el flujo transaccional compartido por "completar"
// y "rechazar". resolutionId y resultStateId determinan el resultado final.
const registerScrapingResult = async ({
  req,
  res,
  resolutionId,
  resultStateId,
  successMessage,
}) => {
  const ticket = parsePositiveInteger(req.params.ticket);
  const scrapingData = parseScrapingData(req.body);

  if (ticket === null || scrapingData === null) {
    return res.status(400).json({ message: "Datos de raspado inválidos o incompletos" });
  }

  const observation =
    typeof req.body.observacion === "string"
      ? req.body.observacion.trim() || null
      : null;
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    // Toda salida anticipada posterior a beginTransaction debe revertir la
    // transacción antes de responder y liberar la conexión.
    const abortTransaction = async (status, message) => {
      await connection.rollback();
      return res.status(status).json({ message });
    };

    // 1. Bloquear la llanta y volver a validar su estado dentro de la transacción.
    const eligibility = await validateEligibleTire(connection, ticket, true);
    if (eligibility.message) {
      return abortTransaction(eligibility.status, eligibility.message);
    }

    // 2. Confirmar que el operario seleccionado sigue activo al guardar.
    const [operators] = await connection.query(
      `SELECT id_empleado
       FROM empleados
       WHERE id_empleado = ? AND estado = 'A'`,
      [scrapingData.operator],
    );

    if (operators.length === 0) {
      return abortTransaction(400, "El operario no existe o no está activo");
    }

    // 3. En rechazos, validar que el motivo exista y no sea PENDIENTE ni APTA.
    if (resultStateId === REJECTED_STATE_ID) {
      const [resolutions] = await connection.query(
        `SELECT id_inspec
         FROM resoluciones_i
         WHERE id_inspec = ? AND id_inspec NOT IN (0, ?)`,
        [resolutionId, APT_RESOLUTION_ID],
      );

      if (resolutions.length === 0) {
        return abortTransaction(400, "Motivo de rechazo inválido");
      }
    }

    // 4. Una ejecución posterior del mismo subproceso se marca como reproceso.
    // El registro anterior nunca se actualiza ni se elimina.
    const [history] = await connection.query(
      `SELECT COUNT(*) AS total
       FROM procesos
       WHERE id_llanta = ? AND id_subproceso = ?`,
      [ticket, SCRAPING_SUBPROCESS_ID],
    );
    const reprocess = history[0].total > 0 ? 1 : 0;
    const registrationDate = new Date();

    // 5. llantas conserva el estado actual y los últimos valores medidos.
    await connection.query(
      `UPDATE llantas
       SET radio_r = ?,
           perimetro = ?,
           ancho = ?,
           retiro_cinturon = ?,
           fecha_raspado = ?,
           fecha_registro_raspado = ?,
           id_operario_raspado = ?,
           id_resolucion_raspado = ?,
           id_estado = ?
       WHERE id_llanta = ?`,
      [
        scrapingData.radio,
        scrapingData.perimeter,
        scrapingData.width,
        scrapingData.beltRemoval,
        scrapingData.processDate,
        registrationDate,
        scrapingData.operator,
        resolutionId,
        resultStateId,
        ticket,
      ],
    );

    // 6. procesos recibe una nueva fila con la copia histórica completa.
    await connection.query(
      `INSERT INTO procesos
        (id_llanta, id_subproceso, fecha, fecha_registro, observacion,
         id_resolucion, reproceso, id_operario, id_estado_resultado,
         nivel_reenc, radio_r, perimetro, ancho, retiro_cinturon)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        ticket,
        SCRAPING_SUBPROCESS_ID,
        scrapingData.processDate,
        registrationDate,
        observation,
        resolutionId,
        reprocess,
        scrapingData.operator,
        resultStateId,
        eligibility.tire.nivel_reenc,
        scrapingData.radio,
        scrapingData.perimeter,
        scrapingData.width,
        scrapingData.beltRemoval,
      ],
    );

    await connection.commit();
    res.status(201).json({ message: successMessage, reproceso: reprocess });
  } catch (error) {
    await connection.rollback();
    console.error("Error en registerScrapingResult:", error);
    res.status(500).json({ message: "Error interno al registrar el raspado" });
  } finally {
    connection.release();
  }
};

// Resultado normal: la llanta continúa APTA y usa la resolución APTA.
export const completeScraping = async (req, res) => {
  return registerScrapingResult({
    req,
    res,
    resolutionId: APT_RESOLUTION_ID,
    resultStateId: APT_STATE_ID,
    successMessage: "Raspado registrado correctamente",
  });
};

// Resultado de rechazo: la resolución viene del selector de motivos y la
// llanta cambia a RECHAZADA. El subproceso 2 permite distinguirla de una DST.
export const rejectTireDuringScraping = async (req, res) => {
  const resolutionId = parsePositiveInteger(req.body.id_resolucion);

  if (resolutionId === null) {
    return res.status(400).json({ message: "Debe seleccionar un motivo de rechazo" });
  }

  return registerScrapingResult({
    req,
    res,
    resolutionId,
    resultStateId: REJECTED_STATE_ID,
    successMessage: "Llanta rechazada durante el raspado",
  });
};
