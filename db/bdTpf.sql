/*==============================================================*/
/* DBMS name:      Sybase SQL Anywhere 11                       */
/* Created on:     7/7/2026 20:31:46                            */
/*==============================================================*/


if exists(select 1 from sys.sysforeignkey where role='FK_CARRERAS_REFERENCE_DEPARTAM') then
    alter table CARRERAS
       delete foreign key FK_CARRERAS_REFERENCE_DEPARTAM
end if;

if exists(select 1 from sys.sysforeignkey where role='FK_DEPARTAM_REFERENCE_EDIFICIO') then
    alter table DEPARTAMENTOS
       delete foreign key FK_DEPARTAM_REFERENCE_EDIFICIO
end if;

if exists(select 1 from sys.sysforeignkey where role='FK_LABORATO_REFERENCE_PISOS') then
    alter table LABORATORIOS
       delete foreign key FK_LABORATO_REFERENCE_PISOS
end if;

if exists(select 1 from sys.sysforeignkey where role='FK_LABORATO_REFERENCE_ESTADOS_') then
    alter table LABORATORIOS
       delete foreign key FK_LABORATO_REFERENCE_ESTADOS_
end if;

if exists(select 1 from sys.sysforeignkey where role='FK_MANTENIM_REFERENCE_ESTADOS_') then
    alter table MANTENIMIENTOS
       delete foreign key FK_MANTENIM_REFERENCE_ESTADOS_
end if;

if exists(select 1 from sys.sysforeignkey where role='FK_MANTENIM_REFERENCE_LABORATO') then
    alter table MANTENIMIENTOS
       delete foreign key FK_MANTENIM_REFERENCE_LABORATO
end if;

if exists(select 1 from sys.sysforeignkey where role='FK_PISOS_REFERENCE_EDIFICIO') then
    alter table PISOS
       delete foreign key FK_PISOS_REFERENCE_EDIFICIO
end if;

if exists(select 1 from sys.sysforeignkey where role='FK_RECURSOS_REFERENCE_LABORATO') then
    alter table RECURSOS
       delete foreign key FK_RECURSOS_REFERENCE_LABORATO
end if;

if exists(select 1 from sys.sysforeignkey where role='FK_RESERVAS_REFERENCE_SOLICITA') then
    alter table RESERVAS
       delete foreign key FK_RESERVAS_REFERENCE_SOLICITA
end if;

if exists(select 1 from sys.sysforeignkey where role='FK_RESERVAS_REFERENCE_ESTADO_R') then
    alter table RESERVAS
       delete foreign key FK_RESERVAS_REFERENCE_ESTADO_R
end if;

if exists(select 1 from sys.sysforeignkey where role='FK_RESERVAS_REFERENCE_TIPO_ACT') then
    alter table RESERVAS
       delete foreign key FK_RESERVAS_REFERENCE_TIPO_ACT
end if;

if exists(select 1 from sys.sysforeignkey where role='FK_RESERVAS_REFERENCE_LABORATO') then
    alter table RESERVAS
       delete foreign key FK_RESERVAS_REFERENCE_LABORATO
end if;

if exists(select 1 from sys.sysforeignkey where role='FK_SOLICITA_REFERENCE_CARRERAS') then
    alter table SOLICITANTES
       delete foreign key FK_SOLICITA_REFERENCE_CARRERAS
end if;

if exists(select 1 from sys.sysforeignkey where role='FK_SOLICITA_REFERENCE_TIPOS_SO') then
    alter table SOLICITANTES
       delete foreign key FK_SOLICITA_REFERENCE_TIPOS_SO
end if;

if exists(select 1 from sys.sysforeignkey where role='FK_SOLICITA_REFERENCE_TIPOS_DO') then
    alter table SOLICITANTES
       delete foreign key FK_SOLICITA_REFERENCE_TIPOS_DO
end if;

if exists(select 1 from sys.sysforeignkey where role='FK_TIPO_ACT_REFERENCE_PRIORIDA') then
    alter table TIPO_ACTIVIDAD
       delete foreign key FK_TIPO_ACT_REFERENCE_PRIORIDA
end if;

if exists(
   select 1 from sys.systable 
   where table_name='CARRERAS'
     and table_type in ('BASE', 'GBL TEMP')
) then
    drop table CARRERAS
end if;

if exists(
   select 1 from sys.systable 
   where table_name='DEPARTAMENTOS'
     and table_type in ('BASE', 'GBL TEMP')
) then
    drop table DEPARTAMENTOS
end if;

if exists(
   select 1 from sys.systable 
   where table_name='EDIFICIOS'
     and table_type in ('BASE', 'GBL TEMP')
) then
    drop table EDIFICIOS
end if;

if exists(
   select 1 from sys.systable 
   where table_name='ESTADOS_MANTENIMIENTOS'
     and table_type in ('BASE', 'GBL TEMP')
) then
    drop table ESTADOS_MANTENIMIENTOS
end if;

if exists(
   select 1 from sys.systable 
   where table_name='ESTADOS_OPERATIVOS'
     and table_type in ('BASE', 'GBL TEMP')
) then
    drop table ESTADOS_OPERATIVOS
end if;

if exists(
   select 1 from sys.systable 
   where table_name='ESTADO_RESERVA'
     and table_type in ('BASE', 'GBL TEMP')
) then
    drop table ESTADO_RESERVA
end if;

if exists(
   select 1 from sys.systable 
   where table_name='LABORATORIOS'
     and table_type in ('BASE', 'GBL TEMP')
) then
    drop table LABORATORIOS
end if;

if exists(
   select 1 from sys.systable 
   where table_name='MANTENIMIENTOS'
     and table_type in ('BASE', 'GBL TEMP')
) then
    drop table MANTENIMIENTOS
end if;

if exists(
   select 1 from sys.systable 
   where table_name='PISOS'
     and table_type in ('BASE', 'GBL TEMP')
) then
    drop table PISOS
end if;

if exists(
   select 1 from sys.systable 
   where table_name='PRIORIDADES'
     and table_type in ('BASE', 'GBL TEMP')
) then
    drop table PRIORIDADES
end if;

if exists(
   select 1 from sys.systable 
   where table_name='RECURSOS'
     and table_type in ('BASE', 'GBL TEMP')
) then
    drop table RECURSOS
end if;

if exists(
   select 1 from sys.systable 
   where table_name='RESERVAS'
     and table_type in ('BASE', 'GBL TEMP')
) then
    drop table RESERVAS
end if;

if exists(
   select 1 from sys.systable 
   where table_name='SOLICITANTES'
     and table_type in ('BASE', 'GBL TEMP')
) then
    drop table SOLICITANTES
end if;

if exists(
   select 1 from sys.systable 
   where table_name='TIPOS_DOCUMENTOS'
     and table_type in ('BASE', 'GBL TEMP')
) then
    drop table TIPOS_DOCUMENTOS
end if;

if exists(
   select 1 from sys.systable 
   where table_name='TIPOS_SOLICITANTES'
     and table_type in ('BASE', 'GBL TEMP')
) then
    drop table TIPOS_SOLICITANTES
end if;

if exists(
   select 1 from sys.systable 
   where table_name='TIPO_ACTIVIDAD'
     and table_type in ('BASE', 'GBL TEMP')
) then
    drop table TIPO_ACTIVIDAD
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
/* Table: CARRERAS                                              */
/*==============================================================*/
create table CARRERAS 
(
   ID_CARRERA           D_CLAVE                        not null default autoincrement,
   ID_DEPARTAMENTO      int                            null,
   NOMBRE               D_NOMBRE                       not null,
   constraint PK_CARRERAS primary key clustered (ID_CARRERA)
);

/*==============================================================*/
/* Table: DEPARTAMENTOS                                         */
/*==============================================================*/
create table DEPARTAMENTOS 
(
   ID_DEPARTAMENTO      D_CLAVE                        not null default autoincrement,
   ID_EDIFICIO          integer                        null,
   NOMBRE               D_NOMBRE                       not null,
   constraint PK_DEPARTAMENTOS primary key clustered (ID_DEPARTAMENTO)
);

/*==============================================================*/
/* Table: EDIFICIOS                                             */
/*==============================================================*/
create table EDIFICIOS 
(
   ID_EDIFICIO          D_CLAVE                        not null,
   NOMBRE_EDIFICIO      D_NOMBRE                       null,
   constraint PK_EDIFICIOS primary key clustered (ID_EDIFICIO)
);

/*==============================================================*/
/* Table: ESTADOS_MANTENIMIENTOS                                */
/*==============================================================*/
create table ESTADOS_MANTENIMIENTOS 
(
   ID_ESTADO_MANTENIMIENTO D_CLAVE                        not null,
   ESTADO_MANTENIMIENTO varchar(1)                     not null default 'R'
      constraint CKC_ESTADO_MANTENIMIE_ESTADOS_ check (ESTADO_MANTENIMIENTO in ('P','R','E','C') and ESTADO_MANTENIMIENTO = upper(ESTADO_MANTENIMIENTO)),
   constraint PK_ESTADOS_MANTENIMIENTOS primary key clustered (ID_ESTADO_MANTENIMIENTO)
);

/*==============================================================*/
/* Table: ESTADOS_OPERATIVOS                                    */
/*==============================================================*/
create table ESTADOS_OPERATIVOS 
(
   ESTADO               D_CLAVE                        not null default autoincrement,
   TIPO                 char(1)                        null default 'D'
      constraint CKC_TIPO_ESTADOS_ check (TIPO is null or (TIPO in ('D','R','M','F','B') and TIPO = upper(TIPO))),
   constraint PK_ESTADOS_OPERATIVOS primary key clustered (ESTADO)
);

/*==============================================================*/
/* Table: ESTADO_RESERVA                                        */
/*==============================================================*/
create table ESTADO_RESERVA 
(
   ID_ESTADO_RESERVA    D_CLAVE                        not null,
   ESTADO_RESERVA       varchar(1)                     not null default 'P'
      constraint CKC_ESTADO_RESERVA_ESTADO_R check (ESTADO_RESERVA in ('A','P','C','U') and ESTADO_RESERVA = upper(ESTADO_RESERVA)),
   constraint PK_ESTADO_RESERVA primary key clustered (ID_ESTADO_RESERVA)
);

/*==============================================================*/
/* Table: LABORATORIOS                                          */
/*==============================================================*/
create table LABORATORIOS 
(
   NUMERO_LABORATORIO   D_CLAVE                        not null default autoincrement,
   ID_EDIFICIO          integer                        null,
   ESTADO               int                            null,
   EDIFICIO             D_NOMBRE                       not null,
   CAPACIDAD_ALUMNOS    D_CLAVE                        not null,
   CANTIDAD_COMPUTADORAS D_CLAVE                        not null,
   VELOCIDAD_CONEXION_INTERNET D_CLAVE                        not null,
   constraint PK_LABORATORIOS primary key clustered (NUMERO_LABORATORIO)
);

/*==============================================================*/
/* Table: MANTENIMIENTOS                                        */
/*==============================================================*/
create table MANTENIMIENTOS 
(
   ID_MANTENIMIENTO     D_CLAVE                        not null,
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
create table PISOS 
(
   ID_EDIFICIO          integer                        not null default autoincrement,
   NRO_PISO             integer                        null,
   constraint PK_PISOS primary key clustered (ID_EDIFICIO)
);

/*==============================================================*/
/* Table: PRIORIDADES                                           */
/*==============================================================*/
create table PRIORIDADES 
(
   ID_PRIORIDAD         D_CLAVE                        not null,
   NOMBRE               D_NOMBRE                       null,
   constraint PK_PRIORIDADES primary key clustered (ID_PRIORIDAD)
);

/*==============================================================*/
/* Table: RECURSOS                                              */
/*==============================================================*/
create table RECURSOS 
(
   ID_RECURSO           D_CLAVE                        not null,
   NUMERO_LABORATORIO   D_CLAVE                        null,
   NOMBRE               D_NOMBRE                       not null,
   DESCRIPCION          D_NOMBRE                       not null,
   DISPONIBILIDAD       varchar(1)                     not null default 'S'
      constraint CKC_DISPONIBILIDAD_RECURSOS check (DISPONIBILIDAD in ('S','N') and DISPONIBILIDAD = upper(DISPONIBILIDAD)),
   constraint PK_RECURSOS primary key clustered (ID_RECURSO)
);

/*==============================================================*/
/* Table: RESERVAS                                              */
/*==============================================================*/
create table RESERVAS 
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
   constraint PK_RESERVAS primary key clustered (ID_RESERVA)
);

/*==============================================================*/
/* Table: SOLICITANTES                                          */
/*==============================================================*/
create table SOLICITANTES 
(
   CEDULA_IDENTIDAD     D_CLAVE                        not null,
   CORREO               D_NOMBRE                       not null,
   ID_CARRERA           int                            null,
   ID_SOLICITANTE       int                            null,
   TIPO_DOCUMENTO       D_CLAVE                        null,
   NOMBRE               D_NOMBRE                       not null,
   APELLIDO             D_NOMBRE                       not null,
   TELEFONO             D_NOMBRE                       not null,
   DEPARTAMENTO         D_NOMBRE                       not null,
   constraint PK_SOLICITANTES primary key clustered (CEDULA_IDENTIDAD, CORREO)
);

/*==============================================================*/
/* Table: TIPOS_DOCUMENTOS                                      */
/*==============================================================*/
create table TIPOS_DOCUMENTOS 
(
   TIPO_DOCUMENTO       D_CLAVE                        not null default autoincrement,
   NOMBRE               D_NOMBRE                       not null,
   constraint PK_TIPOS_DOCUMENTOS primary key clustered (TIPO_DOCUMENTO)
);

/*==============================================================*/
/* Table: TIPOS_SOLICITANTES                                    */
/*==============================================================*/
create table TIPOS_SOLICITANTES 
(
   ID_SOLICITANTE       D_CLAVE                        not null default autoincrement,
   TIPO_SOLICITANTE     D_NOMBRE                       not null,
   constraint PK_TIPOS_SOLICITANTES primary key clustered (ID_SOLICITANTE)
);

/*==============================================================*/
/* Table: TIPO_ACTIVIDAD                                        */
/*==============================================================*/
create table TIPO_ACTIVIDAD 
(
   ID_TIPO_ACTIVIDAD    D_CLAVE                        not null,
   ID_PRIORIDAD         integer                        null,
   NOMBRE               D_NOMBRE                       not null,
   PRIORIDAD            int                            not null,
   DURACION_MAX_HORAS   int                            not null,
   constraint PK_TIPO_ACTIVIDAD primary key clustered (ID_TIPO_ACTIVIDAD)
);

alter table CARRERAS
   add constraint FK_CARRERAS_REFERENCE_DEPARTAM foreign key (ID_DEPARTAMENTO)
      references DEPARTAMENTOS (ID_DEPARTAMENTO)
      on update restrict
      on delete restrict;

alter table DEPARTAMENTOS
   add constraint FK_DEPARTAM_REFERENCE_EDIFICIO foreign key (ID_EDIFICIO)
      references EDIFICIOS (ID_EDIFICIO)
      on update restrict
      on delete restrict;

alter table LABORATORIOS
   add constraint FK_LABORATO_REFERENCE_PISOS foreign key (ID_EDIFICIO)
      references PISOS (ID_EDIFICIO)
      on update restrict
      on delete restrict;

alter table LABORATORIOS
   add constraint FK_LABORATO_REFERENCE_ESTADOS_ foreign key (ESTADO)
      references ESTADOS_OPERATIVOS (ESTADO)
      on update restrict
      on delete restrict;

alter table MANTENIMIENTOS
   add constraint FK_MANTENIM_REFERENCE_ESTADOS_ foreign key (ID_ESTADO_MANTENIMIENTO)
      references ESTADOS_MANTENIMIENTOS (ID_ESTADO_MANTENIMIENTO)
      on update restrict
      on delete restrict;

alter table MANTENIMIENTOS
   add constraint FK_MANTENIM_REFERENCE_LABORATO foreign key (NUMERO_LABORATORIO)
      references LABORATORIOS (NUMERO_LABORATORIO)
      on update restrict
      on delete restrict;

alter table PISOS
   add constraint FK_PISOS_REFERENCE_EDIFICIO foreign key (ID_EDIFICIO)
      references EDIFICIOS (ID_EDIFICIO)
      on update restrict
      on delete restrict;

alter table RECURSOS
   add constraint FK_RECURSOS_REFERENCE_LABORATO foreign key (NUMERO_LABORATORIO)
      references LABORATORIOS (NUMERO_LABORATORIO)
      on update restrict
      on delete restrict;

alter table RESERVAS
   add constraint FK_RESERVAS_REFERENCE_SOLICITA foreign key (CEDULA_IDENTIDAD, CORREO)
      references SOLICITANTES (CEDULA_IDENTIDAD, CORREO)
      on update restrict
      on delete restrict;

alter table RESERVAS
   add constraint FK_RESERVAS_REFERENCE_ESTADO_R foreign key (ID_ESTADO_RESERVA)
      references ESTADO_RESERVA (ID_ESTADO_RESERVA)
      on update restrict
      on delete restrict;

alter table RESERVAS
   add constraint FK_RESERVAS_REFERENCE_TIPO_ACT foreign key (ID_TIPO_ACTIVIDAD)
      references TIPO_ACTIVIDAD (ID_TIPO_ACTIVIDAD)
      on update restrict
      on delete restrict;

alter table RESERVAS
   add constraint FK_RESERVAS_REFERENCE_LABORATO foreign key (NUMERO_LABORATORIO)
      references LABORATORIOS (NUMERO_LABORATORIO)
      on update restrict
      on delete restrict;

alter table SOLICITANTES
   add constraint FK_SOLICITA_REFERENCE_CARRERAS foreign key (ID_CARRERA)
      references CARRERAS (ID_CARRERA)
      on update restrict
      on delete restrict;

alter table SOLICITANTES
   add constraint FK_SOLICITA_REFERENCE_TIPOS_SO foreign key (ID_SOLICITANTE)
      references TIPOS_SOLICITANTES (ID_SOLICITANTE)
      on update restrict
      on delete restrict;

alter table SOLICITANTES
   add constraint FK_SOLICITA_REFERENCE_TIPOS_DO foreign key (TIPO_DOCUMENTO)
      references TIPOS_DOCUMENTOS (TIPO_DOCUMENTO)
      on update restrict
      on delete restrict;

alter table TIPO_ACTIVIDAD
   add constraint FK_TIPO_ACT_REFERENCE_PRIORIDA foreign key (ID_PRIORIDAD)
      references PRIORIDADES (ID_PRIORIDAD)
      on update restrict
      on delete restrict;

