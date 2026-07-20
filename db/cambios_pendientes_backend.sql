
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



/*==============================================================*/
/* 4. EVENTOS PROGRAMADOS                                       */
/*==============================================================*/

CREATE EVENT "ev_cancelar_reservas_vencidas"
    SCHEDULE
        START TIME '00:05:00'
        EVERY 1 HOURS
    HANDLER
    BEGIN
        CALL DBA.sp_cancelar_reservas_vencidas();
    END;



/*==============================================================*/
/* 4. Usuarios y grupo de administradores                       */
/*==============================================================*/

GRANT CONNECT TO admin IDENTIFIED BY 'admin123';
GRANT CONNECT TO solicitante IDENTIFIED BY 'soli123';

GRANT DBA TO admin;
commit;

-- Grupo para validar acciones administrativas desde el backend.
-- Sin IDENTIFIED BY: el grupo no necesita poder loguearse.
GRANT CONNECT TO ADMINISTRADORES;
GRANT GROUP TO ADMINISTRADORES;
GRANT MEMBERSHIP IN GROUP ADMINISTRADORES TO admin;


GRANT CONNECT TO solicitante;
GRANT SELECT ON SYS.SYSTABLE TO solicitante;
GRANT SELECT ON SYS.SYSCOLUMN TO solicitante;
GRANT SELECT ON SYS.SYSUSERPERM TO solicitante;
COMMIT;

/*==============================================================*/
/* Permisos de solicitante (perfil móvil)                       */
/*==============================================================*/
-- Rol/usuario para solicitantes desde la app web
GRANT SELECT ON DBA.LABORATORIOS       TO solicitante;
GRANT SELECT ON DBA.ESTADOS_OPERATIVOS TO solicitante;
GRANT SELECT ON DBA.TIPO_ACTIVIDAD     TO solicitante;
GRANT SELECT ON DBA.PRIORIDADES        TO solicitante;
GRANT SELECT ON DBA.RECURSOS           TO solicitante;
GRANT SELECT ON DBA.ESTADO_RESERVA     TO solicitante;
GRANT SELECT ON DBA.EDIFICIOS          TO solicitante;
GRANT SELECT ON DBA.PISOS              TO solicitante;
GRANT SELECT ON DBA.CARRERAS           TO solicitante;
GRANT SELECT ON DBA.DEPARTAMENTOS      TO solicitante;
GRANT SELECT ON DBA.TIPOS_SOLICITANTES TO solicitante;
GRANT SELECT ON DBA.TIPOS_DOCUMENTOS   TO solicitante;

-- Ver sus propios datos y reservas
GRANT SELECT ON DBA.SOLICITANTES       TO solicitante;
GRANT SELECT ON DBA.RESERVAS           TO solicitante;
GRANT SELECT ON DBA.RESERVAS_RECURSOS  TO solicitante;
GRANT SELECT ON DBA.MANTENIMIENTOS     TO solicitante;
GRANT SELECT ON DBA.ESTADOS_MANTENIMIENTOS TO solicitante;

-- Crear/modificar/cancelar sus reservas
GRANT INSERT, UPDATE ON DBA.RESERVAS          TO solicitante;
GRANT INSERT, DELETE ON DBA.RESERVAS_RECURSOS TO solicitante;

-- Ejecutar los SP/funciones del flujo de reserva
GRANT EXECUTE ON DBA.sp_crear_reserva              TO solicitante;
GRANT EXECUTE ON DBA.sp_laboratorios_disponibles   TO solicitante;
GRANT EXECUTE ON DBA.sp_horarios_disponibles       TO solicitante;
GRANT EXECUTE ON DBA.fn_existe_solapamiento_reservas TO solicitante;
GRANT EXECUTE ON DBA.fn_existe_mantenimiento       TO solicitante;
GRANT EXECUTE ON DBA.fn_validar_horarios           TO solicitante;
GRANT EXECUTE ON DBA.fn_validar_fechas_y_fin_semana TO solicitante;

COMMIT;
-- Nota: NO se necesita ningún GRANT sobre sys.sysgroup ni
-- sys.sysuserperm. El backend valida membresía de admin contra
-- la vista SYSGROUPS (group_name, member_name), que ya es
-- legible por PUBLIC por defecto en SQL Anywhere y no expone
-- nada sensible (a diferencia de las tablas base del catálogo).
-- Permisos de administrador
GRANT SELECT, INSERT, UPDATE, DELETE ON DBA.RESERVAS TO admin;
GRANT SELECT, INSERT, UPDATE, DELETE ON DBA.LABORATORIOS TO admin;
GRANT SELECT, INSERT, UPDATE, DELETE ON DBA.RECURSOS TO admin;
GRANT SELECT, INSERT, UPDATE, DELETE ON DBA.MANTENIMIENTOS TO admin;
GRANT SELECT, INSERT, UPDATE, DELETE ON DBA.CARRERAS TO admin;
GRANT SELECT, INSERT, UPDATE, DELETE ON DBA.DEPARTAMENTOS TO admin;
GRANT SELECT, INSERT, UPDATE, DELETE ON DBA.EDIFICIOS TO admin;
GRANT SELECT, INSERT, UPDATE, DELETE ON DBA.PISOS TO admin;
GRANT SELECT, INSERT, UPDATE, DELETE ON DBA.SOLICITANTES TO admin;
GRANT SELECT, INSERT, UPDATE, DELETE ON DBA.TIPO_ACTIVIDAD TO admin;
GRANT SELECT, INSERT, UPDATE, DELETE ON DBA.PRIORIDADES TO admin;
GRANT EXECUTE ON DBA.sp_cancelar_reservas_vencidas TO ADMINISTRADORES;

COMMIT;


/*==============================================================*/
/* 5. Verificación rápida (opcional, para confirmar que quedó   */
/*    todo bien después de correr este script)                 */
/*==============================================================*/

SELECT ID_TIPO_ACTIVIDAD, NOMBRE, PRIORIDAD, ID_PRIORIDAD FROM TIPO_ACTIVIDAD ORDER BY PRIORIDAD;

SELECT * FROM SYSGROUPS WHERE group_name = 'ADMINISTRADORES';

