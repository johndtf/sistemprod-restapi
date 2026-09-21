-- -----------------------------------------------------------------
-- Ventas de llantas procesadas
-- -----------------------------------------------------------------
-- La cabecera reproduce la factura elaborada previamente en contabilidad.
-- El detalle conserva el precio e IVA acordados por cada llanta, que pueden
-- variar dentro de la misma factura.

CREATE TABLE `ventas_llantas` (
  `id_venta` MEDIUMINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `numero_factura` VARCHAR(30) NOT NULL,
  `fecha_venta` DATE NOT NULL,
  -- Debe coincidir con clientes.id_cliente, que es INT UNSIGNED.
  `id_cliente_comprador` INT UNSIGNED NOT NULL,
  `id_empleado` MEDIUMINT UNSIGNED NOT NULL,
  `id_bodega` SMALLINT UNSIGNED NOT NULL,
  `observacion` VARCHAR(255) NULL,
  `fecha_registro` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id_venta`),
  UNIQUE KEY `uq_ventas_llantas_factura` (`numero_factura`),
  KEY `fk_venta_cliente` (`id_cliente_comprador`),
  KEY `fk_venta_empleado` (`id_empleado`),
  KEY `fk_venta_bodega` (`id_bodega`),
  CONSTRAINT `fk_venta_cliente`
    FOREIGN KEY (`id_cliente_comprador`) REFERENCES `clientes` (`id_cliente`),
  CONSTRAINT `fk_venta_empleado`
    FOREIGN KEY (`id_empleado`) REFERENCES `empleados` (`id_empleado`),
  CONSTRAINT `fk_venta_bodega`
    FOREIGN KEY (`id_bodega`) REFERENCES `bodegas` (`id_bodega`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3;

CREATE TABLE `ventas_llantas_detalle` (
  `id_venta_detalle` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `id_venta` MEDIUMINT UNSIGNED NOT NULL,
  `id_llanta` INT UNSIGNED NOT NULL,
  `precio_venta` DECIMAL(12,2) UNSIGNED NOT NULL,
  `iva_porcentaje` TINYINT UNSIGNED NOT NULL DEFAULT 0,
  PRIMARY KEY (`id_venta_detalle`),
  UNIQUE KEY `uq_venta_detalle_llanta` (`id_llanta`),
  KEY `fk_venta_detalle_venta` (`id_venta`),
  CONSTRAINT `fk_venta_detalle_venta`
    FOREIGN KEY (`id_venta`) REFERENCES `ventas_llantas` (`id_venta`),
  CONSTRAINT `fk_venta_detalle_llanta`
    FOREIGN KEY (`id_llanta`) REFERENCES `llantas` (`id_llanta`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3;
