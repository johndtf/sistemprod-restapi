CREATE TABLE `parametros_planta` (
  `id_parametro` smallint unsigned NOT NULL AUTO_INCREMENT,
  `codigo` varchar(60) NOT NULL,
  `nombre` varchar(100) NOT NULL,
  -- Admite minutos enteros y valores monetarios por kg con dos decimales.
  `valor_numero` decimal(12,2) unsigned NOT NULL DEFAULT '0.00',
  `unidad` varchar(20) NOT NULL,
  `descripcion` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`id_parametro`),
  UNIQUE KEY `codigo_UNIQUE` (`codigo`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3
