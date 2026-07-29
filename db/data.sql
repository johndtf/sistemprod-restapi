-- -----------------------------------------------------
-- Table `data`
-- -----------------------------------------------------

CREATE TABLE `data` (
  -- La configuracion de planta es unica. El cliente propietario conserva sus
  -- datos generales en clientes y esta tabla agrega identidad para reportes.
  `id_configuracion` tinyint unsigned NOT NULL DEFAULT '1',
  `id_cliente_propietario` int unsigned NOT NULL,
  `eslogan` varchar(100) DEFAULT NULL,
  `logo_ruta` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`id_configuracion`),
  UNIQUE KEY `uq_data_cliente_propietario` (`id_cliente_propietario`),
  CONSTRAINT `fk_data_cliente_propietario`
    FOREIGN KEY (`id_cliente_propietario`) REFERENCES `clientes` (`id_cliente`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3
