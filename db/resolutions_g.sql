-- -----------------------------------------------------
-- Table `resoluciones_g`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `resoluciones_g` (
  `id_resol_g` SMALLINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `codigo` VARCHAR(2),  
  `resol_garan` VARCHAR(45) NOT NULL,
  PRIMARY KEY (`id_resol_g`),
  UNIQUE INDEX `id_resol_g_UNIQUE` (`id_resol_g` ASC) VISIBLE)
ENGINE = InnoDB;
