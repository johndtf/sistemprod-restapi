-- -----------------------------------------------------
-- Compras de cascos
-- -----------------------------------------------------
-- La cabecera representa el comprobante entregado a un solo vendedor. El
-- detalle conserva el valor acordado para cada llanta y evita comprar una misma
-- llanta dos veces mediante la llave unica de id_llanta.

CREATE TABLE `compras_cascos` (
  `id_compra` int unsigned NOT NULL AUTO_INCREMENT,
  `documento` mediumint unsigned NOT NULL,
  `fecha_compra` date NOT NULL,
  `id_vendedor` int unsigned NOT NULL,
  `id_empresa_compradora` int unsigned NOT NULL,
  `id_empleado` mediumint unsigned NOT NULL,
  PRIMARY KEY (`id_compra`),
  UNIQUE KEY `uq_compras_cascos_documento` (`documento`),
  KEY `fk_compra_vendedor` (`id_vendedor`),
  KEY `fk_compra_empresa` (`id_empresa_compradora`),
  KEY `fk_compra_empleado` (`id_empleado`),
  CONSTRAINT `fk_compra_vendedor`
    FOREIGN KEY (`id_vendedor`) REFERENCES `clientes` (`id_cliente`),
  CONSTRAINT `fk_compra_empresa`
    FOREIGN KEY (`id_empresa_compradora`) REFERENCES `clientes` (`id_cliente`),
  CONSTRAINT `fk_compra_empleado`
    FOREIGN KEY (`id_empleado`) REFERENCES `empleados` (`id_empleado`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3;

CREATE TABLE `compras_cascos_detalle` (
  `id_compra` int unsigned NOT NULL,
  `id_llanta` int unsigned NOT NULL,
  `valor_compra` decimal(12,2) unsigned NOT NULL,
  PRIMARY KEY (`id_compra`, `id_llanta`),
  UNIQUE KEY `uq_compra_casco_llanta` (`id_llanta`),
  KEY `fk_detalle_llanta` (`id_llanta`),
  CONSTRAINT `fk_detalle_compra`
    FOREIGN KEY (`id_compra`) REFERENCES `compras_cascos` (`id_compra`),
  CONSTRAINT `fk_detalle_llanta`
    FOREIGN KEY (`id_llanta`) REFERENCES `llantas` (`id_llanta`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3;
