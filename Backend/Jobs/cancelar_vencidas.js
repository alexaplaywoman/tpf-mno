const { conectar } = require('../Routes/conexion');   
const { enviarCorreoReserva } = require('../Routes/mail');

const INTERVAL_MS = 60 * 60 * 1000;   // 60 minutos

function ejecutarJob() {
    const usuario = process.env.SYSTEM_DB_USER;
    const clave   = process.env.SYSTEM_DB_PASS;

    if (!usuario || !clave) {
        console.error('[job-vencidas] Faltan SYSTEM_DB_USER / SYSTEM_DB_PASS en .env');
        return;
    }

    conectar(usuario, clave, (err, connection) => {
        if (err) {
            console.error('[job-vencidas] Error al conectar:', err.message);
            return;
        }

        // 1. Buscar reservas pendientes vencidas ANTES de cancelarlas,
        //    para tener sus datos y poder mandar los mails.
        const sqlBuscar = `
            SELECT r.ID_RESERVA, r.CORREO, r.NUMERO_LABORATORIO,
                   r.FECHA_A_RESERVAR, r.HORA_INICIO, r.HORA_FIN,
                   s.NOMBRE, s.APELLIDO,
                   ta.NOMBRE AS ACTIVIDAD
            FROM DBA.RESERVAS r
            JOIN DBA.SOLICITANTES s
                 ON s.CEDULA_IDENTIDAD = r.CEDULA_IDENTIDAD AND s.CORREO = r.CORREO
            JOIN DBA.TIPO_ACTIVIDAD ta
                 ON ta.ID_TIPO_ACTIVIDAD = r.ID_TIPO_ACTIVIDAD
            JOIN DBA.ESTADO_RESERVA er
                 ON er.ID_ESTADO_RESERVA = r.ID_ESTADO_RESERVA
            WHERE er.ESTADO_RESERVA = 'P'
              AND (r.FECHA_A_RESERVAR < CURRENT DATE
                   OR (r.FECHA_A_RESERVAR = CURRENT DATE AND r.HORA_FIN < CURRENT TIME))
        `;

        connection.query(sqlBuscar, (err, vencidas) => {
            if (err) {
                console.error('[job-vencidas] Error al consultar vencidas:', err.message);
                return;
            }

            if (!vencidas || vencidas.length === 0) {
                console.log('[job-vencidas] Sin reservas para cancelar.');
                return;
            }

            console.log(`[job-vencidas] ${vencidas.length} reserva(s) a cancelar.`);

            // 2. Ejecutar el SP que actualiza los estados en BD
            connection.query('CALL DBA.sp_cancelar_reservas_vencidas()', (err) => {
                if (err) {
                    console.error('[job-vencidas] Error al ejecutar SP:', err.message);
                    return;
                }

                // 3. Mandar los mails de advertencia (fire-and-forget)
                vencidas.forEach(r => {
                    enviarCorreoReserva(
                        r.CORREO,
                        'Advertencia: reserva cancelada por falta de uso - Lab Kontrol',
                        `Hola ${r.NOMBRE || ''} ${r.APELLIDO || ''}!\n\n` +
                        `Tu reserva fue cancelada automaticamente porque no fue confirmada ` +
                        `como utilizada dentro del horario reservado:\n\n` +
                        `- Actividad: ${r.ACTIVIDAD}\n` +
                        `- Laboratorio: ${r.NUMERO_LABORATORIO}\n` +
                        `- Fecha: ${String(r.FECHA_A_RESERVAR).split('T')[0]}\n` +
                        `- Horario: ${r.HORA_INICIO} a ${r.HORA_FIN}\n\n` +
                        `Recorda que las reservas no utilizadas afectan la disponibilidad ` +
                        `para otros solicitantes.\n\n` +
                        `Lab Kontrol.`
                    );
                });

                console.log(`[job-vencidas] Mails enviados a ${vencidas.length} solicitante(s).`);
            });
        });
    });
}

function iniciarJobVencidas() {
    // Un disparo unos segundos despues de arrancar el server (por si venia caido)
    setTimeout(ejecutarJob, 5000);
    // Y despues cada 60 minutos
    setInterval(ejecutarJob, INTERVAL_MS);
    console.log('[job-vencidas] Iniciado. Frecuencia: cada 60 minutos.');
}

module.exports = { iniciarJobVencidas };