CREATE TABLE `bodegas` (
  -- El codigo identifica la bodega en el catalogo. Llantas usa B como
  -- ubicacion general e ids de bodega para el destino historico y actual.
  `id_bodega` smallint unsigned NOT NULL AUTO_INCREMENT,
  `codigo` varchar(10) NOT NULL,
  `nombre` varchar(80) NOT NULL,
  `activa` tinyint(1) unsigned NOT NULL DEFAULT '1',
  PRIMARY KEY (`id_bodega`),
  UNIQUE KEY `uq_bodegas_codigo` (`codigo`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3;

-- Semilla minima para que una instalacion nueva pueda registrar salidas sin
-- requerir que antes se cree manualmente una bodega desde el catalogo.
INSERT INTO `bodegas` (`codigo`, `nombre`, `activa`)
SELECT 'B1', 'Bodega 1', 1
WHERE NOT EXISTS (
  SELECT 1 FROM `bodegas` WHERE `codigo` = 'B1'
);
