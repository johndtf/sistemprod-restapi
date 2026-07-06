-- ================================================================
-- MIGRACION: ESTADO ACTUAL DEL SUBPROCESO PREPARACION
-- ================================================================
-- Preparacion no genera mediciones propias. Estas columnas conservan en
-- llantas solamente su ejecucion mas reciente: fecha operativa, fecha real
-- de registro, operario y resultado. El historial completo permanece en
-- procesos y recibe una fila nueva cada vez que se ejecuta el subproceso.

ALTER TABLE `llantas`
  ADD COLUMN `fecha_preparacion` DATETIME NULL AFTER `id_resolucion_raspado`,
  ADD COLUMN `fecha_registro_preparacion` DATETIME NULL AFTER `fecha_preparacion`,
  ADD COLUMN `id_operario_preparacion` MEDIUMINT UNSIGNED NULL AFTER `fecha_registro_preparacion`,
  ADD COLUMN `id_resolucion_preparacion` SMALLINT UNSIGNED NULL AFTER `id_operario_preparacion`,
  ADD INDEX `fk_operario_preparacion` (`id_operario_preparacion`),
  ADD INDEX `fk_resolucion_preparacion` (`id_resolucion_preparacion`),
  ADD CONSTRAINT `fk_operario_preparacion`
    FOREIGN KEY (`id_operario_preparacion`) REFERENCES `empleados` (`id_empleado`),
  ADD CONSTRAINT `fk_resolucion_preparacion`
    FOREIGN KEY (`id_resolucion_preparacion`) REFERENCES `resoluciones_i` (`id_inspec`);
