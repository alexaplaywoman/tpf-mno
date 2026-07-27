/*==============================================================*/
/* Stored procedures para los 5 reportes por rango de fechas.   */
/* v2 - refactor sobre la propuesta original.                    */
/*                                                              */
/* Cambios respecto a v1:                                        */
/*   - Filtrado de estado por LETRA ('C','A','U'), no por ID.    */
/*     Consistente con el resto del sistema (sp_crear_reserva,   */
/*     fn_existe_solapamiento_reservas).                         */
/*   - Reportes 1, 2 y 5 excluyen reservas Canceladas/Ausentes:  */
/*     "utilizacion" no incluye reservas que nunca ocurrieron.   */
/*   - Reporte 4 devuelve nombre legible ('Cancelada'/'Ausente') */
/*     ademas de la letra, para no obligar al frontend a mapear. */
/*   - Validacion de rango de fechas en cada SP + RAISERROR      */
/*     coherente. Cubre "manejo de errores".  */
/*   - fn_validar_rango_fechas reutilizable entre los 5 SPs      */
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
/*     Excluye Canceladas y Ausentes: no son "utilizacion" real.  */
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
      AND er.ESTADO_RESERVA NOT IN ('C','A')
    GROUP BY r.NUMERO_LABORATORIO, l.EDIFICIO
    ORDER BY CANTIDAD_RESERVAS DESC;
END;

/*--------------------------------------------------------------*/
/* 2.2 Horarios de mayor ocupacion                                */
/*     Excluye Canceladas y Ausentes.                             */
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
      AND er.ESTADO_RESERVA NOT IN ('C','A')
    GROUP BY r.HORA_INICIO
    ORDER BY CANTIDAD_RESERVAS DESC;
END;

/*--------------------------------------------------------------*/
/* 2.3 Solicitantes con mas reservas                              */
/*     NO filtra por estado: mide "quien reserva mas", no         */
/*     "quien usa mas". Una cancelacion sigue siendo una reserva  */
/*     realizada (util para detectar solicitantes con muchos      */
/*     cambios o cancelaciones tambien).                          */
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
/*     Filtra por letra ('C','A'). Devuelve tambien el nombre     */
/*     legible para que el frontend no tenga que mapear.          */
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
               ELSE er.ESTADO_RESERVA
           END AS ESTADO_NOMBRE,
           COUNT(*) AS CANTIDAD
    FROM "DBA"."RESERVAS" r
    JOIN "DBA"."ESTADO_RESERVA" er ON er.ID_ESTADO_RESERVA = r.ID_ESTADO_RESERVA
    WHERE r.FECHA_A_RESERVAR BETWEEN p_desde AND p_hasta
      AND er.ESTADO_RESERVA IN ('C','A')
    GROUP BY er.ESTADO_RESERVA
    ORDER BY er.ESTADO_RESERVA;
END;

/*--------------------------------------------------------------*/
/* 2.5 Porcentaje de utilizacion de recursos                      */
/*     Solo cuenta recursos de reservas efectivamente utilizables */
/*     (excluye Cancelada/Ausente). Si una reserva fue cancelada, */
/*     el recurso asociado no se uso realmente.                   */
/*                                                              */
/*     "Porcentaje" = (usos del recurso) * 100 / (total de usos  */
/*     de recursos en el rango, excluyendo reservas canceladas). */
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
                 AND er2.ESTADO_RESERVA NOT IN ('C','A')
           ), 0) AS NUMERIC(5,2)) AS PORCENTAJE
    FROM "DBA"."RESERVAS_RECURSOS" rr
    JOIN "DBA"."RESERVAS" r          ON r.ID_RESERVA = rr.ID_RESERVA
    JOIN "DBA"."RECURSOS" rec        ON rec.ID_RECURSO = rr.ID_RECURSO
    JOIN "DBA"."ESTADO_RESERVA" er   ON er.ID_ESTADO_RESERVA = r.ID_ESTADO_RESERVA
    WHERE r.FECHA_A_RESERVAR BETWEEN p_desde AND p_hasta
      AND er.ESTADO_RESERVA NOT IN ('C','A')
    GROUP BY rec.NOMBRE
    ORDER BY VECES_USADO DESC;
END;

/*==============================================================*/
/* 3. GRANTS                                                     */
/*==============================================================*/
GRANT EXECUTE ON DBA.fn_validar_rango_fechas               TO PUBLIC;
GRANT EXECUTE ON DBA.sp_reporte_laboratorios_mas_utilizados TO PUBLIC;
GRANT EXECUTE ON DBA.sp_reporte_horarios_mas_ocupados       TO PUBLIC;
GRANT EXECUTE ON DBA.sp_reporte_solicitantes_top            TO PUBLIC;
GRANT EXECUTE ON DBA.sp_reporte_cancelaciones_inasistencias TO PUBLIC;
GRANT EXECUTE ON DBA.sp_reporte_porcentaje_recursos         TO PUBLIC;

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