/*==============================================================*/
/* LabControl - 03_permisos.sql                                 */
/* Usuarios, grupo de administradores y grants.                 */
/*                                                              */
/* Correr DESPUES de 01_tablas.sql y 02_objetos.sql: los GRANT  */
/* EXECUTE fallan si el procedimiento todavia no existe.        */
/*                                                              */
/* Este archivo es el UNICO dueno de los permisos. En 02_       */
/* objetos.sql no quedo ningun GRANT, para que no haya dos      */
/* lugares donde buscar por que un usuario puede o no algo.     */
/*==============================================================*/
/* MODELO DE ACCESO                                              */
/*                                                              */
/* El enunciado pide autenticar contra usuarios de la base, sin  */
/* tabla de usuarios propia. Entonces hay dos cuentas:           */
/*                                                              */
/*  - admin        -> sistema web de administracion general.     */
/*                    Tiene DBA y es miembro del grupo           */
/*                    ADMINISTRADORES.                            */
/*  - solicitante  -> perfil movil. Cuenta COMPARTIDA por los    */
/*                    solicitantes, con permisos minimos.        */
/*                                                              */
/* El grupo ADMINISTRADORES existe para poder preguntar "este    */
/* usuario es admin?" desde SQL (fn_es_administrador) y desde el */
/* backend (verificarAdmin en reservas.js), ambos contra la      */
/* vista SYSGROUPS. Asi la regla "solo un admin puede poner un   */
/* lab Fuera de servicio" se valida en la base y no solo en JS.  */
/*                                                              */
/* LIMITACION CONOCIDA (declararla en la defensa):                */
/* como 'solicitante' es una cuenta compartida, la base no puede */
/* distinguir a una persona de otra. La regla "solo podes        */
/* cancelar tus propias reservas" la aplica el backend           */
/* comparando la cedula, no un permiso de la base. El GRANT      */
/* UPDATE sobre RESERVAS es a nivel tabla.                        */
/*==============================================================*/


/*==============================================================*/
/* 0. REVOCACION DEFENSIVA                                      */
/*                                                              */
/* Una version vieja de este script le daba a 'solicitante'      */
/* lectura sobre SYS.SYSUSERPERM, que contiene la columna        */
/* "password" con el hash de la clave de TODOS los usuarios,     */
/* incluido DBA. Eso ya no se otorga. Si se corrio aquella       */
/* version en la base actual, descomentar el REVOKE.             */
/* (Si nunca se otorgo, el REVOKE tira error de "no existe tal   */
/* permiso", por eso queda comentado por defecto.)               */
/*==============================================================*/
-- REVOKE SELECT ON SYS.SYSUSERPERM FROM solicitante;
COMMIT;


/*==============================================================*/
/* 1. USUARIOS Y GRUPO                                          */
/*==============================================================*/
GRANT CONNECT TO admin        IDENTIFIED BY 'admin123';
GRANT CONNECT TO solicitante  IDENTIFIED BY 'soli123';

GRANT DBA TO admin;
COMMIT;

-- Grupo sin IDENTIFIED BY: no necesita poder loguearse, existe
-- solamente para responder la pregunta "es administrador?".
GRANT CONNECT TO ADMINISTRADORES;
GRANT GROUP   TO ADMINISTRADORES;

GRANT MEMBERSHIP IN GROUP ADMINISTRADORES TO admin;
-- DBA tambien entra al grupo: si no, al probar desde ISQL como DBA
-- los triggers admin-only lo rechazarian.
GRANT MEMBERSHIP IN GROUP ADMINISTRADORES TO DBA;
COMMIT;


/*==============================================================*/
/* 2. PERFIL SOLICITANTE (movil)                                */
/*==============================================================*/

/*---- Catalogos de solo lectura, para armar los formularios ----*/
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

/*---- Sus datos y sus reservas ----*/
GRANT SELECT ON DBA.SOLICITANTES           TO solicitante;
GRANT SELECT ON DBA.RESERVAS               TO solicitante;
GRANT SELECT ON DBA.RESERVAS_RECURSOS      TO solicitante;
GRANT SELECT ON DBA.MANTENIMIENTOS         TO solicitante;
GRANT SELECT ON DBA.ESTADOS_MANTENIMIENTOS TO solicitante;

/*---- Crear / modificar / cancelar reservas ----*/
-- Sin DELETE sobre RESERVAS a proposito: una reserva no se borra,
-- se cancela (la trazabilidad historica es un requisito).
GRANT INSERT, UPDATE         ON DBA.RESERVAS          TO solicitante;
GRANT SELECT, INSERT, DELETE ON DBA.RESERVAS_RECURSOS TO solicitante;

/*---- Objetos del flujo de reserva ----*/
GRANT EXECUTE ON DBA.sp_crear_reserva                TO solicitante;
GRANT EXECUTE ON DBA.sp_laboratorios_disponibles     TO solicitante;
GRANT EXECUTE ON DBA.sp_horarios_disponibles         TO solicitante;
GRANT EXECUTE ON DBA.fn_existe_solapamiento_reservas TO solicitante;
GRANT EXECUTE ON DBA.fn_existe_mantenimiento         TO solicitante;
GRANT EXECUTE ON DBA.fn_validar_horarios             TO solicitante;
GRANT EXECUTE ON DBA.fn_validar_fechas_y_fin_semana  TO solicitante;

/*---- Catalogo del sistema ----*/
-- El driver 'sybase' (jConnect) necesita describir los result sets.
-- SYSTABLE y SYSCOLUMN no exponen nada sensible.
-- NO agregar aca SYS.SYSUSERPERM: tiene el hash de las claves.
GRANT SELECT ON SYS.SYSTABLE  TO solicitante;
GRANT SELECT ON SYS.SYSCOLUMN TO solicitante;
COMMIT;

-- No hace falta ningun grant sobre SYS.SYSGROUP: el backend y
-- fn_es_administrador consultan la VISTA SYSGROUPS (group_name,
-- member_name), legible por PUBLIC por defecto y sin datos
-- sensibles, a diferencia de las tablas base del catalogo.


/*==============================================================*/
/* 3. PERFIL ADMIN                                              */
/*                                                              */
/* admin ya tiene DBA, asi que estos grants son redundantes.     */
/* Se dejan escritos porque documentan el diseno tabla por tabla */
/* que pide la rubrica; si se prefiere el modelo minimo, alcanza */
/* con el GRANT DBA de la seccion 1.                             */
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


/*==============================================================*/
/* 4. AUDITORIA                                                 */
/*                                                              */
/* INSERT a PUBLIC: los triggers de auditoria se disparan por    */
/* operaciones de cualquier perfil, incluido solicitante.        */
/* SELECT solo a ADMINISTRADORES: el log completo muestra la     */
/* actividad de todos los usuarios, un solicitante no debe       */
/* verlo. Nadie tiene UPDATE ni DELETE: un log de auditoria que  */
/* se puede editar no sirve como auditoria.                      */
/*==============================================================*/
GRANT INSERT ON DBA.AUDITORIA TO PUBLIC;
GRANT SELECT ON DBA.AUDITORIA TO ADMINISTRADORES;
COMMIT;


/*==============================================================*/
/* 5. REPORTES Y PROCESOS PROGRAMADOS - solo administradores    */
/*                                                              */
/* Los reportes muestran rankings globales (que laboratorio se   */
/* usa mas, quien reserva mas): son informacion institucional,   */
/* no del solicitante. Por eso van a ADMINISTRADORES y no a      */
/* PUBLIC.                                                       */
/*                                                              */
/* fn_validar_rango_fechas queda en PUBLIC: es solo validacion,  */
/* no toca datos.                                                */
/*==============================================================*/
GRANT EXECUTE ON DBA.fn_validar_rango_fechas TO PUBLIC;

GRANT EXECUTE ON DBA.sp_reporte_laboratorios_mas_utilizados TO ADMINISTRADORES;
GRANT EXECUTE ON DBA.sp_reporte_horarios_mas_ocupados       TO ADMINISTRADORES;
GRANT EXECUTE ON DBA.sp_reporte_solicitantes_top            TO ADMINISTRADORES;
GRANT EXECUTE ON DBA.sp_reporte_cancelaciones_inasistencias TO ADMINISTRADORES;
GRANT EXECUTE ON DBA.sp_reporte_porcentaje_recursos         TO ADMINISTRADORES;
GRANT EXECUTE ON DBA.sp_reporte_auditoria                   TO ADMINISTRADORES;

GRANT EXECUTE ON DBA.sp_cancelar_reservas_vencidas          TO ADMINISTRADORES;
COMMIT;

/*--------------------------------------------------------------*/
/* Si en la base actual estos SP ya quedaron con EXECUTE a       */
/* PUBLIC (los scripts viejos reportes.sql / reportes_           */
/* procedures.sql / estado_desplazada.sql los otorgaban asi),    */
/* descomentar este bloque UNA vez para limpiarlo. En una base   */
/* recreada desde cero no hace falta.                            */
/*--------------------------------------------------------------*/
/*
REVOKE EXECUTE ON DBA.sp_reporte_laboratorios_mas_utilizados FROM PUBLIC;
REVOKE EXECUTE ON DBA.sp_reporte_horarios_mas_ocupados       FROM PUBLIC;
REVOKE EXECUTE ON DBA.sp_reporte_solicitantes_top            FROM PUBLIC;
REVOKE EXECUTE ON DBA.sp_reporte_cancelaciones_inasistencias FROM PUBLIC;
REVOKE EXECUTE ON DBA.sp_reporte_porcentaje_recursos         FROM PUBLIC;
REVOKE EXECUTE ON DBA.sp_reporte_auditoria                   FROM PUBLIC;
COMMIT;
*/


/*==============================================================*/
/* NOTA: el evento ev_cancelar_reservas_vencidas NO se crea      */
/* aca. Su unico dueno es 02_objetos.sql, que lo dropea y        */
/* recrea con guarda. Definirlo en dos scripts hace que el       */
/* segundo CREATE EVENT falle por "ya existe".                    */
/*==============================================================*/


/*==============================================================*/
/* 6. VERIFICACION RAPIDA (opcional)                            */
/*==============================================================*/
-- Miembros del grupo de administradores:
SELECT * FROM SYSGROUPS WHERE group_name = 'ADMINISTRADORES';

-- Catalogo de actividades y sus prioridades:
SELECT ID_TIPO_ACTIVIDAD, NOMBRE, NIVEL_PRIORIDAD, ID_PRIORIDAD
FROM DBA.TIPO_ACTIVIDAD
ORDER BY NIVEL_PRIORIDAD;

-- Conectado como 'solicitante', esto DEBE dar error de permisos:
-- SELECT * FROM SYS.SYSUSERPERM;
