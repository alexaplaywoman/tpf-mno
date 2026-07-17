const express = require('express');
const { conectar } = require('./conexion');
const router = express.Router();

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

function verificarAdmin(connection, usuario, callback) {
    connection.query(
        `SELECT COUNT(*) AS es_admin
         FROM SYSGROUPS
         WHERE group_name = 'ADMINISTRADORES' AND member_name = '${usuario}'`,
        (err, permiso) => {
            if (err) return callback(err, false);
            callback(null, !!(permiso[0] && permiso[0].es_admin));
        }
    );
}

const MOTIVOS_CANCELACION_VALIDOS = ['Solapamiento de horarios', 'Error de fecha', 'Enfermedad', 'Otros'];

router.get('/', (req, res) => {
    const { usuario, clave } = req.query;
    if (!usuario || !clave)
        return res.status(400).json({ success: false, error: 'Faltan credenciales.' });

    conectar(usuario, clave, (err, connection) => {
        if (err) return manejarError(err, res, 'conectar a la base de datos');

        const sql = `
            SELECT r.*, l.EDIFICIO, s.NOMBRE, s.APELLIDO, ta.NOMBRE AS tipo_actividad
            FROM DBA.RESERVAS r
            JOIN DBA.LABORATORIOS l ON r.NUMERO_LABORATORIO = l.NUMERO_LABORATORIO
            JOIN DBA.SOLICITANTES s ON r.CEDULA_IDENTIDAD = s.CEDULA_IDENTIDAD AND r.CORREO = s.CORREO
            JOIN DBA.TIPO_ACTIVIDAD ta ON r.ID_TIPO_ACTIVIDAD = ta.ID_TIPO_ACTIVIDAD
            ORDER BY r.FECHA_A_RESERVAR, r.HORA_INICIO
        `;

        connection.query(sql, (err, result) => {
            connection.disconnect();
            if (err) return manejarError(err, res, 'consultar reservas');
            return res.json(result);
        });
    });
});

router.get('/fechas-ocupadas', (req, res) => {
    const { usuario, clave } = req.query;
    if (!usuario || !clave)
        return res.status(400).json({ success: false, error: 'Faltan credenciales.' });

    conectar(usuario, clave, (err, connection) => {
        if (err) return manejarError(err, res, 'conectar a la base de datos');

        const sql = `
            SELECT FECHA_A_RESERVAR, HORA_INICIO, HORA_FIN
            FROM DBA.RESERVAS
            WHERE ID_ESTADO_RESERVA != 3
              AND FECHA_A_RESERVAR >= CURRENT DATE
        `;

        connection.query(sql, (err, result) => {
            connection.disconnect();
            if (err) return manejarError(err, res, 'consultar fechas ocupadas');

            const fechas = result.map(r => ({
                fecha: String(r.FECHA_A_RESERVAR).split('T')[0],
                inicio: r.HORA_INICIO,
                fin: r.HORA_FIN
            }));

            return res.json(fechas);
        });
    });
});

router.get('/:id', (req, res) => {
    const { id } = req.params;
    const { usuario, clave } = req.query;
    if (!usuario || !clave)
        return res.status(400).json({ success: false, error: 'Faltan credenciales.' });

    conectar(usuario, clave, (err, connection) => {
        if (err) return manejarError(err, res, 'conectar a la base de datos');

        connection.query(
            `SELECT * FROM DBA.RESERVAS WHERE ID_RESERVA = ${id}`,
            (err, result) => {
                connection.disconnect();
                if (err) return manejarError(err, res, 'consultar reserva');
                if (result.length > 0) return res.json({ success: true, reserva: result[0] });
                return res.json({ success: false, error: 'Reserva no encontrada.' });
            }
        );
    });
});

router.get('/mis-reservas/:cedula', (req, res) => {
    const { cedula } = req.params;
    const { usuario, clave, incluirPasadas } = req.query;
    if (!usuario || !clave)
        return res.status(400).json({ success: false, error: 'Faltan credenciales.' });

    conectar(usuario, clave, (err, connection) => {
        if (err) return manejarError(err, res, 'conectar a la base de datos');

        const condicionFecha = incluirPasadas === 'true' ? '' : 'AND r.FECHA_A_RESERVAR >= CURRENT DATE';

        const sql = `
            SELECT r.*, l.EDIFICIO, ta.NOMBRE AS tipo_actividad, er.ESTADO_RESERVA AS estado
            FROM DBA.RESERVAS r
            JOIN DBA.LABORATORIOS l ON r.NUMERO_LABORATORIO = l.NUMERO_LABORATORIO
            JOIN DBA.TIPO_ACTIVIDAD ta ON r.ID_TIPO_ACTIVIDAD = ta.ID_TIPO_ACTIVIDAD
            LEFT JOIN DBA.ESTADO_RESERVA er ON r.ID_ESTADO_RESERVA = er.ID_ESTADO_RESERVA
            WHERE r.CEDULA_IDENTIDAD = ${cedula}
            ${condicionFecha}
            ORDER BY r.FECHA_A_RESERVAR, r.HORA_INICIO
        `;

        connection.query(sql, (err, result) => {
            connection.disconnect();
            if (err) return manejarError(err, res, 'consultar mis reservas');
            return res.json(result);
        });
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

    conectar(usuario, clave, (err, connection) => {
        if (err) return manejarError(err, res, 'conectar a la base de datos');

        connection.query(
            `SELECT ESTADO FROM DBA.LABORATORIOS WHERE NUMERO_LABORATORIO = ${numero_laboratorio}`,
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
                    `SELECT NIVEL_PRIORIDAD FROM DBA.TIPO_ACTIVIDAD WHERE ID_TIPO_ACTIVIDAD = ${id_tipo_actividad}`,
                    (err, tipos) => {
                        if (err) {
                            connection.disconnect();
                            return manejarError(err, res, 'consultar tipo de actividad');
                        }
                        if (tipos.length === 0) {
                            connection.disconnect();
                            return res.status(404).json({ success: false, error: 'Tipo de actividad no encontrado.' });
                        }

                        const nuevaPrioridad = tipos[0].NIVEL_PRIORIDAD;

                        const sqlSolapamiento = `
                            SELECT r.ID_RESERVA, ta.NIVEL_PRIORIDAD
                            FROM DBA.RESERVAS r
                            JOIN DBA.TIPO_ACTIVIDAD ta ON r.ID_TIPO_ACTIVIDAD = ta.ID_TIPO_ACTIVIDAD
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

                            const hayConflictoDeMayorOIgualPrioridad = solapados.some(s => s.NIVEL_PRIORIDAD <= nuevaPrioridad);

                            if (solapados.length > 0 && hayConflictoDeMayorOIgualPrioridad) {
                                connection.disconnect();
                                return res.status(409).json({ success: false, error: 'Ya existe una reserva en ese horario.' });
                            }

                            const continuar = (callback) => {
                                if (solapados.length === 0) return callback();

                                const ids = solapados.map(s => s.ID_RESERVA).join(',');
                                connection.query(
                                    `UPDATE DBA.RESERVAS
                                     SET ID_ESTADO_RESERVA = 3,
                                         MOTIVO_CANCELACION = 'Desplazada automaticamente por una reserva de mayor prioridad',
                                         USUARIO_CANCELACION = '${cedula_identidad}'
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
                                    SELECT CAPACIDAD_ALUMNOS FROM DBA.LABORATORIOS
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
                                        if (listaRecursos.length === 0) return callback([]);

                                        const nombresRecursos = listaRecursos.map(n => `'${n}'`).join(',');
                                        connection.query(
                                            `SELECT NOMBRE,
                                                    MIN(CASE WHEN DISPONIBILIDAD = 'S' THEN ID_RECURSO END) AS ID_RECURSO,
                                                    MAX(DISPONIBILIDAD) AS DISPONIBLE
                                             FROM DBA.RECURSOS
                                             WHERE NOMBRE IN (${nombresRecursos}) AND NUMERO_LABORATORIO = ${numero_laboratorio}
                                             GROUP BY NOMBRE`,
                                            (err, result) => {
                                                if (err) {
                                                    connection.disconnect();
                                                    return manejarError(err, res, 'verificar recursos');
                                                }
                                                if (result.length !== listaRecursos.length) {
                                                    connection.disconnect();
                                                    return res.status(400).json({ success: false, error: 'Alguno de los recursos solicitados no pertenece a este laboratorio.' });
                                                }
                                                const noDisponible = result.find(r => r.DISPONIBLE !== 'S');
                                                if (noDisponible) {
                                                    connection.disconnect();
                                                    return res.status(409).json({ success: false, error: `El recurso "${noDisponible.NOMBRE}" no está disponible.` });
                                                }
                                                callback(result.map(r => r.ID_RECURSO));
                                            }
                                        );
                                    };

                                    validarRecursos((idsRecursosDisponibles) => {
                                        const sql = `
                                            INSERT INTO DBA.RESERVAS
                                                (NUMERO_LABORATORIO, CEDULA_IDENTIDAD, CORREO, ID_ESTADO_RESERVA,
                                                 ID_TIPO_ACTIVIDAD, FECHA_A_RESERVAR, HORA_INICIO, HORA_FIN,
                                                 CANTIDAD_ALUMNOS, FECHA_SOLICITUD)
                                            VALUES
                                                (${numero_laboratorio}, ${cedula_identidad}, '${correo}', ${id_estado_reserva || 1},
                                                 ${id_tipo_actividad}, '${fecha_a_reservar}', '${hora_inicio}', '${hora_fin}',
                                                 ${cantidad_alumnos}, GETDATE())
                                        `;

                                        connection.query(sql, (err) => {
                                            if (err) {
                                                connection.disconnect();
                                                return manejarError(err, res, 'crear reserva');
                                            }

                                            if (idsRecursosDisponibles.length === 0) {
                                                connection.disconnect();
                                                return res.json({
                                                    success: true,
                                                    desplazadas: solapados.map(s => s.ID_RESERVA)
                                                });
                                            }

                                            connection.query('SELECT @@IDENTITY AS ID_RESERVA', (err, idResult) => {
                                                if (err) {
                                                    connection.disconnect();
                                                    return manejarError(err, res, 'obtener id de la reserva creada');
                                                }

                                                const idReserva = idResult[0].ID_RESERVA;

                                                // SQL Anywhere 11 no soporta VALUES (a,b),(c,d) multi-fila,
                                                // asi que insertamos un recurso a la vez.
                                                let j = 0;
                                                const insertarSiguienteRecurso = () => {
                                                    if (j >= idsRecursosDisponibles.length) {
                                                        connection.disconnect();
                                                        return res.json({
                                                            success: true,
                                                            desplazadas: solapados.map(s => s.ID_RESERVA)
                                                        });
                                                    }
                                                    const idRecurso = idsRecursosDisponibles[j++];
                                                    connection.query(
                                                        `INSERT INTO DBA.RESERVAS_RECURSOS (ID_RESERVA, ID_RECURSO) VALUES (${idReserva}, ${idRecurso})`,
                                                        (err) => {
                                                            if (err) {
                                                                connection.disconnect();
                                                                return manejarError(err, res, 'asociar recursos a la reserva');
                                                            }
                                                            insertarSiguienteRecurso();
                                                        }
                                                    );
                                                };
                                                insertarSiguienteRecurso();
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
    const { usuario, clave, motivo, cedula_responsable } = req.body;
    if (!usuario || !clave || !motivo || !cedula_responsable)
        return res.status(400).json({ success: false, error: 'Faltan credenciales, el motivo o la cédula del responsable.' });

    if (!MOTIVOS_CANCELACION_VALIDOS.includes(motivo))
        return res.status(400).json({ success: false, error: `Motivo inválido. Opciones: ${MOTIVOS_CANCELACION_VALIDOS.join(', ')}` });

    conectar(usuario, clave, (err, connection) => {
        if (err) return manejarError(err, res, 'conectar a la base de datos');

        connection.query(
            `SELECT CEDULA_IDENTIDAD FROM DBA.SOLICITANTES WHERE CEDULA_IDENTIDAD = ${cedula_responsable}`,
            (err, solicitantes) => {
                if (err) {
                    connection.disconnect();
                    return manejarError(err, res, 'verificar cédula del responsable');
                }
                if (solicitantes.length === 0) {
                    connection.disconnect();
                    return res.status(400).json({ success: false, error: 'La cédula del responsable no corresponde a ningún solicitante registrado.' });
                }

                connection.query(
                    `UPDATE DBA.RESERVAS
                     SET ID_ESTADO_RESERVA = 3,
                         MOTIVO_CANCELACION = '${motivo}',
                         USUARIO_CANCELACION = '${cedula_responsable}'
                     WHERE ID_RESERVA = ${id}`,
                    (err) => {
                        connection.disconnect();
                        if (err) return manejarError(err, res, 'cancelar reserva');
                        return res.json({ success: true });
                    }
                );
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

    conectar(usuario, clave, (err, connection) => {
        if (err) return manejarError(err, res, 'conectar a la base de datos');

        connection.query(
            `UPDATE DBA.RESERVAS SET ID_ESTADO_RESERVA = ${id_estado_reserva} WHERE ID_RESERVA = ${id}`,
            (err) => {
                connection.disconnect();
                if (err) return manejarError(err, res, 'marcar reserva');
                return res.json({ success: true });
            }
        );
    });
});

router.post('/reprogramar/:id', (req, res) => {
    const { id } = req.params;
    const { numero_laboratorio, fecha_a_reservar, hora_inicio, hora_fin, usuario, clave } = req.body;

    if (!usuario || !clave || !fecha_a_reservar || !hora_inicio || !hora_fin)
        return res.status(400).json({ success: false, error: 'Faltan datos obligatorios.' });

    const diaSemana = new Date(fecha_a_reservar).getDay();
    if (diaSemana === 0 || diaSemana === 6)
        return res.status(400).json({ success: false, error: 'No se puede reprogramar a un fin de semana.' });

    conectar(usuario, clave, (err, connection) => {
        if (err) return manejarError(err, res, 'conectar a la base de datos');

        verificarAdmin(connection, usuario, (err, esAdmin) => {
            if (err) {
                connection.disconnect();
                return manejarError(err, res, 'verificar permisos de administrador');
            }
            if (!esAdmin) {
                connection.disconnect();
                return res.status(403).json({ success: false, error: 'Solo un usuario administrativo puede reprogramar una reserva.' });
            }

            connection.query(
                `SELECT NUMERO_LABORATORIO, CANTIDAD_ALUMNOS FROM DBA.RESERVAS WHERE ID_RESERVA = ${id}`,
                (err, reservaActual) => {
                    if (err) {
                        connection.disconnect();
                        return manejarError(err, res, 'consultar reserva');
                    }
                    if (reservaActual.length === 0) {
                        connection.disconnect();
                        return res.status(404).json({ success: false, error: 'Reserva no encontrada.' });
                    }

                    const numeroLab = numero_laboratorio || reservaActual[0].NUMERO_LABORATORIO;
                    const cantidadAlumnos = reservaActual[0].CANTIDAD_ALUMNOS;

                    connection.query(
                        `SELECT ESTADO, CAPACIDAD_ALUMNOS FROM DBA.LABORATORIOS WHERE NUMERO_LABORATORIO = ${numeroLab}`,
                        (err, labs) => {
                            if (err) {
                                connection.disconnect();
                                return manejarError(err, res, 'consultar laboratorio');
                            }
                            if (labs.length === 0) {
                                connection.disconnect();
                                return res.status(404).json({ success: false, error: 'Laboratorio no encontrado.' });
                            }
                            if (labs[0].ESTADO !== 1) {
                                connection.disconnect();
                                return res.status(409).json({ success: false, error: 'El laboratorio no está disponible (bloqueado, en mantenimiento o fuera de servicio).' });
                            }
                            if (cantidadAlumnos > labs[0].CAPACIDAD_ALUMNOS) {
                                connection.disconnect();
                                return res.status(400).json({
                                    success: false,
                                    error: `Cantidad de alumnos (${cantidadAlumnos}) supera la capacidad (${labs[0].CAPACIDAD_ALUMNOS}).`
                                });
                            }

                            const sqlSolapamiento = `
                                SELECT ID_RESERVA FROM DBA.RESERVAS
                                WHERE NUMERO_LABORATORIO = ${numeroLab}
                                  AND FECHA_A_RESERVAR = '${fecha_a_reservar}'
                                  AND ID_ESTADO_RESERVA != 3
                                  AND ID_RESERVA != ${id}
                                  AND HORA_INICIO < '${hora_fin}'
                                  AND HORA_FIN > '${hora_inicio}'
                            `;

                            connection.query(sqlSolapamiento, (err, solapados) => {
                                if (err) {
                                    connection.disconnect();
                                    return manejarError(err, res, 'verificar solapamiento');
                                }
                                if (solapados.length > 0) {
                                    connection.disconnect();
                                    return res.status(409).json({ success: false, error: 'Ya existe una reserva en ese horario.' });
                                }

                                connection.query(
                                    `UPDATE DBA.RESERVAS
                                     SET NUMERO_LABORATORIO = ${numeroLab},
                                         FECHA_A_RESERVAR   = '${fecha_a_reservar}',
                                         HORA_INICIO        = '${hora_inicio}',
                                         HORA_FIN           = '${hora_fin}'
                                     WHERE ID_RESERVA = ${id}`,
                                    (err) => {
                                        connection.disconnect();
                                        if (err) return manejarError(err, res, 'reprogramar reserva');
                                        return res.json({ success: true });
                                    }
                                );
                            });
                        }
                    );
                }
            );
        });
    });
});

router.delete('/delete/:id', (req, res) => {
    const { id } = req.params;
    const { usuario, clave } = req.query;
    if (!usuario || !clave)
        return res.status(400).json({ success: false, error: 'Faltan credenciales.' });

    conectar(usuario, clave, (err, connection) => {
        if (err) return manejarError(err, res, 'conectar para eliminar reserva');

        verificarAdmin(connection, usuario, (err, esAdmin) => {
            if (err) {
                connection.disconnect();
                return manejarError(err, res, 'verificar permisos de administrador');
            }
            if (!esAdmin) {
                connection.disconnect();
                return res.status(403).json({ success: false, error: 'Solo un usuario administrativo puede eliminar una reserva.' });
            }

            connection.query(
                `DELETE FROM DBA.RESERVAS WHERE ID_RESERVA = ${id}`,
                (err) => {
                    connection.disconnect();
                    if (err) return manejarError(err, res, 'eliminar reserva');
                    return res.json({ success: true });
                }
            );
        });
    });
});

module.exports = router;