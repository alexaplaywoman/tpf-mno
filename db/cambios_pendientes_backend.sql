/*==============================================================*/
/* Cambios aplicados en vivo contra bd/labcontrol.db durante     */
/* el desarrollo del backend, todavía sin sumar a los scripts   */
/* oficiales (bdTpf.sql / objetos_bd.sql / datos_prueba...sql). */
/* Ya están probados y funcionando, esto es para dejarlos       */
/* versionados y que la base se pueda recrear desde cero.       */
/*==============================================================*/


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
/* 3. Escala de prioridades 0-4 (0 = mayor prioridad)           */
/*    Nota: no se puede borrar e insertar de nuevo los ids      */
/*    1, 2 y 3 porque TIPO_ACTIVIDAD ya los referencia por FK   */
/*    (FK_TIPO_ACT_REFERENCE_PRIORIDA). Por eso los 3 primeros  */
/*    van con UPDATE y los nuevos (0 y 4) con INSERT.           */
/*==============================================================*/

INSERT INTO PRIORIDADES (ID_PRIORIDAD, NOMBRE) VALUES (0, 'Directores y Decanos');
UPDATE PRIORIDADES SET NOMBRE = 'Evento Institucional' WHERE ID_PRIORIDAD = 1;
UPDATE PRIORIDADES SET NOMBRE = 'Examen'               WHERE ID_PRIORIDAD = 2;
UPDATE PRIORIDADES SET NOMBRE = 'Exposicion y Tesis'   WHERE ID_PRIORIDAD = 3;
INSERT INTO PRIORIDADES (ID_PRIORIDAD, NOMBRE) VALUES (4, 'Clase');

UPDATE TIPO_ACTIVIDAD SET ID_PRIORIDAD = 4, PRIORIDAD = 4 WHERE NOMBRE = 'Clase Regular';
UPDATE TIPO_ACTIVIDAD SET ID_PRIORIDAD = 2, PRIORIDAD = 2 WHERE NOMBRE = 'Examen';
UPDATE TIPO_ACTIVIDAD SET ID_PRIORIDAD = 4, PRIORIDAD = 4 WHERE NOMBRE = 'Capacitacion';
UPDATE TIPO_ACTIVIDAD SET ID_PRIORIDAD = 4, PRIORIDAD = 4 WHERE NOMBRE = 'Tutoria';
UPDATE TIPO_ACTIVIDAD SET ID_PRIORIDAD = 1, PRIORIDAD = 1 WHERE NOMBRE = 'Evento';
UPDATE TIPO_ACTIVIDAD SET ID_PRIORIDAD = 4, PRIORIDAD = 4 WHERE NOMBRE = 'Practica';

-- Tipos de actividad nuevos que no existían todavía
INSERT INTO TIPO_ACTIVIDAD (ID_TIPO_ACTIVIDAD, ID_PRIORIDAD, NOMBRE, PRIORIDAD, DURACION_MAX_HORAS)
VALUES (7, 0, 'Actividad Directiva', 0, 4);

INSERT INTO TIPO_ACTIVIDAD (ID_TIPO_ACTIVIDAD, ID_PRIORIDAD, NOMBRE, PRIORIDAD, DURACION_MAX_HORAS)
VALUES (8, 3, 'Exposicion y Tesis', 3, 3);


/*==============================================================*/
/* 4. Usuarios y grupo de administradores                       */
/*==============================================================*/

GRANT CONNECT TO admin IDENTIFIED BY 'admin123';
GRANT CONNECT TO solicitante IDENTIFIED BY 'soli123';

-- admin es personal administrativo, con privilegios amplios
GRANT DBA TO admin;

-- grupo que usa el backend para validar quién puede hacer
-- acciones administrativas (cambiar estado de laboratorio,
-- reprogramar/eliminar reservas, eliminar registros, etc.)
GRANT CONNECT TO ADMINISTRADORES IDENTIFIED BY 'unaClaveSegura123';
GRANT GROUP TO ADMINISTRADORES;
GRANT MEMBERSHIP IN GROUP ADMINISTRADORES TO admin;

-- solicitante: permisos acotados, solo lo que necesita para
-- consultar y reservar desde el celular
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


/*==============================================================*/
/* 5. Permiso para que cualquier usuario (incluido solicitante) */
/*    pueda consultar la membresía de ADMINISTRADORES sin que   */
/*    el chequeo del backend tire "Permission denied"           */
/*==============================================================*/

GRANT SELECT ON sys.sysgroup TO PUBLIC;
GRANT SELECT ON sys.sysuserperm TO PUBLIC;


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
