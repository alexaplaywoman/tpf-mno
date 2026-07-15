/*==============================================================*/
/* Cambios aplicados en vivo contra bd/labcontrol.db durante     */
/* el desarrollo del backend, todavía sin sumar a los scripts   */
/* oficiales (bdTpf.sql / objetos_bd.sql / datos_prueba...sql). */
/* Ya están probados y funcionando, esto es para dejarlos       */
/* versionados y que la base se pueda recrear desde cero.       */
/*==============================================================*/

*==============================================================*/
/* RESERVAS_RECURSOS - Tabla de detalle para registrar          */
/* qué recursos solicita cada reserva.                          */
/*                                                              */
/* Ejecutar DESPUÉS de bdTpf.sql + objetos_bd.sql               */
/* y DESPUÉS de datos_prueba_labcontrol_ordenado.sql             */
/*==============================================================*/
 
ROLLBACK;   -- liberar cualquier lock pendiente
 
/*--------------------------------------------------------------*/
/* 1. CREAR TABLA   RESERVAS_RECURSOS                                            */
/*--------------------------------------------------------------*/
 
if exists(
   select 1 from sys.systable 
   where table_name='RESERVAS_RECURSOS'
     and table_type in ('BASE', 'GBL TEMP')
     and creator=user_id('DBA')
) then
    drop table DBA.RESERVAS_RECURSOS
end if;
 
CREATE TABLE DBA.RESERVAS_RECURSOS (
   ID_RESERVA           INT            NOT NULL,
   ID_RECURSO           INT            NOT NULL,
   CONSTRAINT PK_RESERVAS_RECURSOS 
      PRIMARY KEY CLUSTERED (ID_RESERVA, ID_RECURSO),
   CONSTRAINT FK_RR_RESERVA FOREIGN KEY (ID_RESERVA)
      REFERENCES DBA.RESERVAS (ID_RESERVA)
      ON UPDATE RESTRICT
      ON DELETE CASCADE,       -- si se borra la reserva, se borran sus recursos
   CONSTRAINT FK_RR_RECURSO FOREIGN KEY (ID_RECURSO)
      REFERENCES DBA.RECURSOS (ID_RECURSO)
      ON UPDATE RESTRICT
      ON DELETE RESTRICT
);
 
COMMIT;
 
/*--------------------------------------------------------------*/
/* 2. GRANTS para el usuario solicitante                        */
/*--------------------------------------------------------------*/
 
-- Ajustá 'solicitante' al nombre exacto de tu usuario si difiere
GRANT SELECT, INSERT, DELETE ON DBA.RESERVAS_RECURSOS TO solicitante;


/*==============================================================*/
/* 1.B Columnas nuevas en RESERVAS (trazabilidad de cancelación) */
/*==============================================================*/

ALTER TABLE RESERVAS ADD MOTIVO_CANCELACION VARCHAR(100) NULL;
ALTER TABLE RESERVAS ADD USUARIO_CANCELACION VARCHAR(50) NULL;


/*==============================================================*/
/* 2. Autoincrement en MANTENIMIENTOS (faltaba, causaba error   */
/*    "cannot be NULL" al insertar sin pasar el id a mano)      */
/*==============================================================*/

ALTER TABLE MANTENIMIENTOS ALTER ID_MANTENIMIENTO DEFAULT AUTOINCREMENT;


/*==============================================================*/
/* 3. Escala de prioridades 0-4 (0 = mayor prioridad)           */
/*    Nota: no se puede borrar e insertar de nuevo los ids      */
/*    1, 2 y 3 porque TIPO_ACTIVIDAD ya los referencia por FK   */
/*    (FK_TIPO_ACT_REFERENCE_PRIORIDA). Por eso los 3 primeros  */
/*    van con UPDATE y los nuevos (0 y 4) con INSERT.           */
/*==============================================================*/

-- 1. Insertar el nuevo registro con ID=5
INSERT INTO prioridades (ID_PRIORIDAD, NOMBRE)
VALUES (5, 'Clase');

-- 2. Actualizar los nombres de los registros existentes
UPDATE prioridades
SET NOMBRE = CASE ID_PRIORIDAD
    WHEN 0 THEN 'Reunión Directiva'
    WHEN 1 THEN 'Evento Institucional'
    WHEN 2 THEN 'Examen'
    WHEN 3 THEN 'Defensa Proyecto Final'
    WHEN 4 THEN 'Exposicion'
    WHEN 5 THEN 'Clase'
    ELSE NOMBRE
END;


/*==============================================================*/
/* 4. Usuarios y grupo de administradores                       */
/*==============================================================*/

GRANT CONNECT TO admin IDENTIFIED BY 'admin123';
GRANT CONNECT TO solicitante IDENTIFIED BY 'soli123';

GRANT DBA TO admin;

-- Grupo para validar acciones administrativas desde el backend.
-- Sin IDENTIFIED BY: el grupo no necesita poder loguearse.
GRANT CONNECT TO ADMINISTRADORES;
GRANT GROUP TO ADMINISTRADORES;
GRANT MEMBERSHIP IN GROUP ADMINISTRADORES TO admin;

/*==============================================================*/
/* Permisos de solicitante (perfil móvil)                       */
/*==============================================================*/
GRANT SELECT ON DBA.LABORATORIOS TO solicitante;
GRANT SELECT ON DBA.RESERVAS TO solicitante;
GRANT INSERT ON DBA.RESERVAS TO solicitante;
GRANT UPDATE ON DBA.RESERVAS TO solicitante;
GRANT SELECT ON DBA.ESTADO_RESERVA TO solicitante;
GRANT SELECT ON DBA.TIPO_ACTIVIDAD TO solicitante;
GRANT SELECT ON DBA.SOLICITANTES TO solicitante;
GRANT SELECT ON DBA.RECURSOS TO solicitante;
GRANT SELECT ON DBA.MANTENIMIENTOS TO solicitante;
GRANT SELECT ON DBA.EDIFICIOS TO solicitante;
GRANT SELECT ON DBA.PISOS TO solicitante;
GRANT SELECT ON DBA.ESTADOS_OPERATIVOS TO solicitante;

-- Procedimientos que llama la interfaz móvil (te faltaban)
GRANT EXECUTE ON DBA.sp_laboratorios_disponibles TO solicitante;
GRANT EXECUTE ON DBA.sp_horarios_disponibles TO solicitante

/*==============================================================*/
/* 6. Verificación rápida (opcional, para confirmar que quedó   */
/*    todo bien después de correr este script)                 */
/*==============================================================*/

SELECT * FROM PRIORIDADES ORDER BY ID_PRIORIDAD;
SELECT ID_TIPO_ACTIVIDAD, NOMBRE, PRIORIDAD, ID_PRIORIDAD FROM TIPO_ACTIVIDAD ORDER BY PRIORIDAD;

SELECT g.user_name AS grupo, m.user_name AS miembro
FROM sys.sysgroup sg
JOIN sys.sysuserperm g ON g.user_id = sg.group_id
JOIN sys.sysuserperm m ON m.user_id = sg.group_member
WHERE g.user_name = 'ADMINISTRADORES';


/*==============================================================*/
/* PASO 1 - Quitar la FK de LABORATORIOS hacia PISOS            */
/*==============================================================*/
ROLLBACK;
ALTER TABLE DBA.LABORATORIOS
   DELETE FOREIGN KEY FK_LABORATO_REFERENCE_PISOS;
COMMIT;

/*==============================================================*/
/* PASO 1b - <<< NUEVO: Quitar la FK de PISOS hacia EDIFICIOS  */
/* (su indice automatico es el que bloqueaba el ALTER)          */
/*==============================================================*/
ROLLBACK;
ALTER TABLE DBA.PISOS
   DELETE FOREIGN KEY FK_PISOS_REFERENCE_EDIFICIO;
COMMIT;

/*==============================================================*/
/* PASO 2 - Quitar la PK actual de PISOS (solo ID_EDIFICIO)     */
/*==============================================================*/
ROLLBACK;
ALTER TABLE DBA.PISOS
   DELETE PRIMARY KEY;
COMMIT;

/*==============================================================*/
/* PASO 3 - Quitar el autoincrement de ID_EDIFICIO en PISOS     */
/*==============================================================*/
ROLLBACK;
ALTER TABLE DBA.PISOS
   ALTER ID_EDIFICIO integer NOT NULL;
COMMIT;

/*==============================================================*/
/* PASO 4 - NRO_PISO obligatorio                                */
/*==============================================================*/
ROLLBACK;
ALTER TABLE DBA.PISOS
   ALTER NRO_PISO integer NOT NULL;
COMMIT;

/*==============================================================*/
/* PASO 5 - Nueva PK compuesta en PISOS                          */
/*==============================================================*/
ROLLBACK;
ALTER TABLE DBA.PISOS
   ADD CONSTRAINT PK_PISOS PRIMARY KEY CLUSTERED (ID_EDIFICIO, NRO_PISO);
COMMIT;

/*==============================================================*/
/* PASO 5b - <<< NUEVO: Reponer la FK de PISOS hacia EDIFICIOS */
/*==============================================================*/
ROLLBACK;
ALTER TABLE DBA.PISOS
   ADD CONSTRAINT FK_PISOS_REFERENCE_EDIFICIO FOREIGN KEY (ID_EDIFICIO)
      REFERENCES DBA.EDIFICIOS (ID_EDIFICIO)
      ON UPDATE RESTRICT
      ON DELETE RESTRICT;
COMMIT;

/*==============================================================*/
/* PASO 6 - Agregar NRO_PISO a LABORATORIOS (nullable primero)  */
/*==============================================================*/
ROLLBACK;
ALTER TABLE DBA.LABORATORIOS
   ADD NRO_PISO integer NULL;
COMMIT;

/*==============================================================*/
/* PASO 7 - Poblar NRO_PISO en filas existentes                 */
/*==============================================================*/
ROLLBACK;
UPDATE DBA.LABORATORIOS l
   SET NRO_PISO = (SELECT p.NRO_PISO
                      FROM DBA.PISOS p
                     WHERE p.ID_EDIFICIO = l.ID_EDIFICIO);
COMMIT;

/*==============================================================*/
/* PASO 8 - NRO_PISO obligatorio en LABORATORIOS                */
/*==============================================================*/
ROLLBACK;
ALTER TABLE DBA.LABORATORIOS
   ALTER NRO_PISO integer NOT NULL;
COMMIT;

/*==============================================================*/
/* PASO 9 - Reponer la FK compuesta LABORATORIOS -> PISOS       */
/*==============================================================*/
ROLLBACK;
ALTER TABLE DBA.LABORATORIOS
   ADD CONSTRAINT FK_LABORATO_REFERENCE_PISOS FOREIGN KEY (ID_EDIFICIO, NRO_PISO)
      REFERENCES DBA.PISOS (ID_EDIFICIO, NRO_PISO)
      ON UPDATE RESTRICT
      ON DELETE RESTRICT;
COMMIT;
