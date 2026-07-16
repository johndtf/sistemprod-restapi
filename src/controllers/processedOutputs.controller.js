import { pool } from "../db.js";

// Los estados y la ubicacion se centralizan para que las consultas de salida
// individual y por bloque apliquen exactamente las mismas reglas.
const RETREADED_STATE_ID = 4;
const REPAIRED_STATE_ID = 3;
const PLANT_LOCATION = "P";
const WAREHOUSE_LOCATION = "B";
const OUTPUT_DOCUMENT_KEY = "documento_salida_procesadas_actual";
const AVERAGE_COST_KEY = "costo_kg_promedio_reencauche";

const STATE_BY_TYPE = {
  REENCAUCHADA: RETREADED_STATE_ID,
  REPARADA: REPAIRED_STATE_ID,
};

// Convierte valores de URL o JSON a enteros seguros antes de usarlos como
// parametros SQL. `null` permite distinguir un dato invalido de un cero.
const parsePositiveInteger = (value) => {
  const number = Number(value);
  return Number.isSafeInteger(number) && number > 0 ? number : null;
};

const normalizeOutputType = (value) =>
  typeof value === "string" && STATE_BY_TYPE[value.toUpperCase()]
    ? value.toUpperCase()
    : null;

const normalizeDate = (value) => {
  if (typeof value !== "string" || !value.trim()) return null;
  const date = value.trim();
  return /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : null;
};

const parseTicketList = (value) => {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.map(parsePositiveInteger).filter(Boolean))];
};

// El costo se lee dentro de la conexion activa para que la validacion y la
// actualizacion final trabajen con el mismo valor durante la transaccion.
const getAverageCost = async (connection) => {
  const [rows] = await connection.query(
    `SELECT valor_numero
     FROM parametros_planta
     WHERE codigo = ?`,
    [AVERAGE_COST_KEY],
  );
  return rows.length === 0 ? 0 : Number(rows[0].valor_numero);
};

// Se ejecuta dentro de la transaccion que actualiza las llantas. Por ello un
// documento solo consume consecutivo cuando toda la salida es valida y queda
// registrada; un error posterior revierte tambien el aumento del parametro.
const getNextOutputDocument = async (connection) => {
  await connection.query(
    `INSERT INTO parametros_planta
      (codigo, nombre, valor_numero, unidad, descripcion)
     VALUES (?, 'Documento actual de salidas procesadas', 0, 'documento',
             'Consecutivo usado para salidas de llantas procesadas.')
     ON DUPLICATE KEY UPDATE codigo = VALUES(codigo)`,
    [OUTPUT_DOCUMENT_KEY],
  );

  const [rows] = await connection.query(
    `SELECT id_parametro, valor_numero
     FROM parametros_planta
     WHERE codigo = ?
     FOR UPDATE`,
    [OUTPUT_DOCUMENT_KEY],
  );
  const nextDocument = Number(rows[0].valor_numero) + 1;

  await connection.query(
    `UPDATE parametros_planta
     SET valor_numero = ?
     WHERE id_parametro = ?`,
    [nextDocument, rows[0].id_parametro],
  );

  return nextDocument;
};

// ==================== CATALOGOS ====================
// Solo se entregan bodegas y empleados activos, que son las opciones validas
// para una nueva salida.
export const getProcessedOutputCatalogs = async (_req, res) => {
  try {
    const [warehouses] = await pool.query(
      `SELECT id_bodega, codigo, nombre
       FROM bodegas
       WHERE activa = 1
       ORDER BY nombre`,
    );
    const [employees] = await pool.query(
      `SELECT id_empleado, nombre, apellido
       FROM empleados
       WHERE estado = 'A'
       ORDER BY nombre, apellido`,
    );
    res.json({
      bodegas: warehouses,
      empleados: employees,
    });
  } catch (error) {
    console.error("Error en getProcessedOutputCatalogs:", error);
    res.status(500).json({ message: "No se pudieron consultar los catalogos de salida" });
  }
};

// ==================== CONSULTAS DE LLANTAS ====================
// Construye las filas para busqueda por tiquete y carga por bloque. No modifica
// llantas: calcula previamente el costo y explica por que alguna no puede salir.
const buildTireRows = async (connection, { tickets = null, outputType }) => {
  const stateId = STATE_BY_TYPE[outputType];
  const averageCost = outputType === "REENCAUCHADA" ? await getAverageCost(connection) : 0;
  const params = [averageCost];
  let filter = `l.ubicacion = ? AND l.id_estado = ?`;
  params.push(PLANT_LOCATION, stateId);

  if (tickets) {
    filter += ` AND l.id_llanta IN (${tickets.map(() => "?").join(", ")})`;
    params.push(...tickets);
  }

  // El peso se obtiene de la combinacion dimension + diseno. Una reparada no
  // requiere este catalogo porque por ahora no tiene costeo en este modulo.
  const [rows] = await connection.query(
    `SELECT l.id_llanta,
            l.serie,
            l.ubicacion,
            l.id_estado,
            e.descripcion AS estado,
            CONCAT(o.numero_orden, ' - ', LPAD(l.consec_orden, 2, '0')) AS orden,
            TRIM(CONCAT(c.nombre, ' ', COALESCE(c.apellido, ''))) AS cliente,
            m.marca,
            d.dimension,
            b.banda AS diseno,
            l.fecha_terminacion,
            MONTH(l.fecha_terminacion) AS mes_proceso,
            YEAR(l.fecha_terminacion) AS anio_proceso,
            pb.peso_promedio,
            ? AS costo_kg_promedio,
            CASE
              WHEN l.id_estado = ?
               AND pb.peso_promedio IS NOT NULL
               AND ? > 0
              THEN ROUND(pb.peso_promedio * ?, 2)
              ELSE NULL
            END AS costo_estimado
     FROM llantas l
     JOIN ordenes o ON l.id_orden = o.id_orden
     JOIN clientes c ON o.id_cliente = c.id_cliente
     JOIN estados_llanta e ON l.id_estado = e.id_estado
     LEFT JOIN marcas m ON l.id_marca = m.id_marca
     LEFT JOIN dimensiones d ON l.id_dimension = d.id_dimension
     LEFT JOIN bandas b ON l.id_banda = b.id_banda
     LEFT JOIN pesos_banda pb
       ON pb.id_dimension = l.id_dimension
      AND pb.id_banda = l.id_banda
     WHERE ${filter}
     ORDER BY d.dimension, b.banda, l.fecha_terminacion, l.id_llanta`,
    [averageCost, RETREADED_STATE_ID, averageCost, averageCost, ...params.slice(1)],
  );

  return rows.map((row) => {
    // El periodo contable se toma de terminacion, incluso si la salida ocurre
    // despues. Asi las llantas terminadas al cierre siguen en el mes correcto.
    const missingWeight = outputType === "REENCAUCHADA" && row.peso_promedio === null;
    const missingCost = outputType === "REENCAUCHADA" && averageCost <= 0;
    const missingPeriod =
      outputType === "REENCAUCHADA" && (!row.mes_proceso || !row.anio_proceso);

    return {
      ...row,
      salida_valida: !missingWeight && !missingCost && !missingPeriod,
      mensaje_validacion: missingWeight
        ? "Falta peso promedio para la combinacion"
        : missingCost
          ? "Falta configurar costo/kg promedio"
          : missingPeriod
            ? "Falta fecha de terminacion para definir el periodo"
            : "Lista para salida",
    };
  });
};

export const getProcessedOutputTire = async (req, res) => {
  const ticket = parsePositiveInteger(req.params.ticket);
  const outputType = normalizeOutputType(req.query.tipo);

  if (ticket === null || !outputType) {
    return res.status(400).json({ message: "Tiquete o tipo de salida invalido" });
  }

  try {
    const [exists] = await pool.query(
      `SELECT id_llanta, ubicacion, id_estado
       FROM llantas
       WHERE id_llanta = ?`,
      [ticket],
    );
    if (exists.length === 0) return res.status(404).json({ message: "Llanta no encontrada" });

    const rows = await buildTireRows(pool, { tickets: [ticket], outputType });
    if (rows.length === 0) {
      return res.status(409).json({
        message: `La llanta debe estar en planta y con estado ${outputType}`,
      });
    }

    res.json(rows[0]);
  } catch (error) {
    console.error("Error en getProcessedOutputTire:", error);
    res.status(500).json({ message: "No se pudo consultar la llanta" });
  }
};

export const listProcessedOutputBlock = async (req, res) => {
  const outputType = normalizeOutputType(req.query.tipo);
  if (!outputType) return res.status(400).json({ message: "Tipo de salida invalido" });

  try {
    const rows = await buildTireRows(pool, { outputType });
    res.json(rows);
  } catch (error) {
    console.error("Error en listProcessedOutputBlock:", error);
    res.status(500).json({ message: "No se pudieron consultar las llantas" });
  }
};

// ==================== ACTUALIZACION DE SALIDA ====================
// La tabla visible es una preparacion del documento. Solo este endpoint cambia
// ubicacion, documento, fechas y costos para todas las llantas seleccionadas.
export const completeProcessedOutput = async (req, res) => {
  const outputType = normalizeOutputType(req.body.tipo_salida);
  const warehouseId = parsePositiveInteger(req.body.id_bodega);
  const employeeId = parsePositiveInteger(req.body.id_empleado);
  const outputDate = normalizeDate(req.body.fecha_salida);
  const tickets = parseTicketList(req.body.tiquetes);

  if (
    !outputType ||
    warehouseId === null ||
    employeeId === null ||
    outputDate === null ||
    tickets.length === 0
  ) {
    return res.status(400).json({ message: "Datos de salida incompletos o invalidos" });
  }

  let connection;

  try {
    connection = await pool.getConnection();
    await connection.beginTransaction();

    // Cualquier regla incumplida deshace toda la transaccion, evitando salidas
    // parciales cuando el documento contiene varias llantas.
    const abort = async (status, message) => {
      await connection.rollback();
      return res.status(status).json({ message });
    };

    const [warehouses] = await connection.query(
      "SELECT id_bodega, codigo FROM bodegas WHERE id_bodega = ? AND activa = 1",
      [warehouseId],
    );
    if (warehouses.length === 0) return abort(400, "La bodega de destino no existe");

    const [employees] = await connection.query(
      "SELECT id_empleado FROM empleados WHERE id_empleado = ? AND estado = 'A'",
      [employeeId],
    );
    if (employees.length === 0) return abort(400, "El empleado no existe o no esta activo");

    // Bloquea las llantas antes de escribir para que dos salidas simultaneas no
    // registren el mismo tiquete en documentos distintos. Despues de esperar el
    // bloqueo se vuelven a consultar sus reglas de disponibilidad.
    const placeholders = tickets.map(() => "?").join(", ");
    const [lockedTires] = await connection.query(
      `SELECT id_llanta
       FROM llantas
       WHERE id_llanta IN (${placeholders})
       FOR UPDATE`,
      tickets,
    );
    if (lockedTires.length !== tickets.length) {
      return abort(409, "Una o mas llantas no existen");
    }

    // Se vuelve a consultar dentro de la transaccion: la tabla del navegador
    // puede haber quedado desactualizada desde que el usuario la cargo.
    const tireRows = await buildTireRows(connection, { tickets, outputType });
    if (tireRows.length !== tickets.length) {
      return abort(409, "Una o mas llantas no estan disponibles para salida");
    }
    const invalid = tireRows.find((row) => !row.salida_valida);
    if (invalid) {
      return abort(
        409,
        `Tiquete ${invalid.id_llanta}: ${invalid.mensaje_validacion}`,
      );
    }

    // El consecutivo se crea al final de las validaciones y antes de guardar
    // las llantas: asi representa exactamente una salida confirmada.
    const documentNumber = await getNextOutputDocument(connection);

    for (const tire of tireRows) {
      // La ubicacion B indica que la llanta ya salio de planta; la bodega
      // concreta queda en id_bodega_actual. id_bodega_salida no se reutiliza
      // para traslados futuros porque conserva el destino original del documento.
      // Las reparadas se registran logisticamente, pero sus campos de costeo se
      // conservan en null hasta definir su metodo de costeo futuro.
      await connection.query(
        `UPDATE llantas
         SET ubicacion = ?,
             documento_salida = ?,
             fecha_salida = ?,
             id_empleado_salida = ?,
             id_bodega_salida = ?,
             id_bodega_actual = ?,
             tipo_salida = ?,
             peso_banda_costeo = ?,
             costo_kg_estimado_aplicado = ?,
             costo_estimado = ?,
             mes_proceso = ?,
             anio_proceso = ?
         WHERE id_llanta = ?`,
        [
          WAREHOUSE_LOCATION,
          documentNumber,
          outputDate,
          employeeId,
          warehouseId,
          warehouseId,
          outputType,
          outputType === "REENCAUCHADA" ? tire.peso_promedio : null,
          outputType === "REENCAUCHADA" ? tire.costo_kg_promedio : null,
          outputType === "REENCAUCHADA" ? tire.costo_estimado : null,
          outputType === "REENCAUCHADA" ? tire.mes_proceso : null,
          outputType === "REENCAUCHADA" ? tire.anio_proceso : null,
          tire.id_llanta,
        ],
      );
    }

    await connection.commit();
    res.json({
      message: `Salida registrada correctamente. Documento ${documentNumber} generado.`,
      documento: documentNumber,
      llantas_actualizadas: tireRows.length,
    });
  } catch (error) {
    if (connection) await connection.rollback();
    console.error("Error en completeProcessedOutput:", error);
    res.status(500).json({ message: "No se pudo registrar la salida" });
  } finally {
    connection?.release();
  }
};
