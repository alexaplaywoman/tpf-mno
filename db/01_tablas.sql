/*==============================================================*/
/* LabControl - 01_tablas.sql                                   */
/* Estructura de la base: dominios, tablas, indices y FKs.      */
/* DBMS: SAP Sybase SQL Anywhere 11 (Watcom-SQL)                */
/*                                                              */
/* ORDEN DE EJECUCION DEL PROYECTO:                             */
/*   1) 01_tablas.sql    <- este archivo (borra y recrea todo)  */
/*   2) 02_objetos.sql   funciones, SPs, event y triggers        */
/*   3) 03_permisos.sql  usuarios, grupo ADMINISTRADORES, grants */
/*   4) datos_prueba_labcontrol_ordenado.sql                     */
/*   5) carreras_ciencias_contables.sql (opcional, datos extra)  */
/*                                                              */
/* NOTAS DE DISENO (para la defensa):                            */
/*  - Origen: PowerDesigner (definitivo.pdm). Regenerar desde    */
/*    ahi si se cambia el modelo; no editar el DDL a mano salvo  */
/*    para AUDITORIA (ver mas abajo).                            */
/*  - Dominios D_CLAVE / D_FECHA / D_NOMBRE: tipos reutilizables */
/*    exigidos por la rubrica (definicion de dominios).          */
/*  - ESTADO_RESERVA acepta P/U/C/A/D. La letra 'D' (Desplazada) */
/*    se agrego para distinguir la cancelacion automatica por    */
/*    prioridad de una cancelacion hecha por una persona.        */
/*  - AUDITORIA no viene del PDM: se agrega al final del script  */
/*    junto con sus dos indices. Si se regenera el DDL desde     */
/*    PowerDesigner hay que volver a pegar ese bloque.           */
/*  - ATENCION al re-ejecutar: este script hace DROP TABLE de    */
/*    todo. Si hay objetos o sesiones abiertas, correr ROLLBACK  */
/*    antes (SQLCODE=-210 por locks de DDL).                      */
/*==============================================================*/

/*==============================================================*/
/* DBMS name:      Sybase SQL Anywhere 11                       */
/* Created on:     27/7/2026 19:50:47                           */
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

if exists(
   select 1 from sys.systable
   where table_name='AUDITORIA'
     and table_type in ('BASE','GBL TEMP')
     and creator=user_id('DBA')
) then
    drop table DBA.AUDITORIA
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
   where table_name='EDIFICIOS'
     and table_type in ('BASE', 'GBL TEMP')
     and creator=user_id('DBA')
) then
    drop table DBA.EDIFICIOS
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
   where table_name='ESTADOS_OPERATIVOS'
     and table_type in ('BASE', 'GBL TEMP')
     and creator=user_id('DBA')
) then
    drop table DBA.ESTADOS_OPERATIVOS
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
   where table_name='LABORATORIOS'
     and table_type in ('BASE', 'GBL TEMP')
     and creator=user_id('DBA')
) then
    drop table DBA.LABORATORIOS
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
   where table_name='PISOS'
     and table_type in ('BASE', 'GBL TEMP')
     and creator=user_id('DBA')
) then
    drop table DBA.PISOS
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
   where table_name='RECURSOS'
     and table_type in ('BASE', 'GBL TEMP')
     and creator=user_id('DBA')
) then
    drop table DBA.RECURSOS
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
   where table_name='RESERVAS_RECURSOS'
     and table_type in ('BASE', 'GBL TEMP')
     and creator=user_id('DBA')
) then
    drop table DBA.RESERVAS_RECURSOS
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
   where table_name='TIPOS_DOCUMENTOS'
     and table_type in ('BASE', 'GBL TEMP')
     and creator=user_id('DBA')
) then
    drop table DBA.TIPOS_DOCUMENTOS
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
   where table_name='TIPO_ACTIVIDAD'
     and table_type in ('BASE', 'GBL TEMP')
     and creator=user_id('DBA')
) then
    drop table DBA.TIPO_ACTIVIDAD
end if;


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
/* User: DBA                                                    */
/*==============================================================*/
grant connect to DBA identified by "sql";

/*==============================================================*/
/* Table: CARRERAS                                              */
/*==============================================================*/
create table DBA.CARRERAS 
(
   ID_CARRERA           D_CLAVE                        not null default autoincrement,
   ID_DEPARTAMENTO      int                            null,
   NOMBRE               D_NOMBRE                       not null,
   constraint PK_CARRERAS primary key clustered (ID_CARRERA)
);

/*==============================================================*/
/* Table: DEPARTAMENTOS                                         */
/*==============================================================*/
create table DBA.DEPARTAMENTOS 
(
   ID_DEPARTAMENTO      D_CLAVE                        not null default autoincrement,
   ID_EDIFICIO          integer                        null,
   NOMBRE               D_NOMBRE                       not null,
   constraint PK_DEPARTAMENTOS primary key clustered (ID_DEPARTAMENTO)
);

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
   ESTADO_MANTENIMIENTO varchar(1)                     not null default 'P'
      constraint CKC_ESTADO_MANTENIMIE_ESTADOS_ check (ESTADO_MANTENIMIENTO in ('P','R','E','C') and ESTADO_MANTENIMIENTO = upper(ESTADO_MANTENIMIENTO)),
   constraint PK_ESTADOS_MANTENIMIENTOS primary key clustered (ID_ESTADO_MANTENIMIENTO)
);

/*==============================================================*/
/* Table: ESTADOS_OPERATIVOS                                    */
/*==============================================================*/
create table DBA.ESTADOS_OPERATIVOS 
(
   ESTADO               D_CLAVE                        not null default autoincrement,
   TIPO                 varchar(1)                     not null default 'D'
      constraint CKC_TIPO_ESTADOS_ check (TIPO in ('D','R','M','F','B') and TIPO = upper(TIPO)),
   constraint PK_ESTADOS_OPERATIVOS primary key clustered (ESTADO)
);

/*==============================================================*/
/* Table: ESTADO_RESERVA                                        */
/*==============================================================*/
create table DBA.ESTADO_RESERVA 
(
   ID_ESTADO_RESERVA    D_CLAVE                        not null default autoincrement,
   ESTADO_RESERVA       varchar(1)                     not null default 'P'
      constraint CKC_ESTADO_RESERVA_ESTADO_R check (ESTADO_RESERVA in ('P','U','C','A','D') and ESTADO_RESERVA = upper(ESTADO_RESERVA)),
   constraint PK_ESTADO_RESERVA primary key clustered (ID_ESTADO_RESERVA)
);

/*==============================================================*/
/* Table: LABORATORIOS                                          */
/*==============================================================*/
create table DBA.LABORATORIOS 
(
   NUMERO_LABORATORIO   D_CLAVE                        not null default autoincrement,
   ID_EDIFICIO          integer                        not null,
   ESTADO               int                            not null,
   EDIFICIO             D_NOMBRE                       not null,
   CAPACIDAD_ALUMNOS    D_CLAVE                        not null,
   CANTIDAD_COMPUTADORAS D_CLAVE                        not null,
   VELOCIDAD_CONEXION_INTERNET D_CLAVE                        not null,
   NRO_PISO             integer                        not null,
   constraint PK_LABORATORIOS primary key clustered (NUMERO_LABORATORIO)
);

/*==============================================================*/
/* Table: MANTENIMIENTOS                                        */
/*==============================================================*/
create table DBA.MANTENIMIENTOS 
(
   ID_MANTENIMIENTO     D_CLAVE                        not null default autoincrement,
   ID_ESTADO_MANTENIMIENTO D_CLAVE                        not null,
   NUMERO_LABORATORIO   int                            not null,
   FECHA_INICIO         D_FECHA                        not null,
   FECHA_FIN_PREVISTA   D_FECHA                        not null,
   OBSERVACIONES        D_NOMBRE                       not null,
   constraint PK_MANTENIMIENTOS primary key clustered (ID_MANTENIMIENTO)
);

/*==============================================================*/
/* Table: PISOS                                                 */
/*==============================================================*/
create table DBA.PISOS 
(
   ID_EDIFICIO          integer                        not null,
   NRO_PISO             integer                        not null,
   constraint PK_PISOS primary key clustered (ID_EDIFICIO, NRO_PISO)
);

/*==============================================================*/
/* Table: PRIORIDADES                                           */
/*==============================================================*/
create table DBA.PRIORIDADES 
(
   ID_PRIORIDAD         D_CLAVE                        not null default autoincrement,
   NOMBRE               D_NOMBRE                       not null,
   constraint PK_PRIORIDADES primary key clustered (ID_PRIORIDAD)
);

/*==============================================================*/
/* Table: RECURSOS                                              */
/*==============================================================*/
create table DBA.RECURSOS 
(
   ID_RECURSO           D_CLAVE                        not null default autoincrement,
   NUMERO_LABORATORIO   D_CLAVE                        not null,
   NOMBRE               D_NOMBRE                       not null,
   DESCRIPCION          D_NOMBRE                       not null,
   DISPONIBILIDAD       varchar(1)                     not null default 'S'
      constraint CKC_DISPONIBILIDAD_RECURSOS check (DISPONIBILIDAD in ('S','N') and DISPONIBILIDAD = upper(DISPONIBILIDAD)),
   constraint PK_RECURSOS primary key clustered (ID_RECURSO)
);

/*==============================================================*/
/* Table: RESERVAS                                              */
/*==============================================================*/
create table DBA.RESERVAS 
(
   ID_RESERVA           D_CLAVE                        not null default autoincrement,
   NUMERO_LABORATORIO   int                            not null,
   CEDULA_IDENTIDAD     int                            not null,
   CORREO               D_NOMBRE                       not null,
   ID_ESTADO_RESERVA    int                            not null,
   ID_TIPO_ACTIVIDAD    int                            not null,
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
   ID_RESERVA           integer                        not null,
   ID_RECURSO           integer                        not null,
   constraint PK_RESERVAS_RECURSOS primary key clustered (ID_RESERVA, ID_RECURSO)
);

/*==============================================================*/
/* Table: SOLICITANTES                                          */
/*==============================================================*/
create table DBA.SOLICITANTES 
(
   CEDULA_IDENTIDAD     D_CLAVE                        not null,
   CORREO               D_NOMBRE                       not null,
   ID_CARRERA           int                            not null,
   ID_SOLICITANTE       int                            not null,
   TIPO_DOCUMENTO       D_CLAVE                        not null,
   NOMBRE               D_NOMBRE                       not null,
   APELLIDO             D_NOMBRE                       not null,
   TELEFONO             D_NOMBRE                       not null,
   DEPARTAMENTO         D_NOMBRE                       not null,
   constraint PK_SOLICITANTES primary key clustered (CEDULA_IDENTIDAD, CORREO)
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
/* Table: TIPO_ACTIVIDAD                                        */
/*==============================================================*/
create table DBA.TIPO_ACTIVIDAD 
(
   ID_TIPO_ACTIVIDAD    D_CLAVE                        not null default autoincrement,
   ID_PRIORIDAD         integer                        not null,
   NOMBRE               D_NOMBRE                       not null,
   NIVEL_PRIORIDAD      integer                        not null,
   DURACION_MAX_HORAS   integer                        not null,
   constraint PK_TIPO_ACTIVIDAD primary key clustered (ID_TIPO_ACTIVIDAD)
);

CREATE TABLE DBA.AUDITORIA
(
    ID_AUDITORIA    D_CLAVE       NOT NULL DEFAULT AUTOINCREMENT,
    FECHA_HORA      TIMESTAMP     NOT NULL DEFAULT CURRENT TIMESTAMP,
    USUARIO         VARCHAR(128)  NOT NULL DEFAULT CURRENT USER,
    TIPO_EVENTO     VARCHAR(50)   NOT NULL,
    ID_REFERENCIA   INT           NULL,
    DESCRIPCION     VARCHAR(500)  NOT NULL,
    CONSTRAINT PK_AUDITORIA PRIMARY KEY CLUSTERED (ID_AUDITORIA)
);

-- Indice para consultas por entidad (ej: historial de la reserva 27)
CREATE INDEX IDX_AUDITORIA_ENTIDAD ON DBA.AUDITORIA (TIPO_EVENTO, ID_REFERENCIA);

-- Indice para consultas por fecha (ej: eventos del ultimo mes)
CREATE INDEX IDX_AUDITORIA_FECHA ON DBA.AUDITORIA (FECHA_HORA);

COMMIT;

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

COMMIT;
