/*==============================================================*/
/* Cambios aplicados en vivo durante el desarrollo del backend,  */
/* todavía sin sumar a los scripts oficiales (bdTpf.sql /       */
/* objetos_bd.sql / datos_prueba_labcontrol_ordenado.sql).      */
/*==============================================================*/

/*==============================================================*/
/* RESERVAS_RECURSOS - Tabla de detalle para registrar          */
/* qué recursos solicita cada reserva.                          */
/*                                                              */
/* Ejecutar DESPUÉS de bdTpf.sql + objetos_bd.sql               */
/* y DESPUÉS de datos_prueba_labcontrol_ordenado.sql             */
/*==============================================================*/

ROLLBACK;   -- liberar cualquier lock pendiente

/*--------------------------------------------------------------*/
/* 1. CREAR TABLA   RESERVAS_RECURSOS                            */
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
/* 0. Revocar permisos peligrosos, por si ya corrieron una      */
/*    version anterior de este script (v1) que le daba a       */
/*    PUBLIC (incluido "solicitante") acceso de lectura a       */
/*    sys.sysuserperm, tabla que tiene la columna "password"    */
/*    con el hash de la clave de TODOS los usuarios (incluido   */
/*    DBA). Si nadie corrio la v1 todavia, estos REVOKE no      */
/*    hacen nada (no hay nada que revocar).                    */
/*==============================================================*/

REVOKE SELECT ON sys.sysuserperm FROM PUBLIC;
REVOKE SELECT ON sys.sysgroup FROM PUBLIC;


/*==============================================================*/
/* 1. Columnas nuevas en RESERVAS (trazabilidad de cancelación) */
/*==============================================================*/

ALTER TABLE RESERVAS ADD MOTIVO_CANCELACION VARCHAR(100) NULL;
ALTER TABLE RESERVAS ADD USUARIO_CANCELACION VARCHAR(50) NULL;


/*==============================================================*/
/* 2. Autoincrement en MANTENIMIENTOS (faltaba, causaba error   */
/*    "cannot be NULL" al insertar sin pasar el id a mano)      */
/*==============================================================*/

ALTER TABLE MANTENIMIENTOS ALTER ID_MANTENIMIENTO DEFAULT AUTOINCREMENT;


/*==============================================================*/
/* 3. Tipo de actividad para directores/decanos                */
/*    RESUELTO: el grupo optó por la propuesta que renombra     */
/*    TIPO_ACTIVIDAD (no la de agregar 'Actividad Directiva'    */
/*    con PRIORIDAD = 0, que quedó descartada). PRIORIDADES     */
/*    sigue en 4 niveles (Alta/Media Alta/Media/Baja) sin       */
/*    tocarse; sólo cambian nombres y el desempate fino en      */
/*    TIPO_ACTIVIDAD.NIVEL_PRIORIDAD/ID_PRIORIDAD.               */
/*                                                              */
/*    OJO: la columna TIPO_ACTIVIDAD.PRIORIDAD se renombró a    */
/*    NIVEL_PRIORIDAD (commit b483ffe, "para mejor entendimiento")*/
/*    Correr esto DESPUES de aplicar ese rename en la base.     */
/*                                                              */
/*    Matchea por NOMBRE (no por ID_TIPO_ACTIVIDAD) porque el   */
/*    autoincrement hace que los IDs difieran entre las bases   */
/*    locales de cada integrante.                               */
/*==============================================================*/

UPDATE TIPO_ACTIVIDAD SET NOMBRE = 'Clase'
 WHERE NOMBRE = 'Clase Regular';

UPDATE TIPO_ACTIVIDAD SET NIVEL_PRIORIDAD = 4, ID_PRIORIDAD = 2
 WHERE NOMBRE = 'Defensa Proyecto Final';

UPDATE TIPO_ACTIVIDAD SET NIVEL_PRIORIDAD = 2
 WHERE NOMBRE = 'Evento Institucional';

UPDATE TIPO_ACTIVIDAD SET NOMBRE = 'Examen', NIVEL_PRIORIDAD = 3
 WHERE NOMBRE = 'Examen Institucional';

UPDATE TIPO_ACTIVIDAD SET NOMBRE = 'Exposicion', NIVEL_PRIORIDAD = 5, DURACION_MAX_HORAS = 4
 WHERE NOMBRE = 'Exposicion y Tesis';

-- Sólo inserta si todavía no existe (evita duplicar al re-correr el script)
INSERT INTO TIPO_ACTIVIDAD (ID_PRIORIDAD, NOMBRE, PRIORIDAD, DURACION_MAX_HORAS)
SELECT 1, 'Reunion Directiva', 1, 3
 WHERE NOT EXISTS (SELECT 1 FROM TIPO_ACTIVIDAD WHERE NOMBRE = 'Reunion Directiva');


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

-- Procedimientos que llama la interfaz móvil
GRANT EXECUTE ON DBA.sp_laboratorios_disponibles TO solicitante;
GRANT EXECUTE ON DBA.sp_horarios_disponibles TO solicitante;

-- Nota: NO se necesita ningún GRANT sobre sys.sysgroup ni
-- sys.sysuserperm. El backend valida membresía de admin contra
-- la vista SYSGROUPS (group_name, member_name), que ya es
-- legible por PUBLIC por defecto en SQL Anywhere y no expone
-- nada sensible (a diferencia de las tablas base del catálogo).

COMMIT;


/*==============================================================*/
/* 5. Verificación rápida (opcional, para confirmar que quedó   */
/*    todo bien después de correr este script)                 */
/*==============================================================*/

SELECT ID_TIPO_ACTIVIDAD, NOMBRE, PRIORIDAD, ID_PRIORIDAD FROM TIPO_ACTIVIDAD ORDER BY PRIORIDAD;

SELECT * FROM SYSGROUPS WHERE group_name = 'ADMINISTRADORES';


/*==============================================================*/
/* PASO 1 - Quitar la FK de LABORATORIOS hacia PISOS            */
/*==============================================================*/
ROLLBACK;
ALTER TABLE DBA.LABORATORIOS
   DELETE FOREIGN KEY FK_LABORATO_REFERENCE_PISOS;
COMMIT;

/*==============================================================*/
/* PASO 1b - Quitar la FK de PISOS hacia EDIFICIOS               */
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
/* PASO 5b - Reponer la FK de PISOS hacia EDIFICIOS              */
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

/*==============================================================*/
/* PASO 10 - Corregir ESTADO_RESERVA                            */
/* En algunas bases la constraint no dejaba usar 'P' (Pendiente) */
/* y los codigos habian quedado mal mapeados (ej: 1='C' en vez  */
/* de 1='P'). El mapeo correcto es P=Pendiente, U=Utilizada,    */
/* C=Cancelada, A=Ausente (ver datos_prueba_labcontrol_ordenado */
/* .sql). Sin esto, list_reservas.html muestra el estado vacio  */
/* ("-") porque el join con ESTADO_RESERVA no encuentra 'P'.    */
/*==============================================================*/
ROLLBACK;

if exists(
   select 1 from sys.sysconstraint
   where constraint_name = 'CKC_ESTADO_RESERVA_ESTADO_R'
) then
    ALTER TABLE DBA.ESTADO_RESERVA
       DELETE CONSTRAINT CKC_ESTADO_RESERVA_ESTADO_R
end if;

ALTER TABLE DBA.ESTADO_RESERVA
   ADD CONSTRAINT CKC_ESTADO_RESERVA_ESTADO_R
   CHECK (ESTADO_RESERVA in ('P','U','C','A') AND ESTADO_RESERVA = UPPER(ESTADO_RESERVA));

-- Si ya existen los 4 codigos pero mal mapeados, los corrige por
-- ID; si falta alguno, lo agrega. No cambia el ID_ESTADO_RESERVA
-- de las reservas ya cargadas, solo el texto que le corresponde
-- a cada ID.
UPDATE DBA.ESTADO_RESERVA SET ESTADO_RESERVA = 'P' WHERE ID_ESTADO_RESERVA = 1;
UPDATE DBA.ESTADO_RESERVA SET ESTADO_RESERVA = 'U' WHERE ID_ESTADO_RESERVA = 2;
UPDATE DBA.ESTADO_RESERVA SET ESTADO_RESERVA = 'C' WHERE ID_ESTADO_RESERVA = 3;

INSERT INTO DBA.ESTADO_RESERVA (ID_ESTADO_RESERVA, ESTADO_RESERVA)
SELECT 4, 'A'
 WHERE NOT EXISTS (SELECT 1 FROM DBA.ESTADO_RESERVA WHERE ID_ESTADO_RESERVA = 4);

UPDATE DBA.ESTADO_RESERVA SET ESTADO_RESERVA = 'A' WHERE ID_ESTADO_RESERVA = 4;

COMMIT;
