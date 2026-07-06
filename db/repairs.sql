-- Catálogo maestro: una referencia identifica un tipo de parche o reparación.
CREATE TABLE `reparaciones` (
  `id_reparacion` smallint unsigned NOT NULL AUTO_INCREMENT,
  `referencia` varchar(20) NOT NULL,
  `nombre` varchar(80) NOT NULL,
  PRIMARY KEY (`id_reparacion`),
  UNIQUE KEY `uq_reparaciones_referencia` (`referencia`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3;

-- Detalle histórico: cada fila indica cuántas unidades de una referencia se
-- utilizaron en una ejecución concreta del subproceso Reparación.
CREATE TABLE `reparaciones_proceso` (
  `id_proceso` int unsigned NOT NULL,
  `id_reparacion` smallint unsigned NOT NULL,
  `cantidad` smallint unsigned NOT NULL,
  PRIMARY KEY (`id_proceso`, `id_reparacion`),
  KEY `idx_reparaciones_proceso_reparacion` (`id_reparacion`),
  CONSTRAINT `fk_reparaciones_proceso_proceso`
    FOREIGN KEY (`id_proceso`) REFERENCES `procesos` (`id_proceso`),
  CONSTRAINT `fk_reparaciones_proceso_reparacion`
    FOREIGN KEY (`id_reparacion`) REFERENCES `reparaciones` (`id_reparacion`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3;
