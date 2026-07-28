-- Falta en db/auditoria.sql: crea la tabla AUDITORIA y los triggers, pero
-- nunca crea el procedure que el backend llama (Backend/Routes/reportes.js,
-- GET /api/reportes/auditoria), solo le hace GRANT EXECUTE a algo que no
-- existe. Correr esto DESPUES de haber aplicado db/auditoria.sql.

DROP PROCEDURE IF EXISTS DBA.sp_reporte_auditoria;

CREATE PROCEDURE DBA.sp_reporte_auditoria(
    in p_fecha_desde date,
    in p_fecha_hasta date,
    in p_grupo varchar(20),
    in p_usuario_filtro varchar(128),
    in p_id_referencia integer,
    in p_offset integer,
    in p_limite integer
)
result (
    ID_AUDITORIA integer,
    FECHA_HORA timestamp,
    USUARIO varchar(128),
    TIPO_EVENTO varchar(50),
    ID_REFERENCIA integer,
    DESCRIPCION varchar(500),
    TOTAL integer
)
begin
    declare v_start integer;
    set v_start = p_offset + 1;

    SELECT TOP p_limite START AT v_start
           ID_AUDITORIA, FECHA_HORA, USUARIO, TIPO_EVENTO, ID_REFERENCIA, DESCRIPCION,
           COUNT(*) OVER () AS TOTAL
    FROM DBA.AUDITORIA
    WHERE (p_fecha_desde IS NULL OR FECHA_HORA >= p_fecha_desde)
      AND (p_fecha_hasta IS NULL OR FECHA_HORA < DATEADD(DAY, 1, p_fecha_hasta))
      AND (
            p_grupo IS NULL OR p_grupo = 'Todos'
            OR (p_grupo = 'Reservas' AND TIPO_EVENTO LIKE 'RESERVA%')
            OR (p_grupo = 'Laboratorios' AND TIPO_EVENTO LIKE 'LABORATORIO%')
            OR (p_grupo = 'Mantenimientos' AND TIPO_EVENTO LIKE 'MANTENIMIENTO%')
          )
      AND (p_usuario_filtro IS NULL OR USUARIO LIKE '%' || p_usuario_filtro || '%')
      AND (p_id_referencia IS NULL OR ID_REFERENCIA = p_id_referencia)
    ORDER BY FECHA_HORA DESC;
end;

GRANT EXECUTE ON DBA.sp_reporte_auditoria TO ADMINISTRADORES;

COMMIT;
