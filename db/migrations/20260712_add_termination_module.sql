ALTER TABLE `llantas`
  ADD COLUMN `fecha_terminacion` DATETIME NULL AFTER `id_resolucion_inspeccion_final`,
  ADD COLUMN `fecha_registro_terminacion` DATETIME NULL AFTER `fecha_terminacion`,
  ADD COLUMN `id_operario_terminacion` MEDIUMINT UNSIGNED NULL AFTER `fecha_registro_terminacion`,
  ADD COLUMN `id_resolucion_terminacion` SMALLINT UNSIGNED NULL AFTER `id_operario_terminacion`,
  ADD INDEX `fk_operario_terminacion` (`id_operario_terminacion`),
  ADD INDEX `fk_resolucion_terminacion` (`id_resolucion_terminacion`),
  ADD CONSTRAINT `fk_operario_terminacion`
    FOREIGN KEY (`id_operario_terminacion`) REFERENCES `empleados` (`id_empleado`),
  ADD CONSTRAINT `fk_resolucion_terminacion`
    FOREIGN KEY (`id_resolucion_terminacion`) REFERENCES `resoluciones_i` (`id_inspec`);
