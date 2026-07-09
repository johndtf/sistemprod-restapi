CREATE TABLE `parametros_planta` (
  `id_parametro` smallint unsigned NOT NULL AUTO_INCREMENT,
  `codigo` varchar(60) NOT NULL,
  `nombre` varchar(100) NOT NULL,
  `valor_numero` int unsigned NOT NULL DEFAULT '0',
  `unidad` varchar(20) NOT NULL,
  `descripcion` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`id_parametro`),
  UNIQUE KEY `codigo_UNIQUE` (`codigo`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3
