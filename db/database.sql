-- MySQL Workbench Forward Engineering

SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0;
SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0;
SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION';

-- -----------------------------------------------------
-- Schema bdreencauche
-- -----------------------------------------------------

-- -----------------------------------------------------
-- Schema bdreencauche
-- -----------------------------------------------------
CREATE SCHEMA IF NOT EXISTS `bdreencauche` DEFAULT CHARACTER SET utf8 ;
USE `bdreencauche` ;

-- -----------------------------------------------------
-- Table `bdreencauche`.`clientes`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `bdreencauche`.`clientes` (
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


-- -----------------------------------------------------
-- Table `bdreencauche`.`ordenes`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `bdreencauche`.`ordenes` (
  `id_orden` INT UNSIGNED NOT NULL,
  `fecha` DATE NOT NULL,
  `id_cliente` MEDIUMINT UNSIGNED NOT NULL,
  PRIMARY KEY (`id_orden`),
  INDEX `id_cliente_idx` (`id_cliente` ASC) INVISIBLE,
  CONSTRAINT `id_cliente`
    FOREIGN KEY (`id_cliente`)
    REFERENCES `bdreencauche`.`clientes` (`id_cliente`)
    ON DELETE NO ACTION
    ON UPDATE NO ACTION)
ENGINE = InnoDB;


-- -----------------------------------------------------
-- Table `bdreencauche`.`marcas`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `bdreencauche`.`marcas` (
  `id_marca` SMALLINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `marca` VARCHAR(20) NOT NULL,
  PRIMARY KEY (`id_marca`),
  UNIQUE INDEX `id_marca_UNIQUE` (`id_marca` ASC) VISIBLE,
  UNIQUE INDEX `marca_UNIQUE` (`marca` ASC) VISIBLE)
ENGINE = InnoDB;


-- -----------------------------------------------------
-- Table `bdreencauche`.`dimensiones`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `bdreencauche`.`dimensiones` (
  `id_dimension` SMALLINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `dimension` VARCHAR(20) NOT NULL,
  PRIMARY KEY (`id_dimension`),
  UNIQUE INDEX `id_dimension_UNIQUE` (`id_dimension` ASC) VISIBLE)
ENGINE = InnoDB;


-- -----------------------------------------------------
-- Table `bdreencauche`.`bandas`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `bdreencauche`.`bandas` (
  `id_banda` SMALLINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `banda` VARCHAR(20) NOT NULL,
  PRIMARY KEY (`id_banda`),
  UNIQUE INDEX `id_disenio_UNIQUE` (`id_banda` ASC) VISIBLE)
ENGINE = InnoDB;


-- -----------------------------------------------------
-- Table `bdreencauche`.`llantas`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `bdreencauche`.`llantas` (
  `id_llanta` INT UNSIGNED NOT NULL,
  `id_marca` SMALLINT UNSIGNED NOT NULL,
  `id_dimension` SMALLINT UNSIGNED NOT NULL,
  `id_banda` SMALLINT UNSIGNED NOT NULL,
  `serie` SMALLINT UNSIGNED NOT NULL,
  `orden` INT UNSIGNED NOT NULL,
  `consec_orden` TINYINT UNSIGNED NOT NULL,
  `ubicacion` VARCHAR(1) NOT NULL,
  `doc_sale` MEDIUMINT UNSIGNED NULL COMMENT 'documento de salida de producción',
  `tipo_doc_sale` TINYINT UNSIGNED NULL COMMENT 'tipo de documento salida de producción',
  `fecha_sale` DATE NULL,
  `doc_entrega` MEDIUMINT UNSIGNED NULL COMMENT 'número documento de entrega al cliente',
  `tipo_doc_entrega` TINYINT(1) UNSIGNED NULL COMMENT 'Tipo de documento de entrega al cliente, factura o remisión rechazo',
  `valor` MEDIUMINT UNSIGNED NULL,
  `impuesto` TINYINT UNSIGNED NULL,
  `id_comprador` MEDIUMINT UNSIGNED NULL,
  `fecha_entrega` DATE NULL COMMENT 'Fecha de entrega de la llanta al cliente',
  PRIMARY KEY (`id_llanta`),
  INDEX `orden_idx` (`orden` ASC) VISIBLE,
  INDEX `id_comprador_idx` (`id_comprador` ASC) VISIBLE,
  INDEX `id_marca_idx` (`id_marca` ASC) VISIBLE,
  INDEX `id_dimension_idx` (`id_dimension` ASC) VISIBLE,
  INDEX `id_banda_idx` (`id_banda` ASC) VISIBLE,
  CONSTRAINT `orden`
    FOREIGN KEY (`orden`)
    REFERENCES `bdreencauche`.`ordenes` (`id_orden`)
    ON DELETE NO ACTION
    ON UPDATE NO ACTION,
  CONSTRAINT `id_comprador`
    FOREIGN KEY (`id_comprador`)
    REFERENCES `bdreencauche`.`clientes` (`id_cliente`)
    ON DELETE NO ACTION
    ON UPDATE NO ACTION,
  CONSTRAINT `id_marca`
    FOREIGN KEY (`id_marca`)
    REFERENCES `bdreencauche`.`marcas` (`id_marca`)
    ON DELETE NO ACTION
    ON UPDATE NO ACTION,
  CONSTRAINT `id_dimension`
    FOREIGN KEY (`id_dimension`)
    REFERENCES `bdreencauche`.`dimensiones` (`id_dimension`)
    ON DELETE NO ACTION
    ON UPDATE NO ACTION,
  CONSTRAINT `id_banda`
    FOREIGN KEY (`id_banda`)
    REFERENCES `bdreencauche`.`bandas` (`id_banda`)
    ON DELETE NO ACTION
    ON UPDATE NO ACTION)
ENGINE = InnoDB;


-- -----------------------------------------------------
-- Table `bdreencauche`.`perfiles`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `bdreencauche`.`perfiles` (
  `id_perfil` TINYINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `perfil` VARCHAR(45) NOT NULL,
  PRIMARY KEY (`id_perfil`),
  UNIQUE INDEX `id_perfil_UNIQUE` (`id_perfil` ASC) VISIBLE,
  UNIQUE INDEX `perfil_nombre_UNIQUE` (`perfil` ASC) VISIBLE)
ENGINE = InnoDB;


-- -----------------------------------------------------
-- Table `bdreencauche`.`empleados`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `bdreencauche`.`empleados` (
  `id_empleado` MEDIUMINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `cedula` INT UNSIGNED NOT NULL,
  `nombre` VARCHAR(45) NOT NULL,
  `apellido` VARCHAR(45) NOT NULL,
  `telefono` VARCHAR(10) NOT NULL,
  `direccion` VARCHAR(100) NOT NULL,
  `email` VARCHAR(100) NULL,
  `id_perfil` TINYINT UNSIGNED NOT NULL,
  `usuario` VARCHAR(30) NOT NULL,
  `contrasenia` VARCHAR(20) NULL,
  `estado` VARCHAR(1) NOT NULL,
  PRIMARY KEY (`id_empleado`),
  UNIQUE INDEX `id_empleado_UNIQUE` (`id_empleado` ASC) VISIBLE,
  UNIQUE INDEX `cedula_UNIQUE` (`cedula` ASC) VISIBLE,
  UNIQUE INDEX `usuario_UNIQUE` (`usuario` ASC) VISIBLE,
  INDEX `id_perfil` (`id_perfil` ASC) INVISIBLE,
  CONSTRAINT `id_perfil`
    FOREIGN KEY (`id_perfil`)
    REFERENCES `bdreencauche`.`perfiles` (`id_perfil`)
    ON DELETE NO ACTION
    ON UPDATE NO ACTION)
ENGINE = InnoDB;


-- -----------------------------------------------------
-- Table `bdreencauche`.`resoluciones_i`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `bdreencauche`.`resoluciones_i` (
  `id_inspec` SMALLINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `resol_inspec` VARCHAR(45) NOT NULL,
  PRIMARY KEY (`id_inspec`),
  UNIQUE INDEX `id_inspec_UNIQUE` (`id_inspec` ASC) VISIBLE)
ENGINE = InnoDB;


-- -----------------------------------------------------
-- Table `bdreencauche`.`procesos`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `bdreencauche`.`procesos` (
  `id_proceso` INT NOT NULL AUTO_INCREMENT,
  `id_llanta` INT UNSIGNED NOT NULL,
  `estado` VARCHAR(12) NOT NULL,
  `nivel_r` TINYINT(2) UNSIGNED NULL DEFAULT 0,
  `id_inspec` SMALLINT UNSIGNED NULL,
  `ancho` SMALLINT(3) UNSIGNED NULL COMMENT 'Ancho de la llanta en mm',
  `perimetro` SMALLINT(3) UNSIGNED NULL,
  `radio_r` SMALLINT(2) UNSIGNED NULL COMMENT 'Radio de raspado en pulgadas',
  `id_ins_inicial` MEDIUMINT UNSIGNED NULL,
  `time_ins_inicial` DATETIME NULL,
  `id_raspado` MEDIUMINT UNSIGNED NULL,
  `time_raspado` DATETIME NULL,
  `id_preparacion` MEDIUMINT UNSIGNED NULL,
  `time_preparacion` DATETIME NULL,
  `id_relleno` MEDIUMINT UNSIGNED NULL,
  `time_relleno` DATETIME NULL,
  `id_corte` MEDIUMINT UNSIGNED NULL,
  `time_corte` DATETIME NULL,
  `id_embandado` MEDIUMINT UNSIGNED NULL,
  `time_embandado` DATETIME NULL,
  `id_vulacanizado` MEDIUMINT UNSIGNED NULL,
  `time_vulcanizado` DATETIME NULL,
  `id_ins_final` MEDIUMINT UNSIGNED NULL,
  `time_ins_final` DATETIME NULL,
  PRIMARY KEY (`id_proceso`),
  INDEX `id_llanta_idx` (`id_llanta` ASC) INVISIBLE,
  INDEX `id_ins_inicial_idx` (`id_ins_inicial` ASC) VISIBLE,
  INDEX `id_raspado_idx` (`id_raspado` ASC) VISIBLE,
  INDEX `id_preparacion_idx` (`id_preparacion` ASC) VISIBLE,
  INDEX `id_relleno_idx` (`id_relleno` ASC) VISIBLE,
  INDEX `id_corte_idx` (`id_corte` ASC) VISIBLE,
  INDEX `id_embandado_idx` (`id_embandado` ASC) VISIBLE,
  INDEX `id_vulcanizado_idx` (`id_vulacanizado` ASC) INVISIBLE,
  INDEX `id_ins_final_idx` (`id_ins_final` ASC) VISIBLE,
  INDEX `id_inspec_idx` (`id_inspec` ASC) VISIBLE,
  CONSTRAINT `id_llanta`
    FOREIGN KEY (`id_llanta`)
    REFERENCES `bdreencauche`.`llantas` (`id_llanta`)
    ON DELETE NO ACTION
    ON UPDATE NO ACTION,
  CONSTRAINT `id_ins_inicial`
    FOREIGN KEY (`id_ins_inicial`)
    REFERENCES `bdreencauche`.`empleados` (`id_empleado`)
    ON DELETE NO ACTION
    ON UPDATE NO ACTION,
  CONSTRAINT `id_raspado`
    FOREIGN KEY (`id_raspado`)
    REFERENCES `bdreencauche`.`empleados` (`id_empleado`)
    ON DELETE NO ACTION
    ON UPDATE NO ACTION,
  CONSTRAINT `id_preparacion`
    FOREIGN KEY (`id_preparacion`)
    REFERENCES `bdreencauche`.`empleados` (`id_empleado`)
    ON DELETE NO ACTION
    ON UPDATE NO ACTION,
  CONSTRAINT `id_relleno`
    FOREIGN KEY (`id_relleno`)
    REFERENCES `bdreencauche`.`empleados` (`id_empleado`)
    ON DELETE NO ACTION
    ON UPDATE NO ACTION,
  CONSTRAINT `id_corte`
    FOREIGN KEY (`id_corte`)
    REFERENCES `bdreencauche`.`empleados` (`id_empleado`)
    ON DELETE NO ACTION
    ON UPDATE NO ACTION,
  CONSTRAINT `id_embandado`
    FOREIGN KEY (`id_embandado`)
    REFERENCES `bdreencauche`.`empleados` (`id_empleado`)
    ON DELETE NO ACTION
    ON UPDATE NO ACTION,
  CONSTRAINT `id_vulcanizado`
    FOREIGN KEY (`id_vulacanizado`)
    REFERENCES `bdreencauche`.`empleados` (`id_empleado`)
    ON DELETE NO ACTION
    ON UPDATE NO ACTION,
  CONSTRAINT `id_ins_final`
    FOREIGN KEY (`id_ins_final`)
    REFERENCES `bdreencauche`.`empleados` (`id_empleado`)
    ON DELETE NO ACTION
    ON UPDATE NO ACTION,
  CONSTRAINT `id_inspec`
    FOREIGN KEY (`id_inspec`)
    REFERENCES `bdreencauche`.`resoluciones_i` (`id_inspec`)
    ON DELETE NO ACTION
    ON UPDATE NO ACTION)
ENGINE = InnoDB;


-- -----------------------------------------------------
-- Table `bdreencauche`.`resoluciones_g`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `bdreencauche`.`resoluciones_g` (
  `id_resol_g` SMALLINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `resol_garan` VARCHAR(45) NOT NULL,
  PRIMARY KEY (`id_resol_g`),
  UNIQUE INDEX `id_resol_g_UNIQUE` (`id_resol_g` ASC) VISIBLE)
ENGINE = InnoDB;


-- -----------------------------------------------------
-- Table `bdreencauche`.`garantias`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `bdreencauche`.`garantias` (
  `id_garantia` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `llanta` INT UNSIGNED NOT NULL,
  `docu_garan` MEDIUMINT UNSIGNED NOT NULL,
  `fecha_entra` DATE NOT NULL,
  `cliente` MEDIUMINT UNSIGNED NOT NULL,
  `resol_g` SMALLINT UNSIGNED NULL,
  `ajustable` TINYINT(1) UNSIGNED NULL,
  `porcentaje` TINYINT UNSIGNED NULL,
  `fecha_resol` DATE NULL,
  PRIMARY KEY (`id_garantia`),
  INDEX `id_llanta_idx` (`llanta` ASC) VISIBLE,
  INDEX `id_cliente_idx` (`cliente` ASC) VISIBLE,
  INDEX `id_resol_g_idx` (`resol_g` ASC) VISIBLE,
  CONSTRAINT `llanta`
    FOREIGN KEY (`llanta`)
    REFERENCES `bdreencauche`.`llantas` (`id_llanta`)
    ON DELETE NO ACTION
    ON UPDATE NO ACTION,
  CONSTRAINT `cliente`
    FOREIGN KEY (`cliente`)
    REFERENCES `bdreencauche`.`clientes` (`id_cliente`)
    ON DELETE NO ACTION
    ON UPDATE NO ACTION,
  CONSTRAINT `resol_g`
    FOREIGN KEY (`resol_g`)
    REFERENCES `bdreencauche`.`resoluciones_g` (`id_resol_g`)
    ON DELETE NO ACTION
    ON UPDATE NO ACTION)
ENGINE = InnoDB;


-- -----------------------------------------------------
-- Table `bdreencauche`.`permisos`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `bdreencauche`.`permisos` (
  `id_permisos` TINYINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `nombre_permiso` VARCHAR(45) NOT NULL,
  PRIMARY KEY (`id_permisos`),
  UNIQUE INDEX `id_permisos_UNIQUE` (`id_permisos` ASC) VISIBLE,
  UNIQUE INDEX `nombre_permiso_UNIQUE` (`nombre_permiso` ASC) VISIBLE)
ENGINE = InnoDB;


-- -----------------------------------------------------
-- Table `bdreencauche`.`permisos_perfiles`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `bdreencauche`.`permisos_perfiles` (
  `permiso` TINYINT UNSIGNED NOT NULL,
  `perfil` TINYINT UNSIGNED NOT NULL,
  INDEX `id_perfil_idx` (`perfil` ASC) VISIBLE,
  INDEX `id_permiso_idx` (`permiso` ASC) VISIBLE,
  CONSTRAINT `perfil`
    FOREIGN KEY (`perfil`)
    REFERENCES `bdreencauche`.`perfiles` (`id_perfil`)
    ON DELETE NO ACTION
    ON UPDATE NO ACTION,
  CONSTRAINT `permiso`
    FOREIGN KEY (`permiso`)
    REFERENCES `bdreencauche`.`permisos` (`id_permisos`)
    ON DELETE NO ACTION
    ON UPDATE NO ACTION)
ENGINE = InnoDB;


SET SQL_MODE=@OLD_SQL_MODE;
SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS;
SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS;
