-- -----------------------------------------------------
-- Table `bandas`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `bandas` (
  `id_banda` SMALLINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `banda` VARCHAR(20) NOT NULL,
  PRIMARY KEY (`id_banda`),
  UNIQUE INDEX `id_disenio_UNIQUE` (`id_banda` ASC) VISIBLE)
ENGINE = InnoDB;