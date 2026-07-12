import { pool } from "../db.js";

// ==================== CONSTANTES DEL SUBPROCESO ====================
// Corte de banda trabaja como operación por lote. El operario y la fecha/hora
// del corte aplican a todas las llantas marcadas en la misma actualización.
const TREAD_CUT_SUBPROCESS_ID = 6;
const SCRAPING_SUBPROCESS_ID = 2;
const APT_STATE_ID = 1;

// ==================== VALIDACION Y FORMATO ====================
const parsePositiveInteger = (value) => {
  const number = Number(value);
  return Number.isSafeInteger(number) && number > 0 ? number : null;
};

const parseTicketList = (value) => {
  if (!Array.isArray(value)) return [];

  return [
    ...new Set(
      value
        .map((ticket) => parsePositiveInteger(ticket))
        .filter((ticket) => ticket !== null),
    ),
  ];
};

const normalizeDateTime = (value) => {
  if (typeof value !== "string" || !value.trim()) return null;

  const normalized = value.trim().replace("T", " ");
  return /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}(:\d{2})?$/.test(normalized)
    ? normalized
    : null;
};

const parseCutData = (body) => {
  const operator = parsePositiveInteger(body.id_operario);
  const processDate = normalizeDateTime(body.fecha_corte);

  if (operator === null || processDate === null) return null;
  return { operator, processDate };
};

const getOrderClause = (order) => {
  if (order === "tiempo") {
    return "fecha_raspado ASC, id_llanta ASC";
  }

  return "diseno ASC, ancho ASC, fecha_raspado ASC, id_llanta ASC";
};

// ==================== CONSULTAS BASE ====================
// La elegibilidad se calcula con procesos porque una llanta puede tener
// reprocesos. La regla operativa es: existe Raspado aprobado y no existe Corte
// posterior a ese Raspado.
const pendingCutsQuery = (orderClause) => `
  SELECT *
  FROM (
    SELECT l.id_llanta,
           CONCAT(o.numero_orden, ' - ', LPAD(l.consec_orden, 2, '0')) AS orden,
           TRIM(CONCAT(c.nombre, ' ', COALESCE(c.apellido, ''))) AS cliente,
           m.marca,
           d.dimension,
           b.banda AS diseno,
           l.serie,
           l.ancho,
           l.perimetro AS largo,
           pr.fecha AS fecha_raspado,
           pr.fecha_registro AS ultimo_raspado_registro,
           TIMESTAMPDIFF(MINUTE, pr.fecha, NOW()) AS minutos_desde_raspado,
           pc.fecha_registro AS ultimo_corte_fecha
    FROM llantas l
    JOIN ordenes o ON l.id_orden = o.id_orden
    JOIN clientes c ON o.id_cliente = c.id_cliente
    LEFT JOIN marcas m ON l.id_marca = m.id_marca
    LEFT JOIN dimensiones d ON l.id_dimension = d.id_dimension
    LEFT JOIN bandas b ON l.id_banda = b.id_banda
    JOIN procesos pr ON pr.id_proceso = (
      SELECT p.id_proceso
      FROM procesos p
      WHERE p.id_llanta = l.id_llanta
        AND p.id_subproceso = ?
        AND p.id_estado_resultado = ?
      ORDER BY p.fecha_registro DESC, p.id_proceso DESC
      LIMIT 1
    )
    LEFT JOIN procesos pc ON pc.id_proceso = (
      SELECT p.id_proceso
      FROM procesos p
      WHERE p.id_llanta = l.id_llanta
        AND p.id_subproceso = ?
      ORDER BY p.fecha_registro DESC, p.id_proceso DESC
      LIMIT 1
    )
    WHERE l.id_estado = ?
  ) pendientes
  WHERE ultimo_corte_fecha IS NULL OR ultimo_corte_fecha < ultimo_raspado_registro
  ORDER BY ${orderClause}`;

const getCutTireQuery = `
  SELECT l.id_llanta,
         CONCAT(o.numero_orden, ' - ', LPAD(l.consec_orden, 2, '0')) AS orden,
         TRIM(CONCAT(c.nombre, ' ', COALESCE(c.apellido, ''))) AS cliente,
         m.marca,
         d.dimension,
         b.banda AS diseno,
         l.serie,
         l.ancho,
         l.perimetro AS largo,
         pr.fecha AS fecha_raspado,
         pc.fecha AS fecha_corte,
         pc.fecha_registro AS ultimo_corte_fecha,
         pc.id_proceso AS id_proceso_corte,
         pc.reproceso AS reproceso,
         CASE WHEN ec.id_empleado IS NULL THEN NULL
              ELSE TRIM(CONCAT(ec.id_empleado, ' - ', ec.nombre, ' ', COALESCE(ec.apellido, '')))
         END AS operario_corte
  FROM llantas l
  JOIN ordenes o ON l.id_orden = o.id_orden
  JOIN clientes c ON o.id_cliente = c.id_cliente
  LEFT JOIN marcas m ON l.id_marca = m.id_marca
  LEFT JOIN dimensiones d ON l.id_dimension = d.id_dimension
  LEFT JOIN bandas b ON l.id_banda = b.id_banda
  JOIN procesos pr ON pr.id_proceso = (
    SELECT p.id_proceso
    FROM procesos p
    WHERE p.id_llanta = l.id_llanta
      AND p.id_subproceso = ?
      AND p.id_estado_resultado = ?
    ORDER BY p.fecha_registro DESC, p.id_proceso DESC
    LIMIT 1
  )
  JOIN procesos pc ON pc.id_proceso = (
    SELECT p.id_proceso
    FROM procesos p
    WHERE p.id_llanta = l.id_llanta
      AND p.id_subproceso = ?
    ORDER BY p.fecha_registro DESC, p.id_proceso DESC
    LIMIT 1
  )
  LEFT JOIN empleados ec ON pc.id_operario = ec.id_empleado
  WHERE l.id_llanta = ?`;

const getEligiblePendingTicket = async (connection, ticket) => {
  const [lockedTire] = await connection.query(
    `SELECT id_llanta
     FROM llantas
     WHERE id_llanta = ?
     FOR UPDATE`,
    [ticket],
  );

  if (lockedTire.length === 0) return null;

  const [rows] = await connection.query(
    pendingCutsQuery("id_llanta ASC"),
    [
      SCRAPING_SUBPROCESS_ID,
      APT_STATE_ID,
      TREAD_CUT_SUBPROCESS_ID,
      APT_STATE_ID,
    ],
  );

  return rows.find((row) => row.id_llanta === ticket) ?? null;
};

const countCutHistory = async (connection, ticket) => {
  const [history] = await connection.query(
    `SELECT COUNT(*) AS total
     FROM procesos
     WHERE id_llanta = ? AND id_subproceso = ?`,
    [ticket, TREAD_CUT_SUBPROCESS_ID],
  );

  return history[0].total;
};

const setCurrentCutFromLatestProcess = async (connection, ticket) => {
  const [rows] = await connection.query(
    `SELECT fecha, fecha_registro, id_operario
     FROM procesos
     WHERE id_llanta = ?
       AND id_subproceso = ?
     ORDER BY fecha_registro DESC, id_proceso DESC
     LIMIT 1`,
    [ticket, TREAD_CUT_SUBPROCESS_ID],
  );

  if (rows.length === 0) {
    await connection.query(
      `UPDATE llantas
       SET fecha_corte = NULL,
           fecha_registro_corte = NULL,
           id_operario_corte = NULL
       WHERE id_llanta = ?`,
      [ticket],
    );
    return;
  }

  await connection.query(
    `UPDATE llantas
     SET fecha_corte = ?,
         fecha_registro_corte = ?,
         id_operario_corte = ?
     WHERE id_llanta = ?`,
    [
      rows[0].fecha,
      rows[0].fecha_registro,
      rows[0].id_operario,
      ticket,
    ],
  );
};

const hasLaterProcessAfterCut = async (connection, ticket, cutRegistrationDate) => {
  const [rows] = await connection.query(
    `SELECT COUNT(*) AS total
     FROM procesos
     WHERE id_llanta = ?
       AND id_subproceso > ?
       AND fecha_registro >= ?`,
    [ticket, TREAD_CUT_SUBPROCESS_ID, cutRegistrationDate],
  );

  return rows[0].total > 0;
};

const registerCutProcess = async (connection, ticket, cutData, reprocess) => {
  const registrationDate = new Date();
  await connection.query(
    `UPDATE llantas
     SET fecha_corte = ?,
         fecha_registro_corte = ?,
         id_operario_corte = ?
     WHERE id_llanta = ?`,
    [
      cutData.processDate,
      registrationDate,
      cutData.operator,
      ticket,
    ],
  );

  await connection.query(
    `INSERT INTO procesos
      (id_llanta, id_subproceso, fecha, fecha_registro, observacion,
       reproceso, id_operario, nivel_reenc)
     SELECT id_llanta, ?, ?, ?, NULL, ?, ?, nivel_reenc
     FROM llantas
     WHERE id_llanta = ?`,
    [
      TREAD_CUT_SUBPROCESS_ID,
      cutData.processDate,
      registrationDate,
      reprocess,
      cutData.operator,
      ticket,
    ],
  );
};

// ==================== CATALOGO DE OPERARIOS ====================
export const getActiveTreadCutOperators = async (_req, res) => {
  try {
    const [operators] = await pool.query(
      `SELECT id_empleado, nombre, apellido
       FROM empleados
       WHERE estado = 'A'
       ORDER BY nombre, apellido`,
    );

    res.json(operators);
  } catch (error) {
    console.error("Error en getActiveTreadCutOperators:", error);
    res.status(500).json({ message: "No se pudieron consultar los operarios" });
  }
};

// ==================== LISTAR PENDIENTES ====================
export const getPendingTreadCuts = async (req, res) => {
  const orderClause = getOrderClause(req.query.order);

  try {
    const [rows] = await pool.query(pendingCutsQuery(orderClause), [
      SCRAPING_SUBPROCESS_ID,
      APT_STATE_ID,
      TREAD_CUT_SUBPROCESS_ID,
      APT_STATE_ID,
    ]);

    res.json(rows);
  } catch (error) {
    console.error("Error en getPendingTreadCuts:", error);
    res.status(500).json({ message: "No se pudieron consultar las bandas pendientes" });
  }
};

// ==================== ACTUALIZAR BANDAS CORTADAS ====================
export const completeTreadCuts = async (req, res) => {
  const tickets = parseTicketList(req.body.tickets);
  const cutData = parseCutData(req.body);

  if (tickets.length === 0) {
    return res.status(400).json({ message: "Debe seleccionar al menos una llanta" });
  }

  if (cutData === null) {
    return res.status(400).json({ message: "Debe seleccionar operario y fecha de corte" });
  }

  const connection = await pool.getConnection();
  const processed = [];
  const skipped = [];

  try {
    await connection.beginTransaction();

    const [operators] = await connection.query(
      `SELECT id_empleado
       FROM empleados
       WHERE id_empleado = ? AND estado = 'A'`,
      [cutData.operator],
    );

    if (operators.length === 0) {
      await connection.rollback();
      return res.status(400).json({ message: "El operario no existe o no está activo" });
    }

    for (const ticket of tickets) {
      const pending = await getEligiblePendingTicket(connection, ticket);

      if (!pending) {
        skipped.push(ticket);
        continue;
      }

      const previousCuts = await countCutHistory(connection, ticket);
      await registerCutProcess(connection, ticket, cutData, previousCuts > 0 ? 1 : 0);
      processed.push(ticket);
    }

    await connection.commit();
    res.json({
      message: "Bandas actualizadas correctamente",
      procesadas: processed,
      omitidas: skipped,
    });
  } catch (error) {
    await connection.rollback();
    console.error("Error en completeTreadCuts:", error);
    res.status(500).json({ message: "Error interno al actualizar bandas" });
  } finally {
    connection.release();
  }
};

// ==================== BUSCAR CORTE REGISTRADO ====================
export const getCutTire = async (req, res) => {
  const ticket = parsePositiveInteger(req.params.ticket);

  if (ticket === null) {
    return res.status(400).json({ message: "Tiquete inválido" });
  }

  try {
    const [rows] = await pool.query(getCutTireQuery, [
      SCRAPING_SUBPROCESS_ID,
      APT_STATE_ID,
      TREAD_CUT_SUBPROCESS_ID,
      ticket,
    ]);

    if (rows.length === 0) {
      return res.status(404).json({ message: "La llanta no tiene un corte registrado" });
    }

    res.json(rows[0]);
  } catch (error) {
    console.error("Error en getCutTire:", error);
    res.status(500).json({ message: "No se pudo consultar el corte de la llanta" });
  }
};

// ==================== DESHACER CORTE ACCIDENTAL ====================
export const undoTreadCut = async (req, res) => {
  const ticket = parsePositiveInteger(req.params.ticket);

  if (ticket === null) {
    return res.status(400).json({ message: "Tiquete inválido" });
  }

  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const [rows] = await connection.query(
      `SELECT id_proceso, fecha_registro
       FROM procesos
       WHERE id_llanta = ?
         AND id_subproceso = ?
       ORDER BY fecha_registro DESC, id_proceso DESC
       LIMIT 1
       FOR UPDATE`,
      [ticket, TREAD_CUT_SUBPROCESS_ID],
    );

    if (rows.length === 0) {
      await connection.rollback();
      return res.status(404).json({ message: "La llanta no tiene un corte para deshacer" });
    }

    if (await hasLaterProcessAfterCut(connection, ticket, rows[0].fecha_registro)) {
      await connection.rollback();
      return res.status(409).json({
        message: "No se puede deshacer el corte porque la llanta ya tiene procesos posteriores",
      });
    }

    // Esta es una corrección operativa: se elimina el último corte porque fue
    // marcado por accidente. Luego llantas vuelve al corte anterior si existía.
    await connection.query("DELETE FROM procesos WHERE id_proceso = ?", [
      rows[0].id_proceso,
    ]);
    await setCurrentCutFromLatestProcess(connection, ticket);

    await connection.commit();
    res.json({ message: "Corte deshecho correctamente" });
  } catch (error) {
    await connection.rollback();
    console.error("Error en undoTreadCut:", error);
    res.status(500).json({ message: "Error interno al deshacer el corte" });
  } finally {
    connection.release();
  }
};

// ==================== REGISTRAR REPROCESO DE CORTE ====================
export const reprocessTreadCut = async (req, res) => {
  const ticket = parsePositiveInteger(req.params.ticket);
  const cutData = parseCutData(req.body);

  if (ticket === null) {
    return res.status(400).json({ message: "Tiquete inválido" });
  }

  if (cutData === null) {
    return res.status(400).json({ message: "Debe seleccionar operario y fecha de corte" });
  }

  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const [operators] = await connection.query(
      `SELECT id_empleado
       FROM empleados
       WHERE id_empleado = ? AND estado = 'A'`,
      [cutData.operator],
    );

    if (operators.length === 0) {
      await connection.rollback();
      return res.status(400).json({ message: "El operario no existe o no está activo" });
    }

    const [tires] = await connection.query(
      `SELECT id_llanta, id_estado
       FROM llantas
       WHERE id_llanta = ?
       FOR UPDATE`,
      [ticket],
    );

    if (tires.length === 0) {
      await connection.rollback();
      return res.status(404).json({ message: "Llanta no encontrada" });
    }

    if (tires[0].id_estado !== APT_STATE_ID) {
      await connection.rollback();
      return res.status(409).json({ message: "Solo las llantas APTAS pueden reprocesar corte" });
    }

    const previousCuts = await countCutHistory(connection, ticket);
    if (previousCuts === 0) {
      await connection.rollback();
      return res.status(409).json({ message: "La llanta no tiene un corte previo para reprocesar" });
    }

    const [latestCut] = await connection.query(
      `SELECT fecha_registro
       FROM procesos
       WHERE id_llanta = ?
         AND id_subproceso = ?
       ORDER BY fecha_registro DESC, id_proceso DESC
       LIMIT 1`,
      [ticket, TREAD_CUT_SUBPROCESS_ID],
    );

    if (
      latestCut.length > 0 &&
      (await hasLaterProcessAfterCut(connection, ticket, latestCut[0].fecha_registro))
    ) {
      await connection.rollback();
      return res.status(409).json({
        message: "No se puede reprocesar el corte porque la llanta ya tiene procesos posteriores",
      });
    }

    await registerCutProcess(connection, ticket, cutData, 1);

    await connection.commit();
    res.status(201).json({ message: "Reproceso de corte registrado correctamente" });
  } catch (error) {
    await connection.rollback();
    console.error("Error en reprocessTreadCut:", error);
    res.status(500).json({ message: "Error interno al registrar el reproceso de corte" });
  } finally {
    connection.release();
  }
};
