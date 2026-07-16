-- ================================================================
-- MIGRACION: BODEGA ACTUAL DE LA LLANTA
-- ================================================================
-- id_bodega_salida conserva el destino del documento que saco la llanta de
-- planta. Este campo indica la bodega donde se encuentra actualmente y podra
-- cambiar en futuros traslados entre bodegas.

ALTER TABLE `llantas`
  ADD COLUMN `id_bodega_actual` SMALLINT UNSIGNED NULL AFTER `id_bodega_salida`,
  ADD INDEX `fk_bodega_actual` (`id_bodega_actual`),
  ADD CONSTRAINT `fk_bodega_actual`
    FOREIGN KEY (`id_bodega_actual`) REFERENCES `bodegas` (`id_bodega`);
