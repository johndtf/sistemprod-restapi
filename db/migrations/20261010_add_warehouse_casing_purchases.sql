-- ================================================================
-- MIGRACION: COMPRAS DE LLANTAS EN BODEGA
-- ================================================================
-- Las compras iniciales y las posteriores al reencauche comparten documento,
-- vendedor, empresa compradora y detalle. El origen y la bodega permiten
-- reconocer en que momento logistico se adquirio cada casco.

ALTER TABLE `compras_cascos`
  ADD COLUMN `origen_compra` VARCHAR(20) NOT NULL DEFAULT 'PLANTA' AFTER `fecha_compra`,
  ADD COLUMN `id_bodega` SMALLINT UNSIGNED NULL AFTER `id_empleado`,
  ADD KEY `fk_compra_bodega` (`id_bodega`),
  ADD CONSTRAINT `fk_compra_bodega`
    FOREIGN KEY (`id_bodega`) REFERENCES `bodegas` (`id_bodega`);

INSERT INTO `permisos` (`nombre_permiso`, `descripcion_permiso`)
SELECT 'comprac', 'Compra de llantas en bodega'
WHERE NOT EXISTS (
  SELECT 1 FROM `permisos` WHERE `nombre_permiso` = 'comprac'
);
