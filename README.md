# tpf-mno
# LabControl

Sistema de Reserva y Administración de Laboratorios Universitarios.

Trabajo Práctico Final 2026 — Informática 4 y Programación 4
Universidad Católica Nuestra Señora de la Asunción — FCyT, Análisis de Sistemas

## Requisitos previos

- **SAP SQL Anywhere 11** (Developer Edition), con `dbsrv11` y `dbisql` en el `PATH`.
- **Node.js 18 o superior** y `npm`.
- **Java Runtime (JRE 8+)**. El driver `sybase` de npm no es nativo: levanta un proceso Java con jConnect. Sin Java instalado, la conexión falla con `Unable to access jarfile`.

---
# Para instalar las dependencias: pip install -r requirements.txt

## 1. Base de datos

### 1.1. Levantar el servidor

```bash
dbsrv11 -n tpf_reservas -x "tcpip{port=2638}" ".\db\tpf_reservas.db"
```

> **Importante:** usar `dbsrv11`, **no** `dbeng11`. El motor personal (`dbeng11`) acepta una sola conexión de red, y el proyecto necesita ISQL y Node.js conectados al mismo tiempo.

La base entregada ya viene precargada, así que normalmente no hace falta crearla. Si aun así se quisiera partir de cero:

```bash
dbinit tpf_reservas.db
dbsrv11 -n tpf_reservas -x "tcpip{port=2638}" tpf_reservas.db
```

Luego ejecutar los cuatro scripts del punto 1.3.

### 1.2. Conectarse con ISQL

```bash
dbisql -c "UID=DBA;PWD=contrasenha;DBN=tpf_reservas;LINKS=tcpip(host=localhost;port=2638)"
```

### 1.3. Ejecutar los scripts **en este orden**

| Orden | Archivo | Contenido |
|---|---|---|
| 1 | `01_tablas.sql` | Tablas, dominios, claves primarias y foráneas, restricciones |
| 2 | `02_objetos.sql` | Funciones, procedimientos almacenados, triggers y el evento programado |
| 3 | `03_permisos.sql` | Usuarios, grupo `ADMINISTRADORES` y `GRANT` |
| 4 | `04_datos_prueba.sql` | Datos precargados para la defensa |

El orden no es opcional: los `GRANT EXECUTE` de `03_permisos.sql` fallan si los procedimientos todavía no existen.

> **Si un script falla con `SQLCODE = -210`** (bloqueo de fila), ejecutar `ROLLBACK;` y volver a correrlo. Toda sentencia DDL (`ALTER`, `DROP`, `CREATE`) necesita la transacción cerrada. El orden estándar de despliegue es `ROLLBACK → DROP → CREATE → COMMIT`.

`04_datos_prueba.sql` se puede reejecutar cuantas veces sea necesario: su **PASO 0** borra todos los datos en orden inverso de claves foráneas antes de reinsertar.

> **Fechas de los datos de prueba.** El script toma como referencia el **29/07/2026**. Si se ejecuta bastante después de esa fecha, las reservas futuras del PASO 6 empiezan a ser rechazadas por el trigger que impide reservar en el pasado. En ese caso, correr el ajuste de fechas del **PASO 9**, incluido en el mismo archivo.

### 1.4. Usuarios de la base

La autenticación se hace contra usuarios de SQL Anywhere; no existe una tabla de usuarios propia.

| Usuario | Clave | Uso |
|---|---|---|
| `admin` | `contrasenha` | Sistema web de administración. Tiene DBA y pertenece al grupo `ADMINISTRADORES` |
| `solicitante` | `contrasenha` | Ambiente móvil. Cuenta compartida, con permisos mínimos |
| `DBA` | `contrasenha` | Cuenta del motor, para ISQL y despliegue de scripts |

---

## 2. Backend

```bash
npm install
```

Crear un archivo `.env` en la raíz del proyecto:

```
SCHEDULER_USUARIO=dba
SCHEDULER_CLAVE=sql

# Configuración del envío de correos
SMTP_USER=[completar]
SMTP_PASS=[completar]
```

Los parámetros de conexión a la base están en `conexion.js`:

```js
new Sybase('localhost', 2638, 'tpf_reservas', usuario, clave, false, undefined, { encoding: 'latin1' });
```

Si la base corre en otro host, puerto o con otro nombre, ese es el único lugar a modificar.

---

## 3. Ejecución

Con el servidor de base de datos ya levantado:

```bash
node app.js
```

Luego abrir en el navegador:

```
http://localhost:3000
```


Al arrancar, el servidor también inicia dos procesos programados en Node.js: el envío de recordatorios previos a la reserva y el aviso de reservas vencidas. En paralelo, el evento `ev_cancelar_reservas_vencidas` corre dentro de la base cada 60 minutos.

---

## 4. Estructura del proyecto

```
LabControl/
├── BaseDeDatos/
│   ├── 01_tablas.sql
│   ├── 02_objetos.sql
│   ├── 03_permisos.sql
│   ├── 04_datos_prueba.sql
│   ├── modelo.pdm              # modelo físico de PowerDesigner
│   └── modelo.pdf              # exportación del modelo
├── Backend/
│   ├── Rutas/                  # endpoints REST
│   └── Jobs/
├── Frontend/                   # HTML, CSS y JavaScript
├── app.js                      # arranque de Express
├── app_administrador.js                      # arranque de Express
├── package.json
├── requirements.txt
└── README.md
```

---

## 5. Problemas frecuentes

| Síntoma | Causa | Solución |
|---|---|---|
| `SQLCODE = -210` al correr un script | Transacción abierta bloqueando el DDL | `ROLLBACK;` y reintentar |
| `JZ00L: Login failed` | Base no levantada, credenciales incorrectas, o límite de conexiones alcanzado | Verificar que `dbsrv11` esté corriendo y reiniciar el proceso de Node |
| `SQLCODE = -265` (procedimiento no encontrado) | El objeto no fue confirmado con `COMMIT`, o la llamada no está calificada con el esquema | Ejecutar `COMMIT;` tras crear el objeto y llamarlo siempre como `CALL DBA.sp_...` |
| `Unable to access jarfile` | Java no instalado, o se le pasó un objeto de configuración al driver | Instalar el JRE. El driver `sybase` sólo acepta argumentos posicionales |
| El archivo `.db` figura como en uso | Quedó un motor corriendo de una ejecución anterior | Cerrar `dbsrv11.exe`, `dbeng11.exe` o `dbisrv11.exe` desde el Administrador de tareas |
| Límite de 10 conexiones simultáneas | Restricción de la Developer Edition, no se puede ampliar | Ya contemplado: `conexion.js` mantiene una conexión por usuario y serializa las consultas |
| Cambios en un archivo `.js` que no surten efecto | Node cachea los módulos con `require` | Detener el servidor con `Ctrl+C` y volver a arrancarlo |

---

## 6. Notas de diseño

- Los catálogos se resuelven siempre por su **código semántico**, nunca por ID numérico. Los estados de reserva son `P` (Pendiente), `C` (Cancelada), `U` (Utilizada), `A` (Ausente) y `D` (Desplazada); los estados operativos de laboratorio son `D` (Disponible), `R` (Reservado), `M`(Mantenimiento), `F` (Fuera de servicio) y `B` (Bloqueado).
- Toda creación de reserva pasa por `sp_crear_reserva`. No hay forma de insertar una reserva salteando la validación de solapamiento ni el desplazamiento por prioridad.
- Las reglas de negocio están implementadas en la base de datos (triggers, funciones y procedimientos), de modo que el ambiente administrativo y el móvil quedan sujetos exactamente a las mismas restricciones.
