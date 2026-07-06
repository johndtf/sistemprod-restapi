import { pool } from "../db.js";
import { getCompletedSubprocessIds } from "../services/tireProcesses.service.js";

// ==================== CONSTANTES DEL SUBPROCESO ====================
// Los identificadores corresponden a los catalogos subprocesos,
// estados_llanta y resoluciones_i de la base de datos.
const PREPARATION_SUBPROCESS_ID = 3;
const SCRAPING_SUBPROCESS_ID = 2;
const APT_STATE_ID = 1;
const REJECTED_STATE_ID = 2;
const APT_RESOLUTION_ID = 1;

// ==================== VALIDACION Y NORMALIZACION ====================
// Los identificadores llegan desde parametros HTML o JSON y, por tanto,
// pueden ser texto. Solo se aceptan enteros positivos y seguros para JS.
const parsePositiveInteger = (value) => {
  const number = Number(value);
  return Number.isSafeInteger(number) && number > 0 ? number : null;
};

// datetime-local utiliza la letra T entre fecha y hora. MySQL acepta el
// mismo valor con un espacio, por eso se normaliza antes de guardarlo.
const normalizeDateTime = (value) => {
  if (typeof value !== "string" || !value.trim()) return null;

  const normalized = value.trim().replace("T", " ");
  return /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}(:\d{2})?$/.test(normalized)
    ? normalized
    : null;
};

const parsePreparationData = (body) => {
  const operator = parsePositiveInteger(body.id_operario);
  const processDate = normalizeDateTime(body.fecha_preparacion);

  if (operator === null || processDate === null) return null;
  return { operator, processDate };
};

// ==================== REGLAS DE ELEGIBILIDAD ====================
// Preparacion solo recibe llantas APTAS con al menos un Raspado aprobado.
// Cuando lock=true, FOR UPDATE impide que otra solicitud cambie la misma
// llanta mientras se registra el resultado de este subproceso.
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
      message: "Solo las llantas APTAS pueden ingresar al subproceso de Preparación",
    };
  }

  const [scraping] = await connection.query(
    `SELECT COUNT(*) AS total
     FROM procesos
     WHERE id_llanta = ?
       AND id_subproceso = ?
       AND id_estado_resultado = ?`,
    [ticket, SCRAPING_SUBPROCESS_ID, APT_STATE_ID],
  );

  if (scraping[0].total === 0) {
    return {
      status: 409,
      message: "La llanta no tiene un Raspado aprobado",
    };
  }

  return { tire: tires[0] };
};

// ==================== CATALOGOS DEL FORMULARIO ====================
// Se ofrecen unicamente empleados activos; el estado se valida nuevamente
// dentro de la transaccion porque podria cambiar mientras el formulario esta abierto.
export const getActivePreparationOperators = async (_req, res) => {
  try {
    const [operators] = await pool.query(
      `SELECT id_empleado, nombre, apellido
       FROM empleados
       WHERE estado = 'A'
       ORDER BY nombre, apellido`,
    );

    res.json(operators);
  } catch (error) {
    console.error("Error en getActivePreparationOperators:", error);
    res.status(500).json({ message: "No se pudieron consultar los operarios" });
  }
};

// Preparacion usa los motivos de inspeccion para rechazar, excluyendo las
// resoluciones PENDIENTE (0) y APTA (1), que no son motivos de rechazo.
export const getPreparationRejectionReasons = async (_req, res) => {
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
    console.error("Error en getPreparationRejectionReasons:", error);
    res.status(500).json({ message: "No se pudieron consultar los motivos" });
  }
};

// ==================== CONSULTAR LLANTA ====================
// Ademas de la informacion general, se devuelve la cantidad de preparaciones
// historicas. El frontend usa ese dato para avisar cuando sera un reproceso.
export const getPreparationTire = async (req, res) => {
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
              l.fecha_preparacion, l.id_operario_preparacion,
              e.descripcion AS estado,
              CONCAT(o.numero_orden, ' - ', LPAD(l.consec_orden, 2, '0')) AS orden,
              TRIM(CONCAT(c.nombre, ' ', COALESCE(c.apellido, ''))) AS cliente,
              m.marca, d.dimension, b.banda AS diseno,
              CASE WHEN ep.id_empleado IS NULL THEN NULL
                   ELSE TRIM(CONCAT(ep.id_empleado, ' - ', ep.nombre, ' ', COALESCE(ep.apellido, '')))
              END AS ultimo_operario
       FROM llantas l
       JOIN ordenes o ON l.id_orden = o.id_orden
       JOIN clientes c ON o.id_cliente = c.id_cliente
       JOIN estados_llanta e ON l.id_estado = e.id_estado
       LEFT JOIN marcas m ON l.id_marca = m.id_marca
       LEFT JOIN dimensiones d ON l.id_dimension = d.id_dimension
       LEFT JOIN bandas b ON l.id_banda = b.id_banda
       LEFT JOIN empleados ep ON l.id_operario_preparacion = ep.id_empleado
       WHERE l.id_llanta = ?`,
      [ticket],
    );

    const [history] = await pool.query(
      `SELECT COUNT(*) AS total
       FROM procesos
       WHERE id_llanta = ? AND id_subproceso = ?`,
      [ticket, PREPARATION_SUBPROCESS_ID],
    );

    const subprocesos = await getCompletedSubprocessIds(pool, ticket);

    res.json({
      ...rows[0],
      preparaciones_registradas: history[0].total,
      subprocesos,
    });
  } catch (error) {
    console.error("Error en getPreparationTire:", error);
    res.status(500).json({ message: "No se pudo consultar la llanta" });
  }
};

// ==================== REGISTRAR RESULTADO ====================
// Completar y rechazar comparten la misma transaccion. Solo cambian la
// resolucion, el estado resultante y el mensaje devuelto al frontend.
const registerPreparationResult = async ({
  req,
  res,
  resolutionId,
  resultStateId,
  successMessage,
}) => {
  const ticket = parsePositiveInteger(req.params.ticket);
  const preparationData = parsePreparationData(req.body);

  if (ticket === null || preparationData === null) {
    return res
      .status(400)
      .json({ message: "Datos de preparación inválidos o incompletos" });
  }

  const observation =
    typeof req.body.observacion === "string"
      ? req.body.observacion.trim() || null
      : null;
  let connection;

  try {
    connection = await pool.getConnection();
    await connection.beginTransaction();

    // Toda validacion fallida despues de iniciar la transaccion debe hacer
    // rollback antes de responder y liberar la conexion.
    const abortTransaction = async (status, message) => {
      await connection.rollback();
      return res.status(status).json({ message });
    };

    // 1. Bloquear la llanta y comprobar nuevamente estado y Raspado aprobado.
    const eligibility = await validateEligibleTire(connection, ticket, true);
    if (eligibility.message) {
      return abortTransaction(eligibility.status, eligibility.message);
    }

    // 2. Evitar asignar un empleado que ya no este activo al momento de guardar.
    const [operators] = await connection.query(
      `SELECT id_empleado
       FROM empleados
       WHERE id_empleado = ? AND estado = 'A'`,
      [preparationData.operator],
    );

    if (operators.length === 0) {
      return abortTransaction(400, "El operario no existe o no está activo");
    }

    // 3. Para un rechazo, comprobar que la resolucion sea un motivo valido.
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

    // 4. Cada repeticion conserva el registro anterior y marca el nuevo como reproceso.
    const [history] = await connection.query(
      `SELECT COUNT(*) AS total
       FROM procesos
       WHERE id_llanta = ? AND id_subproceso = ?`,
      [ticket, PREPARATION_SUBPROCESS_ID],
    );
    const reprocess = history[0].total > 0 ? 1 : 0;
    const registrationDate = new Date();

    // 5. llantas representa el resultado vigente de la ultima Preparacion.
    await connection.query(
      `UPDATE llantas
       SET fecha_preparacion = ?,
           fecha_registro_preparacion = ?,
           id_operario_preparacion = ?,
           id_resolucion_preparacion = ?,
           id_estado = ?
       WHERE id_llanta = ?`,
      [
        preparationData.processDate,
        registrationDate,
        preparationData.operator,
        resolutionId,
        resultStateId,
        ticket,
      ],
    );

    // 6. procesos agrega una fila inmutable para conservar la trazabilidad.
    await connection.query(
      `INSERT INTO procesos
        (id_llanta, id_subproceso, fecha, fecha_registro, observacion,
         id_resolucion, reproceso, id_operario, id_estado_resultado, nivel_reenc)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        ticket,
        PREPARATION_SUBPROCESS_ID,
        preparationData.processDate,
        registrationDate,
        observation,
        resolutionId,
        reprocess,
        preparationData.operator,
        resultStateId,
        eligibility.tire.nivel_reenc,
      ],
    );

    await connection.commit();
    res.status(201).json({ message: successMessage, reproceso: reprocess });
  } catch (error) {
    if (connection) await connection.rollback();
    console.error("Error en registerPreparationResult:", error);
    res.status(500).json({ message: "Error interno al registrar la preparación" });
  } finally {
    connection?.release();
  }
};

// Resultado normal: la llanta conserva el estado APTA y la resolucion APTA.
export const completePreparation = async (req, res) => {
  return registerPreparationResult({
    req,
    res,
    resolutionId: APT_RESOLUTION_ID,
    resultStateId: APT_STATE_ID,
    successMessage: "Preparación registrada correctamente",
  });
};

// Resultado rechazado: el subproceso 3 permite saber donde ocurrio el rechazo.
export const rejectTireDuringPreparation = async (req, res) => {
  const resolutionId = parsePositiveInteger(req.body.id_resolucion);

  if (resolutionId === null) {
    return res.status(400).json({ message: "Debe seleccionar un motivo de rechazo" });
  }

  return registerPreparationResult({
    req,
    res,
    resolutionId,
    resultStateId: REJECTED_STATE_ID,
    successMessage: "Llanta rechazada durante la preparación",
  });
};
