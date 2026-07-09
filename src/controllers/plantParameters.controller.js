import { pool } from "../db.js";

const DRYING_TIME_KEY = "tiempo_secado_relleno_minutos";

const parseNonNegativeInteger = (value) => {
  const number = Number(value);
  return Number.isSafeInteger(number) && number >= 0 ? number : null;
};

// Por ahora la pantalla administra solo el tiempo minimo de secado requerido
// antes de Relleno. La tabla permite agregar otros parametros de planta luego.
export const getPlantParameters = async (_req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT codigo, nombre, valor_numero, unidad, descripcion
       FROM parametros_planta
       WHERE codigo = ?`,
      [DRYING_TIME_KEY],
    );

    if (rows.length === 0) {
      return res.status(404).json({ message: "Parametro de planta no encontrado" });
    }

    res.json(rows[0]);
  } catch (error) {
    console.error("Error en getPlantParameters:", error);
    res.status(500).json({ message: "No se pudieron consultar los parametros" });
  }
};

export const updatePlantParameters = async (req, res) => {
  const minutes = parseNonNegativeInteger(req.body.tiempo_secado_relleno_minutos);

  if (minutes === null || minutes > 65535) {
    return res.status(400).json({
      message: "El tiempo minimo de secado debe ser un entero entre 0 y 65535 minutos",
    });
  }

  try {
    await pool.query(
      `UPDATE parametros_planta
       SET valor_numero = ?
       WHERE codigo = ?`,
      [minutes, DRYING_TIME_KEY],
    );

    res.json({ message: "Parametros de planta actualizados correctamente" });
  } catch (error) {
    console.error("Error en updatePlantParameters:", error);
    res.status(500).json({ message: "No se pudieron actualizar los parametros" });
  }
};
