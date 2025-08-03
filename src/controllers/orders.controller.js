import { pool } from "../db.js";

// 1. Obtener la última orden ingresada
export const getLastOrder = async (req, res) => {
  try {
    const [ordenResult] = await pool.query(
      `SELECT o.*,c.cedula_nit, c.nombre AS nombre_cliente, c.telefono, c.direccion 
       FROM ordenes o
       JOIN clientes c ON o.id_cliente = c.id_cliente
       ORDER BY o.id_orden DESC
       LIMIT 1`
    );

    if (ordenResult.length === 0)
      return res.status(404).json({ message: "No hay órdenes registradas" });

    const orden = ordenResult[0];

    // Obtener llantas de esa orden
    const [llantas] = await pool.query(
      `SELECT l.id_llanta AS tiquete, l.consec_orden, l.serie, l.prioridad, l.observacion, m.marca, d.dimension, b.banda FROM llantas l JOIN marcas m ON l.id_marca = m.id_marca JOIN dimensiones d ON l.id_dimension = d.id_dimension JOIN bandas b ON l.id_banda = b.id_banda WHERE l.id_orden = ?`,
      [orden.id_orden]
    );
    res.json({ orden, llantas });
  } catch (error) {
    console.error("Error en getLastOrder:", error);
    res.status(500).json({ message: "Error al obtener la última orden" });
  }
};

// 2. Crear una nueva orden
export const createOrder = async (req, res) => {
  try {
    const { id_cliente, numero_orden, fecha } = req.body;

    if (!id_cliente || !numero_orden || !fecha)
      return res
        .status(400)
        .json({ message: "Faltan campos requeridos para crear la orden" });

    const [result] = await pool.query(
      "INSERT INTO ordenes (id_cliente, numero_orden, fecha) VALUES (?, ?, ?)",
      [id_cliente, numero_orden, fecha]
    );

    res
      .status(201)
      .json({ message: "Orden creada", id_orden: result.insertId });
  } catch (error) {
    if (error.code === "ER_DUP_ENTRY") {
      return res.status(400).json({
        message:
          "El número de orden ya está en uso. Por favor, verifica el número ingresado.",
      });
    }
    console.error("Error en createOrder:", error);
    res.status(500).json({ message: "Error al crear la orden" });
  }
};

// 3. Obtener una orden por número
export const getOrderByNumber = async (req, res) => {
  try {
    const numeroOrden = req.params.numeroOrden;

    const [ordenes] = await pool.query(
      `SELECT o.*, c.cedula_nit, c.nombre AS nombre_cliente, c.telefono, c.direccion 
       FROM ordenes o
       JOIN clientes c ON o.id_cliente = c.id_cliente
       WHERE o.numero_orden = ?`,
      [numeroOrden]
    );

    if (ordenes.length === 0)
      return res.status(404).json({ message: "Orden no encontrada" });

    const orden = ordenes[0];

    const [llantas] = await pool.query(
      `SELECT l.id_llanta AS tiquete, l.consec_orden, l.serie, l.prioridad, l.observacion, m.marca, d.dimension, b.banda FROM llantas l JOIN marcas m ON l.id_marca = m.id_marca JOIN dimensiones d ON l.id_dimension = d.id_dimension JOIN bandas b ON l.id_banda = b.id_banda WHERE l.id_orden = ?`,
      [orden.id_orden]
    );

    res.json({ orden, llantas });
  } catch (error) {
    console.error("Error en getOrderByNumber:", error);
    res.status(500).json({ message: "Error al obtener la orden" });
  }
};

// 4. Agregar una llanta a una orden
export const addTireToOrder = async (req, res) => {
  try {
    const numeroOrden = req.params.numeroOrden;
    const {
      consec_orden,
      id_marca,
      id_dimension,
      serie,
      id_banda,
      prioridad,
      observacion,
    } = req.body;

    // Buscar el id_orden correspondiente
    const [ordenResult] = await pool.query(
      "SELECT id_orden FROM ordenes WHERE numero_orden = ?",
      [numeroOrden]
    );

    if (ordenResult.length === 0)
      return res.status(404).json({ message: "Orden no encontrada" });

    const id_orden = ordenResult[0].id_orden;

    await pool.query(
      `INSERT INTO llantas 
       (id_orden,consec_orden, id_marca, id_dimension, serie, id_banda, prioridad, observacion) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id_orden,
        consec_orden,
        id_marca,
        id_dimension,
        serie,
        id_banda,
        prioridad,
        observacion,
      ]
    );

    res.status(201).json({ message: "Llanta agregada correctamente" });
  } catch (error) {
    console.error("Error en addTireToOrder:", error);
    res.status(500).json({ message: "Error al agregar la llanta" });
  }
};

// 5. Modificar llanta
export const updateTireInOrder = async (req, res) => {
  try {
    const idLlanta = req.params.idLlanta;
    const {
      consec_orden,
      id_marca,
      id_dimension,
      serie,
      id_banda,
      prioridad,
      observacion,
    } = req.body;

    const [result] = await pool.query(
      `UPDATE llantas SET 
        consec_orden = ?, 
        id_marca = ?, 
        id_dimension = ?, 
        serie = ?, 
        id_banda = ?, 
        prioridad = ?, 
        observacion = ? 
       WHERE id_llanta = ?`,
      [
        consec_orden,
        id_marca,
        id_dimension,
        serie,
        id_banda,
        prioridad,
        observacion,
        idLlanta,
      ]
    );

    res.json({ message: "Llanta actualizada correctamente" });
  } catch (error) {
    console.error("Error en updateTireInOrder:", error);
    res.status(500).json({ message: "Error al actualizar la llanta" });
  }
};

// 6. Reasignar llanta(s) a otra orden
export const reassignMultipleTires = async (req, res) => {
  try {
    const { numeroOrdenDestino, llantasIds } = req.body;

    if (
      !numeroOrdenDestino ||
      !Array.isArray(llantasIds) ||
      llantasIds.length === 0
    ) {
      return res.status(400).json({ message: "Datos inválidos" });
    }

    // Verificar que la orden de destino exista
    const [ordenResult] = await pool.query(
      "SELECT id_orden FROM ordenes WHERE numero_orden = ?",
      [numeroOrdenDestino]
    );

    if (ordenResult.length === 0) {
      return res.status(404).json({ message: "La orden destino no existe" });
    }

    const idOrdenDestino = ordenResult[0].id_orden;

    // Actualizar todas las llantas en una sola consulta
    for (const idLlanta of llantasIds) {
      await pool.query("UPDATE llantas SET id_orden = ? WHERE id_llanta = ?", [
        idOrdenDestino,
        idLlanta,
      ]);
    }

    res.json({ message: "Llantas reasignadas correctamente" });
  } catch (error) {
    console.error("Error en reassignMultipleTires:", error);
    res.status(500).json({ message: "Error al reasignar la(s) llanta(s)" });
  }
};

// 7. Modificar encabezado de orden
export const updateOrder = async (req, res) => {
  try {
    const idOrden = req.params.id;
    const { numero_orden, id_cliente, fecha } = req.body;

    if (!numero_orden || !id_cliente || !fecha) {
      return res
        .status(400)
        .json({ message: "Todos los campos son obligatorios" });
    }

    // Verificar si el número de orden ya existe en otra orden
    const [existing] = await pool.query(
      "SELECT id_orden FROM ordenes WHERE numero_orden = ? AND id_orden != ?",
      [numero_orden, idOrden]
    );

    if (existing.length > 0) {
      return res
        .status(400)
        .json({ message: "Este número de orden ya está en uso" });
    }

    const [result] = await pool.query(
      `UPDATE ordenes SET numero_orden = ?, id_cliente = ?, fecha = ? WHERE id_orden = ?`,
      [numero_orden, id_cliente, fecha, idOrden]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Orden no encontrada" });
    }

    res.json({ message: "Orden actualizada correctamente" });
  } catch (error) {
    console.error("Error en updateOrder:", error);
    res.status(500).json({ message: "Error al actualizar la orden" });
  }
};
