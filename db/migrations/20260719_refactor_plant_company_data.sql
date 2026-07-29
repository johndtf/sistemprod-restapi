-- ================================================================
-- MIGRACION: CONFIGURACION DE EMPRESA PROPIETARIA
-- ================================================================
-- Antes data usaba id simultaneamente como clave de configuracion y cliente.
-- Se conserva el eslogan y se migra ese id al nuevo cliente propietario.

ALTER TABLE `data`
  ADD COLUMN `id_configuracion` TINYINT UNSIGNED NOT NULL DEFAULT 1 FIRST,
  ADD COLUMN `id_cliente_propietario` INT UNSIGNED NULL AFTER `id`,
  ADD COLUMN `logo_ruta` VARCHAR(255) NULL AFTER `eslogan`;

UPDATE `data`
SET `id_cliente_propietario` = `id`;

ALTER TABLE `data`
  DROP PRIMARY KEY,
  MODIFY COLUMN `id` INT NULL,
  MODIFY COLUMN `id_cliente_propietario` INT UNSIGNED NOT NULL,
  ADD PRIMARY KEY (`id_configuracion`),
  ADD UNIQUE KEY `uq_data_cliente_propietario` (`id_cliente_propietario`),
  ADD CONSTRAINT `fk_data_cliente_propietario`
    FOREIGN KEY (`id_cliente_propietario`) REFERENCES `clientes` (`id_cliente`);
