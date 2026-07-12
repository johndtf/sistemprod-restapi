ALTER TABLE `llantas`
  ADD COLUMN `fecha_corte` DATETIME NULL AFTER `id_resolucion_relleno`,
  ADD COLUMN `fecha_registro_corte` DATETIME NULL AFTER `fecha_corte`,
  ADD COLUMN `id_operario_corte` MEDIUMINT UNSIGNED NULL AFTER `fecha_registro_corte`,
  ADD INDEX `fk_operario_corte` (`id_operario_corte`),
  ADD CONSTRAINT `fk_operario_corte`
    FOREIGN KEY (`id_operario_corte`) REFERENCES `empleados` (`id_empleado`);
