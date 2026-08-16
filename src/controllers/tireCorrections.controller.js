import { pool } from "../db.js";

// ==================== REGLAS DEL MODULO ====================
// Esta pantalla corrige datos de identificacion de una llanta que ya esta en
// proceso. No modifica ordenes ni procesos: `llantas` mantiene el dato vigente
// y `correcciones_llanta` conserva quien cambio cada valor y por que motivo.
const PLANT_LOCATION = "P";
const PHYSICAL_TREAD_SUBPROCESS_IDS = [6, 7, 8, 9, 10];

const parsePositiveInteger = (value) => {
  const number = Number(value);
  return Number.isSafeInteger(number) && number > 0 ? number : null;
};

const normalizeNullableText = (value, maxLength) => {
  if (typeof value !== "string") return null;
  const normalized = value.trim();
  return normalized.length <= maxLength ? normalized || null : undefined;
};

// MySQL puede conservar una cadena vacia donde otro formulario guarda NULL.
// Para decidir si realmente hubo una correccion ambos formatos representan la
// misma ausencia de texto; normalizarlos evita filas de bitacora sin cambios.
const normalizeStoredText = (value) => {
  if (value === null || value === undefined) return null;
  const normalized = String(value).trim();
  return normalized || null;
};

const parseCorrectionPayload = (body) => {
  const brandId = parsePositiveInteger(body.id_marca);
  const dimensionId = parsePositiveInteger(body.id_dimension);
  const treadId = parsePositiveInteger(body.id_banda);
  const priority = Number(body.prioridad);
  const retreadLevel = Number(body.nivel_reenc);
  const serie = normalizeNullableText(body.serie, 50);
  const observation = normalizeNullableText(body.observacion, 255);
  const reason = normalizeNullableText(body.motivo, 255);

  if (
    brandId === null ||
    dimensionId === null ||
    treadId === null ||
    !Number.isSafeInteger(priority) ||
    ![0, 1].includes(priority) ||
    !Number.isSafeInteger(retreadLevel) ||
    retreadLevel < 0 ||
    retreadLevel > 255 ||
    serie === undefined ||
    observation === undefined ||
    reason === undefined ||
    !reason
  ) {
    return null;
  }

  return {
    brandId,
    dimensionId,
    treadId,
    priority,
    retreadLevel,
    serie,
    observation,
    reason,
    confirmPhysicalChange: body.confirmar_cambio_fisico === true,
  };
};

// El costo o una salida documentada vuelven inmodificable la identificacion de
// la llanta. De esta forma no se altera una combinacion ya usada para costeo,
// contabilidad o entrega a una bodega.
const getCorrectionBlockReason = (tire) => {
  if (tire.costo_estimado !== null || tire.costo_real !== null) {
    return "La llanta ya tiene costeo registrado y no puede corregirse";
  }
  if (tire.documento_salida !== null || tire.fecha_salida !== null || tire.ubicacion !== PLANT_LOCATION) {
    return "La llanta ya tiene salida registrada o no se encuentra en planta";
  }
  return null;
};

const getTireWithContext = async (connection, ticket, lock = false) => {
  const [rows] = await connection.query(
    `SELECT l.id_llanta,
            l.id_orden,
            l.consec_orden,
            l.id_marca,
            l.id_dimension,
            l.id_banda,
            l.serie,
            l.prioridad,
            l.nivel_reenc,
            l.tipo_ingreso,
            l.observacion,
            l.id_estado,
            l.ubicacion,
            l.documento_salida,
            l.fecha_salida,
            l.costo_estimado,
            l.costo_real,
            CONCAT(o.numero_orden, ' - ', LPAD(l.consec_orden, 2, '0')) AS orden,
            e.descripcion AS estado,
            m.marca,
            d.dimension,
            b.banda AS diseno,
            ultimo_proceso.id_subproceso AS id_ultimo_subproceso,
            sp.nombre AS ultimo_subproceso,
            EXISTS(
              SELECT 1
              FROM procesos proceso_fisico
              WHERE proceso_fisico.id_llanta = l.id_llanta
                AND proceso_fisico.id_subproceso IN (${PHYSICAL_TREAD_SUBPROCESS_IDS.join(", ")})
            ) AS tiene_proceso_fisico_banda
     FROM llantas l
     JOIN ordenes o ON o.id_orden = l.id_orden
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
     WHERE l.id_llanta = ?${lock ? " FOR UPDATE" : ""}`,
    [ticket],
  );

  return rows[0] ?? null;
};

const parseSnapshot = (value) => {
  try {
    return JSON.parse(value || "{}");
  } catch (_error) {
    // Una correccion antigua no debe impedir consultar la llanta si su texto
    // de auditoria fue alterado manualmente o no contiene JSON valido.
    return {};
  }
};

const getCorrectionHistory = async (connection, ticket) => {
  const [rows] = await connection.query(
    `SELECT c.id_correccion,
            c.fecha_registro,
            c.motivo,
            c.datos_anteriores,
            c.datos_nuevos,
            TRIM(CONCAT(e.nombre, ' ', COALESCE(e.apellido, ''))) AS empleado
     FROM correcciones_llanta c
     JOIN empleados e ON e.id_empleado = c.id_empleado
     WHERE c.id_llanta = ?
     ORDER BY c.fecha_registro DESC, c.id_correccion DESC`,
    [ticket],
  );

  return rows.map((row) => ({
    ...row,
    // La bitacora se almacena como texto JSON para no depender de una version
    // particular de MySQL. Si un registro antiguo fuera invalido, se entrega
    // como objeto vacio sin impedir que la pantalla muestre el historial.
    datos_anteriores: parseSnapshot(row.datos_anteriores),
    datos_nuevos: parseSnapshot(row.datos_nuevos),
  }));
};

// ==================== CATALOGOS ====================
// Las correcciones usan los mismos catalogos maestros que Ordenes, evitando
// texto libre y garantizando que los IDs nuevos sean validos.
export const getTireCorrectionCatalogs = async (_req, res) => {
  try {
    const [brands, dimensions, treads] = await Promise.all([
      pool.query("SELECT id_marca, marca FROM marcas ORDER BY marca"),
      pool.query("SELECT id_dimension, dimension FROM dimensiones ORDER BY dimension"),
      pool.query("SELECT id_banda, banda FROM bandas ORDER BY banda"),
    ]);

    res.json({
      marcas: brands[0],
      dimensiones: dimensions[0],
      disenos: treads[0],
    });
  } catch (error) {
    console.error("Error en getTireCorrectionCatalogs:", error);
    res.status(500).json({ message: "No se pudieron consultar los catalogos" });
  }
};

// ==================== CONSULTA ====================
// La consulta siempre devuelve el estado de bloqueo para que el usuario pueda
// entender por que una llanta salida o costeada no puede editarse.
export const getTireForCorrection = async (req, res) => {
  const ticket = parsePositiveInteger(req.params.ticket);
  if (ticket === null) return res.status(400).json({ message: "Tiquete invalido" });

  try {
    const tire = await getTireWithContext(pool, ticket);
    if (!tire) return res.status(404).json({ message: "Llanta no encontrada" });

    const blockReason = getCorrectionBlockReason(tire);
    const history = await getCorrectionHistory(pool, ticket);
    res.json({
      ...tire,
      puede_corregir: !blockReason,
      motivo_bloqueo: blockReason,
      historial_correcciones: history,
    });
  } catch (error) {
    console.error("Error en getTireForCorrection:", error);
    res.status(500).json({ message: "No se pudo consultar la llanta" });
  }
};

// ==================== ACTUALIZACION Y BITACORA ====================
export const updateTireInProcess = async (req, res) => {
  const ticket = parsePositiveInteger(req.params.ticket);
  const correction = parseCorrectionPayload(req.body);
  const employeeId = parsePositiveInteger(req.user?.userId);

  if (ticket === null || !correction || employeeId === null) {
    return res.status(400).json({ message: "Datos de correccion incompletos o invalidos" });
  }

  let connection;
  try {
    connection = await pool.getConnection();
    await connection.beginTransaction();

    const abort = async (status, message) => {
      await connection.rollback();
      return res.status(status).json({ message });
    };

    const tire = await getTireWithContext(connection, ticket, true);
    if (!tire) return abort(404, "Llanta no encontrada");

    const blockReason = getCorrectionBlockReason(tire);
    if (blockReason) return abort(409, blockReason);

    const [catalogRows] = await connection.query(
      `SELECT
         (SELECT COUNT(*) FROM marcas WHERE id_marca = ?) AS marca_valida,
         (SELECT COUNT(*) FROM dimensiones WHERE id_dimension = ?) AS dimension_valida,
         (SELECT COUNT(*) FROM bandas WHERE id_banda = ?) AS diseno_valido,
         (SELECT COUNT(*) FROM empleados WHERE id_empleado = ? AND estado = 'A') AS empleado_activo`,
      [correction.brandId, correction.dimensionId, correction.treadId, employeeId],
    );
    const validation = catalogRows[0];
    if (!validation.marca_valida || !validation.dimension_valida || !validation.diseno_valido) {
      return abort(400, "Marca, dimension o diseno no existe en los catalogos");
    }
    if (!validation.empleado_activo) {
      return abort(403, "El empleado de la sesion no esta activo");
    }

    const previousValues = {
      id_marca: tire.id_marca,
      marca: tire.marca,
      id_dimension: tire.id_dimension,
      dimension: tire.dimension,
      id_banda: tire.id_banda,
      diseno: tire.diseno,
      serie: normalizeStoredText(tire.serie),
      prioridad: tire.prioridad,
      nivel_reenc: tire.nivel_reenc,
      observacion: normalizeStoredText(tire.observacion),
    };

    const sensitiveTreadChange =
      tire.id_dimension !== correction.dimensionId || tire.id_banda !== correction.treadId;
    if (
      sensitiveTreadChange &&
      tire.tiene_proceso_fisico_banda &&
      !correction.confirmPhysicalChange
    ) {
      return abort(
        409,
        "La llanta ya tiene corte de banda o un proceso posterior. Confirme que el cambio coincide con la llanta fisica",
      );
    }

    const newValues = {
      id_marca: correction.brandId,
      id_dimension: correction.dimensionId,
      id_banda: correction.treadId,
      serie: correction.serie,
      prioridad: correction.priority,
      nivel_reenc: correction.retreadLevel,
      observacion: correction.observation,
    };
    const changed = Object.entries(newValues).some(([key, value]) => previousValues[key] !== value);
    if (!changed) return abort(400, "No hay cambios para registrar");

    const [newCatalogNames] = await connection.query(
      `SELECT
         (SELECT marca FROM marcas WHERE id_marca = ?) AS marca,
         (SELECT dimension FROM dimensiones WHERE id_dimension = ?) AS dimension,
         (SELECT banda FROM bandas WHERE id_banda = ?) AS diseno`,
      [correction.brandId, correction.dimensionId, correction.treadId],
    );

    const newSnapshot = {
      ...newValues,
      marca: newCatalogNames[0].marca,
      dimension: newCatalogNames[0].dimension,
      diseno: newCatalogNames[0].diseno,
    };

    await connection.query(
      `UPDATE llantas
       SET id_marca = ?,
           id_dimension = ?,
           id_banda = ?,
           serie = ?,
           prioridad = ?,
           nivel_reenc = ?,
           observacion = ?
       WHERE id_llanta = ?`,
      [
        correction.brandId,
        correction.dimensionId,
        correction.treadId,
        correction.serie,
        correction.priority,
        correction.retreadLevel,
        correction.observation,
        ticket,
      ],
    );

    await connection.query(
      `INSERT INTO correcciones_llanta
        (id_llanta, fecha_registro, id_empleado, motivo, datos_anteriores, datos_nuevos)
       VALUES (?, NOW(), ?, ?, ?, ?)`,
      [
        ticket,
        employeeId,
        correction.reason,
        JSON.stringify(previousValues),
        JSON.stringify(newSnapshot),
      ],
    );

    await connection.commit();
    res.json({ message: "Correccion registrada correctamente" });
  } catch (error) {
    if (connection) await connection.rollback();
    console.error("Error en updateTireInProcess:", error);
    res.status(500).json({ message: "No se pudo registrar la correccion" });
  } finally {
    connection?.release();
  }
};
