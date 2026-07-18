/*==============================================================*/
/* DBMS name:      Sybase SQL Anywhere 11                       */
/* Created on:     17/7/2026 16:44:23                           */
/*==============================================================*/

/*==============================================================*/
/* 1. ELIMINAR FOREIGN KEYS                                     */
/*==============================================================*/

if exists(select 1 from sys.sysforeignkey where role='FK_CARRERAS_REFERENCE_DEPARTAM') then
    alter table DBA.CARRERAS
       delete foreign key FK_CARRERAS_REFERENCE_DEPARTAM
end if;

if exists(select 1 from sys.sysforeignkey where role='FK_DEPARTAM_REFERENCE_EDIFICIO') then
    alter table DBA.DEPARTAMENTOS
       delete foreign key FK_DEPARTAM_REFERENCE_EDIFICIO
end if;

if exists(select 1 from sys.sysforeignkey where role='FK_LABORATO_REFERENCE_PISOS') then
    alter table DBA.LABORATORIOS
       delete foreign key FK_LABORATO_REFERENCE_PISOS
end if;

if exists(select 1 from sys.sysforeignkey where role='FK_LABORATO_REFERENCE_ESTADOS_') then
    alter table DBA.LABORATORIOS
       delete foreign key FK_LABORATO_REFERENCE_ESTADOS_
end if;

if exists(select 1 from sys.sysforeignkey where role='FK_MANTENIM_REFERENCE_ESTADOS_') then
    alter table DBA.MANTENIMIENTOS
       delete foreign key FK_MANTENIM_REFERENCE_ESTADOS_
end if;

if exists(select 1 from sys.sysforeignkey where role='FK_MANTENIM_REFERENCE_LABORATO') then
    alter table DBA.MANTENIMIENTOS
       delete foreign key FK_MANTENIM_REFERENCE_LABORATO
end if;

if exists(select 1 from sys.sysforeignkey where role='FK_PISOS_REFERENCE_EDIFICIO') then
    alter table DBA.PISOS
       delete foreign key FK_PISOS_REFERENCE_EDIFICIO
end if;

if exists(select 1 from sys.sysforeignkey where role='FK_RECURSOS_REFERENCE_LABORATO') then
    alter table DBA.RECURSOS
       delete foreign key FK_RECURSOS_REFERENCE_LABORATO
end if;

if exists(select 1 from sys.sysforeignkey where role='FK_RESERVAS_REFERENCE_SOLICITA') then
    alter table DBA.RESERVAS
       delete foreign key FK_RESERVAS_REFERENCE_SOLICITA
end if;

if exists(select 1 from sys.sysforeignkey where role='FK_RESERVAS_REFERENCE_ESTADO_R') then
    alter table DBA.RESERVAS
       delete foreign key FK_RESERVAS_REFERENCE_ESTADO_R
end if;

if exists(select 1 from sys.sysforeignkey where role='FK_RESERVAS_REFERENCE_TIPO_ACT') then
    alter table DBA.RESERVAS
       delete foreign key FK_RESERVAS_REFERENCE_TIPO_ACT
end if;

if exists(select 1 from sys.sysforeignkey where role='FK_RESERVAS_REFERENCE_LABORATO') then
    alter table DBA.RESERVAS
       delete foreign key FK_RESERVAS_REFERENCE_LABORATO
end if;

if exists(select 1 from sys.sysforeignkey where role='FK_RR_RECURSO') then
    alter table DBA.RESERVAS_RECURSOS
       delete foreign key FK_RR_RECURSO
end if;

if exists(select 1 from sys.sysforeignkey where role='FK_RR_RESERVA') then
    alter table DBA.RESERVAS_RECURSOS
       delete foreign key FK_RR_RESERVA
end if;

if exists(select 1 from sys.sysforeignkey where role='FK_SOLICITA_REFERENCE_CARRERAS') then
    alter table DBA.SOLICITANTES
       delete foreign key FK_SOLICITA_REFERENCE_CARRERAS
end if;

if exists(select 1 from sys.sysforeignkey where role='FK_SOLICITA_REFERENCE_TIPOS_SO') then
    alter table DBA.SOLICITANTES
       delete foreign key FK_SOLICITA_REFERENCE_TIPOS_SO
end if;

if exists(select 1 from sys.sysforeignkey where role='FK_SOLICITA_REFERENCE_TIPOS_DO') then
    alter table DBA.SOLICITANTES
       delete foreign key FK_SOLICITA_REFERENCE_TIPOS_DO
end if;

if exists(select 1 from sys.sysforeignkey where role='FK_TIPO_ACT_REFERENCE_PRIORIDA') then
    alter table DBA.TIPO_ACTIVIDAD
       delete foreign key FK_TIPO_ACT_REFERENCE_PRIORIDA
end if;

/*==============================================================*/
/* 2. ELIMINAR TRIGGERS                                         */
/*==============================================================*/

if exists(select 1 from sys.systrigger where trigger_name='tr_validar_cambio_estado_lab') then
    drop trigger tr_validar_cambio_estado_lab
end if;

if exists(select 1 from sys.systrigger where trigger_name='tr_no_eliminar_lab_con_reservas') then
    drop trigger tr_no_eliminar_lab_con_reservas
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

/*==============================================================*/
/* 3. ELIMINAR EVENTOS                                          */
/*==============================================================*/

if exists(select 1 from sys.sysevent where event_name='ev_cancelar_reservas_vencidas') then
    drop event ev_cancelar_reservas_vencidas
end if;

/*==============================================================*/
/* 4. ELIMINAR PROCEDIMIENTOS Y FUNCIONES                       */
/*==============================================================*/

if exists(select 1 from sys.sysprocedure where proc_name='sp_laboratorios_disponibles') then
    drop procedure sp_laboratorios_disponibles
end if;

if exists(select 1 from sys.sysprocedure where proc_name='sp_horarios_disponibles') then
    drop procedure sp_horarios_disponibles
end if;

if exists(select 1 from sys.sysprocedure where proc_name='sp_crear_reserva') then
    drop procedure sp_crear_reserva
end if;

if exists(select 1 from sys.sysprocedure where proc_name='sp_cancelar_reservas_vencidas') then
    drop procedure sp_cancelar_reservas_vencidas
end if;

if exists(select 1 from sys.sysprocedure where proc_name='fn_es_administrador') then
    drop function fn_es_administrador
end if;

if exists(select 1 from sys.sysprocedure where proc_name='fn_validar_fechas_y_fin_semana') then
    drop function fn_validar_fechas_y_fin_semana
end if;

if exists(select 1 from sys.sysprocedure where proc_name='fn_validar_horarios') then
    drop function fn_validar_horarios
end if;

if exists(select 1 from sys.sysprocedure where proc_name='fn_validar_horarios_mantenimiento') then
    drop function fn_validar_horarios_mantenimiento
end if;

if exists(select 1 from sys.sysprocedure where proc_name='fn_existe_solapamiento_reservas') then
    drop function fn_existe_solapamiento_reservas
end if;

if exists(select 1 from sys.sysprocedure where proc_name='fn_existe_mantenimiento') then
    drop function fn_existe_mantenimiento
end if;

/*==============================================================*/
/* 5. ELIMINAR TABLAS (EN ORDEN INVERSO A LA CREACION)          */
/*==============================================================*/

if exists(
   select 1 from sys.systable 
   where table_name='RESERVAS_RECURSOS'
     and table_type in ('BASE', 'GBL TEMP')
     and creator=user_id('DBA')
) then
    drop table DBA.RESERVAS_RECURSOS
end if;

if exists(
   select 1 from sys.systable 
   where table_name='RESERVAS'
     and table_type in ('BASE', 'GBL TEMP')
     and creator=user_id('DBA')
) then
    drop table DBA.RESERVAS
end if;

if exists(
   select 1 from sys.systable 
   where table_name='SOLICITANTES'
     and table_type in ('BASE', 'GBL TEMP')
     and creator=user_id('DBA')
) then
    drop table DBA.SOLICITANTES
end if;

if exists(
   select 1 from sys.systable 
   where table_name='RECURSOS'
     and table_type in ('BASE', 'GBL TEMP')
     and creator=user_id('DBA')
) then
    drop table DBA.RECURSOS
end if;

if exists(
   select 1 from sys.systable 
   where table_name='MANTENIMIENTOS'
     and table_type in ('BASE', 'GBL TEMP')
     and creator=user_id('DBA')
) then
    drop table DBA.MANTENIMIENTOS
end if;

if exists(
   select 1 from sys.systable 
   where table_name='LABORATORIOS'
     and table_type in ('BASE', 'GBL TEMP')
     and creator=user_id('DBA')
) then
    drop table DBA.LABORATORIOS
end if;

if exists(
   select 1 from sys.systable 
   where table_name='CARRERAS'
     and table_type in ('BASE', 'GBL TEMP')
     and creator=user_id('DBA')
) then
    drop table DBA.CARRERAS
end if;

if exists(
   select 1 from sys.systable 
   where table_name='DEPARTAMENTOS'
     and table_type in ('BASE', 'GBL TEMP')
     and creator=user_id('DBA')
) then
    drop table DBA.DEPARTAMENTOS
end if;

if exists(
   select 1 from sys.systable 
   where table_name='PISOS'
     and table_type in ('BASE', 'GBL TEMP')
     and creator=user_id('DBA')
) then
    drop table DBA.PISOS
end if;

if exists(
   select 1 from sys.systable 
   where table_name='TIPO_ACTIVIDAD'
     and table_type in ('BASE', 'GBL TEMP')
     and creator=user_id('DBA')
) then
    drop table DBA.TIPO_ACTIVIDAD
end if;

if exists(
   select 1 from sys.systable 
   where table_name='PRIORIDADES'
     and table_type in ('BASE', 'GBL TEMP')
     and creator=user_id('DBA')
) then
    drop table DBA.PRIORIDADES
end if;

if exists(
   select 1 from sys.systable 
   where table_name='TIPOS_SOLICITANTES'
     and table_type in ('BASE', 'GBL TEMP')
     and creator=user_id('DBA')
) then
    drop table DBA.TIPOS_SOLICITANTES
end if;

if exists(
   select 1 from sys.systable 
   where table_name='TIPOS_DOCUMENTOS'
     and table_type in ('BASE', 'GBL TEMP')
     and creator=user_id('DBA')
) then
    drop table DBA.TIPOS_DOCUMENTOS
end if;

if exists(
   select 1 from sys.systable 
   where table_name='ESTADO_RESERVA'
     and table_type in ('BASE', 'GBL TEMP')
     and creator=user_id('DBA')
) then
    drop table DBA.ESTADO_RESERVA
end if;

if exists(
   select 1 from sys.systable 
   where table_name='ESTADOS_OPERATIVOS'
     and table_type in ('BASE', 'GBL TEMP')
     and creator=user_id('DBA')
) then
    drop table DBA.ESTADOS_OPERATIVOS
end if;

if exists(
   select 1 from sys.systable 
   where table_name='ESTADOS_MANTENIMIENTOS'
     and table_type in ('BASE', 'GBL TEMP')
     and creator=user_id('DBA')
) then
    drop table DBA.ESTADOS_MANTENIMIENTOS
end if;

if exists(
   select 1 from sys.systable 
   where table_name='EDIFICIOS'
     and table_type in ('BASE', 'GBL TEMP')
     and creator=user_id('DBA')
) then
    drop table DBA.EDIFICIOS
end if;

/*==============================================================*/
/* 6. ELIMINAR DOMINIOS                                         */
/*==============================================================*/

if exists(select 1 from sys.sysusertype where type_name='D_CLAVE') then
   drop domain D_CLAVE
end if;

if exists(select 1 from sys.sysusertype where type_name='D_FECHA') then
   drop domain D_FECHA
end if;

if exists(select 1 from sys.sysusertype where type_name='D_NOMBRE') then
   drop domain D_NOMBRE
end if;

/*==============================================================*/
/* 7. CREAR DOMINIOS                                            */
/*==============================================================*/

/*==============================================================*/
/* Domain: D_CLAVE                                              */
/*==============================================================*/
create domain D_CLAVE as int;

/*==============================================================*/
/* Domain: D_FECHA                                              */
/*==============================================================*/
create domain D_FECHA as date;

/*==============================================================*/
/* Domain: D_NOMBRE                                             */
/*==============================================================*/
create domain D_NOMBRE as varchar(80);

/*==============================================================*/
/* 8. CREAR TABLAS (EN ORDEN DE DEPENDENCIAS)                   */
/*==============================================================*/

/*==============================================================*/
/* TABLAS - NIVEL 1: SIN DEPENDENCIAS                          */
/*==============================================================*/

/*==============================================================*/
/* Table: EDIFICIOS                                             */
/*==============================================================*/
create table DBA.EDIFICIOS 
(
   ID_EDIFICIO          D_CLAVE                        not null default autoincrement,
   NOMBRE_EDIFICIO      D_NOMBRE                       null,
   constraint PK_EDIFICIOS primary key clustered (ID_EDIFICIO)
);

/*==============================================================*/
/* Table: ESTADOS_MANTENIMIENTOS                                */
/*==============================================================*/
create table DBA.ESTADOS_MANTENIMIENTOS 
(
   ID_ESTADO_MANTENIMIENTO D_CLAVE                        not null default autoincrement,
   ESTADO_MANTENIMIENTO varchar                        not null default 'P'
      constraint CKC_ESTADO_MANTENIMIE_ESTADOS_ check (ESTADO_MANTENIMIENTO in ('P','R','E','C') and ESTADO_MANTENIMIENTO = upper(ESTADO_MANTENIMIENTO)),
   constraint PK_ESTADOS_MANTENIMIENTOS primary key clustered (ID_ESTADO_MANTENIMIENTO)
);

/*==============================================================*/
/* Table: ESTADOS_OPERATIVOS                                    */
/*==============================================================*/
create table DBA.ESTADOS_OPERATIVOS 
(
   ESTADO               D_CLAVE                        not null default autoincrement,
   TIPO                 char                           null default 'D'
      constraint CKC_TIPO_ESTADOS_ check (TIPO is null or (TIPO in ('D','R','M','F','B'))),
   constraint PK_ESTADOS_OPERATIVOS primary key clustered (ESTADO)
);

/*==============================================================*/
/* Table: ESTADO_RESERVA                                        */
/*==============================================================*/
create table DBA.ESTADO_RESERVA 
(
   ID_ESTADO_RESERVA    D_CLAVE                        not null default autoincrement,
   ESTADO_RESERVA       varchar                        not null default 'P',
   constraint PK_ESTADO_RESERVA primary key clustered (ID_ESTADO_RESERVA),
   constraint CKC_ESTADO_RESERVA_ESTADO_R check (ESTADO_RESERVA in( 'P','U','C','A' ) and ESTADO_RESERVA = UPPER(ESTADO_RESERVA))
);

/*==============================================================*/
/* Table: TIPOS_DOCUMENTOS                                      */
/*==============================================================*/
create table DBA.TIPOS_DOCUMENTOS 
(
   TIPO_DOCUMENTO       D_CLAVE                        not null default autoincrement,
   NOMBRE               D_NOMBRE                       not null,
   constraint PK_TIPOS_DOCUMENTOS primary key clustered (TIPO_DOCUMENTO)
);

/*==============================================================*/
/* Table: TIPOS_SOLICITANTES                                    */
/*==============================================================*/
create table DBA.TIPOS_SOLICITANTES 
(
   ID_SOLICITANTE       D_CLAVE                        not null default autoincrement,
   TIPO_SOLICITANTE     D_NOMBRE                       not null,
   constraint PK_TIPOS_SOLICITANTES primary key clustered (ID_SOLICITANTE)
);

/*==============================================================*/
/* Table: PRIORIDADES                                           */
/*==============================================================*/
create table DBA.PRIORIDADES 
(
   ID_PRIORIDAD         D_CLAVE                        not null,
   NOMBRE               D_NOMBRE                       not null,
   constraint PK_PRIORIDADES primary key clustered (ID_PRIORIDAD)
);

/*==============================================================*/
/* TABLAS - NIVEL 2: DEPENDEN DE NIVEL 1                       */
/*==============================================================*/

/*==============================================================*/
/* Table: DEPARTAMENTOS                                         */
/*==============================================================*/
create table DBA.DEPARTAMENTOS 
(
   ID_DEPARTAMENTO      D_CLAVE                        not null default autoincrement,
   ID_EDIFICIO          D_CLAVE                        null,
   NOMBRE               D_NOMBRE                       not null,
   constraint PK_DEPARTAMENTOS primary key clustered (ID_DEPARTAMENTO)
);

/*==============================================================*/
/* Table: PISOS                                                 */
/*==============================================================*/
create table DBA.PISOS 
(
   ID_EDIFICIO          D_CLAVE                        not null,
   NRO_PISO             integer                        not null,
   constraint PK_PISOS primary key clustered (ID_EDIFICIO, NRO_PISO)
);

/*==============================================================*/
/* Table: TIPO_ACTIVIDAD                                        */
/*==============================================================*/
create table DBA.TIPO_ACTIVIDAD 
(
   ID_TIPO_ACTIVIDAD    D_CLAVE                        not null,
   ID_PRIORIDAD         D_CLAVE                        null,
   NOMBRE               D_NOMBRE                       not null,
   NIVEL_PRIORIDAD      integer                        not null,
   DURACION_MAX_HORAS   int                            not null,
   constraint PK_TIPO_ACTIVIDAD primary key clustered (ID_TIPO_ACTIVIDAD)
);

/*==============================================================*/
/* TABLAS - NIVEL 3: DEPENDEN DE NIVEL 2                       */
/*==============================================================*/

/*==============================================================*/
/* Table: CARRERAS                                              */
/*==============================================================*/
create table DBA.CARRERAS 
(
   ID_CARRERA           D_CLAVE                        not null default autoincrement,
   ID_DEPARTAMENTO      D_CLAVE                        null,
   NOMBRE               D_NOMBRE                       not null,
   constraint PK_CARRERAS primary key clustered (ID_CARRERA)
);

/*==============================================================*/
/* Table: LABORATORIOS                                          */
/*==============================================================*/
create table DBA.LABORATORIOS 
(
   NUMERO_LABORATORIO   D_CLAVE                        not null default autoincrement,
   ID_EDIFICIO          D_CLAVE                        not null,
   NRO_PISO             integer                        not null,
   ESTADO               D_CLAVE                        not null,
   EDIFICIO             D_NOMBRE                       not null,
   CAPACIDAD_ALUMNOS    D_CLAVE                        not null,
   CANTIDAD_COMPUTADORAS D_CLAVE                       not null,
   VELOCIDAD_CONEXION_INTERNET D_CLAVE                not null,
   constraint PK_LABORATORIOS primary key clustered (NUMERO_LABORATORIO)
);

/*==============================================================*/
/* TABLAS - NIVEL 4: DEPENDEN DE NIVEL 3                       */
/*==============================================================*/

/*==============================================================*/
/* Table: RECURSOS                                              */
/*==============================================================*/
create table DBA.RECURSOS 
(
   ID_RECURSO           D_CLAVE                        not null default autoincrement,
   NUMERO_LABORATORIO   D_CLAVE                        null,
   NOMBRE               D_NOMBRE                       not null,
   DESCRIPCION          D_NOMBRE                       not null,
   DISPONIBILIDAD       varchar                        not null default 'S'
      constraint CKC_DISPONIBILIDAD_RECURSOS check (DISPONIBILIDAD in ('S','N') and DISPONIBILIDAD = upper(DISPONIBILIDAD)),
   constraint PK_RECURSOS primary key clustered (ID_RECURSO)
);

/*==============================================================*/
/* Table: MANTENIMIENTOS                                        */
/*==============================================================*/
create table DBA.MANTENIMIENTOS 
(
   ID_MANTENIMIENTO     D_CLAVE                        not null default autoincrement,
   ID_ESTADO_MANTENIMIENTO D_CLAVE                     not null,
   NUMERO_LABORATORIO   D_CLAVE                        not null,
   FECHA_INICIO         D_FECHA                        not null,
   FECHA_FIN_PREVISTA   D_FECHA                        not null,
   OBSERVACIONES        D_NOMBRE                       not null,
   constraint PK_MANTENIMIENTOS primary key clustered (ID_MANTENIMIENTO)
);

/*==============================================================*/
/* Table: SOLICITANTES                                          */
/*==============================================================*/
create table DBA.SOLICITANTES 
(
   CEDULA_IDENTIDAD     D_CLAVE                        not null,
   CORREO               D_NOMBRE                       not null,
   ID_CARRERA           D_CLAVE                        null,
   ID_SOLICITANTE       D_CLAVE                        null,
   TIPO_DOCUMENTO       D_CLAVE                        null,
   NOMBRE               D_NOMBRE                       not null,
   APELLIDO             D_NOMBRE                       not null,
   TELEFONO             D_NOMBRE                       not null,
   DEPARTAMENTO         D_NOMBRE                       not null,
   constraint PK_SOLICITANTES primary key clustered (CEDULA_IDENTIDAD, CORREO)
);

/*==============================================================*/
/* TABLAS - NIVEL 5: DEPENDEN DE NIVEL 4                       */
/*==============================================================*/

/*==============================================================*/
/* Table: RESERVAS                                              */
/*==============================================================*/
create table DBA.RESERVAS 
(
   ID_RESERVA           D_CLAVE                        not null default autoincrement,
   NUMERO_LABORATORIO   D_CLAVE                        not null,
   CEDULA_IDENTIDAD     D_CLAVE                        not null,
   CORREO               D_NOMBRE                       not null,
   ID_ESTADO_RESERVA    D_CLAVE                        not null,
   ID_TIPO_ACTIVIDAD    D_CLAVE                        not null,
   FECHA_A_RESERVAR     D_FECHA                        not null,
   HORA_INICIO          time                           not null,
   HORA_FIN             time                           not null,
   CANTIDAD_ALUMNOS     int                            not null,
   FECHA_SOLICITUD      D_FECHA                        not null,
   MOTIVO_CANCELACION   varchar(100)                   null,
   USUARIO_CANCELACION  varchar(50)                    null,
   constraint PK_RESERVAS primary key clustered (ID_RESERVA)
);

/*==============================================================*/
/* Table: RESERVAS_RECURSOS                                     */
/*==============================================================*/
create table DBA.RESERVAS_RECURSOS 
(
   ID_RESERVA           D_CLAVE                        not null,
   ID_RECURSO           D_CLAVE                        not null,
   constraint PK_RESERVAS_RECURSOS primary key clustered (ID_RESERVA, ID_RECURSO)
);

/*==============================================================*/
/* 9. CREAR FOREIGN KEYS                                        */
/*==============================================================*/

alter table DBA.CARRERAS
   add constraint FK_CARRERAS_REFERENCE_DEPARTAM foreign key (ID_DEPARTAMENTO)
      references DBA.DEPARTAMENTOS (ID_DEPARTAMENTO)
      on update restrict
      on delete restrict;

alter table DBA.DEPARTAMENTOS
   add constraint FK_DEPARTAM_REFERENCE_EDIFICIO foreign key (ID_EDIFICIO)
      references DBA.EDIFICIOS (ID_EDIFICIO)
      on update restrict
      on delete restrict;

alter table DBA.LABORATORIOS
   add constraint FK_LABORATO_REFERENCE_PISOS foreign key (ID_EDIFICIO, NRO_PISO)
      references DBA.PISOS (ID_EDIFICIO, NRO_PISO)
      on update restrict
      on delete restrict;

alter table DBA.LABORATORIOS
   add constraint FK_LABORATO_REFERENCE_ESTADOS_ foreign key (ESTADO)
      references DBA.ESTADOS_OPERATIVOS (ESTADO)
      on update restrict
      on delete restrict;

alter table DBA.MANTENIMIENTOS
   add constraint FK_MANTENIM_REFERENCE_ESTADOS_ foreign key (ID_ESTADO_MANTENIMIENTO)
      references DBA.ESTADOS_MANTENIMIENTOS (ID_ESTADO_MANTENIMIENTO)
      on update restrict
      on delete restrict;

alter table DBA.MANTENIMIENTOS
   add constraint FK_MANTENIM_REFERENCE_LABORATO foreign key (NUMERO_LABORATORIO)
      references DBA.LABORATORIOS (NUMERO_LABORATORIO)
      on update restrict
      on delete restrict;

alter table DBA.PISOS
   add constraint FK_PISOS_REFERENCE_EDIFICIO foreign key (ID_EDIFICIO)
      references DBA.EDIFICIOS (ID_EDIFICIO)
      on update restrict
      on delete restrict;

alter table DBA.RECURSOS
   add constraint FK_RECURSOS_REFERENCE_LABORATO foreign key (NUMERO_LABORATORIO)
      references DBA.LABORATORIOS (NUMERO_LABORATORIO)
      on update restrict
      on delete restrict;

alter table DBA.RESERVAS
   add constraint FK_RESERVAS_REFERENCE_SOLICITA foreign key (CEDULA_IDENTIDAD, CORREO)
      references DBA.SOLICITANTES (CEDULA_IDENTIDAD, CORREO)
      on update restrict
      on delete restrict;

alter table DBA.RESERVAS
   add constraint FK_RESERVAS_REFERENCE_ESTADO_R foreign key (ID_ESTADO_RESERVA)
      references DBA.ESTADO_RESERVA (ID_ESTADO_RESERVA)
      on update restrict
      on delete restrict;

alter table DBA.RESERVAS
   add constraint FK_RESERVAS_REFERENCE_TIPO_ACT foreign key (ID_TIPO_ACTIVIDAD)
      references DBA.TIPO_ACTIVIDAD (ID_TIPO_ACTIVIDAD)
      on update restrict
      on delete restrict;

alter table DBA.RESERVAS
   add constraint FK_RESERVAS_REFERENCE_LABORATO foreign key (NUMERO_LABORATORIO)
      references DBA.LABORATORIOS (NUMERO_LABORATORIO)
      on update restrict
      on delete restrict;

alter table DBA.RESERVAS_RECURSOS
   add constraint FK_RR_RECURSO foreign key (ID_RECURSO)
      references DBA.RECURSOS (ID_RECURSO)
      on update restrict
      on delete restrict;

alter table DBA.RESERVAS_RECURSOS
   add constraint FK_RR_RESERVA foreign key (ID_RESERVA)
      references DBA.RESERVAS (ID_RESERVA)
      on update restrict
      on delete cascade;

alter table DBA.SOLICITANTES
   add constraint FK_SOLICITA_REFERENCE_CARRERAS foreign key (ID_CARRERA)
      references DBA.CARRERAS (ID_CARRERA)
      on update restrict
      on delete restrict;

alter table DBA.SOLICITANTES
   add constraint FK_SOLICITA_REFERENCE_TIPOS_SO foreign key (ID_SOLICITANTE)
      references DBA.TIPOS_SOLICITANTES (ID_SOLICITANTE)
      on update restrict
      on delete restrict;

alter table DBA.SOLICITANTES
   add constraint FK_SOLICITA_REFERENCE_TIPOS_DO foreign key (TIPO_DOCUMENTO)
      references DBA.TIPOS_DOCUMENTOS (TIPO_DOCUMENTO)
      on update restrict
      on delete restrict;

alter table DBA.TIPO_ACTIVIDAD
   add constraint FK_TIPO_ACT_REFERENCE_PRIORIDA foreign key (ID_PRIORIDAD)
      references DBA.PRIORIDADES (ID_PRIORIDAD)
      on update restrict
      on delete restrict;

/*==============================================================*/
/* 10. CREAR USUARIO DBA (opcional, ya existe)                 */
/*==============================================================*/
-- grant connect to DBA identified by "";