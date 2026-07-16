/*==============================================================*/
/* LabControl - Datos de prueba (VERSION ORDENADA)              */
/* Dialecto: Watcom-SQL (Sybase SQL Anywhere) - ejecutar en ISQL*/
/* Fecha de referencia: hoy = 2026-07-07 (martes)               */
/*                                                              */
/* Este script se puede ejecutar completo de un tiron.          */
/* PASO 0 limpia datos parciales de intentos anteriores.        */
/* Los inserts con errores intencionales estan en el PASO 6,    */
/* COMENTADOS, para probarlos de a uno.                         */
/* El PASO 7 (tambien comentado) demuestra el desplazamiento    */
/* por prioridad: una reserva de mayor jerarquia que SI debe    */
/* entrar aunque se solape con una de menor jerarquia.          */
/*                                                              */
/* SUPUESTOS que tome al mapear tus datos reales (ajustalos si  */
/* no coinciden con la realidad de la facultad):                */
/*  - Los 5 departamentos reales los puse todos en el edificio  */
/*    "Ciencias y Tecnologia" (ID_EDIFICIO=3).                  */
/*  - Los laboratorios 1,2,3 los puse en "Ciencias y Tecnologia"*/
/*    (3) y los laboratorios 4,5 en "Bloque G" (4).             */
/*  - Cada departamento real lo mapee 1 a 1 a una carrera        */
/*    "principal" homonima, para no romper el resto del modelo. */
/*==============================================================*/

/*==============================================================*/
/* PASO 0 - LIMPIEZA (orden inverso a las dependencias FK)      */
/*==============================================================*/
DELETE FROM RESERVAS;
DELETE FROM MANTENIMIENTOS;
DELETE FROM SOLICITANTES;
DELETE FROM RECURSOS;
DELETE FROM LABORATORIOS;
DELETE FROM TIPO_ACTIVIDAD;
DELETE FROM PRIORIDADES;
DELETE FROM TIPOS_SOLICITANTES;
DELETE FROM TIPOS_DOCUMENTOS;
DELETE FROM ESTADO_RESERVA;
DELETE FROM ESTADOS_OPERATIVOS;
DELETE FROM ESTADOS_MANTENIMIENTOS;
DELETE FROM CARRERAS;
DELETE FROM DEPARTAMENTOS;
DELETE FROM PISOS;
DELETE FROM EDIFICIOS;

COMMIT;

/* Verificacion rapida: todo debe dar 0 antes de seguir.
   Si algo no da 0, hay un lock o una tabla que no se pudo
   limpiar (revisar con ROLLBACK y reintentar el DELETE). */
/*
SELECT 'RESERVAS' t, COUNT(*) c FROM RESERVAS
UNION ALL SELECT 'LABORATORIOS', COUNT(*) FROM LABORATORIOS
UNION ALL SELECT 'PISOS', COUNT(*) FROM PISOS
UNION ALL SELECT 'EDIFICIOS', COUNT(*) FROM EDIFICIOS;
*/

/*==============================================================*/
/* PASO 1 - TABLAS SIN DEPENDENCIAS                             */
/*==============================================================*/

/*---------------- EDIFICIOS (edificios reales de la facultad) ----------------*/
INSERT INTO EDIFICIOS (ID_EDIFICIO, NOMBRE_EDIFICIO) VALUES (1, 'Biblioteca Pablo VI');
INSERT INTO EDIFICIOS (ID_EDIFICIO, NOMBRE_EDIFICIO) VALUES (2, 'Ciencias Contables');
INSERT INTO EDIFICIOS (ID_EDIFICIO, NOMBRE_EDIFICIO) VALUES (3, 'Ciencias y Tecnologia');
INSERT INTO EDIFICIOS (ID_EDIFICIO, NOMBRE_EDIFICIO) VALUES (4, 'Bloque G');

/*---------------- ESTADOS_MANTENIMIENTOS ----------------*/
/* P=pendiente, R=realizado, E=en proceso, C=cancelado */
INSERT INTO ESTADOS_MANTENIMIENTOS (ID_ESTADO_MANTENIMIENTO, ESTADO_MANTENIMIENTO) VALUES (1, 'P');
INSERT INTO ESTADOS_MANTENIMIENTOS (ID_ESTADO_MANTENIMIENTO, ESTADO_MANTENIMIENTO) VALUES (2, 'R');
INSERT INTO ESTADOS_MANTENIMIENTOS (ID_ESTADO_MANTENIMIENTO, ESTADO_MANTENIMIENTO) VALUES (3, 'E');
INSERT INTO ESTADOS_MANTENIMIENTOS (ID_ESTADO_MANTENIMIENTO, ESTADO_MANTENIMIENTO) VALUES (4, 'C');

/*---------------- ESTADOS_OPERATIVOS ----------------*/
/* D=Disponible, R=Reservado, M=Mantenimiento, F=Fuera de servicio, B=Bloqueado */
INSERT INTO ESTADOS_OPERATIVOS (ESTADO, TIPO) VALUES (1, 'D');
INSERT INTO ESTADOS_OPERATIVOS (ESTADO, TIPO) VALUES (2, 'R');
INSERT INTO ESTADOS_OPERATIVOS (ESTADO, TIPO) VALUES (3, 'M');
INSERT INTO ESTADOS_OPERATIVOS (ESTADO, TIPO) VALUES (4, 'F');
INSERT INTO ESTADOS_OPERATIVOS (ESTADO, TIPO) VALUES (5, 'B');

/*---------------- ESTADO_RESERVA ----------------*/
/* P=Pendiente, U=Utilizado, C=Cancelado, A=Ausente */
INSERT INTO ESTADO_RESERVA (ID_ESTADO_RESERVA, ESTADO_RESERVA) VALUES (1, 'P');
INSERT INTO ESTADO_RESERVA (ID_ESTADO_RESERVA, ESTADO_RESERVA) VALUES (2, 'U');
INSERT INTO ESTADO_RESERVA (ID_ESTADO_RESERVA, ESTADO_RESERVA) VALUES (3, 'C');
INSERT INTO ESTADO_RESERVA (ID_ESTADO_RESERVA, ESTADO_RESERVA) VALUES (4, 'A');

/*---------------- TIPOS_DOCUMENTOS ----------------*/
INSERT INTO TIPOS_DOCUMENTOS (TIPO_DOCUMENTO, NOMBRE) VALUES (1, 'Cedula de Identidad');
INSERT INTO TIPOS_DOCUMENTOS (TIPO_DOCUMENTO, NOMBRE) VALUES (2, 'Pasaporte');

/*---------------- TIPOS_SOLICITANTES ----------------*/
INSERT INTO TIPOS_SOLICITANTES (ID_SOLICITANTE, TIPO_SOLICITANTE) VALUES (1, 'Docente');
INSERT INTO TIPOS_SOLICITANTES (ID_SOLICITANTE, TIPO_SOLICITANTE) VALUES (2, 'Estudiante');
INSERT INTO TIPOS_SOLICITANTES (ID_SOLICITANTE, TIPO_SOLICITANTE) VALUES (3, 'Administrativo');

/*---------------- PRIORIDADES ----------------*/
/* 1 = maxima prioridad, 4 = minima. Es el "nivel" agrupador que
   usa TIPO_ACTIVIDAD.ID_PRIORIDAD para mostrar/filtrar por
   categoria (Alta/Media Alta/Media/Baja). El desempate fino
   real, sin embargo, lo hace TIPO_ACTIVIDAD.PRIORIDAD (ver abajo). */
INSERT INTO PRIORIDADES (ID_PRIORIDAD, NOMBRE) VALUES (1, 'Alta');
INSERT INTO PRIORIDADES (ID_PRIORIDAD, NOMBRE) VALUES (2, 'Media Alta');
INSERT INTO PRIORIDADES (ID_PRIORIDAD, NOMBRE) VALUES (3, 'Media');
INSERT INTO PRIORIDADES (ID_PRIORIDAD, NOMBRE) VALUES (4, 'Baja');

COMMIT;

/*==============================================================*/
/* PASO 2 - DEPENDEN DE PASO 1                                  */
/*==============================================================*/

/*---------------- PISOS (depende de EDIFICIOS) ----------------*/
/* OJO: la PK de PISOS es solo ID_EDIFICIO -> un piso por edificio.
   Una fila por cada uno de los 4 edificios reales. */
INSERT INTO PISOS (ID_EDIFICIO, NRO_PISO) VALUES (1, 1);
INSERT INTO PISOS (ID_EDIFICIO, NRO_PISO) VALUES (2, 1);
INSERT INTO PISOS (ID_EDIFICIO, NRO_PISO) VALUES (3, 1);
INSERT INTO PISOS (ID_EDIFICIO, NRO_PISO) VALUES (4, 1);

/*---------------- DEPARTAMENTOS (depende de EDIFICIOS) ----------------*/
/* Los 5 departamentos reales de la Facultad de Ciencias y Tecnologia.
   Supuse que todos funcionan en el edificio "Ciencias y Tecnologia"
   (ID_EDIFICIO=3) - ajustalo si alguno esta en otro edificio. */
INSERT INTO DEPARTAMENTOS (ID_DEPARTAMENTO, ID_EDIFICIO, NOMBRE) VALUES (1, 3, 'DA - Arquitectura');
INSERT INTO DEPARTAMENTOS (ID_DEPARTAMENTO, ID_EDIFICIO, NOMBRE) VALUES (2, 3, 'DAS - Analisis de Sistemas');
INSERT INTO DEPARTAMENTOS (ID_DEPARTAMENTO, ID_EDIFICIO, NOMBRE) VALUES (3, 3, 'DEI - Ing. Informatica y Electronica');
INSERT INTO DEPARTAMENTOS (ID_DEPARTAMENTO, ID_EDIFICIO, NOMBRE) VALUES (4, 3, 'DICIA - Ing. Civil, Industrial y Ambiental');
INSERT INTO DEPARTAMENTOS (ID_DEPARTAMENTO, ID_EDIFICIO, NOMBRE) VALUES (5, 3, 'DIS - Diseno Grafico e Industrial');

/*---------------- TIPO_ACTIVIDAD (depende de PRIORIDADES) ----------------*/
/* Catalogo real que pasaste. ID_PRIORIDAD agrupa por nivel:
     1 (Alta)       -> Reunion Directiva, Evento Institucional
     2 (Media Alta)  -> Examen, Defensa Proyecto Final
     3 (Media)       -> Exposicion
     4 (Baja)        -> Clase
   PRIORIDAD (numerico, columna propia de TIPO_ACTIVIDAD) es el
   valor fino que usa fn_existe_solapamiento_reservas para decidir
   desplazamientos: 1 = maxima prioridad real, sin empates. */
INSERT INTO TIPO_ACTIVIDAD (ID_TIPO_ACTIVIDAD, ID_PRIORIDAD, NOMBRE, NIVEL_PRIORIDAD, DURACION_MAX_HORAS) VALUES (0, 1, 'Reunion Directiva', 1, 3);
INSERT INTO TIPO_ACTIVIDAD (ID_TIPO_ACTIVIDAD, ID_PRIORIDAD, NOMBRE, NIVEL_PRIORIDAD, DURACION_MAX_HORAS) VALUES (1, 1, 'Evento Institucional', 2, 8);
INSERT INTO TIPO_ACTIVIDAD (ID_TIPO_ACTIVIDAD, ID_PRIORIDAD, NOMBRE, NIVEL_PRIORIDAD, DURACION_MAX_HORAS) VALUES (2, 2, 'Examen', 3, 3);
INSERT INTO TIPO_ACTIVIDAD (ID_TIPO_ACTIVIDAD, ID_PRIORIDAD, NOMBRE, NIVEL_PRIORIDAD, DURACION_MAX_HORAS) VALUES (3, 2, 'Defensa Proyecto Final', 4, 3);
INSERT INTO TIPO_ACTIVIDAD (ID_TIPO_ACTIVIDAD, ID_PRIORIDAD, NOMBRE, NIVEL_PRIORIDAD, DURACION_MAX_HORAS) VALUES (4, 3, 'Exposicion', 5, 4);
INSERT INTO TIPO_ACTIVIDAD (ID_TIPO_ACTIVIDAD, ID_PRIORIDAD, NOMBRE, NIVEL_PRIORIDAD, DURACION_MAX_HORAS) VALUES (5, 4, 'Clase', 6, 4);

COMMIT;

/*==============================================================*/
/* PASO 3 - DEPENDEN DE PASO 2                                  */
/*==============================================================*/

/*---------------- CARRERAS (depende de DEPARTAMENTOS) ----------------*/
/* Una carrera "principal" por departamento, para no romper el
   resto del modelo (SOLICITANTES depende de CARRERAS). Si tu
   proyecto necesita varias carreras por departamento, se agregan
   despues sin tocar nada mas. */
INSERT INTO CARRERAS (ID_CARRERA, ID_DEPARTAMENTO, NOMBRE) VALUES (1, 1, 'Arquitectura');
INSERT INTO CARRERAS (ID_CARRERA, ID_DEPARTAMENTO, NOMBRE) VALUES (2, 2, 'Analisis de Sistemas');
INSERT INTO CARRERAS (ID_CARRERA, ID_DEPARTAMENTO, NOMBRE) VALUES (3, 3, 'Ingenieria Informatica');
INSERT INTO CARRERAS (ID_CARRERA, ID_DEPARTAMENTO, NOMBRE) VALUES (4, 4, 'Ingenieria Civil');
INSERT INTO CARRERAS (ID_CARRERA, ID_DEPARTAMENTO, NOMBRE) VALUES (5, 5, 'Diseno Grafico');

/*---------------- LABORATORIOS (depende de PISOS y ESTADOS_OPERATIVOS) ----------------*/
/* Labs 1,2,3 en "Ciencias y Tecnologia" (edificio 3);
   labs 4,5 en "Bloque G" (edificio 4).
   Lab 4 en Mantenimiento (3) y Lab 5 Fuera de servicio (4). */
INSERT INTO LABORATORIOS (NUMERO_LABORATORIO, ID_EDIFICIO, ESTADO, EDIFICIO, CAPACIDAD_ALUMNOS, CANTIDAD_COMPUTADORAS, VELOCIDAD_CONEXION_INTERNET)
VALUES (1, 3, 1, 'Ciencias y Tecnologia', 30, 30, 100);
INSERT INTO LABORATORIOS (NUMERO_LABORATORIO, ID_EDIFICIO, ESTADO, EDIFICIO, CAPACIDAD_ALUMNOS, CANTIDAD_COMPUTADORAS, VELOCIDAD_CONEXION_INTERNET)
VALUES (2, 3, 1, 'Ciencias y Tecnologia', 20, 20, 50);
INSERT INTO LABORATORIOS (NUMERO_LABORATORIO, ID_EDIFICIO, ESTADO, EDIFICIO, CAPACIDAD_ALUMNOS, CANTIDAD_COMPUTADORAS, VELOCIDAD_CONEXION_INTERNET)
VALUES (3, 3, 1, 'Ciencias y Tecnologia', 40, 35, 200);
INSERT INTO LABORATORIOS (NUMERO_LABORATORIO, ID_EDIFICIO, ESTADO, EDIFICIO, CAPACIDAD_ALUMNOS, CANTIDAD_COMPUTADORAS, VELOCIDAD_CONEXION_INTERNET)
VALUES (4, 4, 3, 'Bloque G', 25, 25, 100);
INSERT INTO LABORATORIOS (NUMERO_LABORATORIO, ID_EDIFICIO, ESTADO, EDIFICIO, CAPACIDAD_ALUMNOS, CANTIDAD_COMPUTADORAS, VELOCIDAD_CONEXION_INTERNET)
VALUES (5, 4, 4, 'Bloque G', 15, 15, 50);

COMMIT;

/*==============================================================*/
/* PASO 4 - DEPENDEN DE PASO 3                                  */
/*==============================================================*/

/*---------------- RECURSOS (depende de LABORATORIOS) ----------------*/
INSERT INTO RECURSOS (ID_RECURSO, NUMERO_LABORATORIO, NOMBRE, DESCRIPCION, DISPONIBILIDAD) VALUES (1, 1, 'Proyector', 'Proyector Epson Full HD', 'S');
INSERT INTO RECURSOS (ID_RECURSO, NUMERO_LABORATORIO, NOMBRE, DESCRIPCION, DISPONIBILIDAD) VALUES (2, 1, 'Aire Acondicionado', 'Split 24000 BTU', 'S');
INSERT INTO RECURSOS (ID_RECURSO, NUMERO_LABORATORIO, NOMBRE, DESCRIPCION, DISPONIBILIDAD) VALUES (3, 2, 'Proyector', 'Proyector BenQ HD', 'S');
INSERT INTO RECURSOS (ID_RECURSO, NUMERO_LABORATORIO, NOMBRE, DESCRIPCION, DISPONIBILIDAD) VALUES (4, 2, 'Pizarra Digital', 'Pizarra interactiva Smart', 'N');
INSERT INTO RECURSOS (ID_RECURSO, NUMERO_LABORATORIO, NOMBRE, DESCRIPCION, DISPONIBILIDAD) VALUES (5, 3, 'Impresora 3D', 'Creality Ender 3', 'S');
INSERT INTO RECURSOS (ID_RECURSO, NUMERO_LABORATORIO, NOMBRE, DESCRIPCION, DISPONIBILIDAD) VALUES (6, 3, 'Proyector', 'Proyector laser 4K', 'S');
INSERT INTO RECURSOS (ID_RECURSO, NUMERO_LABORATORIO, NOMBRE, DESCRIPCION, DISPONIBILIDAD) VALUES (7, 4, 'Aire Acondicionado', 'Split 18000 BTU', 'S');
INSERT INTO RECURSOS (ID_RECURSO, NUMERO_LABORATORIO, NOMBRE, DESCRIPCION, DISPONIBILIDAD) VALUES (8, 5, 'Proyector', 'Proyector portatil', 'N');

/*---------------- MANTENIMIENTOS (depende de LABORATORIOS y ESTADOS_MANTENIMIENTOS) ----------------*/
INSERT INTO MANTENIMIENTOS (ID_MANTENIMIENTO, ID_ESTADO_MANTENIMIENTO, NUMERO_LABORATORIO, FECHA_INICIO, FECHA_FIN_PREVISTA, OBSERVACIONES)
VALUES (1, 3, 4, '2026-07-06', '2026-07-17', 'Recambio de equipos y cableado de red');
INSERT INTO MANTENIMIENTOS (ID_MANTENIMIENTO, ID_ESTADO_MANTENIMIENTO, NUMERO_LABORATORIO, FECHA_INICIO, FECHA_FIN_PREVISTA, OBSERVACIONES)
VALUES (2, 1, 1, '2026-08-03', '2026-08-07', 'Mantenimiento preventivo de aires acondicionados');
INSERT INTO MANTENIMIENTOS (ID_MANTENIMIENTO, ID_ESTADO_MANTENIMIENTO, NUMERO_LABORATORIO, FECHA_INICIO, FECHA_FIN_PREVISTA, OBSERVACIONES)
VALUES (3, 3, 5, '2026-07-01', '2026-07-31', 'Reparacion electrica general - fuera de servicio');

/*---------------- SOLICITANTES (depende de CARRERAS, TIPOS_SOLICITANTES, TIPOS_DOCUMENTOS) ----------------*/
INSERT INTO SOLICITANTES (CEDULA_IDENTIDAD, CORREO, ID_CARRERA, ID_SOLICITANTE, TIPO_DOCUMENTO, NOMBRE, APELLIDO, TELEFONO, DEPARTAMENTO)
VALUES (4123456, 'jgonzalez@uc.edu.py', 2, 1, 1, 'Juan', 'Gonzalez', '0981111222', 'DAS');
INSERT INTO SOLICITANTES (CEDULA_IDENTIDAD, CORREO, ID_CARRERA, ID_SOLICITANTE, TIPO_DOCUMENTO, NOMBRE, APELLIDO, TELEFONO, DEPARTAMENTO)
VALUES (4234567, 'mlopez@uc.edu.py', 3, 1, 1, 'Maria', 'Lopez', '0982222333', 'DEI');
INSERT INTO SOLICITANTES (CEDULA_IDENTIDAD, CORREO, ID_CARRERA, ID_SOLICITANTE, TIPO_DOCUMENTO, NOMBRE, APELLIDO, TELEFONO, DEPARTAMENTO)
VALUES (4345678, 'crodriguez@uc.edu.py', 2, 2, 1, 'Carlos', 'Rodriguez', '0983333444', 'DAS');
INSERT INTO SOLICITANTES (CEDULA_IDENTIDAD, CORREO, ID_CARRERA, ID_SOLICITANTE, TIPO_DOCUMENTO, NOMBRE, APELLIDO, TELEFONO, DEPARTAMENTO)
VALUES (4456789, 'aferreira@uc.edu.py', 1, 2, 1, 'Ana', 'Ferreira', '0984444555', 'DA');
INSERT INTO SOLICITANTES (CEDULA_IDENTIDAD, CORREO, ID_CARRERA, ID_SOLICITANTE, TIPO_DOCUMENTO, NOMBRE, APELLIDO, TELEFONO, DEPARTAMENTO)
VALUES (4567890, 'pbenitez@uc.edu.py', NULL, 3, 1, 'Pedro', 'Benitez', '0985555666', 'Administracion');

COMMIT;

/*==============================================================*/
/* PASO 5 - RESERVAS VALIDAS (julio 2026)                       */
/* Solo dias habiles, fechas >= hoy (2026-07-07),               */
/* sin solapamientos, alumnos <= capacidad, labs 1-3.           */
/* Estados: 1=P, 2=U, 3=C, 4=A                                  */
/* Tipos:   0=Reunion Directiva, 1=Evento Institucional,        */
/*          2=Examen, 3=Defensa Proyecto Final,                 */
/*          4=Exposicion, 5=Clase                               */
/*==============================================================*/

/* Martes 07/07 (hoy) */
INSERT INTO RESERVAS (NUMERO_LABORATORIO, CEDULA_IDENTIDAD, CORREO, ID_ESTADO_RESERVA, ID_TIPO_ACTIVIDAD, FECHA_A_RESERVAR, HORA_INICIO, HORA_FIN, CANTIDAD_ALUMNOS, FECHA_SOLICITUD)
VALUES (1, 4123456, 'jgonzalez@uc.edu.py', 2, 5, '2026-07-07', '07:30:00', '09:30:00', 25, CURRENT DATE);
INSERT INTO RESERVAS (NUMERO_LABORATORIO, CEDULA_IDENTIDAD, CORREO, ID_ESTADO_RESERVA, ID_TIPO_ACTIVIDAD, FECHA_A_RESERVAR, HORA_INICIO, HORA_FIN, CANTIDAD_ALUMNOS, FECHA_SOLICITUD)
VALUES (2, 4345678, 'crodriguez@uc.edu.py', 4, 4, '2026-07-07', '10:00:00', '12:00:00', 15, CURRENT DATE);

/* Miercoles 08/07 - la primera es la BASE del test de solapamiento */
INSERT INTO RESERVAS (NUMERO_LABORATORIO, CEDULA_IDENTIDAD, CORREO, ID_ESTADO_RESERVA, ID_TIPO_ACTIVIDAD, FECHA_A_RESERVAR, HORA_INICIO, HORA_FIN, CANTIDAD_ALUMNOS, FECHA_SOLICITUD)
VALUES (1, 4234567, 'mlopez@uc.edu.py', 1, 5, '2026-07-08', '08:00:00', '10:00:00', 28, CURRENT DATE);
INSERT INTO RESERVAS (NUMERO_LABORATORIO, CEDULA_IDENTIDAD, CORREO, ID_ESTADO_RESERVA, ID_TIPO_ACTIVIDAD, FECHA_A_RESERVAR, HORA_INICIO, HORA_FIN, CANTIDAD_ALUMNOS, FECHA_SOLICITUD)
VALUES (3, 4456789, 'aferreira@uc.edu.py', 1, 4, '2026-07-08', '14:00:00', '17:00:00', 35, CURRENT DATE);

/* Jueves 09/07 - incluye una cancelada (con motivo obligatorio) */
INSERT INTO RESERVAS (NUMERO_LABORATORIO, CEDULA_IDENTIDAD, CORREO, ID_ESTADO_RESERVA, ID_TIPO_ACTIVIDAD, FECHA_A_RESERVAR, HORA_INICIO, HORA_FIN, CANTIDAD_ALUMNOS, FECHA_SOLICITUD)
VALUES (2, 4123456, 'jgonzalez@uc.edu.py', 1, 5, '2026-07-09', '09:00:00', '11:00:00', 18, CURRENT DATE);
INSERT INTO RESERVAS (NUMERO_LABORATORIO, CEDULA_IDENTIDAD, CORREO, ID_ESTADO_RESERVA, ID_TIPO_ACTIVIDAD, FECHA_A_RESERVAR, HORA_INICIO, HORA_FIN, CANTIDAD_ALUMNOS, FECHA_SOLICITUD, MOTIVO_CANCELACION)
VALUES (1, 4567890, 'pbenitez@uc.edu.py', 3, 4, '2026-07-09', '15:00:00', '17:00:00', 20, CURRENT DATE, 'El solicitante pidio cambio de horario');

/* Viernes 10/07 */
INSERT INTO RESERVAS (NUMERO_LABORATORIO, CEDULA_IDENTIDAD, CORREO, ID_ESTADO_RESERVA, ID_TIPO_ACTIVIDAD, FECHA_A_RESERVAR, HORA_INICIO, HORA_FIN, CANTIDAD_ALUMNOS, FECHA_SOLICITUD)
VALUES (1, 4234567, 'mlopez@uc.edu.py', 1, 2, '2026-07-10', '13:00:00', '15:00:00', 30, CURRENT DATE);

/* Lunes 13/07 - Evento Institucional (max 8h) */
INSERT INTO RESERVAS (NUMERO_LABORATORIO, CEDULA_IDENTIDAD, CORREO, ID_ESTADO_RESERVA, ID_TIPO_ACTIVIDAD, FECHA_A_RESERVAR, HORA_INICIO, HORA_FIN, CANTIDAD_ALUMNOS, FECHA_SOLICITUD)
VALUES (3, 4567890, 'pbenitez@uc.edu.py', 1, 1, '2026-07-13', '08:00:00', '12:00:00', 40, CURRENT DATE);

/* Martes 14/07 - Reunion Directiva (max 3h) */
INSERT INTO RESERVAS (NUMERO_LABORATORIO, CEDULA_IDENTIDAD, CORREO, ID_ESTADO_RESERVA, ID_TIPO_ACTIVIDAD, FECHA_A_RESERVAR, HORA_INICIO, HORA_FIN, CANTIDAD_ALUMNOS, FECHA_SOLICITUD)
VALUES (1, 4123456, 'jgonzalez@uc.edu.py', 1, 0, '2026-07-14', '10:00:00', '12:00:00', 22, CURRENT DATE);

/* Miercoles 15/07 */
INSERT INTO RESERVAS (NUMERO_LABORATORIO, CEDULA_IDENTIDAD, CORREO, ID_ESTADO_RESERVA, ID_TIPO_ACTIVIDAD, FECHA_A_RESERVAR, HORA_INICIO, HORA_FIN, CANTIDAD_ALUMNOS, FECHA_SOLICITUD)
VALUES (2, 4345678, 'crodriguez@uc.edu.py', 1, 4, '2026-07-15', '15:00:00', '17:00:00', 10, CURRENT DATE);

/* Jueves 16/07 */
INSERT INTO RESERVAS (NUMERO_LABORATORIO, CEDULA_IDENTIDAD, CORREO, ID_ESTADO_RESERVA, ID_TIPO_ACTIVIDAD, FECHA_A_RESERVAR, HORA_INICIO, HORA_FIN, CANTIDAD_ALUMNOS, FECHA_SOLICITUD)
VALUES (1, 4234567, 'mlopez@uc.edu.py', 1, 5, '2026-07-16', '07:00:00', '09:00:00', 26, CURRENT DATE);

/* Viernes 17/07 */
INSERT INTO RESERVAS (NUMERO_LABORATORIO, CEDULA_IDENTIDAD, CORREO, ID_ESTADO_RESERVA, ID_TIPO_ACTIVIDAD, FECHA_A_RESERVAR, HORA_INICIO, HORA_FIN, CANTIDAD_ALUMNOS, FECHA_SOLICITUD)
VALUES (3, 4456789, 'aferreira@uc.edu.py', 1, 2, '2026-07-17', '09:00:00', '11:00:00', 38, CURRENT DATE);

/* Lunes 20/07 */
INSERT INTO RESERVAS (NUMERO_LABORATORIO, CEDULA_IDENTIDAD, CORREO, ID_ESTADO_RESERVA, ID_TIPO_ACTIVIDAD, FECHA_A_RESERVAR, HORA_INICIO, HORA_FIN, CANTIDAD_ALUMNOS, FECHA_SOLICITUD)
VALUES (2, 4123456, 'jgonzalez@uc.edu.py', 1, 5, '2026-07-20', '08:00:00', '10:00:00', 20, CURRENT DATE);

/* Martes 21/07 */
INSERT INTO RESERVAS (NUMERO_LABORATORIO, CEDULA_IDENTIDAD, CORREO, ID_ESTADO_RESERVA, ID_TIPO_ACTIVIDAD, FECHA_A_RESERVAR, HORA_INICIO, HORA_FIN, CANTIDAD_ALUMNOS, FECHA_SOLICITUD)
VALUES (1, 4567890, 'pbenitez@uc.edu.py', 1, 4, '2026-07-21', '16:00:00', '18:00:00', 24, CURRENT DATE);

/* Miercoles 22/07 */
INSERT INTO RESERVAS (NUMERO_LABORATORIO, CEDULA_IDENTIDAD, CORREO, ID_ESTADO_RESERVA, ID_TIPO_ACTIVIDAD, FECHA_A_RESERVAR, HORA_INICIO, HORA_FIN, CANTIDAD_ALUMNOS, FECHA_SOLICITUD)
VALUES (3, 4234567, 'mlopez@uc.edu.py', 1, 5, '2026-07-22', '13:00:00', '16:00:00', 30, CURRENT DATE);

/* Jueves 23/07 */
INSERT INTO RESERVAS (NUMERO_LABORATORIO, CEDULA_IDENTIDAD, CORREO, ID_ESTADO_RESERVA, ID_TIPO_ACTIVIDAD, FECHA_A_RESERVAR, HORA_INICIO, HORA_FIN, CANTIDAD_ALUMNOS, FECHA_SOLICITUD)
VALUES (2, 4345678, 'crodriguez@uc.edu.py', 1, 4, '2026-07-23', '11:00:00', '13:00:00', 12, CURRENT DATE);

/* Viernes 24/07 */
INSERT INTO RESERVAS (NUMERO_LABORATORIO, CEDULA_IDENTIDAD, CORREO, ID_ESTADO_RESERVA, ID_TIPO_ACTIVIDAD, FECHA_A_RESERVAR, HORA_INICIO, HORA_FIN, CANTIDAD_ALUMNOS, FECHA_SOLICITUD)
VALUES (1, 4123456, 'jgonzalez@uc.edu.py', 1, 5, '2026-07-24', '09:00:00', '11:00:00', 29, CURRENT DATE);

/* Lunes 27/07 - Evento Institucional */
INSERT INTO RESERVAS (NUMERO_LABORATORIO, CEDULA_IDENTIDAD, CORREO, ID_ESTADO_RESERVA, ID_TIPO_ACTIVIDAD, FECHA_A_RESERVAR, HORA_INICIO, HORA_FIN, CANTIDAD_ALUMNOS, FECHA_SOLICITUD)
VALUES (3, 4567890, 'pbenitez@uc.edu.py', 1, 1, '2026-07-27', '10:00:00', '12:00:00', 36, CURRENT DATE);

/* Martes 28/07 */
INSERT INTO RESERVAS (NUMERO_LABORATORIO, CEDULA_IDENTIDAD, CORREO, ID_ESTADO_RESERVA, ID_TIPO_ACTIVIDAD, FECHA_A_RESERVAR, HORA_INICIO, HORA_FIN, CANTIDAD_ALUMNOS, FECHA_SOLICITUD)
VALUES (2, 4456789, 'aferreira@uc.edu.py', 1, 5, '2026-07-28', '14:00:00', '16:00:00', 19, CURRENT DATE);

/* Miercoles 29/07 - Defensa Proyecto Final (max 3h) */
INSERT INTO RESERVAS (NUMERO_LABORATORIO, CEDULA_IDENTIDAD, CORREO, ID_ESTADO_RESERVA, ID_TIPO_ACTIVIDAD, FECHA_A_RESERVAR, HORA_INICIO, HORA_FIN, CANTIDAD_ALUMNOS, FECHA_SOLICITUD)
VALUES (1, 4234567, 'mlopez@uc.edu.py', 1, 3, '2026-07-29', '08:00:00', '10:00:00', 27, CURRENT DATE);

/* Jueves 30/07 */
INSERT INTO RESERVAS (NUMERO_LABORATORIO, CEDULA_IDENTIDAD, CORREO, ID_ESTADO_RESERVA, ID_TIPO_ACTIVIDAD, FECHA_A_RESERVAR, HORA_INICIO, HORA_FIN, CANTIDAD_ALUMNOS, FECHA_SOLICITUD)
VALUES (3, 4345678, 'crodriguez@uc.edu.py', 1, 4, '2026-07-30', '15:00:00', '18:00:00', 33, CURRENT DATE);

/* Viernes 31/07 */
INSERT INTO RESERVAS (NUMERO_LABORATORIO, CEDULA_IDENTIDAD, CORREO, ID_ESTADO_RESERVA, ID_TIPO_ACTIVIDAD, FECHA_A_RESERVAR, HORA_INICIO, HORA_FIN, CANTIDAD_ALUMNOS, FECHA_SOLICITUD)
VALUES (1, 4123456, 'jgonzalez@uc.edu.py', 1, 5, '2026-07-31', '11:00:00', '13:00:00', 25, CURRENT DATE);

COMMIT;

/*==============================================================*/
/* PASO 6 - INSERTS QUE DEBEN FALLAR (probar de a UNO,          */
/* descomentando cada bloque; ROLLBACK despues de cada fallo)   */
/*==============================================================*/

/* ERROR 1: SOLAPAMIENTO - lab 1, 08/07, 09:00-11:00 choca con 08:00-10:00
   (misma prioridad, tipo 5=Clase en ambas -> no hay desplazamiento).
   Debe rechazarlo tr_concide_horario_fecha_reserva
   (via fn_existe_solapamiento_reservas). */
/*
INSERT INTO RESERVAS (NUMERO_LABORATORIO, CEDULA_IDENTIDAD, CORREO, ID_ESTADO_RESERVA, ID_TIPO_ACTIVIDAD, FECHA_A_RESERVAR, HORA_INICIO, HORA_FIN, CANTIDAD_ALUMNOS, FECHA_SOLICITUD)
VALUES (1, 4345678, 'crodriguez@uc.edu.py', 1, 5, '2026-07-08', '09:00:00', '11:00:00', 15, CURRENT DATE);
*/

/* ERROR 2: FECHA PASADA - 03/07 es anterior a hoy (07/07).
   Debe rechazarlo tr_concide_horario_fecha_reserva
   (via fn_validar_fechas_y_fin_semana). */
/*
INSERT INTO RESERVAS (NUMERO_LABORATORIO, CEDULA_IDENTIDAD, CORREO, ID_ESTADO_RESERVA, ID_TIPO_ACTIVIDAD, FECHA_A_RESERVAR, HORA_INICIO, HORA_FIN, CANTIDAD_ALUMNOS, FECHA_SOLICITUD)
VALUES (2, 4123456, 'jgonzalez@uc.edu.py', 1, 5, '2026-07-03', '08:00:00', '10:00:00', 10, CURRENT DATE);
*/

/* ERROR 3 (opcional): FIN DE SEMANA - 11/07 es sabado */
/*
INSERT INTO RESERVAS (NUMERO_LABORATORIO, CEDULA_IDENTIDAD, CORREO, ID_ESTADO_RESERVA, ID_TIPO_ACTIVIDAD, FECHA_A_RESERVAR, HORA_INICIO, HORA_FIN, CANTIDAD_ALUMNOS, FECHA_SOLICITUD)
VALUES (1, 4234567, 'mlopez@uc.edu.py', 1, 5, '2026-07-11', '09:00:00', '11:00:00', 20, CURRENT DATE);
*/

/* ERROR 4 (opcional): CAPACIDAD EXCEDIDA - lab 2 (cap. 20) con 50 alumnos.
   Debe rechazarlo tr_validar_capacidad_lab. */
/*
INSERT INTO RESERVAS (NUMERO_LABORATORIO, CEDULA_IDENTIDAD, CORREO, ID_ESTADO_RESERVA, ID_TIPO_ACTIVIDAD, FECHA_A_RESERVAR, HORA_INICIO, HORA_FIN, CANTIDAD_ALUMNOS, FECHA_SOLICITUD)
VALUES (2, 4456789, 'aferreira@uc.edu.py', 1, 5, '2026-07-15', '08:00:00', '10:00:00', 50, CURRENT DATE);
*/

/* ERROR 5 (opcional): LAB EN MANTENIMIENTO - lab 4 esta con estado M.
   Debe rechazarlo tr_validar_estados_operativos_lab. */
/*
INSERT INTO RESERVAS (NUMERO_LABORATORIO, CEDULA_IDENTIDAD, CORREO, ID_ESTADO_RESERVA, ID_TIPO_ACTIVIDAD, FECHA_A_RESERVAR, HORA_INICIO, HORA_FIN, CANTIDAD_ALUMNOS, FECHA_SOLICITUD)
VALUES (4, 4567890, 'pbenitez@uc.edu.py', 1, 5, '2026-07-20', '09:00:00', '11:00:00', 15, CURRENT DATE);
*/

/*==============================================================*/
/* PASO 7 (opcional) - DEMOSTRACION DE DESPLAZAMIENTO POR        */
/* PRIORIDAD. A diferencia del PASO 6, esta SI debe insertarse  */
/* con exito, aunque se solape con una reserva existente,       */
/* porque su tipo de actividad tiene mayor jerarquia.           */
/*==============================================================*/

/* Se solapa con la reserva de "Reunion Directiva" del 14/07 en el
   lab 1 (10:00-12:00, tipo 0), pero esta es un Evento Institucional
   (tipo 1, prioridad numerica 2) contra una reserva existente cuyo
   tipo tiene PRIORIDAD=1 (mayor jerarquia numerica = MENOR prioridad
   real que un Evento). Para garantizar que el desplazamiento se vea
   claro, este ejemplo usa una reserva existente de tipo Clase (5,
   PRIORIDAD=6) el 24/07 en el lab 1 (09:00-11:00) y la desplaza con
   un Examen (tipo 2, PRIORIDAD=3) en el mismo horario. */
/*
INSERT INTO RESERVAS (NUMERO_LABORATORIO, CEDULA_IDENTIDAD, CORREO, ID_ESTADO_RESERVA, ID_TIPO_ACTIVIDAD, FECHA_A_RESERVAR, HORA_INICIO, HORA_FIN, CANTIDAD_ALUMNOS, FECHA_SOLICITUD)
VALUES (1, 4456789, 'aferreira@uc.edu.py', 1, 2, '2026-07-24', '09:00:00', '11:00:00', 30, CURRENT DATE);
*/
/* Despues de correr esto, la reserva original de Juan (24/07, tipo
   Clase) sigue en la tabla en estado Pendiente: el trigger NO la
   cancela solo, porque eso es una regla de negocio de nivel proc,
   no del trigger de solapamiento (es el punto pendiente de "manejo
   de reservas desplazadas" que tenes anotado como on-the-horizon). */