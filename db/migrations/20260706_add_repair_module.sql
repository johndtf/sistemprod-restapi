-- ================================================================
-- MIGRACION: CATALOGO Y SUBPROCESO DE REPARACION
-- ================================================================
-- reparaciones contiene las referencias disponibles. La tabla de detalle
-- relaciona cada referencia con una ejecucion historica de procesos, de modo
-- que un reproceso pueda usar cantidades diferentes sin alterar lo anterior.

CREATE TABLE `reparaciones` (
  `id_reparacion` SMALLINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `referencia` VARCHAR(20) NOT NULL,
  `nombre` VARCHAR(80) NOT NULL,
  PRIMARY KEY (`id_reparacion`),
  UNIQUE KEY `uq_reparaciones_referencia` (`referencia`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3;

CREATE TABLE `reparaciones_proceso` (
  `id_proceso` INT UNSIGNED NOT NULL,
  `id_reparacion` SMALLINT UNSIGNED NOT NULL,
  `cantidad` SMALLINT UNSIGNED NOT NULL,
  PRIMARY KEY (`id_proceso`, `id_reparacion`),
  KEY `idx_reparaciones_proceso_reparacion` (`id_reparacion`),
  CONSTRAINT `fk_reparaciones_proceso_proceso`
    FOREIGN KEY (`id_proceso`) REFERENCES `procesos` (`id_proceso`),
  CONSTRAINT `fk_reparaciones_proceso_reparacion`
    FOREIGN KEY (`id_reparacion`) REFERENCES `reparaciones` (`id_reparacion`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3;

-- llantas conserva solamente la ultima actualizacion de Reparacion.
ALTER TABLE `llantas`
  ADD COLUMN `fecha_reparacion` DATETIME NULL AFTER `id_resolucion_preparacion`,
  ADD COLUMN `fecha_registro_reparacion` DATETIME NULL AFTER `fecha_reparacion`,
  ADD COLUMN `id_operario_reparacion` MEDIUMINT UNSIGNED NULL AFTER `fecha_registro_reparacion`,
  ADD COLUMN `id_resolucion_reparacion` SMALLINT UNSIGNED NULL AFTER `id_operario_reparacion`,
  ADD INDEX `fk_operario_reparacion` (`id_operario_reparacion`),
  ADD INDEX `fk_resolucion_reparacion` (`id_resolucion_reparacion`),
  ADD CONSTRAINT `fk_operario_reparacion`
    FOREIGN KEY (`id_operario_reparacion`) REFERENCES `empleados` (`id_empleado`),
  ADD CONSTRAINT `fk_resolucion_reparacion`
    FOREIGN KEY (`id_resolucion_reparacion`) REFERENCES `resoluciones_i` (`id_inspec`);

-- Permiso independiente para administrar el catalogo desde el menu.
INSERT INTO `permisos` (`nombre_permiso`, `descripcion_permiso`)
SELECT 'reparaciones', 'Actualizar catalogo de reparaciones'
WHERE NOT EXISTS (
  SELECT 1 FROM `permisos` WHERE `nombre_permiso` = 'reparaciones'
);
