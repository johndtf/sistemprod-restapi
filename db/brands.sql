-- -----------------------------------------------------
-- Table `marcas`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `marcas` (
  `id_marca` SMALLINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `marca` VARCHAR(20) NOT NULL,
  PRIMARY KEY (`id_marca`),
  UNIQUE INDEX `id_marca_UNIQUE` (`id_marca` ASC) VISIBLE,
  UNIQUE INDEX `marca_UNIQUE` (`marca` ASC) VISIBLE)
ENGINE = InnoDB;
