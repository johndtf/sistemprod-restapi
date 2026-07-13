CREATE TABLE `pesos_banda` (
  `id_peso_banda` int unsigned NOT NULL AUTO_INCREMENT,
  `id_dimension` int unsigned NOT NULL,
  `id_banda` int unsigned NOT NULL,
  `peso_promedio` decimal(8,3) unsigned NOT NULL,
  PRIMARY KEY (`id_peso_banda`),
  UNIQUE KEY `uq_pesos_banda_dimension_banda` (`id_dimension`, `id_banda`),
  KEY `fk_pesos_banda_banda` (`id_banda`),
  CONSTRAINT `fk_pesos_banda_dimension`
    FOREIGN KEY (`id_dimension`) REFERENCES `dimensiones` (`id_dimension`)
    ON UPDATE CASCADE,
  CONSTRAINT `fk_pesos_banda_banda`
    FOREIGN KEY (`id_banda`) REFERENCES `bandas` (`id_banda`)
    ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3
