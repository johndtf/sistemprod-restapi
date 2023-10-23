-- -----------------------------------------------------
-- Table `resoluciones_i`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `resoluciones_i` (
  `id_inspec` SMALLINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `resol_inspec` VARCHAR(45) NOT NULL,
  PRIMARY KEY (`id_inspec`),
  UNIQUE INDEX `id_inspec_UNIQUE` (`id_inspec` ASC) VISIBLE)
ENGINE = InnoDB;