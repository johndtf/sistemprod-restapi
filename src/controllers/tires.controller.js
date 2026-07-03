import { pool } from "../db.js";

// Buscar llanta por tiquete
export const getTireByTicket = async (req, res) => {
  const { ticket } = req.params;

  try {
    const [rows] = await pool.query(
      `SELECT l.id_llanta,  l.serie,
              l.observacion, l.prioridad, e.descripcion AS estado,
              l.nivel_reenc, l.observaciones_inicial, ri.resol_inspec,
              CONCAT(o.numero_orden, ' - ', LPAD(l.consec_orden, 2, '0')) AS orden,
              c.nombre AS cliente_nombre, c.apellido AS cliente_apellido,
              m.marca AS marca, d.dimension AS dimension, b.banda AS diseno
       FROM llantas l
       JOIN ordenes o ON l.id_orden = o.id_orden
       JOIN clientes c ON o.id_cliente = c.id_cliente
       LEFT JOIN marcas m ON l.id_marca = m.id_marca
       LEFT JOIN dimensiones d ON l.id_dimension = d.id_dimension
       LEFT JOIN bandas b ON l.id_banda = b.id_banda
       LEFT JOIN estados_llanta e ON l.id_estado = e.id_estado
       LEFT JOIN resoluciones_i ri ON l.id_inspec = ri.id_inspec
       WHERE l.id_llanta = ? OR l.consec_orden = ?`,
      [ticket, ticket],
    );

    if (rows.length === 0) {
      return res.status(404).json({ message: "Tire not found" });
    }

    const tire = rows[0];
    const [subprocesos] = await pool.query(
      "SELECT DISTINCT id_subproceso FROM procesos WHERE id_llanta = ? ORDER BY id_subproceso",
      [tire.id_llanta],
    );

    res.json({
      ...tire,
      subprocesos: subprocesos.map(({ id_subproceso }) => id_subproceso),
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error fetching tire" });
  }
};
