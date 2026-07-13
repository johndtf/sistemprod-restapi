ALTER TABLE `llantas`
  ADD COLUMN `fecha_inspeccion_final` DATETIME NULL AFTER `id_resolucion_vulcanizado`,
  ADD COLUMN `fecha_registro_inspeccion_final` DATETIME NULL AFTER `fecha_inspeccion_final`,
  ADD COLUMN `id_operario_inspeccion_final` MEDIUMINT UNSIGNED NULL AFTER `fecha_registro_inspeccion_final`,
  ADD COLUMN `id_resolucion_inspeccion_final` SMALLINT UNSIGNED NULL AFTER `id_operario_inspeccion_final`,
  ADD INDEX `fk_operario_inspeccion_final` (`id_operario_inspeccion_final`),
  ADD INDEX `fk_resolucion_inspeccion_final` (`id_resolucion_inspeccion_final`),
  ADD CONSTRAINT `fk_operario_inspeccion_final`
    FOREIGN KEY (`id_operario_inspeccion_final`) REFERENCES `empleados` (`id_empleado`),
  ADD CONSTRAINT `fk_resolucion_inspeccion_final`
    FOREIGN KEY (`id_resolucion_inspeccion_final`) REFERENCES `resoluciones_i` (`id_inspec`);
