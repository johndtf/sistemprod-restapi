-- Modulo de Relleno y parametro de secado por planta.
-- La tabla de parametros queda preparada para crecer con nuevas reglas sin
-- crear una tabla distinta por cada ajuste operativo.

ALTER TABLE `llantas`
  ADD COLUMN `fecha_relleno` DATETIME NULL AFTER `id_resolucion_reparacion`,
  ADD COLUMN `fecha_registro_relleno` DATETIME NULL AFTER `fecha_relleno`,
  ADD COLUMN `id_operario_relleno` MEDIUMINT UNSIGNED NULL AFTER `fecha_registro_relleno`,
  ADD COLUMN `id_resolucion_relleno` SMALLINT UNSIGNED NULL AFTER `id_operario_relleno`,
  ADD INDEX `fk_operario_relleno` (`id_operario_relleno`),
  ADD INDEX `fk_resolucion_relleno` (`id_resolucion_relleno`),
  ADD CONSTRAINT `fk_operario_relleno`
    FOREIGN KEY (`id_operario_relleno`) REFERENCES `empleados` (`id_empleado`),
  ADD CONSTRAINT `fk_resolucion_relleno`
    FOREIGN KEY (`id_resolucion_relleno`) REFERENCES `resoluciones_i` (`id_inspec`);

CREATE TABLE IF NOT EXISTS `parametros_planta` (
  `id_parametro` SMALLINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `codigo` VARCHAR(60) NOT NULL,
  `nombre` VARCHAR(100) NOT NULL,
  `valor_numero` INT UNSIGNED NOT NULL DEFAULT 0,
  `unidad` VARCHAR(20) NOT NULL,
  `descripcion` VARCHAR(255) NULL,
  PRIMARY KEY (`id_parametro`),
  UNIQUE KEY `codigo_UNIQUE` (`codigo`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3;

INSERT INTO `parametros_planta`
  (`codigo`, `nombre`, `valor_numero`, `unidad`, `descripcion`)
SELECT
  'tiempo_secado_relleno_minutos',
  'Tiempo minimo de secado para relleno',
  60,
  'minutos',
  'Minutos orientativos entre preparacion/reparacion y relleno.'
WHERE NOT EXISTS (
  SELECT 1
  FROM `parametros_planta`
  WHERE `codigo` = 'tiempo_secado_relleno_minutos'
);

INSERT INTO `permisos` (`nombre_permiso`, `descripcion_permiso`)
SELECT 'parametros', 'Actualizar parametros de planta'
WHERE NOT EXISTS (
  SELECT 1 FROM `permisos` WHERE `nombre_permiso` = 'parametros'
);
