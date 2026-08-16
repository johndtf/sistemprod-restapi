import { pool } from "../db.js";

// ==================== OPCIONES FIJAS DE LA CONSULTA ====================
// El nombre que recibe el navegador no se usa directamente dentro de ORDER BY.
// Esta lista blanca evita que una opcion manipulada desde la URL pueda alterar
// la consulta SQL y conserva un orden estable cuando hay valores repetidos.
const SORT_OPTIONS = {
  tiquete: "l.id_llanta ASC",
  orden: "o.numero_orden ASC, l.consec_orden ASC, l.id_llanta ASC",
  dimension_diseno: "d.dimension ASC, b.banda ASC, l.id_llanta ASC",
};

const LOCATIONS = new Set(["P", "B", "C"]);

// Convierte los filtros de catalogo a enteros positivos. Un filtro vacio se
// considera opcional, mientras que un valor escrito incorrectamente se rechaza
// para evitar resultados inesperados para el usuario.
const optionalPositiveInteger = (value) => {
  if (value === undefined || value === null || value === "") return null;
  const number = Number(value);
  return Number.isSafeInteger(number) && number > 0 ? number : undefined;
};

// A diferencia de los identificadores de clientes o dimensiones, el catalogo
// de estados usa 0 para PENDIENTE. Por eso este filtro debe aceptar tambien el
// cero y no puede reutilizar la validacion de enteros estrictamente positivos.
const optionalNonNegativeInteger = (value) => {
  if (value === undefined || value === null || value === "") return null;
  const number = Number(value);
  return Number.isSafeInteger(number) && number >= 0 ? number : undefined;
};

const getCustomerName = "TRIM(CONCAT(c.nombre, ' ', COALESCE(c.apellido, '')))";

// ==================== CATALOGOS DE FILTROS ====================
// Se entregan desde el mismo modulo protegido para que la pantalla no dependa
// de permisos administrativos sobre clientes, dimensiones o bodegas.
export const getInventoryQueryCatalogs = async (_req, res) => {
  try {
    const [customers, dimensions, states] = await Promise.all([
      pool.query(
        `SELECT id_cliente, ${getCustomerName} AS cliente
         FROM clientes c
         ORDER BY c.nombre, c.apellido`,
      ),
      pool.query("SELECT id_dimension, dimension FROM dimensiones ORDER BY dimension"),
      pool.query("SELECT id_estado, descripcion FROM estados_llanta ORDER BY id_estado"),
    ]);

    res.json({
      clientes: customers[0],
      dimensiones: dimensions[0],
      estados: states[0],
    });
  } catch (error) {
    console.error("Error en getInventoryQueryCatalogs:", error);
    res.status(500).json({ message: "No se pudieron cargar los filtros de la consulta" });
  }
};

// ==================== CONSULTA GENERAL DE LLANTAS ====================
export const getInventoryQuery = async (req, res) => {
  const customerId = optionalPositiveInteger(req.query.cliente);
  const dimensionId = optionalPositiveInteger(req.query.dimension);
  const stateId = optionalNonNegativeInteger(req.query.estado);
  const orderNumber = optionalPositiveInteger(req.query.orden);
  const ticket = optionalPositiveInteger(req.query.tiquete);
  const location = req.query.ubicacion || null;
  const sort = SORT_OPTIONS[req.query.ordenar] ? req.query.ordenar : "tiquete";

  // undefined identifica valores no vacios que no pudieron convertirse. Asi no
  // se confunde un filtro incorrecto con la intencion de no filtrar.
  if ([customerId, dimensionId, stateId, orderNumber, ticket].some((value) => value === undefined)) {
    return res.status(400).json({ message: "Uno de los filtros numericos no es valido" });
  }
  if (location && !LOCATIONS.has(location)) {
    return res.status(400).json({ message: "La ubicacion seleccionada no es valida" });
  }

  const filters = [];
  const parameters = [];

  if (customerId) {
    filters.push("o.id_cliente = ?");
    parameters.push(customerId);
  }
  if (dimensionId) {
    filters.push("l.id_dimension = ?");
    parameters.push(dimensionId);
  }
  // PENDIENTE tiene id 0, por lo que se comprueba contra null y no por verdad.
  if (stateId !== null) {
    filters.push("l.id_estado = ?");
    parameters.push(stateId);
  }
  if (location) {
    filters.push("l.ubicacion = ?");
    parameters.push(location);
  }
  if (orderNumber) {
    filters.push("o.numero_orden = ?");
    parameters.push(orderNumber);
  }
  if (ticket) {
    filters.push("l.id_llanta = ?");
    parameters.push(ticket);
  }

  const whereClause = filters.length ? `WHERE ${filters.join(" AND ")}` : "";

  try {
    const [rows] = await pool.query(
      `SELECT ${getCustomerName} AS cliente,
              /* El propietario actual puede cambiar cuando la empresa compra
                 un casco; por eso no se toma directamente del cliente de orden. */
              COALESCE(
                NULLIF(TRIM(CONCAT(propietario.nombre, ' ', COALESCE(propietario.apellido, ''))), ''),
                'Sin propietario asignado'
              ) AS propietario,
              l.id_llanta AS tiquete,
              o.numero_orden,
              l.consec_orden,
              d.dimension,
              b.banda AS diseno,
              m.marca,
              l.nivel_reenc,
              o.fecha AS fecha_ingreso,
              e.descripcion AS estado,
              /* El tipo de ingreso explica el flujo esperado de la llanta:
                 reencauche, reparacion o venta de casco. */
              l.tipo_ingreso,
              /* procesos es el historial. Se toma su fila mas reciente para
                 indicar la etapa realmente registrada, incluso en reprocesos. */
              COALESCE(sp.nombre, 'Sin proceso registrado') AS ultimo_subproceso,
              ri.resol_inspec AS resolucion_inspeccion,
              CASE l.ubicacion
                WHEN 'P' THEN 'P - Planta'
                WHEN 'C' THEN 'C - Cliente'
                WHEN 'B' THEN CONCAT('B - ', COALESCE(CONCAT(bo.codigo, ' - ', bo.nombre), 'Bodega sin asignar'))
                ELSE l.ubicacion
              END AS ubicacion,
              COALESCE(l.fecha_terminacion, l.fecha_inspeccion_final) AS fecha_procesada,
              cc.documento AS documento_compra,
              cd.valor_compra AS costo_casco
       FROM llantas l
       JOIN ordenes o ON o.id_orden = l.id_orden
       JOIN clientes c ON c.id_cliente = o.id_cliente
       LEFT JOIN clientes propietario ON propietario.id_cliente = l.id_propietario_actual
       JOIN estados_llanta e ON e.id_estado = l.id_estado
       LEFT JOIN marcas m ON m.id_marca = l.id_marca
       LEFT JOIN dimensiones d ON d.id_dimension = l.id_dimension
       LEFT JOIN bandas b ON b.id_banda = l.id_banda
       LEFT JOIN procesos ultimo_proceso ON ultimo_proceso.id_proceso = (
         SELECT historial.id_proceso
         FROM procesos historial
         WHERE historial.id_llanta = l.id_llanta
         ORDER BY historial.fecha_registro DESC, historial.id_proceso DESC
         LIMIT 1
       )
       LEFT JOIN subprocesos sp ON sp.id_subproceso = ultimo_proceso.id_subproceso
       LEFT JOIN resoluciones_i ri ON ri.id_inspec = l.id_inspec
       LEFT JOIN bodegas bo ON bo.id_bodega = l.id_bodega_actual
       LEFT JOIN compras_cascos_detalle cd ON cd.id_llanta = l.id_llanta
       LEFT JOIN compras_cascos cc ON cc.id_compra = cd.id_compra
       ${whereClause}
       ORDER BY ${SORT_OPTIONS[sort]}`,
      parameters,
    );

    res.json({ filas: rows, total: rows.length, ordenar: sort });
  } catch (error) {
    console.error("Error en getInventoryQuery:", error);
    res.status(500).json({ message: "No se pudo consultar la informacion de las llantas" });
  }
};
