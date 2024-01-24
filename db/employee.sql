-- -----------------------------------------------------
-- Table `empleados`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `empleados` (
  `id_empleado` MEDIUMINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `cedula` BIGINT UNSIGNED NOT NULL,
  `nombre` VARCHAR(45) NOT NULL,
  `apellido` VARCHAR(45) NOT NULL,
  `telefono` VARCHAR(10) NOT NULL,  
  `direccion` VARCHAR(100) NOT NULL,
  `email` VARCHAR(100) NULL,
  `id_perfil` TINYINT UNSIGNED NOT NULL,
  `contrasenia` VARCHAR(128) NULL,
  `estado` VARCHAR(1) NOT NULL,
  `temporal` tinyint NOT NULL DEFAULT '1',
  `cod_recuperacion` varchar(6) DEFAULT NULL,
  `cod_expiracion` datetime DEFAULT NULL,
  PRIMARY KEY (`id_empleado`),
  UNIQUE INDEX `id_empleado_UNIQUE` (`id_empleado` ASC) VISIBLE,
  UNIQUE INDEX `cedula_UNIQUE` (`cedula` ASC) VISIBLE,
  INDEX `id_perfil` (`id_perfil` ASC) INVISIBLE,
  CONSTRAINT `id_perfil`
    FOREIGN KEY (`id_perfil`)
    REFERENCES `perfiles` (`id_perfil`)
    ON DELETE NO ACTION
    ON UPDATE NO ACTION)
ENGINE = InnoDB;