import { pool } from "../db.js";
import { getCompletedSubprocessIds } from "../services/tireProcesses.service.js";

// ==================== IDENTIFICADORES DEL NEGOCIO ====================
// Reparación ocupa la posición 4 del catálogo de subprocesos. Los estados y
// la resolución APTA se comparten con los módulos productivos anteriores.
const REPAIR_SUBPROCESS_ID = 4;
const APT_STATE_ID = 1;
const REJECTED_STATE_ID = 2;
const APT_RESOLUTION_ID = 1;

// ==================== NORMALIZACIÓN DE ENTRADAS ====================
// Los datos enviados desde controles HTML llegan como texto. Convertirlos en
// un solo lugar evita repetir validaciones y rechaza decimales o valores cero.
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

// La clave compuesta de reparaciones_proceso evita duplicados en la base de
// datos; esta validación entrega además un mensaje claro antes de insertar.
const parseRepairDetails = (details) => {
  if (!Array.isArray(details)) return null;
  const ids = new Set();
  const parsed = [];

  for (const detail of details) {
    const repairId = parsePositiveInteger(detail.id_reparacion);
    const quantity = parsePositiveInteger(detail.cantidad);
    if (repairId === null || quantity === null || quantity > 65535 || ids.has(repairId)) {
      return null;
    }
    ids.add(repairId);
    parsed.push({ repairId, quantity });
  }

  return parsed;
};

// ==================== ELEGIBILIDAD DE LA LLANTA ====================
// Reparación es opcional y no depende de Raspado o Preparación. La única regla
// de entrada es que la llanta exista y esté APTA. Durante el registro se usa
// FOR UPDATE para evitar que otra solicitud cambie su estado simultáneamente.
const validateEligibleTire = async (connection, ticket, lock = false) => {
  const [tires] = await connection.query(
    `SELECT id_llanta, id_estado, nivel_reenc
     FROM llantas
     WHERE id_llanta = ?${lock ? " FOR UPDATE" : ""}`,
    [ticket],
  );

  if (tires.length === 0) return { status: 404, message: "Llanta no encontrada" };
  if (tires[0].id_estado !== APT_STATE_ID) {
    return {
      status: 409,
      message: "Solo las llantas APTAS pueden ingresar a Reparación",
    };
  }
  return { tire: tires[0] };
};

// ==================== CATÁLOGOS DEL FORMULARIO ====================
// Estas rutas usan el permiso productivo "reparacion". Así el operario puede
// consultar opciones sin necesitar permisos administrativos sobre catálogos.
export const getActiveRepairOperators = async (_req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT id_empleado, nombre, apellido
       FROM empleados WHERE estado = 'A' ORDER BY nombre, apellido`,
    );
    res.json(rows);
  } catch (error) {
    console.error("Error en getActiveRepairOperators:", error);
    res.status(500).json({ message: "No se pudieron consultar los operarios" });
  }
};

export const getRepairRejectionReasons = async (_req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT id_inspec, codigo, resol_inspec
       FROM resoluciones_i WHERE id_inspec NOT IN (0, ?) ORDER BY codigo`,
      [APT_RESOLUTION_ID],
    );
    res.json(rows);
  } catch (error) {
    console.error("Error en getRepairRejectionReasons:", error);
    res.status(500).json({ message: "No se pudieron consultar los motivos" });
  }
};

export const getRepairCatalog = async (_req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT id_reparacion, referencia, nombre
       FROM reparaciones ORDER BY referencia`,
    );
    res.json(rows);
  } catch (error) {
    console.error("Error en getRepairCatalog:", error);
    res.status(500).json({ message: "No se pudo consultar el catálogo de reparaciones" });
  }
};

// ==================== BÚSQUEDA DE LLANTA ====================
// Devuelve el estado vigente almacenado en llantas, el último operario, la
// cantidad de reparaciones históricas y los indicadores del menú lateral.
export const getRepairTire = async (req, res) => {
  const ticket = parsePositiveInteger(req.params.ticket);
  if (ticket === null) return res.status(400).json({ message: "Tiquete inválido" });

  try {
    const eligibility = await validateEligibleTire(pool, ticket);
    if (eligibility.message) {
      return res.status(eligibility.status).json({ message: eligibility.message });
    }

    const [rows] = await pool.query(
      `SELECT l.id_llanta, l.serie, l.nivel_reenc, l.fecha_reparacion,
              e.descripcion AS estado,
              CONCAT(o.numero_orden, ' - ', LPAD(l.consec_orden, 2, '0')) AS orden,
              TRIM(CONCAT(c.nombre, ' ', COALESCE(c.apellido, ''))) AS cliente,
              m.marca, d.dimension, b.banda AS diseno,
              CASE WHEN er.id_empleado IS NULL THEN NULL
                   ELSE TRIM(CONCAT(er.id_empleado, ' - ', er.nombre, ' ', COALESCE(er.apellido, '')))
              END AS ultimo_operario
       FROM llantas l
       JOIN ordenes o ON l.id_orden = o.id_orden
       JOIN clientes c ON o.id_cliente = c.id_cliente
       JOIN estados_llanta e ON l.id_estado = e.id_estado
       LEFT JOIN marcas m ON l.id_marca = m.id_marca
       LEFT JOIN dimensiones d ON l.id_dimension = d.id_dimension
       LEFT JOIN bandas b ON l.id_banda = b.id_banda
       LEFT JOIN empleados er ON l.id_operario_reparacion = er.id_empleado
       WHERE l.id_llanta = ?`,
      [ticket],
    );
    const [history] = await pool.query(
      `SELECT COUNT(*) AS total FROM procesos
       WHERE id_llanta = ? AND id_subproceso = ?`,
      [ticket, REPAIR_SUBPROCESS_ID],
    );
    const subprocesos = await getCompletedSubprocessIds(pool, ticket);

    res.json({
      ...rows[0],
      reparaciones_registradas: history[0].total,
      subprocesos,
    });
  } catch (error) {
    console.error("Error en getRepairTire:", error);
    res.status(500).json({ message: "No se pudo consultar la llanta" });
  }
};

// ==================== REGISTRO TRANSACCIONAL ====================
// Aprobar y rechazar comparten el mismo recorrido. Una aprobación exige por lo
// menos un parche; un rechazo puede ocurrir antes de utilizar reparaciones.
const registerRepairResult = async ({ req, res, resolutionId, resultStateId, successMessage }) => {
  const ticket = parsePositiveInteger(req.params.ticket);
  const operator = parsePositiveInteger(req.body.id_operario);
  const processDate = normalizeDateTime(req.body.fecha_reparacion);
  const repairs = parseRepairDetails(req.body.reparaciones ?? []);
  const requiresRepairs = resultStateId === APT_STATE_ID;

  if (
    ticket === null ||
    operator === null ||
    processDate === null ||
    repairs === null ||
    (requiresRepairs && repairs.length === 0)
  ) {
    return res.status(400).json({ message: "Datos de reparación inválidos o incompletos" });
  }

  const observation =
    typeof req.body.observacion === "string" ? req.body.observacion.trim() || null : null;
  let connection;

  try {
    connection = await pool.getConnection();
    await connection.beginTransaction();

    // Toda salida anticipada posterior a beginTransaction debe revertir antes
    // de responder para no dejar cambios parciales ni bloqueos abiertos.
    const abort = async (status, message) => {
      await connection.rollback();
      return res.status(status).json({ message });
    };

    // 1. Bloquear y volver a validar la llanta dentro de la transacción.
    const eligibility = await validateEligibleTire(connection, ticket, true);
    if (eligibility.message) return abort(eligibility.status, eligibility.message);

    // 2. El empleado pudo cambiar de estado mientras el formulario estaba abierto.
    const [operators] = await connection.query(
      "SELECT id_empleado FROM empleados WHERE id_empleado = ? AND estado = 'A'",
      [operator],
    );
    if (operators.length === 0) return abort(400, "El operario no existe o no está activo");

    // 3. Un rechazo solo acepta resoluciones reales de rechazo.
    if (resultStateId === REJECTED_STATE_ID) {
      const [reasons] = await connection.query(
        `SELECT id_inspec FROM resoluciones_i
         WHERE id_inspec = ? AND id_inspec NOT IN (0, ?)`,
        [resolutionId, APT_RESOLUTION_ID],
      );
      if (reasons.length === 0) return abort(400, "Motivo de rechazo inválido");
    }

    // 4. Confirmar que todas las referencias aún existen en el catálogo.
    if (repairs.length > 0) {
      const placeholders = repairs.map(() => "?").join(", ");
      const [catalogRows] = await connection.query(
        `SELECT id_reparacion FROM reparaciones WHERE id_reparacion IN (${placeholders})`,
        repairs.map(({ repairId }) => repairId),
      );
      if (catalogRows.length !== repairs.length) {
        return abort(400, "Una de las referencias de reparación no existe");
      }
    }

    // 5. Una ejecución posterior nunca reemplaza la anterior: es reproceso.
    const [history] = await connection.query(
      `SELECT COUNT(*) AS total FROM procesos
       WHERE id_llanta = ? AND id_subproceso = ?`,
      [ticket, REPAIR_SUBPROCESS_ID],
    );
    const reprocess = history[0].total > 0 ? 1 : 0;
    const registrationDate = new Date();

    // 6. llantas conserva únicamente la última actualización del subproceso.
    await connection.query(
      `UPDATE llantas
       SET fecha_reparacion = ?, fecha_registro_reparacion = ?,
           id_operario_reparacion = ?, id_resolucion_reparacion = ?, id_estado = ?
       WHERE id_llanta = ?`,
      [processDate, registrationDate, operator, resolutionId, resultStateId, ticket],
    );

    // 7. procesos recibe la cabecera histórica. insertId identifica exactamente
    // esta ejecución y será la llave foránea de todas sus reparaciones.
    const [processResult] = await connection.query(
      `INSERT INTO procesos
        (id_llanta, id_subproceso, fecha, fecha_registro, observacion,
         id_resolucion, reproceso, id_operario, id_estado_resultado, nivel_reenc)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        ticket,
        REPAIR_SUBPROCESS_ID,
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

    // 8. Insertar el detalle en una sola consulta. La clave compuesta impide
    // repetir una referencia dentro del mismo proceso.
    if (repairs.length > 0) {
      const detailPlaceholders = repairs.map(() => "(?, ?, ?)").join(", ");
      const values = repairs.flatMap(({ repairId, quantity }) => [
        processResult.insertId,
        repairId,
        quantity,
      ]);
      await connection.query(
        `INSERT INTO reparaciones_proceso
          (id_proceso, id_reparacion, cantidad) VALUES ${detailPlaceholders}`,
        values,
      );
    }

    await connection.commit();
    res.status(201).json({ message: successMessage, reproceso: reprocess });
  } catch (error) {
    if (connection) await connection.rollback();
    console.error("Error en registerRepairResult:", error);
    res.status(500).json({ message: "Error interno al registrar la reparación" });
  } finally {
    connection?.release();
  }
};

// Resultado normal: conserva el estado APTA y exige uno o más parches.
export const completeRepair = (req, res) =>
  registerRepairResult({
    req,
    res,
    resolutionId: APT_RESOLUTION_ID,
    resultStateId: APT_STATE_ID,
    successMessage: "Reparación registrada correctamente",
  });

// Resultado rechazado: permite una lista vacía porque el defecto puede
// descubrirse antes de utilizar algún parche.
export const rejectTireDuringRepair = (req, res) => {
  const resolutionId = parsePositiveInteger(req.body.id_resolucion);
  if (resolutionId === null) {
    return res.status(400).json({ message: "Debe seleccionar un motivo de rechazo" });
  }
  return registerRepairResult({
    req,
    res,
    resolutionId,
    resultStateId: REJECTED_STATE_ID,
    successMessage: "Llanta rechazada durante la reparación",
  });
};
