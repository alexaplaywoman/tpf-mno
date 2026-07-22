// recordatorios.js
// Job automatico que envia un mail de recordatorio 40 minutos antes
// de la reserva. Corre cada INTERVALO_MINUTOS minutos.
// Usa un usuario tecnico configurado por variables de entorno.
//
// Idempotencia: se mantiene un Set en memoria con los ID_RESERVA
// ya notificadas para no reenviar el mismo mail en cada corrida.
// El Set se limpia al cambiar de dia (las reservas de dias anteriores
// ya no caen en la ventana). Si el proceso Node se reinicia, se pierde
// el Set, pero como la ventana es "proximos 40 minutos", el impacto
// se limita a las reservas de la hora siguiente al reinicio.

const { conectar } = require('../Routes/conexion');   
const { enviarCorreoReserva } = require('../Routes/mail');

const INTERVALO_MINUTOS = 5;   // cada cuanto corre el scheduler
const VENTANA_MINUTOS   = 40;  // "40 minutos antes"

// IDs de reservas ya notificadas en esta corrida del proceso.
const notificadas = new Set();
let ultimoDiaLimpieza = new Date().toDateString();

function limpiarSiCambioElDia() {
    const hoy = new Date().toDateString();
    if (hoy !== ultimoDiaLimpieza) {
        notificadas.clear();
        ultimoDiaLimpieza = hoy;
        console.log('[recordatorios] Set de notificadas reiniciado (nuevo dia).');
    }
}

function procesarRecordatorios() {
    limpiarSiCambioElDia();

    const usuario = process.env.SYSTEM_DB_USER;
    const clave   = process.env.SYSTEM_DB_PASS;

    if (!usuario || !clave) {
        console.error('[recordatorios] Faltan SYSTEM_DB_USER / SYSTEM_DB_PASS en .env');
        return;
    }

    conectar(usuario, clave, (err, connection) => {
        if (err) {
            console.error('[recordatorios] Error al conectar:', err.message);
            return;
        }

        // Reservas pendientes, de hoy, cuya hora de inicio caiga
        // dentro de los proximos VENTANA_MINUTOS minutos.
        const sql = `
            SELECT r.ID_RESERVA, r.CORREO, r.FECHA_A_RESERVAR,
                   r.HORA_INICIO, r.HORA_FIN, r.NUMERO_LABORATORIO,
                   s.NOMBRE, s.APELLIDO,
                   ta.NOMBRE AS ACTIVIDAD,
                   l.EDIFICIO
            FROM DBA.RESERVAS r
            JOIN DBA.SOLICITANTES s
                 ON s.CEDULA_IDENTIDAD = r.CEDULA_IDENTIDAD
                AND s.CORREO           = r.CORREO
            JOIN DBA.TIPO_ACTIVIDAD ta
                 ON ta.ID_TIPO_ACTIVIDAD = r.ID_TIPO_ACTIVIDAD
            JOIN DBA.LABORATORIOS l
                 ON l.NUMERO_LABORATORIO = r.NUMERO_LABORATORIO
            JOIN DBA.ESTADO_RESERVA er
                 ON er.ID_ESTADO_RESERVA = r.ID_ESTADO_RESERVA
            WHERE er.ESTADO_RESERVA  = 'P'
              AND r.FECHA_A_RESERVAR = CURRENT DATE
              AND r.HORA_INICIO      >  CURRENT TIME
              AND r.HORA_INICIO      <= DATEADD(MINUTE, ${VENTANA_MINUTOS}, CURRENT TIME)
        `;

        connection.query(sql, (err, filas) => {
            if (err) {
                console.error('[recordatorios] Error al consultar:', err.message);
                return; // conexion en cache, no la desconectamos
            }

            if (!filas || filas.length === 0) return;

            // Filtrar las que ya fueron notificadas en esta corrida del proceso
            const pendientes = filas.filter(r => !notificadas.has(r.ID_RESERVA));

            if (pendientes.length === 0) return;

            console.log(`[recordatorios] ${pendientes.length} reserva(s) por notificar.`);

            pendientes.forEach(r => {
                const hora = String(r.HORA_INICIO).slice(0, 5);
                const fin  = String(r.HORA_FIN).slice(0, 5);

                enviarCorreoReserva(
                    r.CORREO,
                    'Recordatorio: tu reserva empieza en 40 minutos - Lab Kontrol',
                    `Hola ${r.NOMBRE || ''} ${r.APELLIDO || ''}!\n\n` +
                    `Te recordamos que tu reserva esta por iniciar. Detalle:\n` +
                    `- Actividad: ${r.ACTIVIDAD || ''}\n` +
                    `- Laboratorio: ${r.NUMERO_LABORATORIO} (${r.EDIFICIO || ''})\n` +
                    `- Horario: ${hora} a ${fin}\n\n` +
                    `Recorda presentarte a tiempo. Si no podes asistir, ` +
                    `cancela la reserva desde el sistema.\n\n` +
                    `Lab Kontrol.`
                );

                // Marca como notificada. Preferimos no reintentar aunque
                // el mail falle: mejor perder un recordatorio que spamear.
                notificadas.add(r.ID_RESERVA);
            });
        });
    });
}

function iniciarJobRecordatorios() {
    console.log(`[recordatorios] Scheduler iniciado (cada ${INTERVALO_MINUTOS} min).`);
    // Primera corrida a los 30 segundos (deja que arranque el server)
    setTimeout(procesarRecordatorios, 30 * 1000);
    // Corridas periodicas
    setInterval(procesarRecordatorios, INTERVALO_MINUTOS * 60 * 1000);
}

module.exports = { iniciarJobRecordatorios, procesarRecordatorios };