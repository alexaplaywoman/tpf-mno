/*==============================================================*/
/* Stored procedures para los 5 reportes por rango de fechas.   */
/* PROPUESTA para sumar a objetos_bd.sql - no se aplico ahi     */
/* directo, para que lo revise quien maneja el diseno de la     */
/* base antes de integrarlo al script oficial.                  */
/*                                                              */
/* Reemplazan el SELECT/GROUP BY que hoy esta armado a mano en  */
/* Backend/Routes/reportes.js: el backend pasa a solo hacer      */
/* CALL DBA.sp_reporte_x(desde, hasta), igual que ya hace con    */
/* sp_crear_reserva para las reservas.                          */
/*==============================================================*/

/*--------------------------------------------------------------*/
/* 1. Laboratorios mas utilizados                                */
/*--------------------------------------------------------------*/
if exists(select 1 from sys.sysprocedure where proc_name='sp_reporte_laboratorios_mas_utilizados') then
    drop procedure sp_reporte_laboratorios_mas_utilizados
end if;

CREATE PROCEDURE "DBA"."sp_reporte_laboratorios_mas_utilizados"(
    IN p_desde DATE,
    IN p_hasta DATE )
RESULT (NUMERO_LABORATORIO INT, EDIFICIO VARCHAR(100), CANTIDAD_RESERVAS INT)
BEGIN
    SELECT r.NUMERO_LABORATORIO, l.EDIFICIO, COUNT(*) AS CANTIDAD_RESERVAS
    FROM "DBA"."RESERVAS" r
    JOIN "DBA"."LABORATORIOS" l ON r.NUMERO_LABORATORIO = l.NUMERO_LABORATORIO
    WHERE r.FECHA_A_RESERVAR BETWEEN p_desde AND p_hasta
    GROUP BY r.NUMERO_LABORATORIO, l.EDIFICIO
    ORDER BY CANTIDAD_RESERVAS DESC;
END;

/*--------------------------------------------------------------*/
/* 2. Horarios de mayor ocupacion                                */
/*--------------------------------------------------------------*/
if exists(select 1 from sys.sysprocedure where proc_name='sp_reporte_horarios_mas_ocupados') then
    drop procedure sp_reporte_horarios_mas_ocupados
end if;

CREATE PROCEDURE "DBA"."sp_reporte_horarios_mas_ocupados"(
    IN p_desde DATE,
    IN p_hasta DATE )
RESULT (HORA_INICIO TIME, CANTIDAD_RESERVAS INT)
BEGIN
    SELECT HORA_INICIO, COUNT(*) AS CANTIDAD_RESERVAS
    FROM "DBA"."RESERVAS"
    WHERE FECHA_A_RESERVAR BETWEEN p_desde AND p_hasta
    GROUP BY HORA_INICIO
    ORDER BY CANTIDAD_RESERVAS DESC;
END;

/*--------------------------------------------------------------*/
/* 3. Solicitantes con mas reservas                               */
/*--------------------------------------------------------------*/
if exists(select 1 from sys.sysprocedure where proc_name='sp_reporte_solicitantes_top') then
    drop procedure sp_reporte_solicitantes_top
end if;

CREATE PROCEDURE "DBA"."sp_reporte_solicitantes_top"(
    IN p_desde DATE,
    IN p_hasta DATE )
RESULT (CEDULA_IDENTIDAD INT, NOMBRE VARCHAR(100), APELLIDO VARCHAR(100), CANTIDAD_RESERVAS INT)
BEGIN
    SELECT r.CEDULA_IDENTIDAD, s.NOMBRE, s.APELLIDO, COUNT(*) AS CANTIDAD_RESERVAS
    FROM "DBA"."RESERVAS" r
    JOIN "DBA"."SOLICITANTES" s ON r.CEDULA_IDENTIDAD = s.CEDULA_IDENTIDAD AND r.CORREO = s.CORREO
    WHERE r.FECHA_A_RESERVAR BETWEEN p_desde AND p_hasta
    GROUP BY r.CEDULA_IDENTIDAD, s.NOMBRE, s.APELLIDO
    ORDER BY CANTIDAD_RESERVAS DESC;
END;

/*--------------------------------------------------------------*/
/* 4. Cancelaciones e inasistencias                               */
/*--------------------------------------------------------------*/
if exists(select 1 from sys.sysprocedure where proc_name='sp_reporte_cancelaciones_inasistencias') then
    drop procedure sp_reporte_cancelaciones_inasistencias
end if;

CREATE PROCEDURE "DBA"."sp_reporte_cancelaciones_inasistencias"(
    IN p_desde DATE,
    IN p_hasta DATE )
RESULT (ESTADO_RESERVA CHAR(1), CANTIDAD INT)
BEGIN
    SELECT er.ESTADO_RESERVA, COUNT(*) AS CANTIDAD
    FROM "DBA"."RESERVAS" r
    JOIN "DBA"."ESTADO_RESERVA" er ON r.ID_ESTADO_RESERVA = er.ID_ESTADO_RESERVA
    WHERE r.FECHA_A_RESERVAR BETWEEN p_desde AND p_hasta
      AND r.ID_ESTADO_RESERVA IN (3, 4)
    GROUP BY er.ESTADO_RESERVA;
END;

/*--------------------------------------------------------------*/
/* 5. Porcentaje de utilizacion de recursos                       */
/*    El porcentaje ahora se calcula adentro del SP (antes lo     */
/*    calculaba el backend en JS despues de traer los conteos).   */
/*--------------------------------------------------------------*/
if exists(select 1 from sys.sysprocedure where proc_name='sp_reporte_porcentaje_recursos') then
    drop procedure sp_reporte_porcentaje_recursos
end if;

CREATE PROCEDURE "DBA"."sp_reporte_porcentaje_recursos"(
    IN p_desde DATE,
    IN p_hasta DATE )
RESULT (NOMBRE VARCHAR(100), VECES_USADO INT, PORCENTAJE NUMERIC(5,2))
BEGIN
    SELECT rec.NOMBRE,
           COUNT(*) AS VECES_USADO,
           CAST(COUNT(*) * 100.0 / NULLIF((
               SELECT COUNT(*)
               FROM "DBA"."RESERVAS_RECURSOS" rr2
               JOIN "DBA"."RESERVAS" r2 ON rr2.ID_RESERVA = r2.ID_RESERVA
               WHERE r2.FECHA_A_RESERVAR BETWEEN p_desde AND p_hasta
           ), 0) AS NUMERIC(5,2)) AS PORCENTAJE
    FROM "DBA"."RESERVAS_RECURSOS" rr
    JOIN "DBA"."RESERVAS" r ON rr.ID_RESERVA = r.ID_RESERVA
    JOIN "DBA"."RECURSOS" rec ON rr.ID_RECURSO = rec.ID_RECURSO
    WHERE r.FECHA_A_RESERVAR BETWEEN p_desde AND p_hasta
    GROUP BY rec.NOMBRE
    ORDER BY VECES_USADO DESC;
END;

/*--------------------------------------------------------------*/
/* Permisos: admin ya tiene DBA (todo), pero por las dudas       */
/* dejamos el GRANT explicito para que cualquier usuario que     */
/* llegue a llamar estos reportes (ej. desde un rol de lectura)  */
/* pueda ejecutarlos sin roto de permisos.                       */
/*--------------------------------------------------------------*/
GRANT EXECUTE ON DBA.sp_reporte_laboratorios_mas_utilizados TO PUBLIC;
GRANT EXECUTE ON DBA.sp_reporte_horarios_mas_ocupados TO PUBLIC;
GRANT EXECUTE ON DBA.sp_reporte_solicitantes_top TO PUBLIC;
GRANT EXECUTE ON DBA.sp_reporte_cancelaciones_inasistencias TO PUBLIC;
GRANT EXECUTE ON DBA.sp_reporte_porcentaje_recursos TO PUBLIC;

COMMIT;
