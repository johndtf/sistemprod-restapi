-- -----------------------------------------------------
-- Table `clientes`
-- -----------------------------------------------------

CREATE TABLE IF NOT EXISTS `clientes` (
  `id_cliente` MEDIUMINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `cedula_nit` VARCHAR(10) NOT NULL,
  `dv` TINYINT NULL,
  `nombre` VARCHAR(45) NOT NULL,
  `apellido` VARCHAR(45) NOT NULL,
  `telefono` VARCHAR(10) NOT NULL,
  `direccion` VARCHAR(100) NOT NULL,
  `email` VARCHAR(100) NOT NULL,
  `usuario` VARCHAR(30) NULL,
  `contrasenia` VARCHAR(20) NULL,
  `estado` VARCHAR(1) NOT NULL,
  PRIMARY KEY (`id_cliente`),
  UNIQUE INDEX `cedula_nit_UNIQUE` (`cedula_nit` ASC) VISIBLE)
ENGINE = InnoDB;