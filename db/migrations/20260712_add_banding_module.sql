ALTER TABLE `llantas`
  ADD COLUMN `fecha_embandado` DATETIME NULL AFTER `id_operario_corte`,
  ADD COLUMN `fecha_registro_embandado` DATETIME NULL AFTER `fecha_embandado`,
  ADD COLUMN `id_operario_embandado` MEDIUMINT UNSIGNED NULL AFTER `fecha_registro_embandado`,
  ADD COLUMN `id_resolucion_embandado` SMALLINT UNSIGNED NULL AFTER `id_operario_embandado`,
  ADD INDEX `fk_operario_embandado` (`id_operario_embandado`),
  ADD INDEX `fk_resolucion_embandado` (`id_resolucion_embandado`),
  ADD CONSTRAINT `fk_operario_embandado`
    FOREIGN KEY (`id_operario_embandado`) REFERENCES `empleados` (`id_empleado`),
  ADD CONSTRAINT `fk_resolucion_embandado`
    FOREIGN KEY (`id_resolucion_embandado`) REFERENCES `resoluciones_i` (`id_inspec`);
