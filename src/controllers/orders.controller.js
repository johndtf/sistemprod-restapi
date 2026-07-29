import { pool } from "../db.js";

// La inspeccion inicial es el punto a partir del cual los datos de entrada de
// una llanta dejan de ser editables. Cambiar dimension, diseno u orden despues
// de ese momento alteraria el historial de produccion y los calculos posteriores.
const INITIAL_INSPECTION_SUBPROCESS_ID = 1;
const VALID_ENTRY_TYPES = ["REENCAUCHE", "REPARACION", "VENTA_CASCO"];

const parsePositiveInteger = (value) => {
  const number = Number(value);
  return Number.isSafeInteger(number) && number > 0 ? number : null;
};

const parseTicketList = (value) => {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.map(parsePositiveInteger).filter(Boolean))];
};

// Esta seleccion se comparte al consultar una orden y una llanta individual.
// Ademas de los datos visibles, entrega ids para editar sin depender de textos
// de la tabla y muestra el ultimo subproceso desde el historial `procesos`.
const tireSelect = `SELECT l.id_llanta AS tiquete,
                           l.id_orden,
                           l.consec_orden,
                           l.id_marca,
                           l.id_dimension,
                           l.id_banda,
                           l.tipo_ingreso,
                           l.id_propietario_actual,
                           l.serie,
                           l.prioridad,
                           l.observacion,
                           m.marca,
                           d.dimension,
                           b.banda,
                           ultimo_proceso.id_subproceso AS id_ultimo_subproceso,
                           sp.nombre AS ultimo_subproceso,
                           ultimo_proceso.fecha_registro AS fecha_ultimo_subproceso,
                           EXISTS(
                             SELECT 1
                             FROM procesos inspeccion_inicial
                             WHERE inspeccion_inicial.id_llanta = l.id_llanta
                               AND inspeccion_inicial.id_subproceso = ${INITIAL_INSPECTION_SUBPROCESS_ID}
                           ) AS tiene_inspeccion_inicial
                    FROM llantas l
                    LEFT JOIN marcas m ON l.id_marca = m.id_marca
                    LEFT JOIN dimensiones d ON l.id_dimension = d.id_dimension
                    LEFT JOIN bandas b ON l.id_banda = b.id_banda
                    LEFT JOIN procesos ultimo_proceso ON ultimo_proceso.id_proceso = (
                      SELECT historial.id_proceso
                      FROM procesos historial
                      WHERE historial.id_llanta = l.id_llanta
                      ORDER BY historial.fecha_registro DESC, historial.id_proceso DESC
                      LIMIT 1
                    )
                    LEFT JOIN subprocesos sp ON ultimo_proceso.id_subproceso = sp.id_subproceso`;

const getOrderWithCustomer = async (connection, orderNumber) => {
  const [orders] = await connection.query(
    `SELECT o.*, c.cedula_nit, c.nombre AS nombre_cliente, c.telefono, c.direccion
     FROM ordenes o
     JOIN clientes c ON o.id_cliente = c.id_cliente
     WHERE o.numero_orden = ?`,
    [orderNumber],
  );

  return orders[0] ?? null;
};

const getTiresForOrder = async (connection, orderId) => {
  const [tires] = await connection.query(
    `${tireSelect}
     WHERE l.id_orden = ?
     ORDER BY l.consec_orden, l.id_llanta`,
    [orderId],
  );

  return tires;
};

const hasInitialInspection = async (connection, tireId) => {
  const [rows] = await connection.query(
    `SELECT 1
     FROM procesos
     WHERE id_llanta = ? AND id_subproceso = ?
     LIMIT 1`,
    [tireId, INITIAL_INSPECTION_SUBPROCESS_ID],
  );

  return rows.length > 0;
};

// 1. Obtener la ultima orden ingresada junto con sus llantas.
export const getLastOrder = async (_req, res) => {
  try {
    const [orders] = await pool.query("SELECT numero_orden FROM ordenes ORDER BY id_orden DESC LIMIT 1");
    if (orders.length === 0) {
      return res.status(404).json({ message: "No hay ordenes registradas" });
    }

    const order = await getOrderWithCustomer(pool, orders[0].numero_orden);
    const tires = await getTiresForOrder(pool, order.id_orden);
    res.json({ orden: order, llantas: tires });
  } catch (error) {
    console.error("Error en getLastOrder:", error);
    res.status(500).json({ message: "Error al obtener la ultima orden" });
  }
};

// 2. Crear una nueva orden. Una orden puede iniciar vacia y recibir sus
// llantas posteriormente, que es el flujo utilizado por el formulario.
export const createOrder = async (req, res) => {
  try {
    const { id_cliente, numero_orden, fecha } = req.body;
    if (!id_cliente || !numero_orden || !fecha) {
      return res.status(400).json({ message: "Faltan campos requeridos para crear la orden" });
    }

    const [result] = await pool.query(
      "INSERT INTO ordenes (id_cliente, numero_orden, fecha) VALUES (?, ?, ?)",
      [id_cliente, numero_orden, fecha],
    );

    res.status(201).json({ message: "Orden creada", id_orden: result.insertId });
  } catch (error) {
    if (error.code === "ER_DUP_ENTRY") {
      return res.status(400).json({
        message: "El numero de orden ya esta en uso. Por favor, verificalo.",
      });
    }
    console.error("Error en createOrder:", error);
    res.status(500).json({ message: "Error al crear la orden" });
  }
};

// 3. Obtener una orden por numero. La tabla recibe el ultimo subproceso para
// que el usuario identifique rapidamente las llantas que ya no puede editar.
export const getOrderByNumber = async (req, res) => {
  try {
    const order = await getOrderWithCustomer(pool, req.params.numeroOrden);
    if (!order) return res.status(404).json({ message: "Orden no encontrada" });

    const tires = await getTiresForOrder(pool, order.id_orden);
    res.json({ orden: order, llantas: tires });
  } catch (error) {
    console.error("Error en getOrderByNumber:", error);
    res.status(500).json({ message: "Error al obtener la orden" });
  }
};

// 4. Consultar una llanta individual para editarla. El frontend usa esta ruta
// en vez de reconstruir ids desde las celdas de la tabla, que solo son texto.
export const getTireForOrder = async (req, res) => {
  const tireId = parsePositiveInteger(req.params.idLlanta);
  if (tireId === null) return res.status(400).json({ message: "Tiquete invalido" });

  try {
    const [tires] = await pool.query(`${tireSelect} WHERE l.id_llanta = ?`, [tireId]);
    if (tires.length === 0) return res.status(404).json({ message: "Llanta no encontrada" });
    res.json(tires[0]);
  } catch (error) {
    console.error("Error en getTireForOrder:", error);
    res.status(500).json({ message: "No se pudo consultar la llanta" });
  }
};

// 5. Agregar una llanta a una orden. El consecutivo se mantiene manual para
// reflejar los espacios reales de los formularios fisicos de entrada.
export const addTireToOrder = async (req, res) => {
  try {
    const { consec_orden, id_marca, id_dimension, serie, id_banda, prioridad, observacion } = req.body;
    const tipoIngreso = VALID_ENTRY_TYPES.includes(req.body.tipo_ingreso)
      ? req.body.tipo_ingreso : "REENCAUCHE";
    const order = await getOrderWithCustomer(pool, req.params.numeroOrden);
    if (!order) return res.status(404).json({ message: "Orden no encontrada" });

    await pool.query(
      `INSERT INTO llantas
       (id_orden, consec_orden, id_marca, id_dimension, serie, id_banda, prioridad, observacion, tipo_ingreso, id_propietario_actual)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [order.id_orden, consec_orden, id_marca, id_dimension, serie, id_banda, prioridad, observacion, tipoIngreso, order.id_cliente],
    );

    res.status(201).json({ message: "Llanta agregada correctamente" });
  } catch (error) {
    console.error("Error en addTireToOrder:", error);
    res.status(500).json({ message: "Error al agregar la llanta" });
  }
};

// 6. Modificar una llanta solo antes de su inspeccion inicial. La validacion
// se hace en transaccion para que el estado no cambie entre la consulta y el UPDATE.
export const updateTireInOrder = async (req, res) => {
  const tireId = parsePositiveInteger(req.params.idLlanta);
  if (tireId === null) return res.status(400).json({ message: "Tiquete invalido" });

  const {
    consec_orden,
    id_marca,
    id_dimension,
    serie,
    id_banda,
    prioridad,
    tipo_ingreso,
    observacion,
  } = req.body;
  if (!VALID_ENTRY_TYPES.includes(tipo_ingreso)) {
    return res.status(400).json({ message: "Tipo de ingreso invalido" });
  }
  let connection;

  try {
    connection = await pool.getConnection();
    await connection.beginTransaction();

    const [tires] = await connection.query(
      "SELECT id_llanta FROM llantas WHERE id_llanta = ? FOR UPDATE",
      [tireId],
    );
    if (tires.length === 0) {
      await connection.rollback();
      return res.status(404).json({ message: "Llanta no encontrada" });
    }

    if (await hasInitialInspection(connection, tireId)) {
      await connection.rollback();
      return res.status(409).json({
        message: "No se puede modificar una llanta despues de su inspeccion inicial",
      });
    }

    await connection.query(
      `UPDATE llantas SET
         consec_orden = ?, id_marca = ?, id_dimension = ?, serie = ?,
         id_banda = ?, prioridad = ?, tipo_ingreso = ?, observacion = ?
       WHERE id_llanta = ?`,
      [
        consec_orden,
        id_marca,
        id_dimension,
        serie,
        id_banda,
        prioridad,
        tipo_ingreso,
        observacion,
        tireId,
      ],
    );

    await connection.commit();
    res.json({ message: "Llanta actualizada correctamente" });
  } catch (error) {
    if (connection) await connection.rollback();
    console.error("Error en updateTireInOrder:", error);
    res.status(500).json({ message: "Error al actualizar la llanta" });
  } finally {
    connection?.release();
  }
};

// 7. Cambiar llantas de orden antes de inspeccion inicial. Se bloquean todas
// las llantas primero y se valida su orden de origen para que no haya cambios
// parciales ni se muevan tiquetes que no fueron seleccionados en esa orden.
export const reassignMultipleTires = async (req, res) => {
  const tickets = parseTicketList(req.body.llantasIds);
  const originOrderNumber = String(req.body.numeroOrdenOrigen ?? "").trim();
  const targetOrderNumber = String(req.body.numeroOrdenDestino ?? "").trim();

  if (!originOrderNumber || !targetOrderNumber || tickets.length === 0) {
    return res.status(400).json({ message: "Datos invalidos" });
  }
  if (originOrderNumber === targetOrderNumber) {
    return res.status(400).json({ message: "La orden destino debe ser diferente" });
  }

  let connection;
  try {
    connection = await pool.getConnection();
    await connection.beginTransaction();

    const originOrder = await getOrderWithCustomer(connection, originOrderNumber);
    const targetOrder = await getOrderWithCustomer(connection, targetOrderNumber);
    if (!originOrder || !targetOrder) {
      await connection.rollback();
      return res.status(404).json({ message: "La orden de origen o destino no existe" });
    }

    const placeholders = tickets.map(() => "?").join(", ");
    const [tires] = await connection.query(
      `SELECT id_llanta, id_orden
       FROM llantas
       WHERE id_llanta IN (${placeholders})
       FOR UPDATE`,
      tickets,
    );
    if (tires.length !== tickets.length || tires.some((tire) => tire.id_orden !== originOrder.id_orden)) {
      await connection.rollback();
      return res.status(409).json({ message: "Una o mas llantas no pertenecen a la orden de origen" });
    }

    for (const tire of tires) {
      if (await hasInitialInspection(connection, tire.id_llanta)) {
        await connection.rollback();
        return res.status(409).json({
          message: `La llanta ${tire.id_llanta} ya tiene inspeccion inicial y no puede cambiar de orden`,
        });
      }
    }

    await connection.query(
      `UPDATE llantas SET id_orden = ? WHERE id_llanta IN (${placeholders})`,
      [targetOrder.id_orden, ...tickets],
    );

    await connection.commit();
    res.json({ message: "Llantas cambiadas de orden correctamente" });
  } catch (error) {
    if (connection) await connection.rollback();
    console.error("Error en reassignMultipleTires:", error);
    res.status(500).json({ message: "Error al reasignar la(s) llanta(s)" });
  } finally {
    connection?.release();
  }
};

// 8. Modificar encabezado de orden antes de que alguna llanta haya pasado por
// inspeccion inicial. Esto protege cliente, fecha y numero frente a cambios
// retrospectivos en una llanta que ya tiene historial de produccion.
export const updateOrder = async (req, res) => {
  const orderId = parsePositiveInteger(req.params.id);
  const { numero_orden, id_cliente, fecha } = req.body;
  if (orderId === null || !numero_orden || !id_cliente || !fecha) {
    return res.status(400).json({ message: "Todos los campos son obligatorios" });
  }

  let connection;
  try {
    connection = await pool.getConnection();
    await connection.beginTransaction();

    const [orders] = await connection.query(
      "SELECT id_orden FROM ordenes WHERE id_orden = ? FOR UPDATE",
      [orderId],
    );
    if (orders.length === 0) {
      await connection.rollback();
      return res.status(404).json({ message: "Orden no encontrada" });
    }

    const [processedTires] = await connection.query(
      `SELECT 1
       FROM llantas l
       JOIN procesos p ON p.id_llanta = l.id_llanta
       WHERE l.id_orden = ? AND p.id_subproceso = ?
       LIMIT 1`,
      [orderId, INITIAL_INSPECTION_SUBPROCESS_ID],
    );
    if (processedTires.length > 0) {
      await connection.rollback();
      return res.status(409).json({
        message: "No se puede modificar una orden con llantas que ya tienen inspeccion inicial",
      });
    }

    const [duplicates] = await connection.query(
      "SELECT id_orden FROM ordenes WHERE numero_orden = ? AND id_orden <> ?",
      [numero_orden, orderId],
    );
    if (duplicates.length > 0) {
      await connection.rollback();
      return res.status(400).json({ message: "Este numero de orden ya esta en uso" });
    }

    await connection.query(
      "UPDATE ordenes SET numero_orden = ?, id_cliente = ?, fecha = ? WHERE id_orden = ?",
      [numero_orden, id_cliente, fecha, orderId],
    );

    await connection.commit();
    res.json({ message: "Orden actualizada correctamente" });
  } catch (error) {
    if (connection) await connection.rollback();
    console.error("Error en updateOrder:", error);
    res.status(500).json({ message: "Error al actualizar la orden" });
  } finally {
    connection?.release();
  }
};
