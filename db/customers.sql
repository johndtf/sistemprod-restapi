-- -----------------------------------------------------
-- Table `clientes`
-- -----------------------------------------------------


CREATE TABLE `clientes` (
  `id_cliente` mediumint unsigned NOT NULL AUTO_INCREMENT,
  `cedula_nit` bigint unsigned NOT NULL,
  `dv` tinyint DEFAULT NULL,
  `nombre` varchar(45) NOT NULL,
  `apellido` varchar(45) NOT NULL,
  `telefono` varchar(10) NOT NULL,
  `direccion` varchar(100) NOT NULL,
  `email` varchar(100) NOT NULL,
  `contrasenia` varchar(128) NOT NULL,
  `estado` varchar(1) NOT NULL,
  `temporal` tinyint NOT NULL DEFAULT '1',
  PRIMARY KEY (`id_cliente`),
  UNIQUE KEY `cedula_nit_UNIQUE` (`cedula_nit`)
) ENGINE=InnoDB AUTO_INCREMENT=17 DEFAULT CHARSET=utf8mb3