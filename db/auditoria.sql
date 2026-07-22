/*==============================================================*/
/*  AUDITORIA / TRAZABILIDAD HISTORICA                           */
/*  Log de eventos de negocio sobre RESERVAS, LABORATORIOS y     */
/*  MANTENIMIENTOS. Un renglon por evento, con descripcion       */
/*  humana legible. Cero cambios en los SPs existentes: los      */
/*  triggers AFTER observan los UPDATEs que ellos hacen.         */
/*==============================================================*/


/*==============================================================*/
/* PASO 0. Limpieza para re-ejecutar el script                   */
/*==============================================================*/
ROLLBACK;

if exists(select 1 from sys.systrigger where trigger_name='tr_aud_mantenimientos_update') then
    drop trigger tr_aud_mantenimientos_update
end if;

if exists(select 1 from sys.systrigger where trigger_name='tr_aud_mantenimientos_insert') then
    drop trigger tr_aud_mantenimientos_insert
end if;

if exists(select 1 from sys.systrigger where trigger_name='tr_aud_laboratorios_update') then
    drop trigger tr_aud_laboratorios_update
end if;

if exists(select 1 from sys.systrigger where trigger_name='tr_aud_reservas_update') then
    drop trigger tr_aud_reservas_update
end if;

if exists(select 1 from sys.systrigger where trigger_name='tr_aud_reservas_insert') then
    drop trigger tr_aud_reservas_insert
end if;

if exists(
   select 1 from sys.systable
   where table_name='AUDITORIA'
     and table_type in ('BASE','GBL TEMP')
     and creator=user_id('DBA')
) then
    drop table DBA.AUDITORIA
end if;

COMMIT;


/*==============================================================*/
/* PASO 1. Tabla AUDITORIA                                       */
/*                                                                */
/*  ID_AUDITORIA   PK autoincrement                              */
/*  FECHA_HORA     timestamp del evento                          */
/*  USUARIO        usuario de BD que dispar  el evento           */
/*  TIPO_EVENTO    codigo del evento (para filtrar en reportes)  */
/*  ID_REFERENCIA  ID de la entidad afectada                     */
/*  DESCRIPCION    mensaje humano legible                        */
/*==============================================================*/
CREATE TABLE DBA.AUDITORIA
(
    ID_AUDITORIA    D_CLAVE       NOT NULL DEFAULT AUTOINCREMENT,
    FECHA_HORA      TIMESTAMP     NOT NULL DEFAULT CURRENT TIMESTAMP,
    USUARIO         VARCHAR(128)  NOT NULL DEFAULT CURRENT USER,
    TIPO_EVENTO     VARCHAR(50)   NOT NULL,
    ID_REFERENCIA   INT           NULL,
    DESCRIPCION     VARCHAR(500)  NOT NULL,
    CONSTRAINT PK_AUDITORIA PRIMARY KEY CLUSTERED (ID_AUDITORIA)
);

-- Indice para consultas por entidad (ej: historial de la reserva 27)
CREATE INDEX IDX_AUDITORIA_ENTIDAD ON DBA.AUDITORIA (TIPO_EVENTO, ID_REFERENCIA);

-- Indice para consultas por fecha (ej: eventos del ultimo mes)
CREATE INDEX IDX_AUDITORIA_FECHA ON DBA.AUDITORIA (FECHA_HORA);

COMMIT;


/*==============================================================*/
/* PASO 2. Trigger AFTER INSERT sobre RESERVAS                   */
/*  Audita la creacion de una reserva.                           */
/*  Se dispara tanto si viene por sp_crear_reserva como si       */
/*  alguien inserta directamente en la tabla.                    */
/*==============================================================*/
CREATE TRIGGER "tr_aud_reservas_insert" AFTER INSERT
ORDER 5 ON "DBA"."RESERVAS"
REFERENCING NEW AS new_row
FOR EACH ROW
BEGIN
    DECLARE v_desc VARCHAR(500);

    SET v_desc = 'Reserva creada. Lab=' || new_row.NUMERO_LABORATORIO
              || ', solicitante=' || new_row.CEDULA_IDENTIDAD
              || ', fecha=' || DATEFORMAT(new_row.FECHA_A_RESERVAR, 'YYYY-MM-DD')
              || ' (' || DATEFORMAT(new_row.HORA_INICIO, 'HH:NN')
              || '-'  || DATEFORMAT(new_row.HORA_FIN,    'HH:NN') || ')'
              || ', alumnos=' || new_row.CANTIDAD_ALUMNOS;

    INSERT INTO "DBA"."AUDITORIA" (TIPO_EVENTO, ID_REFERENCIA, DESCRIPCION)
    VALUES ('RESERVA_CREADA', new_row.ID_RESERVA, v_desc);
END;


/*==============================================================*/
/* PASO 3. Trigger AFTER UPDATE sobre RESERVAS                   */
/*  Audita dos tipos de eventos:                                  */
/*   1) Cambio de estado (pendiente/utilizada/cancelada/ausente) */
/*      Si es cancelacion, incluye el motivo.                    */
/*   2) Reprogramacion (cambio de fecha, hora o laboratorio).    */
/*                                                                */
/*  Si en un mismo UPDATE cambian ambos, se generan dos          */
/*  renglones (uno por evento). Si no cambia ninguno de los      */
/*  campos observados, no se loguea nada (early return por       */
/*  ausencia de INSERT).                                         */
/*==============================================================*/
CREATE TRIGGER "tr_aud_reservas_update" AFTER UPDATE
ORDER 5 ON "DBA"."RESERVAS"
REFERENCING OLD AS old_row NEW AS new_row
FOR EACH ROW
BEGIN
    DECLARE v_estado_old CHAR(1);
    DECLARE v_estado_new CHAR(1);
    DECLARE v_nombre_old VARCHAR(20);
    DECLARE v_nombre_new VARCHAR(20);
    DECLARE v_desc       VARCHAR(500);

    -- ============================================================
    -- Evento 1: cambio de estado
    -- ============================================================
    IF old_row.ID_ESTADO_RESERVA <> new_row.ID_ESTADO_RESERVA THEN
        SELECT ESTADO_RESERVA INTO v_estado_old
        FROM "DBA"."ESTADO_RESERVA"
        WHERE ID_ESTADO_RESERVA = old_row.ID_ESTADO_RESERVA;

        SELECT ESTADO_RESERVA INTO v_estado_new
        FROM "DBA"."ESTADO_RESERVA"
        WHERE ID_ESTADO_RESERVA = new_row.ID_ESTADO_RESERVA;

        -- Traducimos la letra a nombre completo para el mensaje
        SET v_nombre_old =
            CASE v_estado_old
                WHEN 'P' THEN 'Pendiente'
                WHEN 'U' THEN 'Utilizada'
                WHEN 'C' THEN 'Cancelada'
                WHEN 'A' THEN 'Ausente'
                ELSE v_estado_old
            END;

        SET v_nombre_new =
            CASE v_estado_new
                WHEN 'P' THEN 'Pendiente'
                WHEN 'U' THEN 'Utilizada'
                WHEN 'C' THEN 'Cancelada'
                WHEN 'A' THEN 'Ausente'
                ELSE v_estado_new
            END;

        SET v_desc = 'Reserva #' || new_row.ID_RESERVA
                  || ' cambio de estado: ' || v_nombre_old || ' -> ' || v_nombre_new;

        -- Si paso a Cancelada, agregamos el motivo (obligatorio por trigger)
        IF v_estado_new = 'C' AND new_row.MOTIVO_CANCELACION IS NOT NULL THEN
            SET v_desc = v_desc || '. Motivo: ' || new_row.MOTIVO_CANCELACION;
        END IF;

        INSERT INTO "DBA"."AUDITORIA" (TIPO_EVENTO, ID_REFERENCIA, DESCRIPCION)
        VALUES ('RESERVA_ESTADO', new_row.ID_RESERVA, v_desc);
    END IF;

    -- ============================================================
    -- Evento 2: reprogramacion (fecha, hora o laboratorio)
    -- ============================================================
    IF old_row.FECHA_A_RESERVAR    <> new_row.FECHA_A_RESERVAR
       OR old_row.HORA_INICIO       <> new_row.HORA_INICIO
       OR old_row.HORA_FIN          <> new_row.HORA_FIN
       OR old_row.NUMERO_LABORATORIO <> new_row.NUMERO_LABORATORIO THEN

        SET v_desc = 'Reserva #' || new_row.ID_RESERVA || ' reprogramada. ';

        IF old_row.NUMERO_LABORATORIO <> new_row.NUMERO_LABORATORIO THEN
            SET v_desc = v_desc || 'Lab: ' || old_row.NUMERO_LABORATORIO
                                || ' -> '  || new_row.NUMERO_LABORATORIO || '. ';
        END IF;

        IF old_row.FECHA_A_RESERVAR <> new_row.FECHA_A_RESERVAR THEN
            SET v_desc = v_desc || 'Fecha: '
                                || DATEFORMAT(old_row.FECHA_A_RESERVAR, 'YYYY-MM-DD')
                                || ' -> '
                                || DATEFORMAT(new_row.FECHA_A_RESERVAR, 'YYYY-MM-DD') || '. ';
        END IF;

        IF old_row.HORA_INICIO <> new_row.HORA_INICIO
           OR old_row.HORA_FIN <> new_row.HORA_FIN THEN
            SET v_desc = v_desc || 'Horario: '
                                || DATEFORMAT(old_row.HORA_INICIO, 'HH:NN')
                                || '-' || DATEFORMAT(old_row.HORA_FIN, 'HH:NN')
                                || ' -> '
                                || DATEFORMAT(new_row.HORA_INICIO, 'HH:NN')
                                || '-' || DATEFORMAT(new_row.HORA_FIN, 'HH:NN') || '.';
        END IF;

        INSERT INTO "DBA"."AUDITORIA" (TIPO_EVENTO, ID_REFERENCIA, DESCRIPCION)
        VALUES ('RESERVA_REPROGRAMADA', new_row.ID_RESERVA, v_desc);
    END IF;
END;


/*==============================================================*/
/* PASO 4. Trigger AFTER UPDATE sobre LABORATORIOS               */
/*  Audita cambio de estado operativo del laboratorio.           */
/*  Complementa la restriccion admin-only (tr_validar_cambio_    */
/*  estado_lab): quedan registrados quien y cuando lo cambio.    */
/*==============================================================*/
CREATE TRIGGER "tr_aud_laboratorios_update" AFTER UPDATE
ORDER 5 ON "DBA"."LABORATORIOS"
REFERENCING OLD AS old_row NEW AS new_row
FOR EACH ROW
BEGIN
    DECLARE v_tipo_old       CHAR(1);
    DECLARE v_tipo_new       CHAR(1);
    DECLARE v_nombre_old     VARCHAR(30);
    DECLARE v_nombre_new     VARCHAR(30);
    DECLARE v_desc           VARCHAR(500);

    -- Early return: solo interesa el cambio de estado operativo
    IF old_row.ESTADO = new_row.ESTADO THEN
        RETURN;
    END IF;

    SELECT TIPO INTO v_tipo_old
    FROM "DBA"."ESTADOS_OPERATIVOS"
    WHERE ESTADO = old_row.ESTADO;

    SELECT TIPO INTO v_tipo_new
    FROM "DBA"."ESTADOS_OPERATIVOS"
    WHERE ESTADO = new_row.ESTADO;

    SET v_nombre_old =
        CASE v_tipo_old
            WHEN 'D' THEN 'Disponible'
            WHEN 'R' THEN 'Reservado'
            WHEN 'M' THEN 'Mantenimiento'
            WHEN 'F' THEN 'Fuera de servicio'
            WHEN 'B' THEN 'Bloqueado'
            ELSE v_tipo_old
        END;

    SET v_nombre_new =
        CASE v_tipo_new
            WHEN 'D' THEN 'Disponible'
            WHEN 'R' THEN 'Reservado'
            WHEN 'M' THEN 'Mantenimiento'
            WHEN 'F' THEN 'Fuera de servicio'
            WHEN 'B' THEN 'Bloqueado'
            ELSE v_tipo_new
        END;

    SET v_desc = 'Laboratorio ' || new_row.NUMERO_LABORATORIO
              || ' cambio de estado: ' || v_nombre_old || ' -> ' || v_nombre_new;

    INSERT INTO "DBA"."AUDITORIA" (TIPO_EVENTO, ID_REFERENCIA, DESCRIPCION)
    VALUES ('LABORATORIO_ESTADO', new_row.NUMERO_LABORATORIO, v_desc);
END;


/*==============================================================*/
/* PASO 5. Trigger AFTER INSERT sobre MANTENIMIENTOS             */
/*  Audita la programacion de un mantenimiento.                  */
/*==============================================================*/
CREATE TRIGGER "tr_aud_mantenimientos_insert" AFTER INSERT
ORDER 1 ON "DBA"."MANTENIMIENTOS"
REFERENCING NEW AS new_row
FOR EACH ROW
BEGIN
    DECLARE v_desc VARCHAR(500);

    SET v_desc = 'Mantenimiento programado en laboratorio ' || new_row.NUMERO_LABORATORIO
              || ', del ' || DATEFORMAT(new_row.FECHA_INICIO,       'YYYY-MM-DD')
              || ' al '   || DATEFORMAT(new_row.FECHA_FIN_PREVISTA, 'YYYY-MM-DD')
              || '. Observaciones: ' || new_row.OBSERVACIONES;

    INSERT INTO "DBA"."AUDITORIA" (TIPO_EVENTO, ID_REFERENCIA, DESCRIPCION)
    VALUES ('MANTENIMIENTO_CREADO', new_row.ID_MANTENIMIENTO, v_desc);
END;


/*==============================================================*/
/* PASO 6. Trigger AFTER UPDATE sobre MANTENIMIENTOS             */
/*  Audita cambio de estado (P/R/E/C) y cambio de rango de       */
/*  fechas del mantenimiento.                                     */
/*==============================================================*/
CREATE TRIGGER "tr_aud_mantenimientos_update" AFTER UPDATE
ORDER 1 ON "DBA"."MANTENIMIENTOS"
REFERENCING OLD AS old_row NEW AS new_row
FOR EACH ROW
BEGIN
    DECLARE v_estado_old CHAR(1);
    DECLARE v_estado_new CHAR(1);
    DECLARE v_nombre_old VARCHAR(20);
    DECLARE v_nombre_new VARCHAR(20);
    DECLARE v_desc       VARCHAR(500);

    -- ============================================================
    -- Evento 1: cambio de estado
    -- ============================================================
    IF old_row.ID_ESTADO_MANTENIMIENTO <> new_row.ID_ESTADO_MANTENIMIENTO THEN
        SELECT ESTADO_MANTENIMIENTO INTO v_estado_old
        FROM "DBA"."ESTADOS_MANTENIMIENTOS"
        WHERE ID_ESTADO_MANTENIMIENTO = old_row.ID_ESTADO_MANTENIMIENTO;

        SELECT ESTADO_MANTENIMIENTO INTO v_estado_new
        FROM "DBA"."ESTADOS_MANTENIMIENTOS"
        WHERE ID_ESTADO_MANTENIMIENTO = new_row.ID_ESTADO_MANTENIMIENTO;

        SET v_nombre_old =
            CASE v_estado_old
                WHEN 'P' THEN 'Pendiente'
                WHEN 'E' THEN 'En proceso'
                WHEN 'R' THEN 'Realizado'
                WHEN 'C' THEN 'Cancelado'
                ELSE v_estado_old
            END;

        SET v_nombre_new =
            CASE v_estado_new
                WHEN 'P' THEN 'Pendiente'
                WHEN 'E' THEN 'En proceso'
                WHEN 'R' THEN 'Realizado'
                WHEN 'C' THEN 'Cancelado'
                ELSE v_estado_new
            END;

        SET v_desc = 'Mantenimiento #' || new_row.ID_MANTENIMIENTO
                  || ' (lab ' || new_row.NUMERO_LABORATORIO || ')'
                  || ' cambio de estado: ' || v_nombre_old || ' -> ' || v_nombre_new;

        INSERT INTO "DBA"."AUDITORIA" (TIPO_EVENTO, ID_REFERENCIA, DESCRIPCION)
        VALUES ('MANTENIMIENTO_ESTADO', new_row.ID_MANTENIMIENTO, v_desc);
    END IF;

    -- ============================================================
    -- Evento 2: cambio en el rango de fechas
    -- ============================================================
    IF old_row.FECHA_INICIO       <> new_row.FECHA_INICIO
       OR old_row.FECHA_FIN_PREVISTA <> new_row.FECHA_FIN_PREVISTA THEN

        SET v_desc = 'Mantenimiento #' || new_row.ID_MANTENIMIENTO
                  || ' reprogramado. '
                  || 'Rango: '
                  || DATEFORMAT(old_row.FECHA_INICIO,       'YYYY-MM-DD') || ' a '
                  || DATEFORMAT(old_row.FECHA_FIN_PREVISTA, 'YYYY-MM-DD')
                  || ' -> '
                  || DATEFORMAT(new_row.FECHA_INICIO,       'YYYY-MM-DD') || ' a '
                  || DATEFORMAT(new_row.FECHA_FIN_PREVISTA, 'YYYY-MM-DD');

        INSERT INTO "DBA"."AUDITORIA" (TIPO_EVENTO, ID_REFERENCIA, DESCRIPCION)
        VALUES ('MANTENIMIENTO_REPROGRAMADO', new_row.ID_MANTENIMIENTO, v_desc);
    END IF;
END;

COMMIT;


/*==============================================================*/
/* PASO 7. GRANTs                                                */
/*  - INSERT a PUBLIC: cualquier usuario que dispare un trigger  */
/*    debe poder escribir su evento con su propio CURRENT USER.  */
/*  - SELECT solo a ADMINISTRADORES: la auditoria es sensible.   */
/*  - UPDATE y DELETE NO se otorgan a nadie (ni siquiera DBA en  */
/*    la practica): el log es apend-only por diseno.             */
/*==============================================================*/
GRANT INSERT ON DBA.AUDITORIA TO PUBLIC;
GRANT SELECT ON DBA.AUDITORIA TO ADMINISTRADORES;
GRANT MEMBERSHIP IN GROUP ADMINISTRADORES TO DBA;
GRANT EXECUTE ON DBA.sp_reporte_auditoria TO ADMINISTRADORES;

COMMIT;


/*==============================================================*/
/* PASO 8. Consultas de verificacion                             */
/*  Ejecutar despues de generar actividad de prueba.             */
/*==============================================================*/

-- Todos los eventos, mas recientes primero
-- SELECT * FROM DBA.AUDITORIA ORDER BY FECHA_HORA DESC;

-- Historia completa de una reserva especifica
-- SELECT FECHA_HORA, USUARIO, TIPO_EVENTO, DESCRIPCION
-- FROM DBA.AUDITORIA
-- WHERE TIPO_EVENTO LIKE 'RESERVA%' AND ID_REFERENCIA = 1
-- ORDER BY FECHA_HORA;

-- Todas las cancelaciones registradas
-- SELECT FECHA_HORA, USUARIO, DESCRIPCION
-- FROM DBA.AUDITORIA
-- WHERE TIPO_EVENTO = 'RESERVA_ESTADO'
--   AND DESCRIPCION LIKE '%Cancelada%'
-- ORDER BY FECHA_HORA DESC;

-- Historia de cambios de estado de un laboratorio
-- SELECT FECHA_HORA, USUARIO, DESCRIPCION
-- FROM DBA.AUDITORIA
-- WHERE TIPO_EVENTO = 'LABORATORIO_ESTADO' AND ID_REFERENCIA = 1
-- ORDER BY FECHA_HORA;

-- Actividad por usuario
-- SELECT USUARIO, TIPO_EVENTO, COUNT(*) AS CANTIDAD
-- FROM DBA.AUDITORIA
-- GROUP BY USUARIO, TIPO_EVENTO
-- ORDER BY USUARIO, TIPO_EVENTO;