import { pool } from "../db.js";

// El consecutivo se conserva como parametro para que la compra de cascos no
// comparta numeracion con salidas, ordenes u otros documentos de planta.
const PURCHASE_DOCUMENT_KEY = "documento_compra_cascos_actual";
const INITIAL_INSPECTION_SUBPROCESS_ID = 1;
const APPROVED_STATE_ID = 1;

const positiveInteger = (value) => {
  const number = Number(value);
  return Number.isSafeInteger(number) && number > 0 ? number : null;
};

// La fecha se recibe como YYYY-MM-DD desde el input type=date. Validarla antes
// de abrir la transaccion evita documentos con fechas incompletas o ambiguas.
const validPurchaseDate = (value) =>
  typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value);

// Convierte y valida cada fila antes de que llegue a las consultas SQL. El
// valor cero es valido: la planta puede registrar un casco sin valor mientras
// aclara el acuerdo comercial, pero nunca valores negativos o no numericos.
const parseDetails = (value) => {
  if (!Array.isArray(value) || value.length === 0) return null;

  const details = value.map((detail) => ({
    id_llanta: positiveInteger(detail?.id_llanta),
    valor_compra: Number(detail?.valor_compra),
  }));

  const ids = details.map((detail) => detail.id_llanta);
  const hasRepeatedTire = new Set(ids).size !== ids.length;
  const hasInvalidValue = details.some(
    (detail) => !detail.id_llanta || !Number.isFinite(detail.valor_compra) || detail.valor_compra < 0,
  );

  return hasRepeatedTire || hasInvalidValue ? null : details;
};

// Solo se compra un casco ofrecido para venta que ya aprobo Inspeccion Inicial.
// El detalle evita volver a comprar una llanta aunque haya cambiado de orden.
const availableCasingCondition = `
  l.tipo_ingreso = 'VENTA_CASCO'
  AND EXISTS (
    SELECT 1
    FROM procesos p
    WHERE p.id_llanta = l.id_llanta
      AND p.id_subproceso = ${INITIAL_INSPECTION_SUBPROCESS_ID}
      AND p.id_estado_resultado = ${APPROVED_STATE_ID}
  )
  AND NOT EXISTS (
    SELECT 1
    FROM compras_cascos_detalle cd
    WHERE cd.id_llanta = l.id_llanta
  )`;

// Consulta un tiquete para agregarlo al documento que se esta preparando.
export const getEligibleCasing = async (req, res) => {
  const ticket = positiveInteger(req.params.ticket);
  if (!ticket) return res.status(400).json({ message: "Tiquete invalido" });

  try {
    const [rows] = await pool.query(
      `SELECT l.id_llanta, l.id_propietario_actual, c.nombre, c.apellido,
              o.numero_orden, l.consec_orden, m.marca, d.dimension,
              b.banda, l.serie, l.nivel_reenc
       FROM llantas l
       JOIN clientes c ON c.id_cliente = l.id_propietario_actual
       JOIN ordenes o ON o.id_orden = l.id_orden
       LEFT JOIN marcas m ON m.id_marca = l.id_marca
       LEFT JOIN dimensiones d ON d.id_dimension = l.id_dimension
       LEFT JOIN bandas b ON b.id_banda = l.id_banda
       WHERE l.id_llanta = ? AND ${availableCasingCondition}`,
      [ticket],
    );

    if (rows.length === 0) {
      return res.status(409).json({
        message: "La llanta no esta disponible para compra de casco",
      });
    }

    res.json(rows[0]);
  } catch (error) {
    console.error("Error en getEligibleCasing:", error);
    res.status(500).json({ message: "No se pudo consultar la llanta" });
  }
};

// El formulario solo necesita empleados activos y conocer la empresa que sera
// compradora. La empresa se configura una sola vez desde Catalogos > Empresa.
export const getPurchaseCatalogs = async (_req, res) => {
  try {
    const [[company]] = await pool.query(
      `SELECT d.id_cliente_propietario, c.nombre, c.apellido
       FROM data d
       JOIN clientes c ON c.id_cliente = d.id_cliente_propietario
       WHERE d.id_configuracion = 1`,
    );
    const [employees] = await pool.query(
      `SELECT id_empleado, nombre, apellido
       FROM empleados
       WHERE estado = 'A'
       ORDER BY nombre, apellido`,
    );

    if (!company) {
      return res.status(409).json({
        message: "Debe configurar la empresa propietaria antes de comprar cascos",
      });
    }

    res.json({ empresa: company, empleados: employees });
  } catch (error) {
    console.error("Error en getPurchaseCatalogs:", error);
    res.status(500).json({ message: "No se pudieron cargar los catalogos" });
  }
};

// Entrega una compra ya confirmada para la vista imprimible. La consulta parte
// de compras_cascos, no de llantas, para que el documento conserve vendedor,
// comprador y valor pactado aunque la llanta cambie despues de propietario.
export const getCasingPurchaseReport = async (req, res) => {
  const documentNumber = positiveInteger(req.params.documento);
  if (!documentNumber) {
    return res.status(400).json({ message: "Documento invalido" });
  }

  try {
    const [[purchase]] = await pool.query(
      `SELECT cc.id_compra, cc.documento, cc.fecha_compra,
              vendedor.nombre AS vendedor_nombre,
              vendedor.apellido AS vendedor_apellido,
              vendedor.cedula_nit AS vendedor_documento,
              vendedor.telefono AS vendedor_telefono,
              vendedor.direccion AS vendedor_direccion,
              empresa.nombre AS empresa_nombre,
              empresa.apellido AS empresa_apellido,
              empresa.cedula_nit AS empresa_documento,
              empleado.nombre AS empleado_nombre,
              empleado.apellido AS empleado_apellido
       FROM compras_cascos cc
       JOIN clientes vendedor ON vendedor.id_cliente = cc.id_vendedor
       JOIN clientes empresa ON empresa.id_cliente = cc.id_empresa_compradora
       JOIN empleados empleado ON empleado.id_empleado = cc.id_empleado
       WHERE cc.documento = ?`,
      [documentNumber],
    );

    if (!purchase) {
      return res.status(404).json({ message: "Documento de compra no encontrado" });
    }

    const [details] = await pool.query(
      `SELECT cd.id_llanta, cd.valor_compra, l.serie, l.nivel_reenc,
              o.numero_orden, l.consec_orden, m.marca, d.dimension
       FROM compras_cascos_detalle cd
       JOIN llantas l ON l.id_llanta = cd.id_llanta
       JOIN ordenes o ON o.id_orden = l.id_orden
       LEFT JOIN marcas m ON m.id_marca = l.id_marca
       LEFT JOIN dimensiones d ON d.id_dimension = l.id_dimension
       WHERE cd.id_compra = ?
       ORDER BY cd.id_llanta`,
      [purchase.id_compra],
    );

    const total = details.reduce(
      (sum, detail) => sum + Number(detail.valor_compra),
      0,
    );
    res.json({ compra: purchase, detalle: details, total });
  } catch (error) {
    console.error("Error en getCasingPurchaseReport:", error);
    res.status(500).json({ message: "No se pudo cargar el reporte de compra" });
  }
};

// Registra un documento completo. Todas las escrituras se realizan juntas: si
// una llanta deja de estar disponible, no se crea un documento a medias ni se
// transfiere la propiedad de las otras llantas seleccionadas.
export const createCasingPurchase = async (req, res) => {
  const seller = positiveInteger(req.body.id_vendedor);
  const employee = positiveInteger(req.body.id_empleado);
  const date = req.body.fecha_compra;
  const details = parseDetails(req.body.llantas);

  if (!seller || !employee || !validPurchaseDate(date) || !details) {
    return res.status(400).json({ message: "Datos de compra incompletos o invalidos" });
  }

  const tireIds = details.map((detail) => detail.id_llanta);
  const placeholders = tireIds.map(() => "?").join(",");
  let connection;

  try {
    connection = await pool.getConnection();
    await connection.beginTransaction();

    // Bloquear la configuracion evita que un cambio de empresa divida una misma
    // compra entre dos compradores distintos.
    const [[company]] = await connection.query(
      `SELECT id_cliente_propietario
       FROM data
       WHERE id_configuracion = 1
       FOR UPDATE`,
    );
    if (!company) throw new Error("Debe configurar la empresa propietaria");
    // La empresa no puede actuar como vendedora de sus propios cascos. Aunque
    // el formulario lo advierte, esta comprobacion en servidor protege la
    // regla frente a peticiones manuales o sesiones abiertas antiguas.
    if (seller === company.id_cliente_propietario) {
      throw new Error("No se puede comprar un casco cuyo propietario es la empresa");
    }

    const [[activeEmployee]] = await connection.query(
      `SELECT id_empleado
       FROM empleados
       WHERE id_empleado = ? AND estado = 'A'
       FOR UPDATE`,
      [employee],
    );
    if (!activeEmployee) throw new Error("El empleado no se encuentra activo");

    // FOR UPDATE protege la disponibilidad hasta que se inserta el detalle y
    // se transfiere la propiedad. La condicion incluye el detalle para devolver
    // un mensaje claro en vez de depender del error de la llave unica.
    const [availableTires] = await connection.query(
      `SELECT l.id_llanta
       FROM llantas l
       WHERE l.id_llanta IN (${placeholders})
         AND l.id_propietario_actual = ?
         AND ${availableCasingCondition}
       FOR UPDATE`,
      [...tireIds, seller],
    );
    if (availableTires.length !== tireIds.length) {
      throw new Error("Una o mas llantas ya no estan disponibles para este vendedor");
    }

    const [[parameter]] = await connection.query(
      `SELECT id_parametro, valor_numero
       FROM parametros_planta
       WHERE codigo = ?
       FOR UPDATE`,
      [PURCHASE_DOCUMENT_KEY],
    );
    if (!parameter) throw new Error("No existe el consecutivo de compras de cascos");

    const document = Number(parameter.valor_numero) + 1;
    await connection.query(
      "UPDATE parametros_planta SET valor_numero = ? WHERE id_parametro = ?",
      [document, parameter.id_parametro],
    );

    const [purchase] = await connection.query(
      `INSERT INTO compras_cascos
        (documento, fecha_compra, id_vendedor, id_empresa_compradora, id_empleado)
       VALUES (?, ?, ?, ?, ?)`,
      [document, date, seller, company.id_cliente_propietario, employee],
    );

    for (const detail of details) {
      await connection.query(
        `INSERT INTO compras_cascos_detalle (id_compra, id_llanta, valor_compra)
         VALUES (?, ?, ?)`,
        [purchase.insertId, detail.id_llanta, detail.valor_compra],
      );
    }

    // La orden continua identificando quien entrego inicialmente la llanta.
    // Solo el propietario actual cambia despues de confirmar la compra.
    await connection.query(
      `UPDATE llantas
       SET id_propietario_actual = ?
       WHERE id_llanta IN (${placeholders})`,
      [company.id_cliente_propietario, ...tireIds],
    );

    await connection.commit();
    res.status(201).json({
      message: `Compra registrada. Documento ${document}.`,
      documento: document,
    });
  } catch (error) {
    if (connection) await connection.rollback();

    const knownMessages = [
      "configurar la empresa",
      "propietario es la empresa",
      "no se encuentra activo",
      "ya no estan disponibles",
      "No existe el consecutivo",
    ];
    const status = knownMessages.some((message) => error.message?.includes(message))
      ? 409
      : 500;

    console.error("Error en createCasingPurchase:", error);
    res.status(status).json({
      message: error.message || "No se pudo registrar la compra",
    });
  } finally {
    connection?.release();
  }
};
