-- ================================================================
-- MIGRACION: CATALOGO DE PESOS PROMEDIO DE BANDA
-- ================================================================
-- pesos_banda relaciona una dimension con un diseno y guarda el peso promedio
-- usado para estimar el costo de las llantas reencauchadas en la salida.

CREATE TABLE IF NOT EXISTS `pesos_banda` (
  `id_peso_banda` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `id_dimension` INT UNSIGNED NOT NULL,
  `id_banda` INT UNSIGNED NOT NULL,
  `peso_promedio` DECIMAL(8,3) UNSIGNED NOT NULL,
  PRIMARY KEY (`id_peso_banda`),
  UNIQUE KEY `uq_pesos_banda_dimension_banda` (`id_dimension`, `id_banda`),
  KEY `fk_pesos_banda_banda` (`id_banda`),
  CONSTRAINT `fk_pesos_banda_dimension`
    FOREIGN KEY (`id_dimension`) REFERENCES `dimensiones` (`id_dimension`)
    ON UPDATE CASCADE,
  CONSTRAINT `fk_pesos_banda_banda`
    FOREIGN KEY (`id_banda`) REFERENCES `bandas` (`id_banda`)
    ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3;

-- Permiso independiente para administrar el catalogo desde Administracion.
INSERT INTO `permisos` (`nombre_permiso`, `descripcion_permiso`)
SELECT 'pesos_banda', 'Actualizar pesos promedio de banda'
WHERE NOT EXISTS (
  SELECT 1 FROM `permisos` WHERE `nombre_permiso` = 'pesos_banda'
);
