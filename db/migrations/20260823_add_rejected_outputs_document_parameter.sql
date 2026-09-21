-- Consecutivo independiente para no mezclar salidas rechazadas y procesadas.
INSERT INTO parametros_planta (codigo, nombre, valor_numero, unidad, descripcion)
VALUES ('documento_salida_rechazadas_actual', 'Documento actual de salidas rechazadas', 0, 'documento',
        'Consecutivo usado para salidas de llantas rechazadas a bodega.')
ON DUPLICATE KEY UPDATE codigo = VALUES(codigo);
