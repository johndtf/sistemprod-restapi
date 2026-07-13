ALTER TABLE `llantas`
  ADD COLUMN `fecha_vulcanizado` DATETIME NULL AFTER `id_resolucion_embandado`,
  ADD COLUMN `fecha_registro_vulcanizado` DATETIME NULL AFTER `fecha_vulcanizado`,
  ADD COLUMN `id_operario_vulcanizado` MEDIUMINT UNSIGNED NULL AFTER `fecha_registro_vulcanizado`,
  ADD COLUMN `id_resolucion_vulcanizado` SMALLINT UNSIGNED NULL AFTER `id_operario_vulcanizado`,
  ADD INDEX `fk_operario_vulcanizado` (`id_operario_vulcanizado`),
  ADD INDEX `fk_resolucion_vulcanizado` (`id_resolucion_vulcanizado`),
  ADD CONSTRAINT `fk_operario_vulcanizado`
    FOREIGN KEY (`id_operario_vulcanizado`) REFERENCES `empleados` (`id_empleado`),
  ADD CONSTRAINT `fk_resolucion_vulcanizado`
    FOREIGN KEY (`id_resolucion_vulcanizado`) REFERENCES `resoluciones_i` (`id_inspec`);
