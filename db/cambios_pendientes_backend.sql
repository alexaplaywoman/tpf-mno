/*==============================================================*/
/* Cambios aplicados en vivo durante el desarrollo del backend,  */
/* todavía sin sumar a los scripts oficiales (bdTpf.sql /       */
/* objetos_bd.sql / datos_prueba_labcontrol_ordenado.sql).      */
/*==============================================================*/


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
/*    PRIORIDADES no se toca (ya es correcta: Alta/Media Alta/  */
/*    Media/Baja). Solo agregamos el TIPO_ACTIVIDAD que falta,  */
/*    con PRIORIDAD = 0 (mas prioritario que Evento Institucional,*/
/*    que hoy es el mas alto con PRIORIDAD = 1).                */
/*==============================================================*/

INSERT INTO TIPO_ACTIVIDAD (ID_TIPO_ACTIVIDAD, ID_PRIORIDAD, NOMBRE, PRIORIDAD, DURACION_MAX_HORAS)
VALUES (8, 1, 'Actividad Directiva', 0, 4);

/* DECISION PENDIENTE DEL GRUPO (como ya les habían marcado):
   'Defensa Proyecto Final' (ID 6) parece ser el mismo concepto
   que 'Exposicion y Tesis'. Si el grupo confirma que es lo mismo,
   descomentar este UPDATE (no hace falta tocar el numero de
   PRIORIDAD, ya está en 3). Si prefieren mantenerlos separados,
   dejar comentado y no hacer nada. */

-- UPDATE TIPO_ACTIVIDAD SET NOMBRE = 'Exposicion y Tesis' WHERE NOMBRE = 'Defensa Proyecto Final';


/*==============================================================*/
/* 4. Usuarios y grupo de administradores                       */
/*==============================================================*/

GRANT CONNECT TO admin IDENTIFIED BY 'admin123';
GRANT CONNECT TO solicitante IDENTIFIED BY 'soli123';

-- admin es personal administrativo, con privilegios amplios
GRANT DBA TO admin;

-- Grupo para validar acciones administrativas desde el backend.
-- Sin IDENTIFIED BY: el grupo no necesita poder loguearse.
GRANT CONNECT TO ADMINISTRADORES;
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
