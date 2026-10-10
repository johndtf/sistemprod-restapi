import { pool } from "../db.js";

// La entrega empieza en Bodega y termina en Cliente. RECHAZADA es el mismo
// estado que se usa para la salida previa desde Produccion hacia Bodega.
const REJECTED_STATE_ID = 2;
const WAREHOUSE_LOCATION = "B";
const CUSTOMER_LOCATION = "C";
const DOCUMENT_KEY = "documento_entrega_rechazadas_actual";

const positiveInteger = (value) => {
  const number = Number(value);
  return Number.isSafeInteger(number) && number > 0 ? number : null;
};

const validDate = (value) =>
  typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value);

const normalizeObservation = (value) => {
  const observation = String(value || "").trim();
  return observation.length <= 255 ? observation || null : null;
};

const parseTickets = (value) =>
  Array.isArray(value)
    ? [...new Set(value.map(positiveInteger).filter(Boolean))]
    : [];

// Cada tipo de documento posee su propio consecutivo en parametros_planta.
// FOR UPDATE evita que dos entregas confirmadas simultaneamente reciban el
// mismo numero de documento.
const getNextDocument = async (connection) => {
  await connection.query(
    `INSERT INTO parametros_planta (codigo, nombre, valor_numero, unidad, descripcion)
     VALUES (?, 'Documento actual de entregas rechazadas', 0, 'documento',
             'Consecutivo usado para entregar llantas rechazadas desde bodega al cliente.')
     ON DUPLICATE KEY UPDATE codigo = VALUES(codigo)`,
    [DOCUMENT_KEY],
  );

  const [[parameter]] = await connection.query(
    "SELECT id_parametro, valor_numero FROM parametros_planta WHERE codigo = ? FOR UPDATE",
    [DOCUMENT_KEY],
  );
  const document = Number(parameter.valor_numero) + 1;
  await connection.query(
    "UPDATE parametros_planta SET valor_numero = ? WHERE id_parametro = ?",
    [document, parameter.id_parametro],
  );
  return document;
};

// La consulta se utiliza tanto para buscar un tiquete como para cargar un
// bloque y revalidar dentro de la transaccion. El propietario se compara con
// el cliente elegido: una entrega solo puede pertenecer a un receptor.
const availableRejectedTires = async (
  connection,
  { tickets = null, warehouseId = null, customerId = null },
) => {
  const params = [REJECTED_STATE_ID, WAREHOUSE_LOCATION];
  let filter = "l.id_estado = ? AND l.ubicacion = ?";

  if (warehouseId !== null) {
    filter += " AND l.id_bodega_actual = ?";
    params.push(warehouseId);
  }
  if (customerId !== null) {
    filter += " AND l.id_propietario_actual = ?";
    params.push(customerId);
  }
  if (tickets) {
    filter += ` AND l.id_llanta IN (${tickets.map(() => "?").join(", ")})`;
    params.push(...tickets);
  }

  const [rows] = await connection.query(
    `SELECT l.id_llanta,
            l.id_bodega_actual,
            l.id_propietario_actual,
            CONCAT(o.numero_orden, ' - ', LPAD(l.consec_orden, 2, '0')) AS orden,
            d.dimension,
            TRIM(CONCAT(propietario.nombre, ' ', COALESCE(propietario.apellido, ''))) AS propietario,
            COALESCE(
              NULLIF(TRIM(rechazo.observacion), ''),
              motivo_proceso.resol_inspec,
              motivo_inicial.resol_inspec,
              'Sin causa registrada'
            ) AS causa_rechazo
     FROM llantas l
     JOIN ordenes o ON o.id_orden = l.id_orden
     LEFT JOIN clientes propietario ON propietario.id_cliente = l.id_propietario_actual
     LEFT JOIN dimensiones d ON d.id_dimension = l.id_dimension
     LEFT JOIN procesos rechazo ON rechazo.id_proceso = (
       SELECT p.id_proceso
       FROM procesos p
       WHERE p.id_llanta = l.id_llanta AND p.id_estado_resultado = ?
       ORDER BY p.fecha_registro DESC, p.id_proceso DESC
       LIMIT 1
     )
     LEFT JOIN resoluciones_i motivo_proceso ON motivo_proceso.id_inspec = rechazo.id_resolucion
     LEFT JOIN resoluciones_i motivo_inicial ON motivo_inicial.id_inspec = l.id_inspec
     WHERE ${filter}
     ORDER BY d.dimension, l.id_llanta`,
    [REJECTED_STATE_ID, ...params],
  );

  return rows;
};

export const getRejectedDeliveryCatalogs = async (_req, res) => {
  try {
    const [[bodegas], [clientes], [empleados]] = await Promise.all([
      pool.query("SELECT id_bodega, codigo, nombre FROM bodegas WHERE activa = 1 ORDER BY nombre"),
      pool.query(
        `SELECT id_cliente, TRIM(CONCAT(nombre, ' ', COALESCE(apellido, ''))) AS cliente
         FROM clientes WHERE estado = 'A' ORDER BY nombre, apellido`,
      ),
      pool.query(
        "SELECT id_empleado, nombre, apellido FROM empleados WHERE estado = 'A' ORDER BY nombre, apellido",
      ),
    ]);
    res.json({ bodegas, clientes, empleados });
  } catch (error) {
    console.error("Error en getRejectedDeliveryCatalogs:", error);
    res.status(500).json({ message: "No se pudieron cargar los catalogos de entrega" });
  }
};

export const getRejectedDeliveryTire = async (req, res) => {
  const ticket = positiveInteger(req.params.ticket);
  if (!ticket) return res.status(400).json({ message: "Tiquete invalido" });

  try {
    const [[exists]] = await pool.query("SELECT id_llanta FROM llantas WHERE id_llanta = ?", [ticket]);
    if (!exists) return res.status(404).json({ message: "Llanta no encontrada" });

    const tires = await availableRejectedTires(pool, { tickets: [ticket] });
    if (tires.length === 0) {
      return res.status(409).json({
        message: "La llanta debe estar rechazada y ubicada en una bodega",
      });
    }
    res.json(tires[0]);
  } catch (error) {
    console.error("Error en getRejectedDeliveryTire:", error);
    res.status(500).json({ message: "No se pudo consultar la llanta rechazada" });
  }
};

export const listRejectedDeliveryBlock = async (req, res) => {
  const warehouseId = positiveInteger(req.query.id_bodega);
  const customerId = positiveInteger(req.query.id_cliente);
  if (!warehouseId || !customerId) {
    return res.status(400).json({ message: "Seleccione bodega y cliente para cargar el bloque" });
  }

  try {
    res.json(
      await availableRejectedTires(pool, { warehouseId, customerId }),
    );
  } catch (error) {
    console.error("Error en listRejectedDeliveryBlock:", error);
    res.status(500).json({ message: "No se pudieron cargar las llantas rechazadas" });
  }
};

// Confirma la entrega completa en una transaccion: crea cabecera, fija una
// fotografia de cada fila, y solo entonces cambia la ubicacion B -> C.
export const completeRejectedDelivery = async (req, res) => {
  const warehouseId = positiveInteger(req.body.id_bodega);
  const customerId = positiveInteger(req.body.id_cliente);
  const employeeId = positiveInteger(req.body.id_empleado);
  const tickets = parseTickets(req.body.tiquetes);
  const deliveryDate = validDate(req.body.fecha_entrega) ? req.body.fecha_entrega : null;
  const observation = normalizeObservation(req.body.observacion);

  if (!warehouseId || !customerId || !employeeId || !deliveryDate || tickets.length === 0) {
    return res.status(400).json({ message: "Datos de entrega incompletos o invalidos" });
  }
  if (String(req.body.observacion || "").trim().length > 255) {
    return res.status(400).json({ message: "La observacion no puede superar 255 caracteres" });
  }

  let connection;
  try {
    connection = await pool.getConnection();
    await connection.beginTransaction();
    const abort = async (status, message) => {
      await connection.rollback();
      return res.status(status).json({ message });
    };

    const [[warehouse]] = await connection.query(
      "SELECT id_bodega FROM bodegas WHERE id_bodega = ? AND activa = 1",
      [warehouseId],
    );
    if (!warehouse) return abort(400, "La bodega de origen no existe o esta inactiva");

    const [[customer]] = await connection.query(
      "SELECT id_cliente FROM clientes WHERE id_cliente = ? AND estado = 'A'",
      [customerId],
    );
    if (!customer) return abort(400, "El cliente receptor no existe o esta inactivo");

    const [[employee]] = await connection.query(
      "SELECT id_empleado FROM empleados WHERE id_empleado = ? AND estado = 'A'",
      [employeeId],
    );
    if (!employee) return abort(400, "El empleado no existe o esta inactivo");

    const placeholders = tickets.map(() => "?").join(", ");
    const [lockedTires] = await connection.query(
      `SELECT id_llanta FROM llantas WHERE id_llanta IN (${placeholders}) FOR UPDATE`,
      tickets,
    );
    if (lockedTires.length !== tickets.length) {
      return abort(409, "Una o mas llantas no existen");
    }

    const tires = await availableRejectedTires(connection, {
      tickets,
      warehouseId,
      customerId,
    });
    if (tires.length !== tickets.length) {
      return abort(
        409,
        "Una o mas llantas ya no estan rechazadas, en bodega o asignadas a este cliente",
      );
    }

    const document = await getNextDocument(connection);
    const [delivery] = await connection.query(
      `INSERT INTO entregas_rechazadas
        (documento_entrega, fecha_entrega, id_cliente, id_empleado, id_bodega, observacion)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [document, deliveryDate, customerId, employeeId, warehouseId, observation],
    );

    for (const tire of tires) {
      await connection.query(
        `INSERT INTO entregas_rechazadas_detalle
          (id_entrega_rechazada, id_llanta, orden, dimension, propietario, causa_rechazo)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [
          delivery.insertId,
          tire.id_llanta,
          tire.orden,
          tire.dimension,
          tire.propietario,
          tire.causa_rechazo,
        ],
      );
    }

    await connection.query(
      `UPDATE llantas
       SET ubicacion = ?, id_bodega_actual = NULL
       WHERE id_llanta IN (${placeholders})`,
      [CUSTOMER_LOCATION, ...tickets],
    );

    await connection.commit();
    res.json({
      message: `Entrega de rechazos registrada. Documento ${document} generado.`,
      documento: document,
      llantas_actualizadas: tires.length,
    });
  } catch (error) {
    if (connection) await connection.rollback();
    console.error("Error en completeRejectedDelivery:", error);
    res.status(500).json({ message: "No se pudo registrar la entrega de rechazos" });
  } finally {
    connection?.release();
  }
};

// El reporte se basa en las tablas de entrega y no en llantas. Asi conserva
// la evidencia de la entrega aunque posteriormente se cree una garantia.
export const getRejectedDeliveryReport = async (req, res) => {
  const document = positiveInteger(req.params.documento);
  if (!document) return res.status(400).json({ message: "Documento invalido" });

  try {
    const [[delivery]] = await pool.query(
      `SELECT er.documento_entrega, er.fecha_entrega, er.observacion,
              b.codigo AS bodega_codigo, b.nombre AS bodega_nombre,
              TRIM(CONCAT(cliente.nombre, ' ', COALESCE(cliente.apellido, ''))) AS cliente,
              empleado.nombre AS empleado_nombre, empleado.apellido AS empleado_apellido,
              empresa.nombre AS empresa_nombre, empresa.apellido AS empresa_apellido,
              configuracion.eslogan AS empresa_eslogan
       FROM entregas_rechazadas er
       JOIN clientes cliente ON cliente.id_cliente = er.id_cliente
       JOIN empleados empleado ON empleado.id_empleado = er.id_empleado
       JOIN bodegas b ON b.id_bodega = er.id_bodega
       LEFT JOIN data configuracion ON configuracion.id_configuracion = 1
       LEFT JOIN clientes empresa ON empresa.id_cliente = configuracion.id_cliente_propietario
       WHERE er.documento_entrega = ?`,
      [document],
    );
    if (!delivery) {
      return res.status(404).json({ message: "Documento de entrega no encontrado" });
    }

    const [details] = await pool.query(
      `SELECT id_llanta, orden, dimension, propietario, causa_rechazo
       FROM entregas_rechazadas_detalle
       WHERE id_entrega_rechazada = (
         SELECT id_entrega_rechazada FROM entregas_rechazadas WHERE documento_entrega = ?
       )
       ORDER BY dimension, id_llanta`,
      [document],
    );

    res.json({ entrega: delivery, detalle: details });
  } catch (error) {
    console.error("Error en getRejectedDeliveryReport:", error);
    res.status(500).json({ message: "No se pudo cargar el comprobante de entrega" });
  }
};
