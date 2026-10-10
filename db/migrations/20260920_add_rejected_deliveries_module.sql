-- ================================================================
-- MIGRACION: ENTREGA DE RECHAZOS DESDE BODEGA A CLIENTE
-- ================================================================
-- Esta entrega no reutiliza documento_salida ni tipo_salida de llantas porque
-- esos campos documentan exclusivamente el movimiento Produccion -> Bodega.
-- Las nuevas tablas preservan por separado el posterior movimiento Bodega ->
-- Cliente y permiten imprimirlo aunque la llanta cambie otra vez de ubicacion.

CREATE TABLE IF NOT EXISTS `entregas_rechazadas` (
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

CREATE TABLE IF NOT EXISTS `entregas_rechazadas_detalle` (
  `id_entrega_rechazada_detalle` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `id_entrega_rechazada` MEDIUMINT UNSIGNED NOT NULL,
  `id_llanta` INT UNSIGNED NOT NULL,
  -- Se conservan estos textos como fotografia operativa del comprobante.
  `orden` VARCHAR(30) NULL,
  `dimension` VARCHAR(50) NULL,
  `propietario` VARCHAR(160) NULL,
  `causa_rechazo` VARCHAR(255) NULL,
  PRIMARY KEY (`id_entrega_rechazada_detalle`),
  -- Una llanta puede regresar a planta y requerir otra entrega futura; por
  -- ello se indexa para consulta, pero no se restringe a una sola entrega.
  KEY `idx_entrega_rechazo_detalle_llanta` (`id_llanta`),
  KEY `fk_entrega_rechazo_detalle_entrega` (`id_entrega_rechazada`),
  CONSTRAINT `fk_entrega_rechazo_detalle_entrega`
    FOREIGN KEY (`id_entrega_rechazada`) REFERENCES `entregas_rechazadas` (`id_entrega_rechazada`),
  CONSTRAINT `fk_entrega_rechazo_detalle_llanta`
    FOREIGN KEY (`id_llanta`) REFERENCES `llantas` (`id_llanta`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3;

INSERT INTO `parametros_planta`
  (`codigo`, `nombre`, `valor_numero`, `unidad`, `descripcion`)
SELECT
  'documento_entrega_rechazadas_actual',
  'Documento actual de entregas rechazadas',
  0,
  'documento',
  'Consecutivo usado para entregar llantas rechazadas desde bodega al cliente.'
WHERE NOT EXISTS (
  SELECT 1 FROM `parametros_planta`
  WHERE `codigo` = 'documento_entrega_rechazadas_actual'
);

INSERT INTO `permisos` (`nombre_permiso`, `descripcion_permiso`)
SELECT 'entregar', 'Entrega de rechazos a cliente'
WHERE NOT EXISTS (
  SELECT 1 FROM `permisos` WHERE `nombre_permiso` = 'entregar'
);
