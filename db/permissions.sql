CREATE TABLE `permisos` (
  `id_permisos` tinyint unsigned NOT NULL AUTO_INCREMENT,
  `nombre_permiso` varchar(20) NOT NULL,
  `descripcion_permiso` varchar(45) DEFAULT NULL,
  PRIMARY KEY (`id_permisos`),
  UNIQUE KEY `id_permisos_UNIQUE` (`id_permisos`),
  UNIQUE KEY `nombre_permiso_UNIQUE` (`nombre_permiso`)
) ENGINE=InnoDB AUTO_INCREMENT=25 DEFAULT CHARSET=utf8mb3


