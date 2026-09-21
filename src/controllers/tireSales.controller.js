import { pool } from "../db.js";

// Los estados se conservan como constantes para que las consultas por tiquete,
// por bloque y la confirmacion final usen exactamente las mismas reglas.
const RETREADED_STATE_ID = 4;
const REPAIRED_STATE_ID = 3;
const WAREHOUSE_LOCATION = "B";
const CUSTOMER_LOCATION = "C";
const DEFAULT_SALES_TAX_KEY = "iva_predeterminado_ventas";

const positiveInteger = (value) => {
  const number = Number(value);
  return Number.isSafeInteger(number) && number > 0 ? number : null;
};

const validDate = (value) =>
  typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value);

// Una factura viene del programa contable, por eso no se genera un consecutivo
// interno. Se permite letra, numero y guion, sin aceptar espacios vacios.
const normalizeInvoice = (value) => {
  const invoice = String(value || "").trim().toUpperCase();
  return invoice.length > 0 && invoice.length <= 30 ? invoice : null;
};

const normalizeObservation = (value) => {
  const observation = String(value || "").trim();
  return observation.length <= 255 ? observation || null : null;
};

const validMoney = (value) => {
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 ? Number(number.toFixed(2)) : null;
};

// Convierte el detalle recibido en datos seguros. La llave Set impide que una
// llanta se agregue dos veces aunque el navegador enviara filas repetidas.
const parseDetails = (value) => {
  if (!Array.isArray(value) || value.length === 0) return null;

  const seenTickets = new Set();
  const details = [];

  for (const row of value) {
    const ticket = positiveInteger(row.id_llanta);
    const price = validMoney(row.precio_venta);
    const iva = Number(row.iva_porcentaje);

    if (
      ticket === null ||
      price === null ||
      !Number.isInteger(iva) ||
      iva < 0 ||
      iva > 100 ||
      seenTickets.has(ticket)
    ) {
      return null;
    }

    seenTickets.add(ticket);
    details.push({ ticket, price, iva });
  }

  return details;
};

// Esta consulta no cambia datos. Se reutiliza al buscar un tiquete, cargar una
// bodega y validar de nuevo las llantas dentro de la transaccion de venta.
const availableTires = async (connection, { tickets = null, warehouseId = null }) => {
  const params = [WAREHOUSE_LOCATION, RETREADED_STATE_ID, REPAIRED_STATE_ID];
  let filter = "l.ubicacion = ? AND l.id_estado IN (?, ?)";

  if (warehouseId !== null) {
    filter += " AND l.id_bodega_actual = ?";
    params.push(warehouseId);
  }

  if (tickets) {
    filter += ` AND l.id_llanta IN (${tickets.map(() => "?").join(", ")})`;
    params.push(...tickets);
  }

  const [rows] = await connection.query(
    `SELECT l.id_llanta,
            l.id_bodega_actual,
            CONCAT(o.numero_orden, ' - ', LPAD(l.consec_orden, 2, '0')) AS orden,
            d.dimension,
            b.banda AS diseno,
            e.descripcion AS estado,
            bo.codigo AS bodega_codigo,
            bo.nombre AS bodega_nombre,
            TRIM(CONCAT(propietario.nombre, ' ', COALESCE(propietario.apellido, ''))) AS propietario
     FROM llantas l
     JOIN ordenes o ON o.id_orden = l.id_orden
     JOIN estados_llanta e ON e.id_estado = l.id_estado
     LEFT JOIN dimensiones d ON d.id_dimension = l.id_dimension
     LEFT JOIN bandas b ON b.id_banda = l.id_banda
     LEFT JOIN bodegas bo ON bo.id_bodega = l.id_bodega_actual
     LEFT JOIN clientes propietario ON propietario.id_cliente = l.id_propietario_actual
     WHERE ${filter}
     ORDER BY d.dimension, b.banda, l.id_llanta`,
    params,
  );

  return rows;
};

// El IVA se consulta junto con los catalogos que ya se necesitan para abrir la
// venta. Es una sugerencia de interfaz; el detalle enviado al confirmar sigue
// siendo la fuente final y permite modificar cada llanta por separado.
export const getTireSaleCatalogs = async (_req, res) => {
  try {
    const [[bodegas], [clientes], [empleados], [taxParameters]] = await Promise.all([
      pool.query(
        "SELECT id_bodega, codigo, nombre FROM bodegas WHERE activa = 1 ORDER BY nombre",
      ),
      pool.query(
        `SELECT id_cliente, TRIM(CONCAT(nombre, ' ', COALESCE(apellido, ''))) AS cliente
         FROM clientes WHERE estado = 'A' ORDER BY nombre, apellido`,
      ),
      pool.query(
        `SELECT id_empleado, nombre, apellido FROM empleados
         WHERE estado = 'A' ORDER BY nombre, apellido`,
      ),
      pool.query(
        "SELECT valor_numero FROM parametros_planta WHERE codigo = ?",
        [DEFAULT_SALES_TAX_KEY],
      ),
    ]);

    res.json({
      bodegas,
      clientes,
      empleados,
      iva_predeterminado: Number(taxParameters[0]?.valor_numero ?? 0),
    });
  } catch (error) {
    console.error("Error en getTireSaleCatalogs:", error);
    res.status(500).json({ message: "No se pudieron cargar los catalogos de venta" });
  }
};

export const getTireForSale = async (req, res) => {
  const ticket = positiveInteger(req.params.ticket);
  if (ticket === null) {
    return res.status(400).json({ message: "Tiquete invalido" });
  }

  try {
    const [[existing]] = await pool.query(
      "SELECT id_llanta FROM llantas WHERE id_llanta = ?",
      [ticket],
    );
    if (!existing) {
      return res.status(404).json({ message: "Llanta no encontrada" });
    }

    const tires = await availableTires(pool, { tickets: [ticket] });
    if (tires.length === 0) {
      return res.status(409).json({
        message: "La llanta debe estar reencauchada o reparada y ubicada en bodega",
      });
    }

    res.json(tires[0]);
  } catch (error) {
    console.error("Error en getTireForSale:", error);
    res.status(500).json({ message: "No se pudo consultar la llanta" });
  }
};

export const listWarehouseTiresForSale = async (req, res) => {
  const warehouseId = positiveInteger(req.query.id_bodega);
  if (warehouseId === null) {
    return res.status(400).json({ message: "Debe seleccionar una bodega valida" });
  }

  try {
    res.json(await availableTires(pool, { warehouseId }));
  } catch (error) {
    console.error("Error en listWarehouseTiresForSale:", error);
    res.status(500).json({ message: "No se pudieron cargar las llantas de la bodega" });
  }
};

// Confirma en una sola transaccion la factura, sus precios y el traslado B -> C.
// Si una llanta deja de estar disponible, se revierte todo y no queda una venta
// parcial ni una factura sin detalle.
export const completeTireSale = async (req, res) => {
  const invoice = normalizeInvoice(req.body.numero_factura);
  const saleDate = validDate(req.body.fecha_venta) ? req.body.fecha_venta : null;
  const customerId = positiveInteger(req.body.id_cliente_comprador);
  const employeeId = positiveInteger(req.body.id_empleado);
  const warehouseId = positiveInteger(req.body.id_bodega);
  const observation = normalizeObservation(req.body.observacion);
  const details = parseDetails(req.body.llantas);

  if (!invoice || !saleDate || !customerId || !employeeId || !warehouseId || !details) {
    return res.status(400).json({ message: "Datos de venta incompletos o invalidos" });
  }

  // Un texto mayor a 255 caracteres debe rechazarse, no convertirse en null
  // silenciosamente como una observacion que se dejo vacia intencionalmente.
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

    const [[existingInvoice]] = await connection.query(
      "SELECT id_venta FROM ventas_llantas WHERE numero_factura = ?",
      [invoice],
    );
    if (existingInvoice) {
      return abort(409, "El numero de factura ya fue actualizado en el sistema");
    }

    const [[customer]] = await connection.query(
      "SELECT id_cliente FROM clientes WHERE id_cliente = ? AND estado = 'A'",
      [customerId],
    );
    if (!customer) return abort(400, "El cliente comprador no existe o esta inactivo");

    const [[employee]] = await connection.query(
      "SELECT id_empleado FROM empleados WHERE id_empleado = ? AND estado = 'A'",
      [employeeId],
    );
    if (!employee) return abort(400, "El empleado no existe o esta inactivo");

    const [[warehouse]] = await connection.query(
      "SELECT id_bodega FROM bodegas WHERE id_bodega = ? AND activa = 1",
      [warehouseId],
    );
    if (!warehouse) return abort(400, "La bodega de origen no existe o esta inactiva");

    const tickets = details.map((detail) => detail.ticket);
    const placeholders = tickets.map(() => "?").join(", ");
    const [lockedTires] = await connection.query(
      `SELECT id_llanta FROM llantas WHERE id_llanta IN (${placeholders}) FOR UPDATE`,
      tickets,
    );
    if (lockedTires.length !== tickets.length) {
      return abort(409, "Una o mas llantas no existen");
    }

    const tires = await availableTires(connection, { tickets, warehouseId });
    if (tires.length !== tickets.length) {
      return abort(
        409,
        "Una o mas llantas ya no estan disponibles en la bodega para esta venta",
      );
    }

    const [sale] = await connection.query(
      `INSERT INTO ventas_llantas
        (numero_factura, fecha_venta, id_cliente_comprador, id_empleado, id_bodega, observacion)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [invoice, saleDate, customerId, employeeId, warehouseId, observation],
    );

    for (const detail of details) {
      await connection.query(
        `INSERT INTO ventas_llantas_detalle
          (id_venta, id_llanta, precio_venta, iva_porcentaje)
         VALUES (?, ?, ?, ?)`,
        [sale.insertId, detail.ticket, detail.price, detail.iva],
      );
    }

    // id_bodega_salida conserva la salida original de Produccion. Solo se
    // vacia la bodega actual porque desde este momento la llanta esta en C.
    await connection.query(
      `UPDATE llantas
       SET ubicacion = ?, id_bodega_actual = NULL
       WHERE id_llanta IN (${placeholders})`,
      [CUSTOMER_LOCATION, ...tickets],
    );

    await connection.commit();
    res.json({
      message: `Venta actualizada correctamente. Factura ${invoice} registrada.`,
      factura: invoice,
      llantas_actualizadas: details.length,
    });
  } catch (error) {
    if (connection) await connection.rollback();
    console.error("Error en completeTireSale:", error);
    res.status(500).json({ message: "No se pudo actualizar la venta" });
  } finally {
    connection?.release();
  }
};

// El reporte parte de ventas_llantas y no de la ubicacion actual de llantas.
// Asi conserva comprador, bodega, precios e IVA aunque despues haya garantia.
export const getTireSaleReport = async (req, res) => {
  const invoice = normalizeInvoice(req.params.factura);
  if (!invoice) return res.status(400).json({ message: "Factura invalida" });

  try {
    const [[sale]] = await pool.query(
      `SELECT v.numero_factura, v.fecha_venta, v.observacion,
              TRIM(CONCAT(comprador.nombre, ' ', COALESCE(comprador.apellido, ''))) AS comprador,
              comprador.cedula_nit AS comprador_documento,
              TRIM(CONCAT(empleado.nombre, ' ', COALESCE(empleado.apellido, ''))) AS empleado,
              b.codigo AS bodega_codigo, b.nombre AS bodega_nombre,
              TRIM(CONCAT(empresa.nombre, ' ', COALESCE(empresa.apellido, ''))) AS empresa,
              configuracion.eslogan AS empresa_eslogan
       FROM ventas_llantas v
       JOIN clientes comprador ON comprador.id_cliente = v.id_cliente_comprador
       JOIN empleados empleado ON empleado.id_empleado = v.id_empleado
       JOIN bodegas b ON b.id_bodega = v.id_bodega
       LEFT JOIN data configuracion ON configuracion.id_configuracion = 1
       LEFT JOIN clientes empresa ON empresa.id_cliente = configuracion.id_cliente_propietario
       WHERE v.numero_factura = ?`,
      [invoice],
    );
    if (!sale) return res.status(404).json({ message: "Factura de venta no encontrada" });

    const [details] = await pool.query(
      `SELECT l.id_llanta,
              CONCAT(o.numero_orden, ' - ', LPAD(l.consec_orden, 2, '0')) AS orden,
              d.dimension, b.banda AS diseno,
              e.descripcion AS estado,
              TRIM(CONCAT(propietario.nombre, ' ', COALESCE(propietario.apellido, ''))) AS propietario,
              vd.precio_venta, vd.iva_porcentaje,
              ROUND(vd.precio_venta * vd.iva_porcentaje / 100, 2) AS valor_iva,
              ROUND(vd.precio_venta * (1 + vd.iva_porcentaje / 100), 2) AS total
       FROM ventas_llantas_detalle vd
       JOIN llantas l ON l.id_llanta = vd.id_llanta
       JOIN ordenes o ON o.id_orden = l.id_orden
       JOIN estados_llanta e ON e.id_estado = l.id_estado
       LEFT JOIN dimensiones d ON d.id_dimension = l.id_dimension
       LEFT JOIN bandas b ON b.id_banda = l.id_banda
       LEFT JOIN clientes propietario ON propietario.id_cliente = l.id_propietario_actual
       WHERE vd.id_venta = (SELECT id_venta FROM ventas_llantas WHERE numero_factura = ?)
       ORDER BY d.dimension, b.banda, l.id_llanta`,
      [invoice],
    );

    res.json({ venta: sale, detalle: details });
  } catch (error) {
    console.error("Error en getTireSaleReport:", error);
    res.status(500).json({ message: "No se pudo cargar el comprobante de venta" });
  }
};
