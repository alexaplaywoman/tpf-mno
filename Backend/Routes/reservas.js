const express = require('express');
const Sybase = require('sybase');
const router = express.Router();

function getConnection(usuario, clave) {
    return new Sybase('localhost', 2639, 'labcontrol', usuario, clave);
}

const manejarError = (err, res, action) => {
    let errorMessage;
    if (err && typeof err === 'object') {
        errorMessage = err.message || JSON.stringify(err);
    } else {
        errorMessage = String(err || 'Error de Base de Datos Desconocido');
    }
    console.error(`Error al ${action}:`, err);
    return res.status(500).json({
        success: false,
        error: `Error de base de datos al ${action}: ${errorMessage}`
    });
};

const MOTIVOS_CANCELACION_VALIDOS = ['Solapamiento de horarios', 'Error de fecha', 'Enfermedad', 'Otros'];

router.get('/', (req, res) => {
    const { usuario, clave } = req.query;
    if (!usuario || !clave)
        return res.status(400).json({ success: false, error: 'Faltan credenciales.' });

    const connection = getConnection(usuario, clave);

    connection.connect((err) => {
        if (err) return res.status(500).json({ success: false, error: 'Error de conexión.' });

        const sql = `
            SELECT r.*, l.EDIFICIO, s.NOMBRE, s.APELLIDO, ta.NOMBRE AS tipo_actividad
            FROM RESERVAS r
            JOIN LABORATORIOS l ON r.NUMERO_LABORATORIO = l.NUMERO_LABORATORIO
            JOIN SOLICITANTES s ON r.CEDULA_IDENTIDAD = s.CEDULA_IDENTIDAD AND r.CORREO = s.CORREO
            JOIN TIPO_ACTIVIDAD ta ON r.ID_TIPO_ACTIVIDAD = ta.ID_TIPO_ACTIVIDAD
            ORDER BY r.FECHA_A_RESERVAR, r.HORA_INICIO
        `;

        connection.query(sql, (err, result) => {
            connection.disconnect();
            if (err) return manejarError(err, res, 'consultar reservas');
            return res.json(result);
        });
    });
});

router.get('/:id', (req, res) => {
    const { id } = req.params;
    const { usuario, clave } = req.query;
    if (!usuario || !clave)
        return res.status(400).json({ success: false, error: 'Faltan credenciales.' });

    const connection = getConnection(usuario, clave);

    connection.connect((err) => {
        if (err) return res.status(500).json({ success: false, error: 'Error de conexión.' });

        connection.query(
            `SELECT * FROM RESERVAS WHERE ID_RESERVA = ${id}`,
            (err, result) => {
                connection.disconnect();
                if (err) return manejarError(err, res, 'consultar reserva');
                if (result.length > 0) return res.json({ success: true, reserva: result[0] });
                return res.json({ success: false, error: 'Reserva no encontrada.' });
            }
        );
    });
});

router.post('/add', (req, res) => {
    const {
        numero_laboratorio, cedula_identidad, correo,
        id_estado_reserva, id_tipo_actividad,
        fecha_a_reservar, hora_inicio, hora_fin,
        cantidad_alumnos, recursos, usuario, clave
    } = req.body;

    if (!usuario || !clave || !numero_laboratorio || !cedula_identidad ||
        !correo || !fecha_a_reservar || !hora_inicio || !hora_fin || !cantidad_alumnos || !id_tipo_actividad)
        return res.status(400).json({ success: false, error: 'Faltan datos obligatorios.' });

    const diaSemana = new Date(fecha_a_reservar).getDay();
    if (diaSemana === 0 || diaSemana === 6)
        return res.status(400).json({ success: false, error: 'No se puede reservar los fines de semana.' });

    const listaRecursos = recursos || [];

    const connection = getConnection(usuario, clave);

    connection.connect((err) => {
        if (err) return res.status(500).json({ success: false, error: 'Error de conexión.' });

        connection.query(
            `SELECT ESTADO FROM LABORATORIOS WHERE NUMERO_LABORATORIO = ${numero_laboratorio}`,
            (err, labEstado) => {
                if (err) {
                    connection.disconnect();
                    return manejarError(err, res, 'consultar estado del laboratorio');
                }
                if (labEstado.length === 0) {
                    connection.disconnect();
                    return res.status(404).json({ success: false, error: 'Laboratorio no encontrado.' });
                }
                if (labEstado[0].ESTADO !== 1) {
                    connection.disconnect();
                    return res.status(409).json({ success: false, error: 'El laboratorio no está disponible (bloqueado, en mantenimiento o fuera de servicio).' });
                }

                connection.query(
                    `SELECT PRIORIDAD FROM TIPO_ACTIVIDAD WHERE ID_TIPO_ACTIVIDAD = ${id_tipo_actividad}`,
                    (err, tipos) => {
                        if (err) {
                            connection.disconnect();
                            return manejarError(err, res, 'consultar tipo de actividad');
                        }
                        if (tipos.length === 0) {
                            connection.disconnect();
                            return res.status(404).json({ success: false, error: 'Tipo de actividad no encontrado.' });
                        }

                        const nuevaPrioridad = tipos[0].PRIORIDAD;

                        const sqlSolapamiento = `
                            SELECT r.ID_RESERVA, ta.PRIORIDAD
                            FROM RESERVAS r
                            JOIN TIPO_ACTIVIDAD ta ON r.ID_TIPO_ACTIVIDAD = ta.ID_TIPO_ACTIVIDAD
                            WHERE r.NUMERO_LABORATORIO = ${numero_laboratorio}
                              AND r.FECHA_A_RESERVAR = '${fecha_a_reservar}'
                              AND r.ID_ESTADO_RESERVA != 3
                              AND r.HORA_INICIO < '${hora_fin}'
                              AND r.HORA_FIN > '${hora_inicio}'
                        `;

                        connection.query(sqlSolapamiento, (err, solapados) => {
                            if (err) {
                                connection.disconnect();
                                return manejarError(err, res, 'verificar solapamiento');
                            }

                            const hayConflictoDeMayorOIgualPrioridad = solapados.some(s => s.PRIORIDAD <= nuevaPrioridad);

                            if (solapados.length > 0 && hayConflictoDeMayorOIgualPrioridad) {
                                connection.disconnect();
                                return res.status(409).json({ success: false, error: 'Ya existe una reserva en ese horario.' });
                            }

                            const continuar = (callback) => {
                                if (solapados.length === 0) return callback();

                                const ids = solapados.map(s => s.ID_RESERVA).join(',');
                                connection.query(
                                    `UPDATE RESERVAS
                                     SET ID_ESTADO_RESERVA = 3,
                                         MOTIVO_CANCELACION = 'Desplazada automaticamente por una reserva de mayor prioridad',
                                         USUARIO_CANCELACION = '${usuario}'
                                     WHERE ID_RESERVA IN (${ids})`,
                                    (err) => {
                                        if (err) {
                                            connection.disconnect();
                                            return manejarError(err, res, 'desplazar reservas de menor prioridad');
                                        }
                                        callback();
                                    }
                                );
                            };

                            continuar(() => {
                                const sqlCapacidad = `
                                    SELECT CAPACIDAD_ALUMNOS FROM LABORATORIOS
                                    WHERE NUMERO_LABORATORIO = ${numero_laboratorio}
                                `;

                                connection.query(sqlCapacidad, (err, labs) => {
                                    if (err) {
                                        connection.disconnect();
                                        return manejarError(err, res, 'verificar capacidad');
                                    }

                                    if (labs.length === 0) {
                                        connection.disconnect();
                                        return res.status(404).json({ success: false, error: 'Laboratorio no encontrado.' });
                                    }

                                    if (cantidad_alumnos > labs[0].CAPACIDAD_ALUMNOS) {
                                        connection.disconnect();
                                        return res.status(400).json({
                                            success: false,
                                            error: `Cantidad de alumnos (${cantidad_alumnos}) supera la capacidad (${labs[0].CAPACIDAD_ALUMNOS}).`
                                        });
                                    }

                                    const validarRecursos = (callback) => {
                                        if (listaRecursos.length === 0) return callback();

                                        const idsRecursos = listaRecursos.join(',');
                                        connection.query(
                                            `SELECT ID_RECURSO, NOMBRE, DISPONIBILIDAD FROM RECURSOS
                                             WHERE ID_RECURSO IN (${idsRecursos}) AND NUMERO_LABORATORIO = ${numero_laboratorio}`,
                                            (err, result) => {
                                                if (err) {
                                                    connection.disconnect();
                                                    return manejarError(err, res, 'verificar recursos');
                                                }
                                                if (result.length !== listaRecursos.length) {
                                                    connection.disconnect();
                                                    return res.status(400).json({ success: false, error: 'Alguno de los recursos solicitados no pertenece a este laboratorio.' });
                                                }
                                                const noDisponible = result.find(r => r.DISPONIBILIDAD !== 'S');
                                                if (noDisponible) {
                                                    connection.disconnect();
                                                    return res.status(409).json({ success: false, error: `El recurso "${noDisponible.NOMBRE}" no está disponible.` });
                                                }
                                                callback();
                                            }
                                        );
                                    };

                                    validarRecursos(() => {
                                        const sql = `
                                            INSERT INTO RESERVAS
                                                (NUMERO_LABORATORIO, CEDULA_IDENTIDAD, CORREO, ID_ESTADO_RESERVA,
                                                 ID_TIPO_ACTIVIDAD, FECHA_A_RESERVAR, HORA_INICIO, HORA_FIN,
                                                 CANTIDAD_ALUMNOS, FECHA_SOLICITUD)
                                            VALUES
                                                (${numero_laboratorio}, ${cedula_identidad}, '${correo}', ${id_estado_reserva || 1},
                                                 ${id_tipo_actividad}, '${fecha_a_reservar}', '${hora_inicio}', '${hora_fin}',
                                                 ${cantidad_alumnos}, GETDATE())
                                        `;

                                        connection.query(sql, (err) => {
                                            connection.disconnect();
                                            if (err) return manejarError(err, res, 'crear reserva');
                                            return res.json({
                                                success: true,
                                                desplazadas: solapados.map(s => s.ID_RESERVA)
                                            });
                                        });
                                    });
                                });
                            });
                        });
                    }
                );
            }
        );
    });
});

router.post('/cancelar/:id', (req, res) => {
    const { id } = req.params;
    const { usuario, clave, motivo } = req.body;
    if (!usuario || !clave || !motivo)
        return res.status(400).json({ success: false, error: 'Faltan credenciales o el motivo de cancelación.' });

    if (!MOTIVOS_CANCELACION_VALIDOS.includes(motivo))
        return res.status(400).json({ success: false, error: `Motivo inválido. Opciones: ${MOTIVOS_CANCELACION_VALIDOS.join(', ')}` });

    const connection = getConnection(usuario, clave);

    connection.connect((err) => {
        if (err) return res.status(500).json({ success: false, error: 'Error de conexión.' });

        connection.query(
            `UPDATE RESERVAS
             SET ID_ESTADO_RESERVA = 3,
                 MOTIVO_CANCELACION = '${motivo}',
                 USUARIO_CANCELACION = '${usuario}'
             WHERE ID_RESERVA = ${id}`,
            (err) => {
                connection.disconnect();
                if (err) return manejarError(err, res, 'cancelar reserva');
                return res.json({ success: true });
            }
        );
    });
});

router.post('/marcar/:id', (req, res) => {
    const { id } = req.params;
    const { id_estado_reserva, usuario, clave } = req.body;

    if (!usuario || !clave || !id_estado_reserva)
        return res.status(400).json({ success: false, error: 'Faltan credenciales o el estado.' });

    if (id_estado_reserva != 2 && id_estado_reserva != 4)
        return res.status(400).json({ success: false, error: 'Solo se puede marcar como Utilizada (2) o No presentado (4). Para cancelar, usá /cancelar/:id.' });

    const connection = getConnection(usuario, clave);

    connection.connect((err) => {
        if (err) return res.status(500).json({ success: false, error: 'Error de conexión.' });

        connection.query(
            `UPDATE RESERVAS SET ID_ESTADO_RESERVA = ${id_estado_reserva} WHERE ID_RESERVA = ${id}`,
            (err) => {
                connection.disconnect();
                if (err) return manejarError(err, res, 'marcar reserva');
                return res.json({ success: true });
            }
        );
    });
});

router.delete('/delete/:id', (req, res) => {
    const { id } = req.params;
    const { usuario, clave } = req.query;
    if (!usuario || !clave)
        return res.status(400).json({ success: false, error: 'Faltan credenciales.' });

    const connection = getConnection(usuario, clave);

    connection.connect((err) => {
        if (err) return manejarError(err, res, 'conectar para eliminar reserva');

        connection.query(
            `DELETE FROM RESERVAS WHERE ID_RESERVA = ${id}`,
            (err) => {
                connection.disconnect();
                if (err) return manejarError(err, res, 'eliminar reserva');
                return res.json({ success: true });
            }
        );
    });
});

module.exports = router;