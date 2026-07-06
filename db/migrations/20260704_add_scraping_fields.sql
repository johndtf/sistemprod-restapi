-- ============================================================================
-- MIGRACION: DATOS DE RASPADO
-- ============================================================================
-- llantas representa el estado vigente. Estas columnas conservan las últimas
-- medidas, el último resultado, el operario y las fechas del subproceso.
-- La migración es aditiva: no elimina ni transforma información existente.
ALTER TABLE `llantas`
  ADD COLUMN `radio_r` SMALLINT UNSIGNED NULL AFTER `observaciones_inicial`,
  ADD COLUMN `perimetro` SMALLINT UNSIGNED NULL AFTER `radio_r`,
  ADD COLUMN `ancho` SMALLINT UNSIGNED NULL AFTER `perimetro`,
  ADD COLUMN `retiro_cinturon` TINYINT(1) UNSIGNED NOT NULL DEFAULT 0 AFTER `ancho`,
  ADD COLUMN `fecha_raspado` DATETIME NULL AFTER `retiro_cinturon`,
  ADD COLUMN `fecha_registro_raspado` DATETIME NULL AFTER `fecha_raspado`,
  ADD COLUMN `id_operario_raspado` MEDIUMINT UNSIGNED NULL AFTER `fecha_registro_raspado`,
  ADD COLUMN `id_resolucion_raspado` SMALLINT UNSIGNED NULL AFTER `id_operario_raspado`,
  ADD INDEX `fk_operario_raspado` (`id_operario_raspado`),
  ADD INDEX `fk_resolucion_raspado` (`id_resolucion_raspado`),
  ADD CONSTRAINT `fk_operario_raspado`
    FOREIGN KEY (`id_operario_raspado`) REFERENCES `empleados` (`id_empleado`),
  ADD CONSTRAINT `fk_resolucion_raspado`
    FOREIGN KEY (`id_resolucion_raspado`) REFERENCES `resoluciones_i` (`id_inspec`);

-- procesos representa el historial. Cada ejecución, incluido un reproceso o
-- un rechazo, guarda su propia copia de las medidas tomadas en ese momento.
ALTER TABLE `procesos`
  ADD COLUMN `radio_r` SMALLINT UNSIGNED NULL AFTER `nivel_reenc`,
  ADD COLUMN `perimetro` SMALLINT UNSIGNED NULL AFTER `radio_r`,
  ADD COLUMN `ancho` SMALLINT UNSIGNED NULL AFTER `perimetro`,
  ADD COLUMN `retiro_cinturon` TINYINT(1) UNSIGNED NULL AFTER `ancho`;
