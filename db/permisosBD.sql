/*==============================================================*/
/* Permisos y usuarios del sistema LabControl.                  */
/* v2 - correcciones de seguridad y limpieza.                   */
/*                                                              */


/*==============================================================*/
/* 0. Revocaciones defensivas                                   */
/*    Por si se corrio una version previa de este script que    */
/*    le dio a solicitante acceso de lectura a SYS.SYSUSERPERM   */
/*    (columna "password" con el hash de clave de todos los      */
/*    usuarios, incluido DBA). Si nunca se otorgo, el REVOKE     */
/*    simplemente no encuentra nada que revocar.                 */
/*==============================================================*/
-- REVOKE SELECT ON SYS.SYSUSERPERM FROM solicitante;
COMMIT;

/*==============================================================*/
/* 1. Usuarios y grupo de administradores                       */
/*==============================================================*/
GRANT CONNECT TO admin IDENTIFIED BY 'admin123';
GRANT CONNECT TO solicitante IDENTIFIED BY 'soli123';

GRANT DBA TO admin;
COMMIT;

-- Grupo para validar acciones administrativas desde el backend.
-- Sin IDENTIFIED BY: el grupo no necesita poder loguearse.
GRANT CONNECT TO ADMINISTRADORES;
GRANT GROUP TO ADMINISTRADORES;
GRANT MEMBERSHIP IN GROUP ADMINISTRADORES TO admin;
COMMIT;

/*==============================================================*/
/* 2. Permisos de solicitante (perfil movil, cuenta compartida) */
/*==============================================================*/
-- Catalogos de solo lectura para armar los formularios
GRANT SELECT ON DBA.LABORATORIOS           TO solicitante;
GRANT SELECT ON DBA.ESTADOS_OPERATIVOS     TO solicitante;
GRANT SELECT ON DBA.TIPO_ACTIVIDAD         TO solicitante;
GRANT SELECT ON DBA.PRIORIDADES            TO solicitante;
GRANT SELECT ON DBA.RECURSOS               TO solicitante;
GRANT SELECT ON DBA.ESTADO_RESERVA         TO solicitante;
GRANT SELECT ON DBA.EDIFICIOS              TO solicitante;
GRANT SELECT ON DBA.PISOS                  TO solicitante;
GRANT SELECT ON DBA.CARRERAS               TO solicitante;
GRANT SELECT ON DBA.DEPARTAMENTOS          TO solicitante;
GRANT SELECT ON DBA.TIPOS_SOLICITANTES     TO solicitante;
GRANT SELECT ON DBA.TIPOS_DOCUMENTOS       TO solicitante;

-- Ver sus propios datos y reservas
GRANT SELECT ON DBA.SOLICITANTES           TO solicitante;
GRANT SELECT ON DBA.RESERVAS               TO solicitante;
GRANT SELECT ON DBA.RESERVAS_RECURSOS      TO solicitante;
GRANT SELECT ON DBA.MANTENIMIENTOS         TO solicitante;
GRANT SELECT ON DBA.ESTADOS_MANTENIMIENTOS TO solicitante;

-- Crear/modificar/cancelar sus reservas.
-- Nota: el UPDATE es a nivel tabla; la restriccion "solo tus
-- propias reservas" la aplica el backend (reservas.js), no la
-- base, por tratarse de una cuenta compartida.
GRANT INSERT, UPDATE        ON DBA.RESERVAS          TO solicitante;
GRANT SELECT, INSERT, DELETE ON DBA.RESERVAS_RECURSOS TO solicitante;

-- Ejecutar los SP/funciones del flujo de reserva
GRANT EXECUTE ON DBA.sp_crear_reserva                TO solicitante;
GRANT EXECUTE ON DBA.sp_laboratorios_disponibles     TO solicitante;
GRANT EXECUTE ON DBA.sp_horarios_disponibles         TO solicitante;
GRANT EXECUTE ON DBA.fn_existe_solapamiento_reservas TO solicitante;
GRANT EXECUTE ON DBA.fn_existe_mantenimiento         TO solicitante;
GRANT EXECUTE ON DBA.fn_validar_horarios             TO solicitante;
GRANT EXECUTE ON DBA.fn_validar_fechas_y_fin_semana  TO solicitante;

-- El driver 'sybase' necesita describir result sets. SYSTABLE y
-- SYSCOLUMN no exponen nada sensible. IMPORTANTE: NO agregar aca
-- SYS.SYSUSERPERM (tiene la columna password / hash de claves).
-- Si el flujo de reserva funciona sin estos dos, se pueden quitar.
GRANT SELECT ON SYS.SYSTABLE  TO solicitante;
GRANT SELECT ON SYS.SYSCOLUMN TO solicitante;
COMMIT;

-- Nota: NO se necesita GRANT sobre sys.sysgroup ni sys.sysuserperm.
-- El backend valida membresia de admin contra la vista SYSGROUPS
-- (group_name, member_name), legible por PUBLIC por defecto en
-- SQL Anywhere y sin datos sensibles (a diferencia de las tablas
-- base del catalogo).

/*==============================================================*/
/* 3. Permisos de administrador                                 */
/*    admin ya tiene DBA (autoridad total), por lo que estos     */
/*    grants explicitos son redundantes. Se dejan documentados   */
/*    para mostrar el diseno de permisos tabla por tabla; si se  */
/*    prefiere el modelo minimalista, alcanza con "GRANT DBA".   */
/*==============================================================*/
GRANT SELECT, INSERT, UPDATE, DELETE ON DBA.RESERVAS       TO admin;
GRANT SELECT, INSERT, UPDATE, DELETE ON DBA.LABORATORIOS   TO admin;
GRANT SELECT, INSERT, UPDATE, DELETE ON DBA.RECURSOS       TO admin;
GRANT SELECT, INSERT, UPDATE, DELETE ON DBA.MANTENIMIENTOS TO admin;
GRANT SELECT, INSERT, UPDATE, DELETE ON DBA.CARRERAS       TO admin;
GRANT SELECT, INSERT, UPDATE, DELETE ON DBA.DEPARTAMENTOS  TO admin;
GRANT SELECT, INSERT, UPDATE, DELETE ON DBA.EDIFICIOS      TO admin;
GRANT SELECT, INSERT, UPDATE, DELETE ON DBA.PISOS          TO admin;
GRANT SELECT, INSERT, UPDATE, DELETE ON DBA.SOLICITANTES   TO admin;
GRANT SELECT, INSERT, UPDATE, DELETE ON DBA.TIPO_ACTIVIDAD TO admin;
GRANT SELECT, INSERT, UPDATE, DELETE ON DBA.PRIORIDADES    TO admin;
COMMIT;

-- Procesos programados / mantenimiento (solo admin).
GRANT EXECUTE ON DBA.sp_cancelar_reservas_vencidas TO ADMINISTRADORES;

--Auditoria: solo admin puede ver el log completo, solicitante no tiene acceso.
GRANT INSERT ON DBA.AUDITORIA TO PUBLIC;
GRANT SELECT ON DBA.AUDITORIA TO ADMINISTRADORES;
GRANT MEMBERSHIP IN GROUP ADMINISTRADORES TO DBA;
GRANT EXECUTE ON DBA.sp_reporte_auditoria TO ADMINISTRADORES;

COMMIT;
/*==============================================================*/
/* 4. Reportes: solo administradores                            */
/*    Se revoca el acceso PUBLIC que dejaba reportes.sql y se    */
/*    limita a ADMINISTRADORES (el solicitante movil no debe     */
/*    ver rankings globales). fn_validar_rango_fechas queda en   */
/*    PUBLIC: es una validacion sin datos.                       */
/*==============================================================*/
/*REVOKE EXECUTE ON DBA.sp_reporte_laboratorios_mas_utilizados FROM PUBLIC;
REVOKE EXECUTE ON DBA.sp_reporte_horarios_mas_ocupados       FROM PUBLIC;
REVOKE EXECUTE ON DBA.sp_reporte_solicitantes_top            FROM PUBLIC;
REVOKE EXECUTE ON DBA.sp_reporte_cancelaciones_inasistencias FROM PUBLIC;
REVOKE EXECUTE ON DBA.sp_reporte_porcentaje_recursos         FROM PUBLIC;*/

GRANT EXECUTE ON DBA.sp_reporte_laboratorios_mas_utilizados TO ADMINISTRADORES;
GRANT EXECUTE ON DBA.sp_reporte_horarios_mas_ocupados       TO ADMINISTRADORES;
GRANT EXECUTE ON DBA.sp_reporte_solicitantes_top            TO ADMINISTRADORES;
GRANT EXECUTE ON DBA.sp_reporte_cancelaciones_inasistencias TO ADMINISTRADORES;
GRANT EXECUTE ON DBA.sp_reporte_porcentaje_recursos         TO ADMINISTRADORES;
COMMIT;

/*==============================================================*/
/* NOTA: el evento ev_cancelar_reservas_vencidas NO se crea      */
/* aca. Su unico dueno es objetos_bd.sql, que ya lo dropea y    */
/* recrea con drop-guard. Definirlo en dos scripts hace que el   */
/* segundo CREATE EVENT falle por "ya existe".                   */
/*==============================================================*/

/*==============================================================*/
/* 5. Verificacion rapida (opcional)                            */
/*==============================================================*/
SELECT ID_TIPO_ACTIVIDAD, NOMBRE, NIVEL_PRIORIDAD, ID_PRIORIDAD
FROM TIPO_ACTIVIDAD ORDER BY NIVEL_PRIORIDAD;

SELECT * FROM SYSGROUPS WHERE group_name = 'ADMINISTRADORES';

-- Confirmar que solicitante YA NO puede leer SYSUSERPERM:
-- (conectado como solicitante, esto deberia dar error de permisos)
-- SELECT * FROM SYS.SYSUSERPERM;