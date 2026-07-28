/*==============================================================*/
/* Agrega el estado "Desplazada" (letra 'D'), separado de       */
/* "Cancelada" (letra 'C'). Hoy sp_crear_reserva marca como      */
/* Cancelada tanto lo que cancela un solicitante/admin como lo   */
/* que el sistema desplaza automaticamente por prioridad - con   */
/* esto se distinguen.                                          */
/*                                                              */
/* Es admin-only en el sentido de que NO se agrega a la lista de */
/* estados seleccionables a mano (GET /api/reservas/estados/     */
/* listar): solo lo pone sp_crear_reserva.                       */
/*==============================================================*/

/*--------------------------------------------------------------*/
/* 1. Nuevo estado en DBA.ESTADO_RESERVA                         */
/*    La columna tiene un CHECK que solo permite P/U/C/A; hay    */
/*    que recrearlo para sumar 'D'. Si el nombre de la           */
/*    constraint en tu base es distinto, ajustalo aca (fijate    */
/*    con: SELECT constraint_name FROM SYS.SYSCONSTRAINT WHERE   */
/*    table_object_id = (SELECT object_id FROM SYS.SYSTABLE      */
/*    WHERE table_name='ESTADO_RESERVA')).                       */
/*--------------------------------------------------------------*/
IF EXISTS (SELECT 1 FROM SYS.SYSCONSTRAINT WHERE constraint_name = 'CKC_ESTADO_RESERVA_ESTADO_R') THEN
    ALTER TABLE DBA.ESTADO_RESERVA DROP CONSTRAINT CKC_ESTADO_RESERVA_ESTADO_R;
END IF;

ALTER TABLE DBA.ESTADO_RESERVA ADD CONSTRAINT CKC_ESTADO_RESERVA_ESTADO_R CHECK (ESTADO_RESERVA IN ('P','U','C','A','D'));

IF NOT EXISTS (SELECT 1 FROM DBA.ESTADO_RESERVA WHERE ESTADO_RESERVA = 'D') THEN
    INSERT INTO DBA.ESTADO_RESERVA (ID_ESTADO_RESERVA, ESTADO_RESERVA)
    VALUES ((SELECT COALESCE(MAX(ID_ESTADO_RESERVA), 0) + 1 FROM DBA.ESTADO_RESERVA), 'D');
END IF;

COMMIT;

/*--------------------------------------------------------------*/
/* 1.b Backfill: reservas viejas que el sistema ya habia          */
/*     desplazado (quedaron como Cancelada porque el estado       */
/*     Desplazada no existia todavia). Las identificamos por el   */
/*     motivo exacto que siempre les puso sp_crear_reserva - no    */
/*     toca ninguna cancelacion real hecha por un solicitante o    */
/*     admin, esas tienen otro motivo.                             */
/*--------------------------------------------------------------*/
UPDATE DBA.RESERVAS
SET ID_ESTADO_RESERVA = (SELECT ID_ESTADO_RESERVA FROM DBA.ESTADO_RESERVA WHERE ESTADO_RESERVA = 'D')
WHERE MOTIVO_CANCELACION = 'Desplazada por reserva de mayor prioridad'
  AND ID_ESTADO_RESERVA = (SELECT ID_ESTADO_RESERVA FROM DBA.ESTADO_RESERVA WHERE ESTADO_RESERVA = 'C');

COMMIT;

/*--------------------------------------------------------------*/
/* 2. sp_crear_reserva: usar "Desplazada" en vez de "Cancelada"  */
/*    para las reservas que reemplaza por prioridad.             */
/*--------------------------------------------------------------*/
DROP PROCEDURE IF EXISTS DBA.sp_crear_reserva;

CREATE PROCEDURE DBA.sp_crear_reserva(
  in p_numero_laboratorio integer,
  in p_cedula_identidad integer,
  in p_correo varchar(80),
  in p_id_tipo_actividad integer,
  in p_fecha_a_reservar date,
  in p_hora_inicio time,
  in p_hora_fin time,
  in p_cantidad_alumnos integer )
result( ID_RESERVA integer,DESPLAZADAS varchar(500) )
begin
  declare v_nivel_nuevo integer;
  declare v_id_estado_pendiente integer;
  declare v_id_estado_desplazada integer;
  declare v_nuevo_id integer;
  declare v_desplazadas varchar(500);
  select NIVEL_PRIORIDAD
    into v_nivel_nuevo from DBA.TIPO_ACTIVIDAD
    where ID_TIPO_ACTIVIDAD = p_id_tipo_actividad;
  if v_nivel_nuevo is null then
    raiserror 99999 'Tipo de actividad inexistente.';
    return
  end if;
  select ID_ESTADO_RESERVA
    into v_id_estado_pendiente from DBA.ESTADO_RESERVA where ESTADO_RESERVA = 'P';
  select ID_ESTADO_RESERVA
    into v_id_estado_desplazada from DBA.ESTADO_RESERVA where ESTADO_RESERVA = 'D';
  select LIST(r.ID_RESERVA,',')
    into v_desplazadas from DBA.RESERVAS as r
      join DBA.TIPO_ACTIVIDAD as ta on ta.ID_TIPO_ACTIVIDAD = r.ID_TIPO_ACTIVIDAD
      join DBA.ESTADO_RESERVA as er on er.ID_ESTADO_RESERVA = r.ID_ESTADO_RESERVA
    where r.NUMERO_LABORATORIO = p_numero_laboratorio
    and r.FECHA_A_RESERVAR = p_fecha_a_reservar
    and er.ESTADO_RESERVA not in( 'C','A','D' )
    and ta.NIVEL_PRIORIDAD > v_nivel_nuevo
    and p_hora_inicio < r.HORA_FIN
    and p_hora_fin > r.HORA_INICIO;
  if v_desplazadas is not null then
    update DBA.RESERVAS
      set ID_ESTADO_RESERVA = v_id_estado_desplazada,
      MOTIVO_CANCELACION = 'Desplazada por reserva de mayor prioridad',
      USUARIO_CANCELACION = current user
      where ID_RESERVA
       = any(select r.ID_RESERVA
        from DBA.RESERVAS as r
          join DBA.TIPO_ACTIVIDAD as ta on ta.ID_TIPO_ACTIVIDAD = r.ID_TIPO_ACTIVIDAD
          join DBA.ESTADO_RESERVA as er on er.ID_ESTADO_RESERVA = r.ID_ESTADO_RESERVA
        where r.NUMERO_LABORATORIO = p_numero_laboratorio
        and r.FECHA_A_RESERVAR = p_fecha_a_reservar
        and er.ESTADO_RESERVA not in( 'C','A','D' )
        and ta.NIVEL_PRIORIDAD > v_nivel_nuevo
        and p_hora_inicio < r.HORA_FIN
        and p_hora_fin > r.HORA_INICIO)
  end if;
  insert into DBA.RESERVAS
    ( NUMERO_LABORATORIO,CEDULA_IDENTIDAD,CORREO,
    ID_ESTADO_RESERVA,ID_TIPO_ACTIVIDAD,
    FECHA_A_RESERVAR,HORA_INICIO,HORA_FIN,
    CANTIDAD_ALUMNOS,FECHA_SOLICITUD )
    values( p_numero_laboratorio,p_cedula_identidad,p_correo,
    v_id_estado_pendiente,p_id_tipo_actividad,
    p_fecha_a_reservar,p_hora_inicio,p_hora_fin,
    p_cantidad_alumnos,current date ) ;
  set v_nuevo_id = @@IDENTITY;
  select v_nuevo_id as ID_RESERVA,v_desplazadas as DESPLAZADAS
end;

/*--------------------------------------------------------------*/
/* 3. fn_existe_solapamiento_reservas: una reserva Desplazada no */
/*    debe seguir bloqueando ese horario (igual que Cancelada).  */
/*--------------------------------------------------------------*/
DROP FUNCTION IF EXISTS DBA.fn_existe_solapamiento_reservas;

CREATE FUNCTION DBA.fn_existe_solapamiento_reservas(
  in p_numero_laboratorio integer,
  in p_fecha date,
  in p_hora_inicio time,
  in p_hora_fin time,
  in p_id_reserva_excluir integer,
  in p_id_tipo_actividad integer )
returns integer
not deterministic
begin
  declare v_count integer;
  declare v_prioridad_nueva integer;
  if p_id_tipo_actividad is not null then
    select NIVEL_PRIORIDAD
      into v_prioridad_nueva from DBA.TIPO_ACTIVIDAD
      where ID_TIPO_ACTIVIDAD = p_id_tipo_actividad
  end if;
  select COUNT()
    into v_count from DBA.RESERVAS as r
      join DBA.TIPO_ACTIVIDAD as ta on ta.ID_TIPO_ACTIVIDAD = r.ID_TIPO_ACTIVIDAD
      join DBA.ESTADO_RESERVA as er on er.ID_ESTADO_RESERVA = r.ID_ESTADO_RESERVA
    where r.NUMERO_LABORATORIO = p_numero_laboratorio
    and r.FECHA_A_RESERVAR = p_fecha
    and(p_id_reserva_excluir is null or r.ID_RESERVA <> p_id_reserva_excluir)
    and er.ESTADO_RESERVA not in( 'C','A','D' )
    and(v_prioridad_nueva is null or ta.NIVEL_PRIORIDAD <= v_prioridad_nueva)
    and p_hora_inicio < r.HORA_FIN
    and p_hora_fin > r.HORA_INICIO;
  return v_count
end;

/*--------------------------------------------------------------*/
/* 4. Reportes: una reserva Desplazada tampoco es "utilizacion"  */
/*    real, se excluye igual que Cancelada/Ausente.              */
/*--------------------------------------------------------------*/
DROP PROCEDURE IF EXISTS DBA.sp_reporte_laboratorios_mas_utilizados;

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

DROP PROCEDURE IF EXISTS DBA.sp_reporte_horarios_mas_ocupados;

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

DROP PROCEDURE IF EXISTS DBA.sp_reporte_porcentaje_recursos;

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

GRANT EXECUTE ON DBA.sp_crear_reserva TO PUBLIC;
GRANT EXECUTE ON DBA.fn_existe_solapamiento_reservas TO PUBLIC;
GRANT EXECUTE ON DBA.sp_reporte_laboratorios_mas_utilizados TO PUBLIC;
GRANT EXECUTE ON DBA.sp_reporte_horarios_mas_ocupados TO PUBLIC;
GRANT EXECUTE ON DBA.sp_reporte_porcentaje_recursos TO PUBLIC;

COMMIT;
