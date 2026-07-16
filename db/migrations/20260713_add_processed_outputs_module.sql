-- ================================================================
-- MIGRACION: SALIDAS DE LLANTAS PROCESADAS
-- ================================================================
-- Este modulo registra salidas logisticas de llantas REENCAUCHADAS y REPARADAS.
-- Para REENCAUCHADAS tambien guarda los datos del costeo estimado.

CREATE TABLE IF NOT EXISTS `bodegas` (
  `id_bodega` SMALLINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `codigo` VARCHAR(10) NOT NULL,
  `nombre` VARCHAR(80) NOT NULL,
  `activa` TINYINT(1) UNSIGNED NOT NULL DEFAULT 1,
  PRIMARY KEY (`id_bodega`),
  UNIQUE KEY `uq_bodegas_codigo` (`codigo`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3;

INSERT INTO `bodegas` (`codigo`, `nombre`, `activa`)
SELECT 'B1', 'Bodega 1', 1
WHERE NOT EXISTS (
  SELECT 1 FROM `bodegas` WHERE `codigo` = 'B1'
);

ALTER TABLE `parametros_planta`
  -- El costo por kg necesita centavos; el secado continua almacenandose como
  -- entero desde la aplicacion aunque la columna ahora admita decimales.
  MODIFY COLUMN `valor_numero` DECIMAL(12,2) UNSIGNED NOT NULL DEFAULT 0;

INSERT INTO `parametros_planta`
  (`codigo`, `nombre`, `valor_numero`, `unidad`, `descripcion`)
SELECT
  'documento_salida_procesadas_actual',
  'Documento actual de salidas procesadas',
  0,
  'documento',
  'Consecutivo usado para salidas de llantas procesadas.'
WHERE NOT EXISTS (
  SELECT 1 FROM `parametros_planta`
  WHERE `codigo` = 'documento_salida_procesadas_actual'
);

INSERT INTO `parametros_planta`
  (`codigo`, `nombre`, `valor_numero`, `unidad`, `descripcion`)
SELECT
  'costo_kg_promedio_reencauche',
  'Costo/kg promedio de reencauche',
  0,
  'moneda/kg',
  'Costo provisional por kg usado para estimar salidas de llantas reencauchadas.'
WHERE NOT EXISTS (
  SELECT 1 FROM `parametros_planta`
  WHERE `codigo` = 'costo_kg_promedio_reencauche'
);

ALTER TABLE `llantas`
  -- Ubicacion y documento describen el movimiento logistico; los campos de
  -- costo conservan tanto el estimado de salida como el ajuste real futuro.
  ADD COLUMN `ubicacion` VARCHAR(10) NOT NULL DEFAULT 'P' AFTER `id_resolucion_terminacion`,
  ADD COLUMN `documento_salida` MEDIUMINT UNSIGNED NULL AFTER `ubicacion`,
  ADD COLUMN `fecha_salida` DATE NULL AFTER `documento_salida`,
  ADD COLUMN `id_empleado_salida` MEDIUMINT UNSIGNED NULL AFTER `fecha_salida`,
  ADD COLUMN `id_bodega_salida` SMALLINT UNSIGNED NULL AFTER `id_empleado_salida`,
  ADD COLUMN `tipo_salida` VARCHAR(20) NULL AFTER `id_bodega_salida`,
  ADD COLUMN `peso_banda_costeo` DECIMAL(8,3) UNSIGNED NULL AFTER `tipo_salida`,
  ADD COLUMN `costo_kg_estimado_aplicado` DECIMAL(12,2) UNSIGNED NULL AFTER `peso_banda_costeo`,
  ADD COLUMN `costo_estimado` DECIMAL(12,2) UNSIGNED NULL AFTER `costo_kg_estimado_aplicado`,
  ADD COLUMN `costo_kg_real_aplicado` DECIMAL(12,2) UNSIGNED NULL AFTER `costo_estimado`,
  ADD COLUMN `costo_real` DECIMAL(12,2) UNSIGNED NULL AFTER `costo_kg_real_aplicado`,
  ADD COLUMN `mes_proceso` TINYINT UNSIGNED NULL AFTER `costo_real`,
  ADD COLUMN `anio_proceso` SMALLINT UNSIGNED NULL AFTER `mes_proceso`,
  ADD INDEX `idx_llantas_salida_documento` (`documento_salida`),
  ADD INDEX `idx_llantas_salida_disponibles` (`ubicacion`, `id_estado`),
  ADD INDEX `fk_empleado_salida` (`id_empleado_salida`),
  ADD INDEX `fk_bodega_salida` (`id_bodega_salida`),
  ADD CONSTRAINT `fk_empleado_salida`
    FOREIGN KEY (`id_empleado_salida`) REFERENCES `empleados` (`id_empleado`),
  ADD CONSTRAINT `fk_bodega_salida`
    FOREIGN KEY (`id_bodega_salida`) REFERENCES `bodegas` (`id_bodega`);

INSERT INTO `permisos` (`nombre_permiso`, `descripcion_permiso`)
SELECT 'salidasprocesadas', 'Salidas Procesadas'
WHERE NOT EXISTS (
  SELECT 1 FROM `permisos` WHERE `nombre_permiso` = 'salidasprocesadas'
);

INSERT INTO `permisos` (`nombre_permiso`, `descripcion_permiso`)
SELECT 'bodegas', 'Actualizar bodegas'
WHERE NOT EXISTS (
  SELECT 1 FROM `permisos` WHERE `nombre_permiso` = 'bodegas'
);
