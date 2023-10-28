-- -----------------------------------------------------
-- Table `perfiles`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `perfiles` (
  `id_perfil` TINYINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `perfil` VARCHAR(45) NOT NULL,
  `descripcion` VARCHAR(120),
  PRIMARY KEY (`id_perfil`),
  UNIQUE INDEX `id_perfil_UNIQUE` (`id_perfil` ASC) VISIBLE,
  UNIQUE INDEX `perfil_nombre_UNIQUE` (`perfil` ASC) VISIBLE)
ENGINE = InnoDB;
