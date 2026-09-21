-- ================================================================
-- MIGRACION: IVA PREDETERMINADO PARA VENTAS
-- ================================================================
-- El valor se propone al cargar llantas en una factura. No sustituye el IVA
-- propio de cada fila, que se conserva en ventas_llantas_detalle para dejar
-- trazabilidad de cualquier excepcion o ajuste comercial.

INSERT INTO `parametros_planta`
  (`codigo`, `nombre`, `valor_numero`, `unidad`, `descripcion`)
SELECT
  'iva_predeterminado_ventas',
  'IVA predeterminado para ventas',
  0,
  '%',
  'Porcentaje sugerido al cargar llantas en una factura de venta.'
WHERE NOT EXISTS (
  SELECT 1
  FROM `parametros_planta`
  WHERE `codigo` = 'iva_predeterminado_ventas'
);
