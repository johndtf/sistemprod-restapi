-- -----------------------------------------------------
-- Table `dimensiones`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `dimensiones` (
  `id_dimension` SMALLINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `dimension` VARCHAR(20) NOT NULL,
  PRIMARY KEY (`id_dimension`),
  UNIQUE INDEX `id_dimension_UNIQUE` (`id_dimension` ASC) VISIBLE)
ENGINE = InnoDB;