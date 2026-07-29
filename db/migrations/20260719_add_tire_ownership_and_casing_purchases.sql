-- Tipo de ingreso y propietario actual por llanta.
ALTER TABLE llantas
  ADD COLUMN tipo_ingreso VARCHAR(20) NOT NULL DEFAULT 'REENCAUCHE' AFTER id_estado,
  ADD COLUMN id_propietario_actual INT UNSIGNED NULL AFTER tipo_ingreso,
  ADD INDEX fk_propietario_actual (id_propietario_actual),
  ADD CONSTRAINT fk_propietario_actual FOREIGN KEY (id_propietario_actual) REFERENCES clientes (id_cliente);

-- Las llantas existentes conservan como propietario el cliente de su orden.
UPDATE llantas l JOIN ordenes o ON o.id_orden = l.id_orden
SET l.id_propietario_actual = o.id_cliente
WHERE l.id_propietario_actual IS NULL;

CREATE TABLE compras_cascos (
  id_compra INT UNSIGNED NOT NULL AUTO_INCREMENT,
  documento MEDIUMINT UNSIGNED NOT NULL,
  fecha_compra DATE NOT NULL,
  id_vendedor INT UNSIGNED NOT NULL,
  id_empresa_compradora INT UNSIGNED NOT NULL,
  id_empleado MEDIUMINT UNSIGNED NOT NULL,
  PRIMARY KEY (id_compra),
  UNIQUE KEY uq_compras_cascos_documento (documento),
  CONSTRAINT fk_compra_vendedor FOREIGN KEY (id_vendedor) REFERENCES clientes (id_cliente),
  CONSTRAINT fk_compra_empresa FOREIGN KEY (id_empresa_compradora) REFERENCES clientes (id_cliente),
  CONSTRAINT fk_compra_empleado FOREIGN KEY (id_empleado) REFERENCES empleados (id_empleado)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3;

CREATE TABLE compras_cascos_detalle (
  id_compra INT UNSIGNED NOT NULL,
  id_llanta INT UNSIGNED NOT NULL,
  valor_compra DECIMAL(12,2) UNSIGNED NOT NULL,
  PRIMARY KEY (id_compra, id_llanta),
  UNIQUE KEY uq_compra_casco_llanta (id_llanta),
  CONSTRAINT fk_detalle_compra FOREIGN KEY (id_compra) REFERENCES compras_cascos (id_compra),
  CONSTRAINT fk_detalle_llanta FOREIGN KEY (id_llanta) REFERENCES llantas (id_llanta)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3;

INSERT INTO parametros_planta (codigo, nombre, valor_numero, unidad, descripcion)
SELECT 'documento_compra_cascos_actual', 'Documento actual de compras de cascos', 0, 'documento',
       'Consecutivo de documentos de compra de cascos.'
WHERE NOT EXISTS (SELECT 1 FROM parametros_planta WHERE codigo = 'documento_compra_cascos_actual');

INSERT INTO permisos (nombre_permiso, descripcion_permiso)
SELECT 'comprascascos', 'Registrar compras de cascos'
WHERE NOT EXISTS (SELECT 1 FROM permisos WHERE nombre_permiso = 'comprascascos');
