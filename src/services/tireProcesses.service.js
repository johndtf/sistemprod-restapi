// ==================== HISTORIAL COMUN DE SUBPROCESOS ====================
// Esta consulta pertenece al historial de la llanta y no a un formulario en
// particular. Centralizarla permite que Inspeccion, Raspado y Preparacion
// muestren exactamente los mismos indicadores en el menu lateral.
export const getCompletedSubprocessIds = async (connection, tireId) => {
  const [rows] = await connection.query(
    `SELECT DISTINCT id_subproceso
     FROM procesos
     WHERE id_llanta = ?
     ORDER BY id_subproceso`,
    [tireId],
  );

  return rows.map(({ id_subproceso }) => id_subproceso);
};
