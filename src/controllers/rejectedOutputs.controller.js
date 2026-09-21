import { pool } from "../db.js";

const REJECTED_STATE_ID = 2;
const PLANT_LOCATION = "P";
const WAREHOUSE_LOCATION = "B";
const REJECTED_OUTPUT_TYPE = "RECHAZADA";
const DOCUMENT_KEY = "documento_salida_rechazadas_actual";

const positiveInteger = (value) => {
  const number = Number(value);
  return Number.isSafeInteger(number) && number > 0 ? number : null;
};
const validDate = (value) => typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value);
const parseTickets = (value) => Array.isArray(value)
  ? [...new Set(value.map(positiveInteger).filter(Boolean))]
  : [];

// El consecutivo de rechazadas es independiente del de llantas procesadas:
// ambos flujos usan los campos generales de salida, pero son documentos distintos.
const getNextDocument = async (connection) => {
  await connection.query(
    `INSERT INTO parametros_planta (codigo, nombre, valor_numero, unidad, descripcion)
     VALUES (?, 'Documento actual de salidas rechazadas', 0, 'documento',
             'Consecutivo usado para salidas de llantas rechazadas a bodega.')
     ON DUPLICATE KEY UPDATE codigo = VALUES(codigo)`,
    [DOCUMENT_KEY],
  );
  const [[parameter]] = await connection.query(
    "SELECT id_parametro, valor_numero FROM parametros_planta WHERE codigo = ? FOR UPDATE",
    [DOCUMENT_KEY],
  );
  const document = Number(parameter.valor_numero) + 1;
  await connection.query("UPDATE parametros_planta SET valor_numero = ? WHERE id_parametro = ?", [document, parameter.id_parametro]);
  return document;
};

// La causa se obtiene del ultimo proceso rechazado, evitando usar datos de
// inspeccion inicial que pueden no corresponder al rechazo final de la llanta.
const rejectedTires = async (connection, tickets = null) => {
  const params = [REJECTED_STATE_ID, PLANT_LOCATION, REJECTED_STATE_ID];
  let filter = "l.ubicacion = ? AND l.id_estado = ?";
  if (tickets) {
    filter += ` AND l.id_llanta IN (${tickets.map(() => "?").join(", ")})`;
    params.push(...tickets);
  }
  const [rows] = await connection.query(
    `SELECT l.id_llanta,
            CONCAT(o.numero_orden, ' - ', LPAD(l.consec_orden, 2, '0')) AS orden,
            d.dimension,
            TRIM(CONCAT(propietario.nombre, ' ', COALESCE(propietario.apellido, ''))) AS propietario,
            COALESCE(NULLIF(TRIM(rechazo.observacion), ''), motivo_proceso.resol_inspec,
                     motivo_inicial.resol_inspec, 'Sin causa registrada') AS causa_rechazo
     FROM llantas l
     JOIN ordenes o ON o.id_orden = l.id_orden
     LEFT JOIN clientes propietario ON propietario.id_cliente = l.id_propietario_actual
     LEFT JOIN dimensiones d ON d.id_dimension = l.id_dimension
     LEFT JOIN procesos rechazo ON rechazo.id_proceso = (
       SELECT p.id_proceso FROM procesos p
       WHERE p.id_llanta = l.id_llanta AND p.id_estado_resultado = ?
       ORDER BY p.fecha_registro DESC, p.id_proceso DESC LIMIT 1
     )
     LEFT JOIN resoluciones_i motivo_proceso ON motivo_proceso.id_inspec = rechazo.id_resolucion
     LEFT JOIN resoluciones_i motivo_inicial ON motivo_inicial.id_inspec = l.id_inspec
     WHERE ${filter}
     ORDER BY d.dimension, l.id_llanta`,
    params,
  );
  return rows;
};

export const getRejectedOutputCatalogs = async (_req, res) => {
  try {
    const [[bodegas], [empleados]] = await Promise.all([
      pool.query("SELECT id_bodega, codigo, nombre FROM bodegas WHERE activa = 1 ORDER BY nombre"),
      pool.query("SELECT id_empleado, nombre, apellido FROM empleados WHERE estado = 'A' ORDER BY nombre, apellido"),
    ]);
    res.json({ bodegas, empleados });
  } catch (error) {
    console.error("Error en getRejectedOutputCatalogs:", error);
    res.status(500).json({ message: "No se pudieron consultar los catalogos de salida" });
  }
};

export const getRejectedOutputTire = async (req, res) => {
  const ticket = positiveInteger(req.params.ticket);
  if (!ticket) return res.status(400).json({ message: "Tiquete invalido" });
  try {
    const [[exists]] = await pool.query("SELECT id_llanta FROM llantas WHERE id_llanta = ?", [ticket]);
    if (!exists) return res.status(404).json({ message: "Llanta no encontrada" });
    const rows = await rejectedTires(pool, [ticket]);
    if (rows.length === 0) {
      return res.status(409).json({ message: "La llanta debe estar rechazada y ubicada en planta" });
    }
    res.json(rows[0]);
  } catch (error) {
    console.error("Error en getRejectedOutputTire:", error);
    res.status(500).json({ message: "No se pudo consultar la llanta rechazada" });
  }
};

export const listRejectedOutputBlock = async (_req, res) => {
  try { res.json(await rejectedTires(pool)); }
  catch (error) {
    console.error("Error en listRejectedOutputBlock:", error);
    res.status(500).json({ message: "No se pudieron consultar las llantas rechazadas" });
  }
};

export const completeRejectedOutput = async (req, res) => {
  const warehouse = positiveInteger(req.body.id_bodega);
  const employee = positiveInteger(req.body.id_empleado);
  const tickets = parseTickets(req.body.tiquetes);
  if (!warehouse || !employee || !validDate(req.body.fecha_salida) || tickets.length === 0) {
    return res.status(400).json({ message: "Datos de salida incompletos o invalidos" });
  }
  let connection;
  try {
    connection = await pool.getConnection();
    await connection.beginTransaction();
    const abort = async (status, message) => { await connection.rollback(); return res.status(status).json({ message }); };
    const [[validWarehouse]] = await connection.query("SELECT id_bodega FROM bodegas WHERE id_bodega = ? AND activa = 1", [warehouse]);
    if (!validWarehouse) return abort(400, "La bodega de destino no existe o esta inactiva");
    const [[validEmployee]] = await connection.query("SELECT id_empleado FROM empleados WHERE id_empleado = ? AND estado = 'A'", [employee]);
    if (!validEmployee) return abort(400, "El empleado no existe o no esta activo");
    const placeholders = tickets.map(() => "?").join(", ");
    const [locked] = await connection.query(`SELECT id_llanta FROM llantas WHERE id_llanta IN (${placeholders}) FOR UPDATE`, tickets);
    if (locked.length !== tickets.length) return abort(409, "Una o mas llantas no existen");
    const available = await rejectedTires(connection, tickets);
    if (available.length !== tickets.length) return abort(409, "Una o mas llantas ya no estan disponibles para salida a bodega");
    const document = await getNextDocument(connection);
    await connection.query(
      `UPDATE llantas SET ubicacion = ?, documento_salida = ?, fecha_salida = ?,
         id_empleado_salida = ?, id_bodega_salida = ?, id_bodega_actual = ?, tipo_salida = ?
       WHERE id_llanta IN (${placeholders})`,
      [WAREHOUSE_LOCATION, document, req.body.fecha_salida, employee, warehouse, warehouse, REJECTED_OUTPUT_TYPE, ...tickets],
    );
    await connection.commit();
    res.json({ message: `Salida de rechazadas registrada. Documento ${document} generado.`, documento: document, llantas_actualizadas: available.length });
  } catch (error) {
    if (connection) await connection.rollback();
    console.error("Error en completeRejectedOutput:", error);
    res.status(500).json({ message: "No se pudo registrar la salida de rechazadas" });
  } finally { connection?.release(); }
};

export const getRejectedOutputReport = async (req, res) => {
  const document = positiveInteger(req.params.documento);
  if (!document) return res.status(400).json({ message: "Documento invalido" });
  try {
    const [[salida]] = await pool.query(
      `SELECT l.documento_salida, l.fecha_salida, b.codigo AS bodega_codigo, b.nombre AS bodega_nombre,
              empleado.nombre AS empleado_nombre, empleado.apellido AS empleado_apellido,
              empresa.nombre AS empresa_nombre, empresa.apellido AS empresa_apellido, configuracion.eslogan AS empresa_eslogan
       FROM llantas l LEFT JOIN bodegas b ON b.id_bodega = l.id_bodega_salida
       LEFT JOIN empleados empleado ON empleado.id_empleado = l.id_empleado_salida
       LEFT JOIN data configuracion ON configuracion.id_configuracion = 1
       LEFT JOIN clientes empresa ON empresa.id_cliente = configuracion.id_cliente_propietario
       WHERE l.documento_salida = ? AND l.tipo_salida = ? ORDER BY l.id_llanta LIMIT 1`,
      [document, REJECTED_OUTPUT_TYPE],
    );
    if (!salida) return res.status(404).json({ message: "Documento de salida rechazada no encontrado" });
    const [detalle] = await pool.query(
      `SELECT l.id_llanta, CONCAT(o.numero_orden, ' - ', LPAD(l.consec_orden, 2, '0')) AS orden,
              d.dimension, TRIM(CONCAT(propietario.nombre, ' ', COALESCE(propietario.apellido, ''))) AS propietario,
              COALESCE(NULLIF(TRIM(rechazo.observacion), ''), motivo_proceso.resol_inspec,
                       motivo_inicial.resol_inspec, 'Sin causa registrada') AS causa_rechazo
       FROM llantas l JOIN ordenes o ON o.id_orden = l.id_orden
       LEFT JOIN clientes propietario ON propietario.id_cliente = l.id_propietario_actual
       LEFT JOIN dimensiones d ON d.id_dimension = l.id_dimension
       LEFT JOIN procesos rechazo ON rechazo.id_proceso = (
         SELECT p.id_proceso FROM procesos p WHERE p.id_llanta = l.id_llanta AND p.id_estado_resultado = ?
         ORDER BY p.fecha_registro DESC, p.id_proceso DESC LIMIT 1
       )
       LEFT JOIN resoluciones_i motivo_proceso ON motivo_proceso.id_inspec = rechazo.id_resolucion
       LEFT JOIN resoluciones_i motivo_inicial ON motivo_inicial.id_inspec = l.id_inspec
       WHERE l.documento_salida = ? AND l.tipo_salida = ? ORDER BY d.dimension, l.id_llanta`,
      [REJECTED_STATE_ID, document, REJECTED_OUTPUT_TYPE],
    );
    res.json({ salida, detalle });
  } catch (error) {
    console.error("Error en getRejectedOutputReport:", error);
    res.status(500).json({ message: "No se pudo cargar el reporte de rechazo" });
  }
};
