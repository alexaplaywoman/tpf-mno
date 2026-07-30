/*==============================================================*/
/* LabControl - 02_objetos.sql                                  */
/* Logica de negocio en base de datos:                          */
/*   1) funciones                                               */
/*   2) procedimientos de operacion                             */
/*   3) procedimientos de reportes                              */
/*   4) evento programado (job)                                 */
/*   5) triggers de validacion                                  */
/*   6) triggers de auditoria                                   */
/*                                                              */
/* Correr DESPUES de 01_tablas.sql y ANTES de 03_permisos.sql.  */
/* Este archivo NO contiene ningun GRANT: todos los permisos    */
/* viven en 03_permisos.sql (un solo dueno por tema).           */
/*                                                              */
/* Re-ejecutable: la seccion 0 dropea todo con guarda de        */
/* existencia. Si algun DROP falla con SQLCODE=-210, correr un  */
/* ROLLBACK primero (locks de DDL).                              */
/*==============================================================*/
/* UNIFICACION - de donde salio cada cosa y que se resolvio:     */
/*                                                              */
/*  - Base: objetos_bd.sql (version con triggers de auditoria).  */
/*  - sp_crear_reserva: se tomo la version de estado_desplazada  */
/*    .sql, que marca las reservas desplazadas con la letra 'D'  */
/*    y no con 'C'. Se le corrigio el estilo (IN en vez de       */
/*    = ANY) y se le agrego la validacion de que el estado 'D'   */
/*    exista en el catalogo.                                     */
/*  - fn_existe_solapamiento_reservas: se mantuvo la version de  */
/*    objetos_bd.sql y se le sumo 'D' a la lista de estados que  */
/*    no bloquean. OJO: la copia que estaba en estado_           */
/*    desplazada.sql tenia "SELECT COUNT()" sin el asterisco     */
/*    (artefacto de PowerDesigner) - eso no compila, quedo       */
/*    corregido a COUNT(*).                                      */
/*  - Reportes: se tomo reportes.sql v3 (valida rango con        */
/*    fn_validar_rango_fechas y excluye C/A/D). Las copias       */
/*    viejas de reportes_procedures.sql y las incluidas en       */
/*    estado_desplazada.sql quedan descartadas.                  */
/*  - sp_reporte_auditoria: se combinaron las dos versiones. Del */
/*    reportes.sql v3 se tomo el cuerpo (parametros con DEFAULT, */
/*    normalizacion de vacios a NULL y RAISERROR propios) y de   */
/*    sp_reporte_auditoria.sql la clausula RESULT con los tipos  */
/*    de las 7 columnas, que la otra no declaraba.               */
/*  - sp_cancelar_reservas_vencidas marca las vencidas como      */
/*    'A' (Ausente), no como 'C'. Ver la justificacion completa  */
/*    en el comentario del procedimiento.                        */
/*  - Se agrego 'D' -> 'Desplazada' al CASE del trigger de       */
/*    auditoria de RESERVAS, que solo traducia P/U/C/A.          */
/*==============================================================*/


/*==============================================================*/
/* 0. LIMPIEZA (orden inverso a las dependencias)               */
/*==============================================================*/

/*---- evento ----*/
if exists(select 1 from sys.sysevent where event_name='ev_cancelar_reservas_vencidas') then
    drop event ev_cancelar_reservas_vencidas
end if;

/*---- triggers de auditoria ----*/
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

/*---- triggers de validacion ----*/
if exists(select 1 from sys.systrigger where trigger_name='tr_validar_cambio_estado_lab') then
    drop trigger tr_validar_cambio_estado_lab
end if;

if exists(select 1 from sys.systrigger where trigger_name='tr_no_eliminar_lab_con_reservas') then
    drop trigger tr_no_eliminar_lab_con_reservas
end if;

-- Nombre viejo (trigger unico INSERT+UPDATE), antes de separarlo en dos.
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

/*---- procedimientos de reportes ----*/
if exists(select 1 from sys.sysprocedure where proc_name='sp_reporte_auditoria') then
    drop procedure sp_reporte_auditoria
end if;

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

/*---- procedimientos de operacion ----*/
if exists(select 1 from sys.sysprocedure where proc_name='sp_cancelar_reservas_vencidas') then
    drop procedure sp_cancelar_reservas_vencidas
end if;

if exists(select 1 from sys.sysprocedure where proc_name='sp_crear_reserva') then
    drop procedure sp_crear_reserva
end if;

if exists(select 1 from sys.sysprocedure where proc_name='sp_laboratorios_disponibles') then
    drop procedure sp_laboratorios_disponibles
end if;

if exists(select 1 from sys.sysprocedure where proc_name='sp_horarios_disponibles') then
    drop procedure sp_horarios_disponibles
end if;

/*---- funciones (en sysprocedure tambien, se dropean con DROP FUNCTION) ----*/
if exists(select 1 from sys.sysprocedure where proc_name='fn_validar_rango_fechas') then
    drop function fn_validar_rango_fechas
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

COMMIT;


/*==============================================================*/
/* 1. FUNCIONES                                                 */
/*    Todas devuelven un codigo INTEGER en vez de lanzar el      */
/*    error: quien las llama decide el mensaje segun contexto.   */
/*    Asi la misma funcion sirve para un trigger (que corta la   */
/*    operacion) y para un SP de consulta (que filtra).          */
/*==============================================================*/

/*--------------------------------------------------------------*/
/* fn_es_administrador                                           */
/* Valida membresia contra la vista SYSGROUPS. La autenticacion  */
/* del sistema usa usuarios reales de la base (no una tabla      */
/* USUARIOS propia), tal como pide el enunciado.                 */
/*--------------------------------------------------------------*/
CREATE FUNCTION "DBA"."fn_es_administrador"( IN p_usuario VARCHAR(128) )
RETURNS INTEGER
BEGIN
    DECLARE v_count INTEGER;

    SELECT COUNT(*) INTO v_count
    FROM SYSGROUPS
    WHERE group_name = 'ADMINISTRADORES'
      AND member_name = p_usuario;

    RETURN v_count;
END;


/*--------------------------------------------------------------*/
/* fn_validar_fechas_y_fin_semana                                */
/* 1 = invalida (pasado o fin de semana) ; 0 = valida            */
/*--------------------------------------------------------------*/
CREATE FUNCTION "DBA"."fn_validar_fechas_y_fin_semana"( IN p_fecha DATE )
RETURNS INTEGER
NOT DETERMINISTIC          -- usa CURRENT DATE
BEGIN
    IF p_fecha < CURRENT DATE THEN
        RETURN 1;
    END IF;
    IF DOW(p_fecha) IN (1, 7) THEN   -- 1=domingo, 7=sabado
        RETURN 1;
    END IF;
    RETURN 0;
END;


/*--------------------------------------------------------------*/
/* fn_validar_horarios                                           */
/* 1 = inicio >= fin ; 2 = inicio ya paso (siendo hoy) ; 0 = ok  */
/*--------------------------------------------------------------*/
CREATE FUNCTION "DBA"."fn_validar_horarios"(
    IN p_hora_inicio TIME,
    IN p_hora_fin    TIME,
    IN p_fecha       DATE )
RETURNS INTEGER
NOT DETERMINISTIC          -- usa CURRENT TIME
BEGIN
    IF p_hora_inicio >= p_hora_fin THEN
        RETURN 1;
    END IF;
    IF p_fecha = CURRENT DATE AND p_hora_inicio < CURRENT TIME THEN
        RETURN 2;
    END IF;
    RETURN 0;
END;


/*--------------------------------------------------------------*/
/* fn_validar_horarios_mantenimiento                             */
/* 1 = invalida ; 0 = valida                                     */
/*--------------------------------------------------------------*/
CREATE FUNCTION "DBA"."fn_validar_horarios_mantenimiento"(
    IN p_fecha_inicio DATE,
    IN p_fecha_fin    DATE )
RETURNS INTEGER
NOT DETERMINISTIC
BEGIN
    IF p_fecha_inicio > p_fecha_fin THEN
        RETURN 1;
    END IF;
    IF p_fecha_inicio < CURRENT DATE THEN
        RETURN 1;
    END IF;
    RETURN 0;
END;


/*--------------------------------------------------------------*/
/* fn_existe_solapamiento_reservas                               */
/* Devuelve cuantas reservas vigentes chocan con la franja.      */
/*                                                              */
/* Estados que NO bloquean: C (Cancelada), A (Ausente) y         */
/* D (Desplazada). Una reserva desplazada por prioridad nunca    */
/* va a ocurrir, asi que su horario vuelve a estar libre.        */
/*                                                              */
/* El filtro se hace por LETRA (JOIN a ESTADO_RESERVA), nunca    */
/* por ID numerico: si el catalogo se recarga en otro orden los  */
/* IDs cambian, las letras no.                                   */
/*                                                              */
/* p_id_tipo_actividad NULL  -> consulta pura: cualquier reserva */
/*   vigente cuenta como choque (lo usan los SP de consulta).    */
/* p_id_tipo_actividad != NULL -> solo cuentan las de prioridad  */
/*   igual o mas fuerte (NIVEL_PRIORIDAD <= el nuevo). Las mas   */
/*   debiles no bloquean porque sp_crear_reserva las desplaza.   */
/*   Recordar: NIVEL_PRIORIDAD mas bajo = mas importante.        */
/*--------------------------------------------------------------*/
CREATE FUNCTION "DBA"."fn_existe_solapamiento_reservas"(
    IN p_numero_laboratorio INT,
    IN p_fecha              DATE,
    IN p_hora_inicio        TIME,
    IN p_hora_fin           TIME,
    IN p_id_reserva_excluir INT,   -- reserva a ignorar (para UPDATE); NULL si no aplica
    IN p_id_tipo_actividad  INT )
RETURNS INTEGER
NOT DETERMINISTIC
BEGIN
    DECLARE v_count INTEGER;
    DECLARE v_prioridad_nueva INT;

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
      AND er.ESTADO_RESERVA NOT IN ('C','A','D')
      AND (v_prioridad_nueva IS NULL OR ta.NIVEL_PRIORIDAD <= v_prioridad_nueva)
      -- Solapamiento total o parcial: [ini1,fin1) toca a [ini2,fin2)
      AND p_hora_inicio < r.HORA_FIN
      AND p_hora_fin    > r.HORA_INICIO;

    RETURN v_count;
END;


/*--------------------------------------------------------------*/
/* fn_existe_mantenimiento                                       */
/* Solo bloquean los mantenimientos Pendientes ('P') o En        */
/* proceso ('E'). Los Realizados ('R') y Cancelados ('C') no.    */
/*--------------------------------------------------------------*/
CREATE FUNCTION "DBA"."fn_existe_mantenimiento"(
    IN p_numero_laboratorio INT,
    IN p_fecha              DATE )
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


/*--------------------------------------------------------------*/
/* fn_validar_rango_fechas                                       */
/* Validacion compartida por los 5 reportes por periodo.         */
/* 0 = valido ; 1 = alguna fecha nula ; 2 = desde > hasta        */
/*--------------------------------------------------------------*/
CREATE FUNCTION "DBA"."fn_validar_rango_fechas"(
    IN p_desde DATE,
    IN p_hasta DATE )
RETURNS INTEGER
BEGIN
    IF p_desde IS NULL OR p_hasta IS NULL THEN
        RETURN 1;
    END IF;
    IF p_desde > p_hasta THEN
        RETURN 2;
    END IF;
    RETURN 0;
END;

COMMIT;


/*==============================================================*/
/* 2. PROCEDIMIENTOS DE OPERACION                               */
/*==============================================================*/

/*--------------------------------------------------------------*/
/* sp_horarios_disponibles                                       */
/* Devuelve las franjas libres de un laboratorio en una fecha,   */
/* para una duracion dada. Genera candidatos cada 1 hora entre   */
/* las 07:00 y el cierre (22:00) con sa_rowgenerator y filtra    */
/* los que chocan.                                               */
/*--------------------------------------------------------------*/
CREATE PROCEDURE "DBA"."sp_horarios_disponibles"(
    IN p_numero_laboratorio INT,
    IN p_fecha              DATE,
    IN p_duracion_horas     INT,
    IN p_id_tipo_actividad  INT )
RESULT (HORA_INICIO TIME, HORA_FIN TIME)
BEGIN
    DECLARE v_duracion_max INT;

    SELECT DURACION_MAX_HORAS INTO v_duracion_max
      FROM "DBA"."TIPO_ACTIVIDAD"
     WHERE ID_TIPO_ACTIVIDAD = p_id_tipo_actividad;

    IF v_duracion_max IS NULL THEN
        RAISERROR 99010 'Tipo de actividad inexistente';
        RETURN;
    END IF;

    IF p_duracion_horas < 1 OR p_duracion_horas > v_duracion_max THEN
        RAISERROR 99011 'La duracion solicitada supera el maximo permitido para este tipo de actividad';
        RETURN;
    END IF;

    -- El mantenimiento depende solo del lab y la fecha: se chequea una sola vez
    IF DBA."fn_existe_mantenimiento"(p_numero_laboratorio, p_fecha) > 0 THEN
        RETURN;   -- lab en mantenimiento: no hay horarios ese dia
    END IF;

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


/*--------------------------------------------------------------*/
/* sp_laboratorios_disponibles                                   */
/* Laboratorios libres para una fecha y franja horaria.          */
/* Excluye los que estan en Mantenimiento / Fuera de servicio /  */
/* Bloqueado por estado operativo, y los que ya tienen una       */
/* reserva vigente que se solapa.                                */
/*--------------------------------------------------------------*/
CREATE PROCEDURE "DBA"."sp_laboratorios_disponibles"(
    IN p_fecha        DATE,
    IN p_hora_inicio  TIME,
    IN p_hora_fin     TIME )
BEGIN
    DECLARE v_val INTEGER;

    SET v_val = DBA."fn_validar_horarios"(p_hora_inicio, p_hora_fin, p_fecha);

    IF v_val = 1 THEN
        RAISERROR 99999 'La hora de inicio debe ser anterior a la hora de fin.';
        RETURN;
    END IF;
    IF v_val = 2 THEN
        RAISERROR 99999 'La hora de inicio debe ser posterior a la hora actual en una fecha disponible.';
        RETURN;
    END IF;

    IF DBA."fn_validar_fechas_y_fin_semana"(p_fecha) = 1 THEN
        RAISERROR 99999 'Fecha invalida: no se permite pasado ni fines de semana.';
        RETURN;
    END IF;

    SELECT l.*
    FROM "DBA"."LABORATORIOS" l
    JOIN "DBA"."ESTADOS_OPERATIVOS" eo ON eo.ESTADO = l.ESTADO
    WHERE eo.TIPO NOT IN ('M','F','B')
      AND DBA."fn_existe_solapamiento_reservas"(
            l.NUMERO_LABORATORIO,
            p_fecha,
            p_hora_inicio,
            p_hora_fin,
            NULL,
            NULL) = 0;
END;


/*--------------------------------------------------------------*/
/* sp_crear_reserva                                              */
/* Alta de reserva con desplazamiento por prioridad.             */
/*                                                              */
/* Secuencia:                                                    */
/*  1. Resuelve el NIVEL_PRIORIDAD del tipo de actividad pedido. */
/*  2. Junta en una lista los IDs de las reservas vigentes que   */
/*     se solapan y son ESTRICTAMENTE de menor prioridad         */
/*     (NIVEL_PRIORIDAD > el nuevo).                             */
/*  3. Las marca como 'D' (Desplazada) con motivo y usuario.     */
/*  4. Inserta la nueva. Recien ahi disparan los triggers de     */
/*     validacion; si algo esta mal el RAISERROR sube al backend */
/*     intacto y la transaccion no queda a medias.               */
/*  5. Devuelve el ID nuevo y la lista de desplazadas, que el    */
/*     backend usa para mandar el mail de aviso a cada           */
/*     solicitante afectado (trazabilidad + notificacion).       */
/*                                                              */
/* Un solapamiento contra una reserva de prioridad igual o mas   */
/* fuerte NO se desplaza: lo rechaza el trigger, porque          */
/* fn_existe_solapamiento_reservas con tipo de actividad solo    */
/* mira las de NIVEL_PRIORIDAD <= al nuevo.                      */
/*                                                              */
/* Estado 'D' vs 'C': una desplazada la cancelo el sistema por   */
/* prioridad; una 'C' la cancelo una persona con un motivo       */
/* elegido. Separarlas hace que el reporte de cancelaciones no   */
/* le cuente al solicitante una cancelacion que no hizo.         */
/*--------------------------------------------------------------*/
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
    DECLARE v_nivel_nuevo          INT;
    DECLARE v_id_estado_pendiente  INT;
    DECLARE v_id_estado_desplazada INT;
    DECLARE v_nuevo_id             INT;
    DECLARE v_desplazadas          VARCHAR(500);

    SELECT NIVEL_PRIORIDAD INTO v_nivel_nuevo
    FROM "DBA"."TIPO_ACTIVIDAD"
    WHERE ID_TIPO_ACTIVIDAD = p_id_tipo_actividad;

    IF v_nivel_nuevo IS NULL THEN
        RAISERROR 99999 'Tipo de actividad inexistente.';
        RETURN;
    END IF;

    -- Estados resueltos por letra, nunca por ID hardcodeado
    SELECT ID_ESTADO_RESERVA INTO v_id_estado_pendiente
    FROM "DBA"."ESTADO_RESERVA" WHERE ESTADO_RESERVA = 'P';

    SELECT ID_ESTADO_RESERVA INTO v_id_estado_desplazada
    FROM "DBA"."ESTADO_RESERVA" WHERE ESTADO_RESERVA = 'D';

    IF v_id_estado_pendiente IS NULL OR v_id_estado_desplazada IS NULL THEN
        RAISERROR 99999 'Catalogo ESTADO_RESERVA incompleto: faltan los estados P y/o D.';
        RETURN;
    END IF;

    -- Lista de IDs a desplazar (se calcula ANTES del UPDATE, porque
    -- despues ya no cumplirian la condicion de estado)
    SELECT LIST(r.ID_RESERVA, ',') INTO v_desplazadas
    FROM "DBA"."RESERVAS" r
    JOIN "DBA"."TIPO_ACTIVIDAD" ta ON ta.ID_TIPO_ACTIVIDAD = r.ID_TIPO_ACTIVIDAD
    JOIN "DBA"."ESTADO_RESERVA" er ON er.ID_ESTADO_RESERVA = r.ID_ESTADO_RESERVA
    WHERE r.NUMERO_LABORATORIO = p_numero_laboratorio
      AND r.FECHA_A_RESERVAR   = p_fecha_a_reservar
      AND er.ESTADO_RESERVA NOT IN ('C','A','D')
      AND ta.NIVEL_PRIORIDAD  > v_nivel_nuevo   -- estrictamente mas debil
      AND p_hora_inicio < r.HORA_FIN
      AND p_hora_fin    > r.HORA_INICIO;

    IF v_desplazadas IS NOT NULL THEN
        UPDATE "DBA"."RESERVAS"
        SET ID_ESTADO_RESERVA   = v_id_estado_desplazada,
            MOTIVO_CANCELACION  = 'Desplazada por reserva de mayor prioridad',
            USUARIO_CANCELACION = CURRENT USER
        WHERE ID_RESERVA IN (
            SELECT r.ID_RESERVA
            FROM "DBA"."RESERVAS" r
            JOIN "DBA"."TIPO_ACTIVIDAD" ta ON ta.ID_TIPO_ACTIVIDAD = r.ID_TIPO_ACTIVIDAD
            JOIN "DBA"."ESTADO_RESERVA" er ON er.ID_ESTADO_RESERVA = r.ID_ESTADO_RESERVA
            WHERE r.NUMERO_LABORATORIO = p_numero_laboratorio
              AND r.FECHA_A_RESERVAR   = p_fecha_a_reservar
              AND er.ESTADO_RESERVA NOT IN ('C','A','D')
              AND ta.NIVEL_PRIORIDAD  > v_nivel_nuevo
              AND p_hora_inicio < r.HORA_FIN
              AND p_hora_fin    > r.HORA_INICIO
        );
    END IF;

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

    -- Un solo result set: el driver 'sybase' de Node solo entrega el primero
    SELECT v_nuevo_id AS ID_RESERVA, v_desplazadas AS DESPLAZADAS;
END;


/*--------------------------------------------------------------*/
/* sp_cancelar_reservas_vencidas                                 */
/* Job de limpieza: toda reserva Pendiente cuyo bloque ya        */
/* termino y nadie confirmo como Utilizada pasa a AUSENTE ('A'). */
/* Cubre tanto dias pasados como reservas de hoy ya vencidas.    */
/*                                                              */
/* Por que 'A' (Ausente) y no 'C' (Cancelada):                   */
/* el enunciado dice "podra pasar automaticamente a estado       */
/* Cancelada", pero Cancelada describe una decision de una       */
/* persona (que ademas esta obligada a dar un motivo y quedar    */
/* registrada como responsable). Aca no cancelo nadie: el        */
/* solicitante simplemente no se presento ni confirmo el uso,    */
/* que es exactamente la definicion de Ausente y lo que el       */
/* mismo enunciado pide registrar "para futuras referencias y    */
/* estadisticas". Marcarlas como Canceladas le inflaria al       */
/* solicitante un contador de cancelaciones que nunca hizo, y    */
/* mezclaria dos cosas distintas en el reporte de               */
/* cancelaciones e inasistencias.                                */
/*                                                              */
/* Se deja igual el motivo y USUARIO_CANCELACION='SYSTEM' para   */
/* que quede claro que la marca la puso el job y no un usuario.  */
/*--------------------------------------------------------------*/
CREATE PROCEDURE "DBA"."sp_cancelar_reservas_vencidas"()
BEGIN
    DECLARE v_id_estado_ausente   INT;
    DECLARE v_id_estado_pendiente INT;

    SELECT ID_ESTADO_RESERVA INTO v_id_estado_ausente
    FROM "DBA"."ESTADO_RESERVA" WHERE ESTADO_RESERVA = 'A';

    SELECT ID_ESTADO_RESERVA INTO v_id_estado_pendiente
    FROM "DBA"."ESTADO_RESERVA" WHERE ESTADO_RESERVA = 'P';

    UPDATE "DBA"."RESERVAS"
    SET ID_ESTADO_RESERVA   = v_id_estado_ausente,
        MOTIVO_CANCELACION  = 'No confirmada como utilizada',
        USUARIO_CANCELACION = 'SYSTEM'
    WHERE ID_ESTADO_RESERVA = v_id_estado_pendiente
      AND (FECHA_A_RESERVAR < CURRENT DATE
           OR (FECHA_A_RESERVAR = CURRENT DATE AND HORA_FIN < CURRENT TIME));
END;

COMMIT;


/*==============================================================*/
/* 3. PROCEDIMIENTOS DE REPORTES (por rango de fechas)          */
/*    Los cinco validan el rango con la MISMA funcion            */
/*    (fn_validar_rango_fechas) y devuelven el error con         */
/*    RAISERROR: reutilizacion de logica + manejo de errores,    */
/*    que es lo que puntua la rubrica de Informatica 4.          */
/*==============================================================*/

/*--------------------------------------------------------------*/
/* 3.1 Laboratorios mas utilizados                                */
/*     Excluye C / A / D: miden utilizacion real.                 */
/*--------------------------------------------------------------*/
CREATE PROCEDURE "DBA"."sp_reporte_laboratorios_mas_utilizados"(
    IN p_desde DATE,
    IN p_hasta DATE )
RESULT (NUMERO_LABORATORIO INT, EDIFICIO VARCHAR(80), CANTIDAD_RESERVAS INT)
BEGIN
    DECLARE v_val INT;
    SET v_val = DBA."fn_validar_rango_fechas"(p_desde, p_hasta);
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
    JOIN "DBA"."LABORATORIOS" l    ON l.NUMERO_LABORATORIO = r.NUMERO_LABORATORIO
    JOIN "DBA"."ESTADO_RESERVA" er ON er.ID_ESTADO_RESERVA = r.ID_ESTADO_RESERVA
    WHERE r.FECHA_A_RESERVAR BETWEEN p_desde AND p_hasta
      AND er.ESTADO_RESERVA NOT IN ('C','A','D')
    GROUP BY r.NUMERO_LABORATORIO, l.EDIFICIO
    ORDER BY CANTIDAD_RESERVAS DESC;
END;


/*--------------------------------------------------------------*/
/* 3.2 Horarios de mayor ocupacion                                */
/*     Se agrupa por HORA_INICIO directo (no por HOUR()) porque   */
/*     sp_horarios_disponibles solo ofrece inicios en hora        */
/*     exacta: en la practica no hay reservas 08:30.              */
/*--------------------------------------------------------------*/
CREATE PROCEDURE "DBA"."sp_reporte_horarios_mas_ocupados"(
    IN p_desde DATE,
    IN p_hasta DATE )
RESULT (HORA_INICIO TIME, CANTIDAD_RESERVAS INT)
BEGIN
    DECLARE v_val INT;
    SET v_val = DBA."fn_validar_rango_fechas"(p_desde, p_hasta);
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
/* 3.3 Solicitantes con mas reservas                              */
/*     A proposito NO filtra por estado: mide "quien reserva      */
/*     mas", no "quien usa mas". Una cancelacion o un             */
/*     desplazamiento siguen siendo una reserva que la persona    */
/*     efectivamente solicito.                                    */
/*--------------------------------------------------------------*/
CREATE PROCEDURE "DBA"."sp_reporte_solicitantes_top"(
    IN p_desde DATE,
    IN p_hasta DATE )
RESULT (CEDULA_IDENTIDAD INT, NOMBRE VARCHAR(80), APELLIDO VARCHAR(80), CANTIDAD_RESERVAS INT)
BEGIN
    DECLARE v_val INT;
    SET v_val = DBA."fn_validar_rango_fechas"(p_desde, p_hasta);
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
/* 3.4 Cancelaciones e inasistencias                              */
/*     Muestra 'D' como fila propia ("Desplazada") para que no    */
/*     se confunda con una cancelacion hecha por una persona.     */
/*     Devuelve el nombre legible ya resuelto para el frontend.   */
/*--------------------------------------------------------------*/
CREATE PROCEDURE "DBA"."sp_reporte_cancelaciones_inasistencias"(
    IN p_desde DATE,
    IN p_hasta DATE )
RESULT (ESTADO_RESERVA CHAR(1), ESTADO_NOMBRE VARCHAR(20), CANTIDAD INT)
BEGIN
    DECLARE v_val INT;
    SET v_val = DBA."fn_validar_rango_fechas"(p_desde, p_hasta);
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
/* 3.5 Porcentaje de utilizacion de recursos                      */
/*     Porcentaje = usos del recurso * 100 / total de usos de     */
/*     recursos en el rango. El filtro de estado C/A/D tiene que  */
/*     ser IDENTICO en numerador y denominador, si no el          */
/*     porcentaje queda descuadrado.                              */
/*--------------------------------------------------------------*/
CREATE PROCEDURE "DBA"."sp_reporte_porcentaje_recursos"(
    IN p_desde DATE,
    IN p_hasta DATE )
RESULT (NOMBRE VARCHAR(80), VECES_USADO INT, PORCENTAJE NUMERIC(5,2))
BEGIN
    DECLARE v_val INT;
    SET v_val = DBA."fn_validar_rango_fechas"(p_desde, p_hasta);
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
               JOIN "DBA"."RESERVAS" r2        ON r2.ID_RESERVA = rr2.ID_RESERVA
               JOIN "DBA"."ESTADO_RESERVA" er2 ON er2.ID_ESTADO_RESERVA = r2.ID_ESTADO_RESERVA
               WHERE r2.FECHA_A_RESERVAR BETWEEN p_desde AND p_hasta
                 AND er2.ESTADO_RESERVA NOT IN ('C','A','D')
           ), 0) AS NUMERIC(5,2)) AS PORCENTAJE
    FROM "DBA"."RESERVAS_RECURSOS" rr
    JOIN "DBA"."RESERVAS" r        ON r.ID_RESERVA  = rr.ID_RESERVA
    JOIN "DBA"."RECURSOS" rec      ON rec.ID_RECURSO = rr.ID_RECURSO
    JOIN "DBA"."ESTADO_RESERVA" er ON er.ID_ESTADO_RESERVA = r.ID_ESTADO_RESERVA
    WHERE r.FECHA_A_RESERVAR BETWEEN p_desde AND p_hasta
      AND er.ESTADO_RESERVA NOT IN ('C','A','D')
    GROUP BY rec.NOMBRE
    ORDER BY VECES_USADO DESC;
END;


/*--------------------------------------------------------------*/
/* 3.6 Reporte de auditoria (paginado)                            */
/*     Todos los filtros son opcionales (DEFAULT NULL) y se       */
/*     resuelven con el patron (param IS NULL OR columna = ...):  */
/*     un solo SELECT sirve para cualquier combinacion.           */
/*                                                              */
/*     El agrupamiento usa el PREFIJO de TIPO_EVENTO             */
/*     (RESERVA% / LABORATORIO% / MANTENIMIENTO%), por eso los    */
/*     nombres de evento se eligieron con ese prefijo.            */
/*                                                              */
/*     COUNT(*) OVER () devuelve el total filtrado SIN paginar   */
/*     como columna extra: hace falta porque el driver 'sybase'  */
/*     solo entrega el primer result set, asi que no se puede    */
/*     devolver "pagina + total" en dos SELECT separados.        */
/*                                                              */
/*     La clausula RESULT declara los tipos de las 7 columnas.   */
/*     Sin ella el driver tiene que deducirlos describiendo el   */
/*     SELECT, y con TOP ... START AT y una funcion de ventana   */
/*     esa deduccion es fragil. Es la misma razon por la que la  */
/*     tienen sp_crear_reserva y los reportes.                    */
/*--------------------------------------------------------------*/
CREATE PROCEDURE "DBA"."sp_reporte_auditoria"(
    IN p_fecha_desde   DATE          DEFAULT NULL,
    IN p_fecha_hasta   DATE          DEFAULT NULL,
    IN p_grupo         VARCHAR(50)   DEFAULT NULL,
    IN p_usuario       VARCHAR(128)  DEFAULT NULL,
    IN p_id_referencia INT           DEFAULT NULL,
    IN p_offset        INT           DEFAULT 0,
    IN p_limit         INT           DEFAULT 20 )
RESULT (ID_AUDITORIA  INT,
        FECHA_HORA    TIMESTAMP,
        USUARIO       VARCHAR(128),
        TIPO_EVENTO   VARCHAR(50),
        ID_REFERENCIA INT,
        DESCRIPCION   VARCHAR(500),
        TOTAL         INT)
BEGIN
    DECLARE v_grupo    VARCHAR(50);
    DECLARE v_usuario  VARCHAR(128);
    DECLARE v_start_at INT;

    -- Normalizar strings vacios (y 'Todos') a NULL: el frontend manda
    -- '' cuando el usuario no eligio nada en el combo
    SET v_grupo   = CASE
                       WHEN p_grupo IS NULL         THEN NULL
                       WHEN TRIM(p_grupo) = ''      THEN NULL
                       WHEN TRIM(p_grupo) = 'Todos' THEN NULL
                       ELSE TRIM(p_grupo)
                    END;

    SET v_usuario = CASE
                       WHEN p_usuario IS NULL       THEN NULL
                       WHEN TRIM(p_usuario) = ''    THEN NULL
                       ELSE TRIM(p_usuario)
                    END;

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
END;

COMMIT;


/*==============================================================*/
/* 4. EVENTO PROGRAMADO (job)                                   */
/*    Corre cada 60 minutos. Este archivo es el UNICO dueno del  */
/*    evento: no volver a crearlo en el script de permisos o el  */
/*    segundo CREATE EVENT falla por "ya existe".                */
/*                                                              */
/*    Requiere servidor de red (dbsrv11); con dbeng11 personal   */
/*    los eventos igual corren, pero solo mientras haya una      */
/*    sesion activa.                                             */
/*==============================================================*/
CREATE EVENT ev_cancelar_reservas_vencidas
SCHEDULE
   START TIME '00:05 AM' EVERY 60 MINUTES
HANDLER
BEGIN
    CALL DBA.sp_cancelar_reservas_vencidas();
END;

COMMIT;


/*==============================================================*/
/* 5. TRIGGERS DE VALIDACION - RESERVAS                         */
/*                                                              */
/*    Estan numerados con ORDER para que el mensaje de error     */
/*    que ve el usuario sea siempre el mas especifico primero:   */
/*      ORDER 1 estado operativo del laboratorio                 */
/*      ORDER 2 capacidad                                        */
/*      ORDER 3 fecha / horario / mantenimiento / solapamiento   */
/*      ORDER 4 datos obligatorios de cancelacion                */
/*      ORDER 5 auditoria (AFTER)                                */
/*                                                              */
/*    INSERT y UPDATE van en triggers separados donde hace falta */
/*    comparar OLD contra NEW: en SQL Anywhere 11 un trigger de  */
/*    INSERT no puede usar REFERENCING OLD.                      */
/*==============================================================*/

CREATE TRIGGER "tr_validar_estados_operativos_lab" BEFORE INSERT
ORDER 1 ON "DBA"."RESERVAS"
REFERENCING NEW AS new_row
FOR EACH ROW
BEGIN
    DECLARE v_tipo CHAR(1);

    SELECT eo.TIPO INTO v_tipo
    FROM   "DBA"."LABORATORIOS" l
    JOIN   "DBA"."ESTADOS_OPERATIVOS" eo ON eo.ESTADO = l.ESTADO
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
    FROM "DBA"."LABORATORIOS" l
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
    FROM "DBA"."TIPO_ACTIVIDAD"
    WHERE ID_TIPO_ACTIVIDAD = new_row.ID_TIPO_ACTIVIDAD;

    IF DATEDIFF(hour, new_row.HORA_INICIO, new_row.HORA_FIN) > v_max THEN
        RAISERROR 99999 'La duracion supera el maximo permitido para este tipo de actividad.';
        RETURN;
    END IF;

    IF DBA."fn_validar_fechas_y_fin_semana"(new_row.FECHA_A_RESERVAR) = 1 THEN
        RAISERROR 99999 'Fecha invalida: no se permite pasado ni fines de semana.';
        RETURN;
    END IF;

    IF DBA."fn_existe_mantenimiento"(new_row.NUMERO_LABORATORIO, new_row.FECHA_A_RESERVAR) > 0 THEN
        RAISERROR 99999 'El laboratorio tiene mantenimiento programado en esa fecha.';
        RETURN;
    END IF;

    SET v_val = DBA."fn_validar_horarios"(new_row.HORA_INICIO, new_row.HORA_FIN, new_row.FECHA_A_RESERVAR);

    IF v_val = 1 THEN
        RAISERROR 99999 'La hora de inicio debe ser anterior a la hora de fin.';
        RETURN;
    END IF;

    IF v_val = 2 THEN
        RAISERROR 99999 'La hora de inicio debe ser posterior a la hora actual en una fecha disponible.';
        RETURN;
    END IF;

    IF DBA."fn_existe_solapamiento_reservas"(
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


/*--------------------------------------------------------------*/
/* Version UPDATE del anterior.                                  */
/* Early return si no cambiaron fecha / horario / laboratorio:    */
/* se compara OLD contra NEW en vez de usar UPDATE OF (columnas), */
/* porque UPDATE OF dispara aunque el valor no haya cambiado y    */
/* eso rompia operaciones administrativas sobre reservas con      */
/* fecha pasada (marcar Utilizada, marcar Ausente, cancelar).     */
/*--------------------------------------------------------------*/
CREATE TRIGGER "tr_concide_horario_fecha_reserva_upd" BEFORE UPDATE
ORDER 3 ON "DBA"."RESERVAS"
REFERENCING OLD AS old_row NEW AS new_row
FOR EACH ROW
BEGIN
    DECLARE v_val  INTEGER;
    DECLARE v_tipo CHAR(1);
    DECLARE v_max  INT;

    SELECT DURACION_MAX_HORAS INTO v_max
    FROM "DBA"."TIPO_ACTIVIDAD"
    WHERE ID_TIPO_ACTIVIDAD = new_row.ID_TIPO_ACTIVIDAD;

    IF DATEDIFF(hour, new_row.HORA_INICIO, new_row.HORA_FIN) > v_max THEN
        RAISERROR 99999 'La duracion supera el maximo permitido para este tipo de actividad.';
        RETURN;
    END IF;

    IF old_row.FECHA_A_RESERVAR   = new_row.FECHA_A_RESERVAR
       AND old_row.HORA_INICIO        = new_row.HORA_INICIO
       AND old_row.HORA_FIN           = new_row.HORA_FIN
       AND old_row.NUMERO_LABORATORIO = new_row.NUMERO_LABORATORIO THEN
        RETURN;   -- no cambio fecha/horario/lab: no hace falta revalidar
    END IF;

    IF DBA."fn_validar_fechas_y_fin_semana"(new_row.FECHA_A_RESERVAR) = 1 THEN
        RAISERROR 99999 'Fecha invalida: no se permite pasado ni fines de semana.';
        RETURN;
    END IF;

    IF DBA."fn_existe_mantenimiento"(new_row.NUMERO_LABORATORIO, new_row.FECHA_A_RESERVAR) > 0 THEN
        RAISERROR 99999 'El laboratorio tiene mantenimiento programado en esa fecha.';
        RETURN;
    END IF;

    SELECT eo.TIPO INTO v_tipo
    FROM "DBA"."LABORATORIOS" l
    JOIN "DBA"."ESTADOS_OPERATIVOS" eo ON eo.ESTADO = l.ESTADO
    WHERE l.NUMERO_LABORATORIO = new_row.NUMERO_LABORATORIO;

    IF v_tipo IN ('M','F','B') THEN
        RAISERROR 99999 'El laboratorio no esta disponible (mantenimiento, fuera de servicio o bloqueado).';
        RETURN;
    END IF;

    SET v_val = DBA."fn_validar_horarios"(new_row.HORA_INICIO, new_row.HORA_FIN, new_row.FECHA_A_RESERVAR);

    IF v_val = 1 THEN
        RAISERROR 99999 'La hora de inicio debe ser anterior a la hora de fin.';
        RETURN;
    END IF;

    IF v_val = 2 THEN
        RAISERROR 99999 'La hora de inicio debe ser posterior a la hora actual en una fecha disponible.';
        RETURN;
    END IF;

    IF DBA."fn_existe_solapamiento_reservas"(
           new_row.NUMERO_LABORATORIO, new_row.FECHA_A_RESERVAR,
           new_row.HORA_INICIO, new_row.HORA_FIN,
           new_row.ID_RESERVA, new_row.ID_TIPO_ACTIVIDAD) > 0 THEN
        RAISERROR 99999 'El horario coincide con una reserva ya existente.';
        RETURN;
    END IF;
END;


/*--------------------------------------------------------------*/
/* Regla del enunciado: toda cancelacion registra obligatoria-    */
/* mente el motivo y el usuario responsable.                      */
/* Si el backend no manda el usuario, se completa con CURRENT     */
/* USER (la autenticacion usa usuarios reales de la base).        */
/*--------------------------------------------------------------*/
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
        IF new_row.MOTIVO_CANCELACION IS NULL
           OR TRIM(new_row.MOTIVO_CANCELACION) = '' THEN
            RAISERROR 99999 'Una reserva cancelada debe registrar el motivo de la cancelacion.';
            RETURN;
        END IF;

        IF new_row.USUARIO_CANCELACION IS NULL
           OR TRIM(new_row.USUARIO_CANCELACION) = '' THEN
            SET new_row.USUARIO_CANCELACION = CURRENT USER;
        END IF;
    END IF;
END;


/*==============================================================*/
/* 6. TRIGGERS DE VALIDACION - LABORATORIOS                     */
/*==============================================================*/

/*--------------------------------------------------------------*/
/* Solo administradores pueden dejar un laboratorio Fuera de      */
/* servicio ('F') o Bloqueado ('B').                              */
/* Early return si el estado no cambia: asi se pueden editar      */
/* capacidad, computadoras, etc. sin ser admin.                   */
/*--------------------------------------------------------------*/
CREATE TRIGGER "tr_validar_cambio_estado_lab" BEFORE UPDATE
ORDER 1 ON "DBA"."LABORATORIOS"
REFERENCING OLD AS old_row NEW AS new_row
FOR EACH ROW
BEGIN
    DECLARE v_tipo_nuevo CHAR(1);

    IF old_row.ESTADO = new_row.ESTADO THEN
        RETURN;
    END IF;

    SELECT TIPO INTO v_tipo_nuevo
    FROM "DBA"."ESTADOS_OPERATIVOS"
    WHERE ESTADO = new_row.ESTADO;

    IF v_tipo_nuevo IN ('F','B') AND DBA."fn_es_administrador"(CURRENT USER) = 0 THEN
        RAISERROR 99999 'Solo usuarios administrativos pueden poner un laboratorio Fuera de servicio o Bloqueado.';
        RETURN;
    END IF;
END;


/*--------------------------------------------------------------*/
/* Regla del enunciado: no se puede eliminar fisicamente un       */
/* laboratorio con reservas historicas asociadas.                 */
/* Se implementa con trigger y no con la FK, porque la FK ya es   */
/* ON DELETE RESTRICT pero devolveria un error tecnico ilegible;  */
/* asi el usuario recibe un mensaje claro.                        */
/*--------------------------------------------------------------*/
CREATE TRIGGER "tr_no_eliminar_lab_con_reservas" BEFORE DELETE
ORDER 1 ON "DBA"."LABORATORIOS"
REFERENCING OLD AS old_row
FOR EACH ROW
BEGIN
    DECLARE v_count INTEGER;

    SELECT COUNT(*) INTO v_count
    FROM "DBA"."RESERVAS"
    WHERE NUMERO_LABORATORIO = old_row.NUMERO_LABORATORIO;

    IF v_count > 0 THEN
        RAISERROR 99999 'No se puede eliminar el laboratorio: tiene reservas historicas asociadas.';
        RETURN;
    END IF;
END;

COMMIT;


/*==============================================================*/
/* 7. TRIGGERS DE AUDITORIA (AFTER)                             */
/*                                                              */
/* Alcance: se auditan RESERVAS, LABORATORIOS y MANTENIMIENTOS,  */
/* es decir los eventos de negocio con consecuencia operativa.    */
/* Quedan afuera a proposito:                                     */
/*   - los catalogos (tipos, prioridades, estados), que casi no   */
/*     cambian y cuyo cambio no afecta una operacion concreta;    */
/*   - SOLICITANTES, porque la propia reserva ya registra quien   */
/*     la pidio.                                                  */
/*                                                              */
/* USUARIO y FECHA_HORA no se pasan: la tabla AUDITORIA los       */
/* toma por DEFAULT (CURRENT USER / CURRENT TIMESTAMP).           */
/* Son AFTER porque solo tiene sentido registrar lo que           */
/* efectivamente quedo grabado.                                   */
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


/*--------------------------------------------------------------*/
/* Audita dos eventos distintos sobre la misma fila:              */
/*   1) cambio de estado (con el motivo si fue cancelacion)       */
/*   2) reprogramacion (fecha, hora o laboratorio)                */
/* Si en un mismo UPDATE cambian los dos, se generan dos          */
/* renglones. Si no cambia ninguno de los campos observados, no   */
/* se inserta nada.                                               */
/*--------------------------------------------------------------*/
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

    /*---- Evento 1: cambio de estado ----*/
    IF old_row.ID_ESTADO_RESERVA <> new_row.ID_ESTADO_RESERVA THEN
        SELECT ESTADO_RESERVA INTO v_estado_old
        FROM "DBA"."ESTADO_RESERVA"
        WHERE ID_ESTADO_RESERVA = old_row.ID_ESTADO_RESERVA;

        SELECT ESTADO_RESERVA INTO v_estado_new
        FROM "DBA"."ESTADO_RESERVA"
        WHERE ID_ESTADO_RESERVA = new_row.ID_ESTADO_RESERVA;

        SET v_nombre_old =
            CASE v_estado_old
                WHEN 'P' THEN 'Pendiente'
                WHEN 'U' THEN 'Utilizada'
                WHEN 'C' THEN 'Cancelada'
                WHEN 'A' THEN 'Ausente'
                WHEN 'D' THEN 'Desplazada'
                ELSE v_estado_old
            END;

        SET v_nombre_new =
            CASE v_estado_new
                WHEN 'P' THEN 'Pendiente'
                WHEN 'U' THEN 'Utilizada'
                WHEN 'C' THEN 'Cancelada'
                WHEN 'A' THEN 'Ausente'
                WHEN 'D' THEN 'Desplazada'
                ELSE v_estado_new
            END;

        SET v_desc = 'Reserva #' || new_row.ID_RESERVA
                  || ' cambio de estado: ' || v_nombre_old || ' -> ' || v_nombre_new;

        -- El motivo es obligatorio en 'C' (trigger ORDER 4) y lo pone
        -- sp_crear_reserva en 'D'
        IF v_estado_new IN ('C','D') AND new_row.MOTIVO_CANCELACION IS NOT NULL THEN
            SET v_desc = v_desc || '. Motivo: ' || new_row.MOTIVO_CANCELACION;
        END IF;

        INSERT INTO "DBA"."AUDITORIA" (TIPO_EVENTO, ID_REFERENCIA, DESCRIPCION)
        VALUES ('RESERVA_ESTADO', new_row.ID_RESERVA, v_desc);
    END IF;

    /*---- Evento 2: reprogramacion ----*/
    IF old_row.FECHA_A_RESERVAR      <> new_row.FECHA_A_RESERVAR
       OR old_row.HORA_INICIO        <> new_row.HORA_INICIO
       OR old_row.HORA_FIN           <> new_row.HORA_FIN
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


/*--------------------------------------------------------------*/
/* Cambio de estado operativo del laboratorio.                    */
/* Complementa la restriccion admin-only: ademas de impedirlo a   */
/* quien no corresponde, deja registrado quien y cuando lo hizo.  */
/*--------------------------------------------------------------*/
CREATE TRIGGER "tr_aud_laboratorios_update" AFTER UPDATE
ORDER 5 ON "DBA"."LABORATORIOS"
REFERENCING OLD AS old_row NEW AS new_row
FOR EACH ROW
BEGIN
    DECLARE v_tipo_old   CHAR(1);
    DECLARE v_tipo_new   CHAR(1);
    DECLARE v_nombre_old VARCHAR(30);
    DECLARE v_nombre_new VARCHAR(30);
    DECLARE v_desc       VARCHAR(500);

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

    /*---- Evento 1: cambio de estado ----*/
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

    /*---- Evento 2: cambio en el rango de fechas ----*/
    IF old_row.FECHA_INICIO          <> new_row.FECHA_INICIO
       OR old_row.FECHA_FIN_PREVISTA <> new_row.FECHA_FIN_PREVISTA THEN

        SET v_desc = 'Mantenimiento #' || new_row.ID_MANTENIMIENTO
                  || ' reprogramado. Rango: '
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
/* 8. VERIFICACION RAPIDA (opcional)                            */
/*==============================================================*/
-- SELECT proc_name FROM sys.sysprocedure WHERE proc_name LIKE 'sp_%' OR proc_name LIKE 'fn_%' ORDER BY 1;
-- SELECT trigger_name FROM sys.systrigger WHERE trigger_name LIKE 'tr_%' ORDER BY 1;
-- SELECT event_name FROM sys.sysevent;
