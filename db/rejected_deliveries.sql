-- Entregas fisicas de llantas rechazadas desde una bodega hacia su cliente.
-- La definicion completa e idempotente para instalaciones existentes se
-- encuentra en migrations/20260920_add_rejected_deliveries_module.sql.

CREATE TABLE `entregas_rechazadas` (
  `id_entrega_rechazada` MEDIUMINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `documento_entrega` MEDIUMINT UNSIGNED NOT NULL,
  `fecha_entrega` DATE NOT NULL,
  `id_cliente` INT UNSIGNED NOT NULL,
  `id_empleado` MEDIUMINT UNSIGNED NOT NULL,
  `id_bodega` SMALLINT UNSIGNED NOT NULL,
  `observacion` VARCHAR(255) NULL,
  `fecha_registro` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id_entrega_rechazada`),
  UNIQUE KEY `uq_entrega_rechazo_documento` (`documento_entrega`),
  KEY `fk_entrega_rechazo_cliente` (`id_cliente`),
  KEY `fk_entrega_rechazo_empleado` (`id_empleado`),
  KEY `fk_entrega_rechazo_bodega` (`id_bodega`),
  CONSTRAINT `fk_entrega_rechazo_cliente`
    FOREIGN KEY (`id_cliente`) REFERENCES `clientes` (`id_cliente`),
  CONSTRAINT `fk_entrega_rechazo_empleado`
    FOREIGN KEY (`id_empleado`) REFERENCES `empleados` (`id_empleado`),
  CONSTRAINT `fk_entrega_rechazo_bodega`
    FOREIGN KEY (`id_bodega`) REFERENCES `bodegas` (`id_bodega`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3;

CREATE TABLE `entregas_rechazadas_detalle` (
  `id_entrega_rechazada_detalle` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `id_entrega_rechazada` MEDIUMINT UNSIGNED NOT NULL,
  `id_llanta` INT UNSIGNED NOT NULL,
  `orden` VARCHAR(30) NULL,
  `dimension` VARCHAR(50) NULL,
  `propietario` VARCHAR(160) NULL,
  `causa_rechazo` VARCHAR(255) NULL,
  PRIMARY KEY (`id_entrega_rechazada_detalle`),
  KEY `idx_entrega_rechazo_detalle_llanta` (`id_llanta`),
  KEY `fk_entrega_rechazo_detalle_entrega` (`id_entrega_rechazada`),
  CONSTRAINT `fk_entrega_rechazo_detalle_entrega`
    FOREIGN KEY (`id_entrega_rechazada`) REFERENCES `entregas_rechazadas` (`id_entrega_rechazada`),
  CONSTRAINT `fk_entrega_rechazo_detalle_llanta`
    FOREIGN KEY (`id_llanta`) REFERENCES `llantas` (`id_llanta`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3;
