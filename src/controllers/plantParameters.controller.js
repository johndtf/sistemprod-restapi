import { pool } from "../db.js";

const DRYING_TIME_KEY = "tiempo_secado_relleno_minutos";
const AVERAGE_COST_KEY = "costo_kg_promedio_reencauche";
const DEFAULT_SALES_TAX_KEY = "iva_predeterminado_ventas";

// El secado se trabaja en minutos completos; el costo admite dos decimales
// porque se aplica como valor monetario por kilogramo de banda.
const parseNonNegativeInteger = (value) => {
  const number = Number(value);
  return Number.isSafeInteger(number) && number >= 0 ? number : null;
};

const parseNonNegativeDecimal = (value) => {
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 ? Number(number.toFixed(2)) : null;
};

// El IVA se expresa como porcentaje completo: 19 significa 19%, no 0.19.
// Mantenerlo entero hace que coincida con el campo de cada detalle de venta.
const parseTaxPercentage = (value) => {
  const number = Number(value);
  return Number.isSafeInteger(number) && number >= 0 && number <= 100 ? number : null;
};

// La pantalla administra parametros operativos generales. Se consultan por
// codigo para que agregar nuevos ajustes no obligue a cambiar la estructura de
// la tabla.
export const getPlantParameters = async (_req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT codigo, nombre, valor_numero, unidad, descripcion
       FROM parametros_planta
       WHERE codigo IN (?, ?, ?)
       ORDER BY codigo`,
      [DRYING_TIME_KEY, AVERAGE_COST_KEY, DEFAULT_SALES_TAX_KEY],
    );

    res.json({
      tiempo_secado_relleno_minutos:
        rows.find((row) => row.codigo === DRYING_TIME_KEY) ?? null,
      costo_kg_promedio_reencauche:
        rows.find((row) => row.codigo === AVERAGE_COST_KEY) ?? null,
      iva_predeterminado_ventas:
        rows.find((row) => row.codigo === DEFAULT_SALES_TAX_KEY) ?? null,
    });
  } catch (error) {
    console.error("Error en getPlantParameters:", error);
    res.status(500).json({ message: "No se pudieron consultar los parametros" });
  }
};

export const updateDryingTimeParameter = async (req, res) => {
  const minutes = parseNonNegativeInteger(req.body.tiempo_secado_relleno_minutos);

  if (minutes === null || minutes > 65535) {
    return res.status(400).json({
      message: "El secado del cemento debe ser un entero entre 0 y 65535 minutos",
    });
  }

  try {
    await pool.query(
      `UPDATE parametros_planta
       SET valor_numero = ?
       WHERE codigo = ?`,
      [minutes, DRYING_TIME_KEY],
    );

    res.json({ message: "Secado del cemento actualizado correctamente" });
  } catch (error) {
    console.error("Error en updateDryingTimeParameter:", error);
    res.status(500).json({ message: "No se pudo actualizar el secado del cemento" });
  }
};

// El INSERT condicional protege instalaciones antiguas que todavia no tengan
// el parametro. Despues se actualiza siempre por codigo, no por un id fijo.
export const updateRetreadAverageCostParameter = async (req, res) => {
  const averageCost = parseNonNegativeDecimal(req.body.costo_kg_promedio_reencauche);

  if (averageCost === null || averageCost > 999999999.99) {
    return res.status(400).json({
      message: "El costo/kg promedio debe ser un numero mayor o igual a cero",
    });
  }

  try {
    await pool.query(
      `INSERT INTO parametros_planta
        (codigo, nombre, valor_numero, unidad, descripcion)
       SELECT ?, 'Costo/kg promedio de reencauche', 0, 'moneda/kg',
              'Costo provisional por kg usado para estimar salidas de llantas reencauchadas.'
       WHERE NOT EXISTS (
         SELECT 1 FROM parametros_planta WHERE codigo = ?
       )`,
      [AVERAGE_COST_KEY, AVERAGE_COST_KEY],
    );

    await pool.query(
      `UPDATE parametros_planta
       SET valor_numero = ?
       WHERE codigo = ?`,
      [averageCost, AVERAGE_COST_KEY],
    );

    res.json({ message: "Costo/kg promedio actualizado correctamente" });
  } catch (error) {
    console.error("Error en updateRetreadAverageCostParameter:", error);
    res.status(500).json({ message: "No se pudo actualizar el costo/kg promedio" });
  }
};

// El IVA queda separado del costo y del secado para que cada boton de la
// pantalla modifique solamente el dato operativo que le corresponde.
export const updateDefaultSalesTaxParameter = async (req, res) => {
  const tax = parseTaxPercentage(req.body.iva_predeterminado_ventas);

  if (tax === null) {
    return res.status(400).json({
      message: "El IVA predeterminado debe ser un entero entre 0 y 100 por ciento",
    });
  }

  try {
    // Tambien cubre bases instaladas antes de crear este parametro nuevo.
    await pool.query(
      `INSERT INTO parametros_planta
        (codigo, nombre, valor_numero, unidad, descripcion)
       SELECT ?, 'IVA predeterminado para ventas', 0, '%',
              'Porcentaje sugerido al cargar llantas en una factura de venta.'
       WHERE NOT EXISTS (
         SELECT 1 FROM parametros_planta WHERE codigo = ?
       )`,
      [DEFAULT_SALES_TAX_KEY, DEFAULT_SALES_TAX_KEY],
    );

    await pool.query(
      `UPDATE parametros_planta
       SET valor_numero = ?
       WHERE codigo = ?`,
      [tax, DEFAULT_SALES_TAX_KEY],
    );

    res.json({ message: "IVA predeterminado actualizado correctamente" });
  } catch (error) {
    console.error("Error en updateDefaultSalesTaxParameter:", error);
    res.status(500).json({ message: "No se pudo actualizar el IVA predeterminado" });
  }
};
