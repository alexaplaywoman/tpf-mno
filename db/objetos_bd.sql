/*==============================================================*/
/* Objetos de lógica de negocio: funciones, procedimientos y    */
/* triggers.                                                     */
/* IMPORTANTE: pegar ESTE bloque al FINAL de bdTpf.sql,          */
/* despues de crear todas las tablas y las foreign keys.        */
/* Orden: 1) funciones  2) procedimientos  3) triggers          */
/*==============================================================*/


/*==============================================================*/
/* 0. Limpieza (para que el script sea re-ejecutable).          */
/*    Se borra en orden inverso a las dependencias:             */
/*    triggers -> procedimientos -> funciones.                  */
/*==============================================================*/
if exists(select 1 from sys.sysevent where event_name='ev_cancelar_reservas_vencidas') then
    drop event ev_cancelar_reservas_vencidas
end if;

if exists(select 1 from sys.sysprocedure where proc_name='sp_cancelar_reservas_vencidas') then
    drop procedure sp_cancelar_reservas_vencidas
end if;

if exists(select 1 from sys.systrigger where trigger_name='tr_validar_cambio_estado_lab') then
    drop trigger tr_validar_cambio_estado_lab
end if;

if exists(select 1 from sys.systrigger where trigger_name='tr_no_eliminar_lab_con_reservas') then
    drop trigger tr_no_eliminar_lab_con_reservas
end if;

if exists(select 1 from sys.sysprocedure where proc_name='sp_crear_reserva') then
    drop procedure sp_crear_reserva
end if;

if exists(select 1 from sys.systrigger where trigger_name='tr_concide_horario_fecha_reserva') then
    drop trigger tr_concide_horario_fecha_reserva
end if;

if exists(select 1 from sys.systrigger where trigger_name='tr_concide_horario_fecha_reserva_ins') then
    drop trigger tr_concide_horario_fecha_reserva_ins
end if;

if exists(select 1 from sys.systrigger where trigger_name='tr_concide_horario_fecha_reserva_upd') then
    drop trigger tr_concide_horario_fecha_reserva_upd
end if;

if exists(select 1 from sys.systrigger where trigger_name='tr_validad_cancelacion_reserva') then
    drop trigger tr_validad_cancelacion_reserva
end if;

if exists(select 1 from sys.systrigger where trigger_name='tr_validar_capacidad_lab') then
    drop trigger tr_validar_capacidad_lab
end if;

if exists(select 1 from sys.systrigger where trigger_name='tr_validar_estados_operativos_lab') then
    drop trigger tr_validar_estados_operativos_lab
end if;

if exists(select 1 from sys.sysprocedure where proc_name='sp_laboratorios_disponibles') then
    drop procedure sp_laboratorios_disponibles
end if;

if exists(select 1 from sys.sysprocedure where proc_name='sp_horarios_disponibles') then
    drop procedure sp_horarios_disponibles
end if;

if exists(select 1 from sys.sysprocedure where proc_name='fn_existe_mantenimiento') then
    drop function fn_existe_mantenimiento
end if;

if exists(select 1 from sys.sysprocedure where proc_name='fn_existe_solapamiento_reservas') then
    drop function fn_existe_solapamiento_reservas
end if;

if exists(select 1 from sys.sysprocedure where proc_name='fn_validar_horarios_mantenimiento') then
    drop function fn_validar_horarios_mantenimiento
end if;

if exists(select 1 from sys.sysprocedure where proc_name='fn_validar_horarios') then
    drop function fn_validar_horarios
end if;

if exists(select 1 from sys.sysprocedure where proc_name='fn_validar_fechas_y_fin_semana') then
    drop function fn_validar_fechas_y_fin_semana
end if;

if exists(select 1 from sys.sysprocedure where proc_name='fn_es_administrador') then
    drop function fn_es_administrador
end if;

/*==============================================================*/
/* 1. FUNCIONES                                                 */
/*==============================================================*/

CREATE FUNCTION "DBA"."fn_es_administrador"(IN p_usuario VARCHAR(128))
RETURNS INTEGER
BEGIN
    DECLARE v_count INTEGER;
    
    SELECT COUNT(*) INTO v_count
    FROM SYSGROUPS
    WHERE group_name = 'ADMINISTRADORES'
      AND member_name = p_usuario;
      
    RETURN v_count;
END;


CREATE FUNCTION "DBA"."fn_validar_fechas_y_fin_semana"( IN fecha DATE )
RETURNS INTEGER
NOT DETERMINISTIC          -- usa CURRENT DATE
BEGIN
    -- 1 = invalida (pasado o fin de semana), 0 = valida
    IF fecha < CURRENT DATE THEN
        RETURN 1;
    END IF;
    IF DOW(fecha) IN (1, 7) THEN   -- 1=domingo, 7=sabado
        RETURN 1;
    END IF;
    RETURN 0;
END;


CREATE FUNCTION "DBA"."fn_validar_horarios"( IN hora_inicio TIME, IN hora_fin TIME, IN fecha DATE )
RETURNS INTEGER
NOT DETERMINISTIC          -- usa CURRENT TIME
BEGIN
    -- 1 = inicio >= fin ; 2 = inicio en el pasado (hoy) ; 0 = valido
    IF hora_inicio >= hora_fin THEN
        RETURN 1;
    END IF;
    IF fecha = CURRENT DATE AND hora_inicio < CURRENT TIME THEN
        RETURN 2;
    END IF;
    RETURN 0;
END;


CREATE FUNCTION "DBA"."fn_validar_horarios_mantenimiento"( IN fecha_inicio DATE, IN fecha_fin DATE )
RETURNS INTEGER
NOT DETERMINISTIC
BEGIN
    -- 1 = invalida, 0 = valida
    IF fecha_inicio > fecha_fin THEN
        RETURN 1;
    END IF;
    IF fecha_inicio < CURRENT DATE THEN
        RETURN 1;
    END IF;
    RETURN 0;
END;


CREATE FUNCTION "DBA"."fn_existe_solapamiento_reservas"(
    IN p_numero_laboratorio INT,
    IN p_fecha              DATE,
    IN p_hora_inicio        TIME,
    IN p_hora_fin           TIME,
    IN p_id_reserva_excluir INT,   -- ID de la reserva a ignorar (para UPDATE); NULL si no aplica
    IN p_id_tipo_actividad  INT )  -- tipo de actividad de la nueva reserva; NULL = consulta pura
RETURNS INTEGER
NOT DETERMINISTIC
BEGIN
    DECLARE v_count INTEGER;
    DECLARE v_prioridad_nueva INT;

    -- Si nos pasaron tipo de actividad, buscamos su prioridad real
    IF p_id_tipo_actividad IS NOT NULL THEN
        SELECT NIVEL_PRIORIDAD INTO v_prioridad_nueva
        FROM "DBA"."TIPO_ACTIVIDAD"
        WHERE ID_TIPO_ACTIVIDAD = p_id_tipo_actividad;
    END IF;

    SELECT COUNT(*) INTO v_count
    FROM "DBA"."RESERVAS" r
    JOIN "DBA"."TIPO_ACTIVIDAD" ta ON ta.ID_TIPO_ACTIVIDAD = r.ID_TIPO_ACTIVIDAD
    JOIN "DBA"."ESTADO_RESERVA" er ON er.ID_ESTADO_RESERVA = r.ID_ESTADO_RESERVA
    WHERE r.NUMERO_LABORATORIO = p_numero_laboratorio
      AND r.FECHA_A_RESERVAR   = p_fecha
      AND (p_id_reserva_excluir IS NULL OR r.ID_RESERVA <> p_id_reserva_excluir)
      AND er.ESTADO_RESERVA NOT IN ('C','A')          -- Cancelada y Ausente no bloquean
      AND (v_prioridad_nueva IS NULL OR ta.NIVEL_PRIORIDAD <= v_prioridad_nueva) --el nivel de prioridad cuanto mas bajo - mas importante
      AND p_hora_inicio < r.HORA_FIN
      AND p_hora_fin    > r.HORA_INICIO;

    RETURN v_count;
END;


CREATE FUNCTION "DBA"."fn_existe_mantenimiento"(
    IN p_numero_laboratorio INT,
    IN p_fecha DATE )
RETURNS INTEGER
NOT DETERMINISTIC
BEGIN
    DECLARE v_count INTEGER;

    SELECT COUNT(*) INTO v_count
    FROM "DBA"."MANTENIMIENTOS" ma
    JOIN "DBA"."ESTADOS_MANTENIMIENTOS" em
         ON em.ID_ESTADO_MANTENIMIENTO = ma.ID_ESTADO_MANTENIMIENTO
    WHERE ma.NUMERO_LABORATORIO = p_numero_laboratorio
      AND p_fecha BETWEEN ma.FECHA_INICIO AND ma.FECHA_FIN_PREVISTA
      AND em.ESTADO_MANTENIMIENTO IN ('P','E');

    RETURN v_count;
END;


/*==============================================================*/
/* 2. PROCEDIMIENTOS                                            */
/*==============================================================*/

CREATE PROCEDURE "DBA"."sp_horarios_disponibles"(
    IN p_numero_laboratorio INT,
    IN p_fecha              DATE,
    IN p_duracion_horas     INT,
    IN p_id_tipo_actividad  INT )
RESULT (HORA_INICIO TIME, HORA_FIN TIME)
BEGIN
    DECLARE v_duracion_max INT;

    SELECT DURACION_MAX_HORAS INTO v_duracion_max
      FROM TIPO_ACTIVIDAD
     WHERE ID_TIPO_ACTIVIDAD = p_id_tipo_actividad;

    IF v_duracion_max IS NULL THEN
        RAISERROR 99010 'Tipo de actividad inexistente';
        RETURN;
    END IF;

    IF p_duracion_horas < 1 OR p_duracion_horas > v_duracion_max THEN
        RAISERROR 99011 'La duracion solicitada supera el maximo permitido para este tipo de actividad';
        RETURN;
    END IF;

    -- El mantenimiento depende solo del lab y la fecha: se chequea una vez
    IF DBA."fn_existe_mantenimiento"(p_numero_laboratorio, p_fecha) > 0 THEN
        RETURN;   -- lab en mantenimiento: no hay horarios disponibles ese dia
    END IF;

    -- Genera inicios candidatos cada 1 hora entre 07:00 y el cierre (22:00)
    SELECT c.HORA_INICIO, c.HORA_FIN
      FROM (
            SELECT CAST(DATEADD(HOUR, rg.row_num - 1, CAST('07:00:00' AS TIME)) AS TIME) AS HORA_INICIO,
                   CAST(DATEADD(HOUR, rg.row_num - 1 + p_duracion_horas, CAST('07:00:00' AS TIME)) AS TIME) AS HORA_FIN
              FROM sa_rowgenerator(1, 15) rg
             WHERE (7 + rg.row_num - 1 + p_duracion_horas) <= 22
           ) c
     WHERE DBA."fn_existe_solapamiento_reservas"(
               p_numero_laboratorio,
               p_fecha,
               c.HORA_INICIO,
               c.HORA_FIN,
               NULL,
               NULL) = 0
     ORDER BY 1;
END;


CREATE PROCEDURE "DBA"."sp_laboratorios_disponibles"(
    IN p_fecha        DATE,
    IN p_hora_inicio  TIME,
    IN p_hora_fin     TIME )
BEGIN
    DECLARE v_val INTEGER;

    -- Coherencia del horario pedido
    SET v_val = DBA.fn_validar_horarios(p_hora_inicio, p_hora_fin, p_fecha);

    IF v_val = 1 THEN
        RAISERROR 99999 'La hora de inicio debe ser anterior a la hora de fin.';
        RETURN;
    END IF;
    IF v_val = 2 THEN
        RAISERROR 99999 'La hora de inicio debe ser posterior a la hora actual en una fecha disponible.';
        RETURN;
    END IF;

    -- Fecha valida (no pasado, no fin de semana)
    IF DBA.fn_validar_fechas_y_fin_semana(p_fecha) = 1 THEN
        RAISERROR 99999 'Fecha invalida: no se permite pasado ni fines de semana.';
        RETURN;
    END IF;

    -- Labs cuyo estado global no sea M/F/B y que NO tengan una reserva
    -- (no cancelada) que se solape con la franja pedida
    SELECT l.*
    FROM LABORATORIOS l
    JOIN ESTADOS_OPERATIVOS eo ON eo.ESTADO = l.ESTADO
    WHERE eo.TIPO NOT IN ('M','F','B')
      AND DBA."fn_existe_solapamiento_reservas"(
            l.NUMERO_LABORATORIO,
            p_fecha,
            p_hora_inicio,
            p_hora_fin,
            NULL,
            NULL) = 0;
END;


CREATE PROCEDURE "DBA"."sp_crear_reserva"(
    IN p_numero_laboratorio INT,
    IN p_cedula_identidad   INT,
    IN p_correo             VARCHAR(80),
    IN p_id_tipo_actividad  INT,
    IN p_fecha_a_reservar   DATE,
    IN p_hora_inicio        TIME,
    IN p_hora_fin           TIME,
    IN p_cantidad_alumnos   INT )
RESULT (ID_RESERVA INT, DESPLAZADAS VARCHAR(500))
BEGIN
    DECLARE v_nivel_nuevo         INT;
    DECLARE v_id_estado_pendiente INT;
    DECLARE v_id_estado_cancelada INT;
    DECLARE v_nuevo_id            INT;
    DECLARE v_desplazadas         VARCHAR(500);

    -- Nivel de prioridad de la nueva actividad (mas bajo = mas importante)
    SELECT NIVEL_PRIORIDAD INTO v_nivel_nuevo
    FROM "DBA"."TIPO_ACTIVIDAD"
    WHERE ID_TIPO_ACTIVIDAD = p_id_tipo_actividad;

    IF v_nivel_nuevo IS NULL THEN
        RAISERROR 99999 'Tipo de actividad inexistente.';
        RETURN;
    END IF;

    -- Estados por letra (robusto ante cambios de orden en el catalogo)
    SELECT ID_ESTADO_RESERVA INTO v_id_estado_pendiente
    FROM "DBA"."ESTADO_RESERVA" WHERE ESTADO_RESERVA = 'P';

    SELECT ID_ESTADO_RESERVA INTO v_id_estado_cancelada
    FROM "DBA"."ESTADO_RESERVA" WHERE ESTADO_RESERVA = 'C';

    -- Lista de IDs desplazados (para devolver al backend, sirve para el mail al solicitante)
    SELECT LIST(r.ID_RESERVA, ',') INTO v_desplazadas
    FROM "DBA"."RESERVAS" r
    JOIN "DBA"."TIPO_ACTIVIDAD" ta ON ta.ID_TIPO_ACTIVIDAD = r.ID_TIPO_ACTIVIDAD
    JOIN "DBA"."ESTADO_RESERVA" er ON er.ID_ESTADO_RESERVA = r.ID_ESTADO_RESERVA
    WHERE r.NUMERO_LABORATORIO = p_numero_laboratorio
      AND r.FECHA_A_RESERVAR   = p_fecha_a_reservar
      AND er.ESTADO_RESERVA NOT IN ('C','A')
      AND ta.NIVEL_PRIORIDAD  > v_nivel_nuevo   -- ESTRICTAMENTE menor prioridad
      AND p_hora_inicio < r.HORA_FIN
      AND p_hora_fin    > r.HORA_INICIO;

    -- Cancelar las desplazadas (si las hay)
    IF v_desplazadas IS NOT NULL THEN
        UPDATE "DBA"."RESERVAS"
        SET ID_ESTADO_RESERVA   = v_id_estado_cancelada,
            MOTIVO_CANCELACION  = 'Desplazada por reserva de mayor prioridad',
            USUARIO_CANCELACION = CURRENT USER
        WHERE ID_RESERVA IN (
            SELECT r.ID_RESERVA
            FROM "DBA"."RESERVAS" r
            JOIN "DBA"."TIPO_ACTIVIDAD" ta ON ta.ID_TIPO_ACTIVIDAD = r.ID_TIPO_ACTIVIDAD
            JOIN "DBA"."ESTADO_RESERVA" er ON er.ID_ESTADO_RESERVA = r.ID_ESTADO_RESERVA
            WHERE r.NUMERO_LABORATORIO = p_numero_laboratorio
              AND r.FECHA_A_RESERVAR   = p_fecha_a_reservar
              AND er.ESTADO_RESERVA NOT IN ('C','A')
              AND ta.NIVEL_PRIORIDAD  > v_nivel_nuevo
              AND p_hora_inicio < r.HORA_FIN
              AND p_hora_fin    > r.HORA_INICIO
        );
    END IF;

    -- INSERT: aca disparan todos los triggers (fecha valida, mantenimiento,
    -- estado del lab, capacidad, solapamiento de igual-o-mayor prioridad).
    -- Si algo esta mal, el RAISERROR del trigger sube al backend intacto.
    INSERT INTO "DBA"."RESERVAS"
        (NUMERO_LABORATORIO, CEDULA_IDENTIDAD, CORREO,
         ID_ESTADO_RESERVA, ID_TIPO_ACTIVIDAD,
         FECHA_A_RESERVAR, HORA_INICIO, HORA_FIN,
         CANTIDAD_ALUMNOS, FECHA_SOLICITUD)
    VALUES
        (p_numero_laboratorio, p_cedula_identidad, p_correo,
         v_id_estado_pendiente, p_id_tipo_actividad,
         p_fecha_a_reservar, p_hora_inicio, p_hora_fin,
         p_cantidad_alumnos, CURRENT DATE);

    SET v_nuevo_id = @@IDENTITY;

    SELECT v_nuevo_id AS ID_RESERVA, v_desplazadas AS DESPLAZADAS;
END;

CREATE PROCEDURE "DBA"."sp_cancelar_reservas_vencidas"()
BEGIN
    DECLARE v_id_estado_cancelada INT;
    DECLARE v_id_estado_ausente INT;
    
    -- Obtener IDs de estados
    SELECT ID_ESTADO_RESERVA INTO v_id_estado_cancelada
    FROM ESTADO_RESERVA WHERE ESTADO_RESERVA = 'C';
    
    SELECT ID_ESTADO_RESERVA INTO v_id_estado_ausente
    FROM ESTADO_RESERVA WHERE ESTADO_RESERVA = 'A';
    
    -- Cancelar reservas pendientes cuya fecha ya pasó
    UPDATE RESERVAS
    SET ID_ESTADO_RESERVA = v_id_estado_cancelada,
        MOTIVO_CANCELACION = 'Cancelada automáticamente por fecha vencida',
        USUARIO_CANCELACION = 'SYSTEM'
    WHERE ID_ESTADO_RESERVA = (SELECT ID_ESTADO_RESERVA FROM ESTADO_RESERVA WHERE ESTADO_RESERVA = 'P')
      AND FECHA_A_RESERVAR < CURRENT DATE;
      
    -- Marcar como ausentes las reservas del día actual que ya pasaron su hora de inicio
    UPDATE RESERVAS
    SET ID_ESTADO_RESERVA = v_id_estado_ausente
    WHERE ID_ESTADO_RESERVA = (SELECT ID_ESTADO_RESERVA FROM ESTADO_RESERVA WHERE ESTADO_RESERVA = 'P')
      AND FECHA_A_RESERVAR = CURRENT DATE
      AND HORA_INICIO < CURRENT TIME;
END;
commit;
/*==============================================================*/
/* 3. TRIGGERS (sobre RESERVAS)                                 */
/*==============================================================*/

CREATE TRIGGER "tr_validar_estados_operativos_lab" BEFORE INSERT   -- solo INSERT
ORDER 1 ON "DBA"."RESERVAS"
REFERENCING NEW AS new_row
FOR EACH ROW
BEGIN
    DECLARE v_tipo CHAR(1);

    SELECT eo.TIPO
    INTO   v_tipo
    FROM   LABORATORIOS l
    INNER JOIN ESTADOS_OPERATIVOS eo ON eo.ESTADO = l.ESTADO
    WHERE  l.NUMERO_LABORATORIO = new_row.NUMERO_LABORATORIO;

    IF v_tipo IN ('M','F','B') THEN
        RAISERROR 99999 'El laboratorio no esta disponible (mantenimiento, fuera de servicio o bloqueado).';
    END IF;
END;


CREATE TRIGGER "tr_validar_capacidad_lab" BEFORE INSERT, UPDATE
ORDER 2 ON "DBA"."RESERVAS"
REFERENCING NEW AS new_row
FOR EACH ROW
BEGIN
    DECLARE v_cap INTEGER;

    SELECT l.CAPACIDAD_ALUMNOS INTO v_cap
    FROM LABORATORIOS l
    WHERE l.NUMERO_LABORATORIO = new_row.NUMERO_LABORATORIO;

    IF v_cap < new_row.CANTIDAD_ALUMNOS THEN
        RAISERROR 99999 'La cantidad de alumnos supera la capacidad de la sala.';
    END IF;
END;


CREATE TRIGGER "tr_concide_horario_fecha_reserva_ins" BEFORE INSERT
ORDER 3 ON "DBA"."RESERVAS"
REFERENCING NEW AS new_row
FOR EACH ROW
BEGIN
    DECLARE v_val INTEGER;
    DECLARE v_max INT;
    SELECT DURACION_MAX_HORAS INTO v_max
    FROM TIPO_ACTIVIDAD
    WHERE ID_TIPO_ACTIVIDAD = new_row.ID_TIPO_ACTIVIDAD;

    IF DATEDIFF(hour, new_row.HORA_INICIO, new_row.HORA_FIN) > v_max THEN
        RAISERROR 99999 'La duracion supera el maximo permitido para este tipo de actividad.';
        RETURN;
    END IF;

    -- Fecha valida (no pasado, no fin de semana)
    IF DBA.fn_validar_fechas_y_fin_semana(new_row.FECHA_A_RESERVAR) = 1 THEN
        RAISERROR 99999 'Fecha invalida: no se permite pasado ni fines de semana.';
        RETURN;
    END IF;

    IF DBA.fn_existe_mantenimiento(new_row.NUMERO_LABORATORIO, new_row.FECHA_A_RESERVAR) > 0 THEN
    RAISERROR 99999 'El laboratorio tiene mantenimiento programado en esa fecha.';
    RETURN;
    END IF;

    SET v_val = DBA.fn_validar_horarios(new_row.HORA_INICIO, new_row.HORA_FIN, new_row.FECHA_A_RESERVAR);

    -- Horario coherente (inicio < fin)
    IF v_val = 1 THEN
        RAISERROR 99999 'La hora de inicio debe ser anterior a la hora de fin.';
        RETURN;
    END IF;

    -- Inicio posterior a la hora actual en una fecha disponible
    IF v_val = 2 THEN
        RAISERROR 99999 'La hora de inicio debe ser posterior a la hora actual en una fecha disponible.';
        RETURN;
    END IF;

    -- Solapamiento con otra reserva
    IF "DBA"."fn_existe_solapamiento_reservas"(
           new_row.NUMERO_LABORATORIO,
           new_row.FECHA_A_RESERVAR,
           new_row.HORA_INICIO,
           new_row.HORA_FIN,
           new_row.ID_RESERVA,
           new_row.ID_TIPO_ACTIVIDAD) > 0 THEN
        RAISERROR 99999 'El horario coincide con una reserva ya existente.';
        RETURN;
    END IF;
END;


CREATE TRIGGER "tr_concide_horario_fecha_reserva_upd" BEFORE UPDATE
ORDER 3 ON "DBA"."RESERVAS"
REFERENCING OLD AS old_row NEW AS new_row
FOR EACH ROW
BEGIN
    DECLARE v_val INTEGER;
    DECLARE v_tipo CHAR(1);
    DECLARE v_max INT;
    SELECT DURACION_MAX_HORAS INTO v_max
    FROM TIPO_ACTIVIDAD
    WHERE ID_TIPO_ACTIVIDAD = new_row.ID_TIPO_ACTIVIDAD;

    IF DATEDIFF(hour, new_row.HORA_INICIO, new_row.HORA_FIN) > v_max THEN
        RAISERROR 99999 'La duracion supera el maximo permitido para este tipo de actividad.';
        RETURN;
    END IF;
    
    IF old_row.FECHA_A_RESERVAR = new_row.FECHA_A_RESERVAR
       AND old_row.HORA_INICIO = new_row.HORA_INICIO
       AND old_row.HORA_FIN = new_row.HORA_FIN
       AND old_row.NUMERO_LABORATORIO = new_row.NUMERO_LABORATORIO THEN
        RETURN;   -- no cambio fecha/horario/lab, no hace falta revalidar
    END IF;

    IF DBA.fn_validar_fechas_y_fin_semana(new_row.FECHA_A_RESERVAR) = 1 THEN
        RAISERROR 99999 'Fecha invalida: no se permite pasado ni fines de semana.';
        RETURN;
    END IF;
    
    IF DBA.fn_existe_mantenimiento(new_row.NUMERO_LABORATORIO, new_row.FECHA_A_RESERVAR) > 0 THEN
    RAISERROR 99999 'El laboratorio tiene mantenimiento programado en esa fecha.';
    RETURN;
    END IF;
    
    SELECT eo.TIPO INTO v_tipo
    FROM LABORATORIOS l
    INNER JOIN ESTADOS_OPERATIVOS eo ON eo.ESTADO = l.ESTADO
    WHERE l.NUMERO_LABORATORIO = new_row.NUMERO_LABORATORIO;

    IF v_tipo IN ('M','F','B') THEN
        RAISERROR 99999 'El laboratorio no esta disponible (mantenimiento, fuera de servicio o bloqueado).';
        RETURN;
    END IF;

    SET v_val = DBA.fn_validar_horarios(new_row.HORA_INICIO, new_row.HORA_FIN, new_row.FECHA_A_RESERVAR);

    IF v_val = 1 THEN
        RAISERROR 99999 'La hora de inicio debe ser anterior a la hora de fin.';
        RETURN;
    END IF;

    IF v_val = 2 THEN
        RAISERROR 99999 'La hora de inicio debe ser posterior a la hora actual en una fecha disponible.';
        RETURN;
    END IF;

    IF "DBA"."fn_existe_solapamiento_reservas"(
           new_row.NUMERO_LABORATORIO, new_row.FECHA_A_RESERVAR,
           new_row.HORA_INICIO, new_row.HORA_FIN,
           new_row.ID_RESERVA, new_row.ID_TIPO_ACTIVIDAD) > 0 THEN
        RAISERROR 99999 'El horario coincide con una reserva ya existente.';
        RETURN;
    END IF;
END;

CREATE TRIGGER "tr_validad_cancelacion_reserva" BEFORE INSERT, UPDATE
ORDER 4 ON "DBA"."RESERVAS"
REFERENCING NEW AS new_row
FOR EACH ROW
BEGIN
    DECLARE v_estado CHAR(1);

    SELECT er.ESTADO_RESERVA INTO v_estado
    FROM "DBA"."ESTADO_RESERVA" er
    WHERE er.ID_ESTADO_RESERVA = new_row.ID_ESTADO_RESERVA;

    IF v_estado = 'C' THEN
        -- Si hay cancelacion, registra obligatoriamente el motivo
        IF new_row.MOTIVO_CANCELACION IS NULL
           OR TRIM(new_row.MOTIVO_CANCELACION) = '' THEN
            RAISERROR 99999 'Una reserva cancelada debe registrar el motivo de la cancelacion.';
            RETURN;
        END IF;
        -- Usuario responsable: si no viene, se completa con el usuario
        -- de base de datos conectado (la auth del sistema usa usuarios reales)
        IF new_row.USUARIO_CANCELACION IS NULL
           OR TRIM(new_row.USUARIO_CANCELACION) = '' THEN
            SET new_row.USUARIO_CANCELACION = CURRENT USER;
        END IF;
    END IF;
END;

/*==============================================================*/
/*  TRIGGERS (sobre LABORATORIOS)                                 */
/*==============================================================*/


CREATE TRIGGER "tr_validar_cambio_estado_lab" BEFORE UPDATE
ORDER 1 ON "DBA"."LABORATORIOS"
REFERENCING OLD AS old_row NEW AS new_row
FOR EACH ROW
BEGIN
    DECLARE v_tipo_nuevo CHAR(1);

    -- Early-return: si el estado no cambia, no hay nada que validar.
    -- Permite editar otras columnas del laboratorio (capacidad,
    -- cantidad de computadoras, etc.) sin restriccion de rol.
    IF old_row.ESTADO = new_row.ESTADO THEN
        RETURN;
    END IF;

    SELECT TIPO INTO v_tipo_nuevo
    FROM ESTADOS_OPERATIVOS
    WHERE ESTADO = new_row.ESTADO;

    -- Solo administradores pueden poner un laboratorio Fuera de servicio o Bloqueado.
    -- Los estados Disponible / Reservado / Mantenimiento quedan libres para
    -- operacion normal (p.ej. el flujo de mantenimiento marca el lab como 'M').
    IF v_tipo_nuevo IN ('F','B') AND DBA.fn_es_administrador(CURRENT USER) = 0 THEN
        RAISERROR 99999 'Solo usuarios administrativos pueden poner un laboratorio Fuera de servicio o Bloqueado.';
        RETURN;
    END IF;
END;

CREATE TRIGGER "tr_no_eliminar_lab_con_reservas" BEFORE DELETE
ORDER 1 ON "DBA"."LABORATORIOS"
REFERENCING OLD AS old_row
FOR EACH ROW
BEGIN
    DECLARE v_count INTEGER;

    SELECT COUNT(*) INTO v_count
    FROM RESERVAS
    WHERE NUMERO_LABORATORIO = old_row.NUMERO_LABORATORIO;

    IF v_count > 0 THEN
        RAISERROR 99999 'No se puede eliminar el laboratorio: tiene reservas historicas asociadas.';
        RETURN;
    END IF;
END;