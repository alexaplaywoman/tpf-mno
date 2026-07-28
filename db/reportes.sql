/*==============================================================*/
/* Stored procedures para los 5 reportes por rango de fechas.   */
/* v3 - agrega exclusion del estado 'D' (Desplazada).            */
/*                                                              */
/* Cambios respecto a v2:                                        */
/*   - Reportes 1, 2 y 5 excluyen tambien 'D' (Desplazada): una  */
/*     reserva desplazada por prioridad nunca ocurrio, no es     */
/*     utilizacion real (mismo criterio que C y A).              */
/*   - Reporte 4 (cancelaciones/inasistencias) muestra 'D' como  */
/*     fila propia etiquetada "Desplazada", para separarla de    */
/*     las canceladas por el usuario.                            */
/*   - Reporte 3 (solicitantes) NO cambia: mide "quien reserva   */
/*     mas", y una desplazada sigue siendo una reserva que el    */
/*     solicitante hizo.                                          */
/*                                                              */
/* Nota sobre "horarios de mayor ocupacion":                      */
/*   sp_horarios_disponibles genera candidatos cada 1h desde     */
/*   las 07:00, asi que en la practica todas las reservas       */
/*   arrancan en hora exacta. Se mantiene GROUP BY HORA_INICIO    */
/*   directo (no HOUR()), documentado como decision.              */
/*==============================================================*/

/*--------------------------------------------------------------*/
/* 0. Cleanup                                                    */
/*--------------------------------------------------------------*/
if exists(select 1 from sys.sysprocedure where proc_name='sp_reporte_porcentaje_recursos') then
    drop procedure sp_reporte_porcentaje_recursos
end if;

if exists(select 1 from sys.sysprocedure where proc_name='sp_reporte_cancelaciones_inasistencias') then
    drop procedure sp_reporte_cancelaciones_inasistencias
end if;

if exists(select 1 from sys.sysprocedure where proc_name='sp_reporte_solicitantes_top') then
    drop procedure sp_reporte_solicitantes_top
end if;

if exists(select 1 from sys.sysprocedure where proc_name='sp_reporte_horarios_mas_ocupados') then
    drop procedure sp_reporte_horarios_mas_ocupados
end if;

if exists(select 1 from sys.sysprocedure where proc_name='sp_reporte_laboratorios_mas_utilizados') then
    drop procedure sp_reporte_laboratorios_mas_utilizados
end if;

if exists(select 1 from sys.sysprocedure where proc_name='fn_validar_rango_fechas') then
    drop function fn_validar_rango_fechas
end if;

commit;

/*==============================================================*/
/* 1. FUNCION AUXILIAR - validacion reutilizable                 */
/*==============================================================*/

CREATE FUNCTION "DBA"."fn_validar_rango_fechas"(
    IN p_desde DATE,
    IN p_hasta DATE )
RETURNS INTEGER
BEGIN
    -- 0 = valido ; 1 = alguna fecha nula ; 2 = desde > hasta
    IF p_desde IS NULL OR p_hasta IS NULL THEN
        RETURN 1;
    END IF;
    IF p_desde > p_hasta THEN
        RETURN 2;
    END IF;
    RETURN 0;
END;

/*==============================================================*/
/* 2. REPORTES                                                   */
/*==============================================================*/

/*--------------------------------------------------------------*/
/* 2.1 Laboratorios mas utilizados                                */
/*     Excluye Canceladas, Ausentes y Desplazadas.                */
/*--------------------------------------------------------------*/
CREATE PROCEDURE "DBA"."sp_reporte_laboratorios_mas_utilizados"(
    IN p_desde DATE,
    IN p_hasta DATE )
RESULT (NUMERO_LABORATORIO INT, EDIFICIO VARCHAR(80), CANTIDAD_RESERVAS INT)
BEGIN
    DECLARE v_val INT;
    SET v_val = DBA.fn_validar_rango_fechas(p_desde, p_hasta);
    IF v_val = 1 THEN
        RAISERROR 99999 'Debe indicar fecha desde y fecha hasta.';
        RETURN;
    END IF;
    IF v_val = 2 THEN
        RAISERROR 99999 'La fecha desde no puede ser posterior a la fecha hasta.';
        RETURN;
    END IF;

    SELECT r.NUMERO_LABORATORIO, l.EDIFICIO, COUNT(*) AS CANTIDAD_RESERVAS
    FROM "DBA"."RESERVAS" r
    JOIN "DBA"."LABORATORIOS" l  ON l.NUMERO_LABORATORIO = r.NUMERO_LABORATORIO
    JOIN "DBA"."ESTADO_RESERVA" er ON er.ID_ESTADO_RESERVA = r.ID_ESTADO_RESERVA
    WHERE r.FECHA_A_RESERVAR BETWEEN p_desde AND p_hasta
      AND er.ESTADO_RESERVA NOT IN ('C','A','D')
    GROUP BY r.NUMERO_LABORATORIO, l.EDIFICIO
    ORDER BY CANTIDAD_RESERVAS DESC;
END;

/*--------------------------------------------------------------*/
/* 2.2 Horarios de mayor ocupacion                                */
/*     Excluye Canceladas, Ausentes y Desplazadas.                */
/*--------------------------------------------------------------*/
CREATE PROCEDURE "DBA"."sp_reporte_horarios_mas_ocupados"(
    IN p_desde DATE,
    IN p_hasta DATE )
RESULT (HORA_INICIO TIME, CANTIDAD_RESERVAS INT)
BEGIN
    DECLARE v_val INT;
    SET v_val = DBA.fn_validar_rango_fechas(p_desde, p_hasta);
    IF v_val = 1 THEN
        RAISERROR 99999 'Debe indicar fecha desde y fecha hasta.';
        RETURN;
    END IF;
    IF v_val = 2 THEN
        RAISERROR 99999 'La fecha desde no puede ser posterior a la fecha hasta.';
        RETURN;
    END IF;

    SELECT r.HORA_INICIO, COUNT(*) AS CANTIDAD_RESERVAS
    FROM "DBA"."RESERVAS" r
    JOIN "DBA"."ESTADO_RESERVA" er ON er.ID_ESTADO_RESERVA = r.ID_ESTADO_RESERVA
    WHERE r.FECHA_A_RESERVAR BETWEEN p_desde AND p_hasta
      AND er.ESTADO_RESERVA NOT IN ('C','A','D')
    GROUP BY r.HORA_INICIO
    ORDER BY CANTIDAD_RESERVAS DESC;
END;

/*--------------------------------------------------------------*/
/* 2.3 Solicitantes con mas reservas                              */
/*     NO filtra por estado: mide "quien reserva mas", no         */
/*     "quien usa mas". Una cancelacion o desplazamiento siguen   */
/*     siendo una reserva realizada por el solicitante.           */
/*--------------------------------------------------------------*/
CREATE PROCEDURE "DBA"."sp_reporte_solicitantes_top"(
    IN p_desde DATE,
    IN p_hasta DATE )
RESULT (CEDULA_IDENTIDAD INT, NOMBRE VARCHAR(80), APELLIDO VARCHAR(80), CANTIDAD_RESERVAS INT)
BEGIN
    DECLARE v_val INT;
    SET v_val = DBA.fn_validar_rango_fechas(p_desde, p_hasta);
    IF v_val = 1 THEN
        RAISERROR 99999 'Debe indicar fecha desde y fecha hasta.';
        RETURN;
    END IF;
    IF v_val = 2 THEN
        RAISERROR 99999 'La fecha desde no puede ser posterior a la fecha hasta.';
        RETURN;
    END IF;

    SELECT r.CEDULA_IDENTIDAD, s.NOMBRE, s.APELLIDO, COUNT(*) AS CANTIDAD_RESERVAS
    FROM "DBA"."RESERVAS" r
    JOIN "DBA"."SOLICITANTES" s
         ON s.CEDULA_IDENTIDAD = r.CEDULA_IDENTIDAD
        AND s.CORREO           = r.CORREO
    WHERE r.FECHA_A_RESERVAR BETWEEN p_desde AND p_hasta
    GROUP BY r.CEDULA_IDENTIDAD, s.NOMBRE, s.APELLIDO
    ORDER BY CANTIDAD_RESERVAS DESC;
END;

/*--------------------------------------------------------------*/
/* 2.4 Cancelaciones e inasistencias                              */
/*     Filtra por letra ('C','A','D'). Muestra 'D' como fila      */
/*     propia ("Desplazada") para separarla de las canceladas     */
/*     por el usuario. Devuelve nombre legible para el frontend.  */
/*--------------------------------------------------------------*/
CREATE PROCEDURE "DBA"."sp_reporte_cancelaciones_inasistencias"(
    IN p_desde DATE,
    IN p_hasta DATE )
RESULT (ESTADO_RESERVA CHAR(1), ESTADO_NOMBRE VARCHAR(20), CANTIDAD INT)
BEGIN
    DECLARE v_val INT;
    SET v_val = DBA.fn_validar_rango_fechas(p_desde, p_hasta);
    IF v_val = 1 THEN
        RAISERROR 99999 'Debe indicar fecha desde y fecha hasta.';
        RETURN;
    END IF;
    IF v_val = 2 THEN
        RAISERROR 99999 'La fecha desde no puede ser posterior a la fecha hasta.';
        RETURN;
    END IF;

    SELECT er.ESTADO_RESERVA,
           CASE er.ESTADO_RESERVA
               WHEN 'C' THEN 'Cancelada'
               WHEN 'A' THEN 'Ausente'
               WHEN 'D' THEN 'Desplazada'
               ELSE er.ESTADO_RESERVA
           END AS ESTADO_NOMBRE,
           COUNT(*) AS CANTIDAD
    FROM "DBA"."RESERVAS" r
    JOIN "DBA"."ESTADO_RESERVA" er ON er.ID_ESTADO_RESERVA = r.ID_ESTADO_RESERVA
    WHERE r.FECHA_A_RESERVAR BETWEEN p_desde AND p_hasta
      AND er.ESTADO_RESERVA IN ('C','A','D')
    GROUP BY er.ESTADO_RESERVA
    ORDER BY er.ESTADO_RESERVA;
END;

/*--------------------------------------------------------------*/
/* 2.5 Porcentaje de utilizacion de recursos                      */
/*     Solo cuenta recursos de reservas efectivamente utilizables */
/*     (excluye Cancelada / Ausente / Desplazada). Si la reserva  */
/*     no ocurrio, el recurso asociado no se uso realmente.       */
/*                                                              */
/*     "Porcentaje" = (usos del recurso) * 100 / (total de usos  */
/*     de recursos en el rango, mismo filtro de estado).          */
/*     El filtro C/A/D debe ser IDENTICO en numerador y           */
/*     denominador o el porcentaje queda descuadrado.             */
/*--------------------------------------------------------------*/
CREATE PROCEDURE "DBA"."sp_reporte_porcentaje_recursos"(
    IN p_desde DATE,
    IN p_hasta DATE )
RESULT (NOMBRE VARCHAR(80), VECES_USADO INT, PORCENTAJE NUMERIC(5,2))
BEGIN
    DECLARE v_val INT;
    SET v_val = DBA.fn_validar_rango_fechas(p_desde, p_hasta);
    IF v_val = 1 THEN
        RAISERROR 99999 'Debe indicar fecha desde y fecha hasta.';
        RETURN;
    END IF;
    IF v_val = 2 THEN
        RAISERROR 99999 'La fecha desde no puede ser posterior a la fecha hasta.';
        RETURN;
    END IF;

    SELECT rec.NOMBRE,
           COUNT(*) AS VECES_USADO,
           CAST(COUNT(*) * 100.0 / NULLIF((
               SELECT COUNT(*)
               FROM "DBA"."RESERVAS_RECURSOS" rr2
               JOIN "DBA"."RESERVAS" r2         ON r2.ID_RESERVA = rr2.ID_RESERVA
               JOIN "DBA"."ESTADO_RESERVA" er2  ON er2.ID_ESTADO_RESERVA = r2.ID_ESTADO_RESERVA
               WHERE r2.FECHA_A_RESERVAR BETWEEN p_desde AND p_hasta
                 AND er2.ESTADO_RESERVA NOT IN ('C','A','D')
           ), 0) AS NUMERIC(5,2)) AS PORCENTAJE
    FROM "DBA"."RESERVAS_RECURSOS" rr
    JOIN "DBA"."RESERVAS" r          ON r.ID_RESERVA = rr.ID_RESERVA
    JOIN "DBA"."RECURSOS" rec        ON rec.ID_RECURSO = rr.ID_RECURSO
    JOIN "DBA"."ESTADO_RESERVA" er   ON er.ID_ESTADO_RESERVA = r.ID_ESTADO_RESERVA
    WHERE r.FECHA_A_RESERVAR BETWEEN p_desde AND p_hasta
      AND er.ESTADO_RESERVA NOT IN ('C','A','D')
    GROUP BY rec.NOMBRE
    ORDER BY VECES_USADO DESC;
END;


CREATE PROCEDURE "DBA"."sp_reporte_auditoria"(
    IN p_fecha_desde   DATE          DEFAULT NULL,
    IN p_fecha_hasta   DATE          DEFAULT NULL,
    IN p_grupo         VARCHAR(50)   DEFAULT NULL,
    IN p_usuario       VARCHAR(128)  DEFAULT NULL,
    IN p_id_referencia INT           DEFAULT NULL,
    IN p_offset        INT           DEFAULT 0,
    IN p_limit         INT           DEFAULT 20 )
BEGIN
    DECLARE v_grupo    VARCHAR(50);
    DECLARE v_usuario  VARCHAR(128);
    DECLARE v_start_at INT;

    -- Normalizar strings vacios (y 'Todos') a NULL
    SET v_grupo   = CASE
                       WHEN p_grupo IS NULL             THEN NULL
                       WHEN TRIM(p_grupo) = ''          THEN NULL
                       WHEN TRIM(p_grupo) = 'Todos'     THEN NULL
                       ELSE TRIM(p_grupo)
                    END;

    SET v_usuario = CASE
                       WHEN p_usuario IS NULL           THEN NULL
                       WHEN TRIM(p_usuario) = ''        THEN NULL
                       ELSE TRIM(p_usuario)
                    END;

    -- Validaciones
    IF p_offset IS NULL OR p_offset < 0 THEN
        RAISERROR 99201 'El offset no puede ser negativo.';
        RETURN;
    END IF;

    IF p_limit IS NULL OR p_limit <= 0 OR p_limit > 100 THEN
        RAISERROR 99202 'El limite debe ser un entero entre 1 y 100.';
        RETURN;
    END IF;

    IF p_fecha_desde IS NOT NULL
       AND p_fecha_hasta IS NOT NULL
       AND p_fecha_desde > p_fecha_hasta THEN
        RAISERROR 99203 'La fecha desde no puede ser mayor que la fecha hasta.';
        RETURN;
    END IF;

    IF v_grupo IS NOT NULL
       AND v_grupo NOT IN ('Reservas','Laboratorios','Mantenimientos') THEN
        RAISERROR 99204 'Grupo invalido. Valores permitidos: Reservas, Laboratorios, Mantenimientos, Todos.';
        RETURN;
    END IF;

    SET v_start_at = p_offset + 1;

    -- --------------------------------------------------------------
    -- Result set unico: pagina + total (como columna extra por fila)
    --
    -- COUNT(*) OVER () se computa DESPUES del WHERE y ANTES de TOP,
    -- por lo que da el conteo filtrado sin paginar.
    -- --------------------------------------------------------------
    SELECT TOP p_limit START AT v_start_at
           ID_AUDITORIA,
           FECHA_HORA,
           USUARIO,
           TIPO_EVENTO,
           ID_REFERENCIA,
           DESCRIPCION,
           COUNT(*) OVER () AS TOTAL
    FROM "DBA"."AUDITORIA"
    WHERE (p_fecha_desde   IS NULL OR FECHA_HORA >= p_fecha_desde)
      AND (p_fecha_hasta   IS NULL OR FECHA_HORA <  DATEADD(day, 1, p_fecha_hasta))
      AND (v_grupo         IS NULL
           OR (v_grupo = 'Reservas'       AND TIPO_EVENTO LIKE 'RESERVA%')
           OR (v_grupo = 'Laboratorios'   AND TIPO_EVENTO LIKE 'LABORATORIO%')
           OR (v_grupo = 'Mantenimientos' AND TIPO_EVENTO LIKE 'MANTENIMIENTO%'))
      AND (v_usuario       IS NULL OR USUARIO LIKE '%' || v_usuario || '%')
      AND (p_id_referencia IS NULL OR ID_REFERENCIA = p_id_referencia)
    ORDER BY FECHA_HORA DESC, ID_AUDITORIA DESC;
END
/*==============================================================*/
/* 3. GRANTS                                                     */
/*==============================================================*/
GRANT EXECUTE ON DBA.fn_validar_rango_fechas               TO PUBLIC;
GRANT EXECUTE ON DBA.sp_reporte_laboratorios_mas_utilizados TO PUBLIC;
GRANT EXECUTE ON DBA.sp_reporte_horarios_mas_ocupados       TO PUBLIC;
GRANT EXECUTE ON DBA.sp_reporte_solicitantes_top            TO PUBLIC;
GRANT EXECUTE ON DBA.sp_reporte_cancelaciones_inasistencias TO PUBLIC;
GRANT EXECUTE ON DBA.sp_reporte_porcentaje_recursos         TO PUBLIC;
GRANT EXECUTE ON DBA.sp_reporte_auditoria                   TO PUBLIC;

COMMIT;

/*==============================================================*/
/* 4. Pruebas rapidas de humo (comentadas)                       */
/*==============================================================*/
-- CALL DBA.sp_reporte_laboratorios_mas_utilizados('2026-01-01','2026-12-31');
-- CALL DBA.sp_reporte_horarios_mas_ocupados      ('2026-01-01','2026-12-31');
-- CALL DBA.sp_reporte_solicitantes_top           ('2026-01-01','2026-12-31');
-- CALL DBA.sp_reporte_cancelaciones_inasistencias('2026-01-01','2026-12-31');
-- CALL DBA.sp_reporte_porcentaje_recursos        ('2026-01-01','2026-12-31');

-- Pruebas de validacion (deben tirar RAISERROR):
-- CALL DBA.sp_reporte_laboratorios_mas_utilizados(NULL, '2026-12-31');
-- CALL DBA.sp_reporte_laboratorios_mas_utilizados('2026-12-31','2026-01-01');