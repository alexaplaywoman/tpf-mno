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

const ESTADO_LAB_MANTENIMIENTO = 3; // laboratorio en mantenimiento
const ESTADO_LAB_DISPONIBLE = 1;    // laboratorio disponible
const ESTADOS_MANT_FINALIZADOS = [3, 4]; // Realizado o Cancelado

router.get('/', (req, res) => {
    const { usuario, clave } = req.query;
    if (!usuario || !clave)
        return res.status(400).json({ success: false, error: 'Faltan credenciales.' });

    conectar(usuario, clave, (err, connection) => {
        if (err) return res.status(500).json({ success: false, error: 'Error de conexión.' });

        const sql = `
            SELECT m.ID_MANTENIMIENTO, m.NUMERO_LABORATORIO, m.FECHA_INICIO,
                   m.FECHA_FIN_PREVISTA, m.OBSERVACIONES, m.ID_ESTADO_MANTENIMIENTO,
                   em.ESTADO_MANTENIMIENTO AS estado_mantenimiento,
                   l.EDIFICIO
            FROM DBA.MANTENIMIENTOS m
            LEFT JOIN DBA.ESTADOS_MANTENIMIENTOS em ON m.ID_ESTADO_MANTENIMIENTO = em.ID_ESTADO_MANTENIMIENTO
            LEFT JOIN DBA.LABORATORIOS l ON m.NUMERO_LABORATORIO = l.NUMERO_LABORATORIO
            ORDER BY m.FECHA_INICIO DESC
        `;

        connection.query(sql, (err, result) => {
            connection.disconnect();
            if (err) return manejarError(err, res, 'consultar mantenimientos');
            return res.json(result);
        });
    });
});

router.get('/:id', (req, res) => {
    const { id } = req.params;
    const { usuario, clave } = req.query;
    if (!usuario || !clave)
        return res.status(400).json({ success: false, error: 'Faltan credenciales.' });

    conectar(usuario, clave, (err, connection) => {
        if (err) return res.status(500).json({ success: false, error: 'Error de conexión.' });

        connection.query(
            `SELECT * FROM DBA.MANTENIMIENTOS WHERE ID_MANTENIMIENTO = ${id}`,
            (err, result) => {
                connection.disconnect();
                if (err) return manejarError(err, res, 'consultar mantenimiento');
                if (result.length > 0) return res.json({ success: true, mantenimiento: result[0] });
                return res.json({ success: false, error: 'Mantenimiento no encontrado.' });
            }
        );
    });
});

router.post('/add', (req, res) => {
    const {
        numero_laboratorio, id_estado_mantenimiento, fecha_inicio,
        fecha_fin_prevista, observaciones, usuario, clave
    } = req.body;

    if (!usuario || !clave || !numero_laboratorio || !fecha_inicio)
        return res.status(400).json({ success: false, error: 'Faltan datos obligatorios.' });

    conectar(usuario, clave, (err, connection) => {
        if (err) return res.status(500).json({ success: false, error: 'Error de conexión.' });

        connection.query(
            `SELECT ID_MANTENIMIENTO FROM DBA.MANTENIMIENTOS
             WHERE NUMERO_LABORATORIO = ${numero_laboratorio}
               AND ID_ESTADO_MANTENIMIENTO IN (1, 2)`,
            (err, activos) => {
                if (err) {
                    connection.disconnect();
                    return manejarError(err, res, 'verificar mantenimientos activos');
                }
                if (activos.length > 0) {
                    connection.disconnect();
                    return res.status(409).json({ success: false, error: 'Este laboratorio ya tiene un mantenimiento pendiente o en proceso.' });
                }

                const estadoMant = id_estado_mantenimiento || 1;

                connection.query(
                    `SELECT ID_ESTADO_MANTENIMIENTO FROM DBA.ESTADOS_MANTENIMIENTOS WHERE ID_ESTADO_MANTENIMIENTO = ${estadoMant}`,
                    (err, estados) => {
                        if (err) {
                            connection.disconnect();
                            return manejarError(err, res, 'verificar estado de mantenimiento');
                        }
                        if (estados.length === 0) {
                            connection.disconnect();
                            return res.status(400).json({ success: false, error: 'Estado de mantenimiento no válido.' });
                        }

                        const sqlInsert = `
                            INSERT INTO DBA.MANTENIMIENTOS
                                (ID_ESTADO_MANTENIMIENTO, NUMERO_LABORATORIO, FECHA_INICIO, FECHA_FIN_PREVISTA, OBSERVACIONES)
                            VALUES
                                (${estadoMant}, ${numero_laboratorio}, '${fecha_inicio}',
                                 '${fecha_fin_prevista}', '${observaciones}')
                        `;

                        connection.query(sqlInsert, (err) => {
                            if (err) {
                                connection.disconnect();
                                return manejarError(err, res, 'agregar mantenimiento');
                            }

                            connection.query(
                                `UPDATE DBA.LABORATORIOS SET ESTADO = ${ESTADO_LAB_MANTENIMIENTO} WHERE NUMERO_LABORATORIO = ${numero_laboratorio}`,
                                (err) => {
                                    connection.disconnect();
                                    if (err) return manejarError(err, res, 'actualizar estado del laboratorio');
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

router.post('/estado/:id', (req, res) => {
    const { id } = req.params;
    const { id_estado_mantenimiento, fecha_fin_prevista, observaciones, usuario, clave } = req.body;

    if (!usuario || !clave || !id_estado_mantenimiento)
        return res.status(400).json({ success: false, error: 'Faltan datos.' });

    conectar(usuario, clave, (err, connection) => {
        if (err) return res.status(500).json({ success: false, error: 'Error de conexión.' });

        connection.query(
            `SELECT ID_ESTADO_MANTENIMIENTO FROM DBA.ESTADOS_MANTENIMIENTOS WHERE ID_ESTADO_MANTENIMIENTO = ${id_estado_mantenimiento}`,
            (err, estados) => {
                if (err) {
                    connection.disconnect();
                    return manejarError(err, res, 'verificar estado de mantenimiento');
                }
                if (estados.length === 0) {
                    connection.disconnect();
                    return res.status(400).json({ success: false, error: 'Estado de mantenimiento no válido.' });
                }

                connection.query(
                    `SELECT NUMERO_LABORATORIO FROM DBA.MANTENIMIENTOS WHERE ID_MANTENIMIENTO = ${id}`,
                    (err, result) => {
                        if (err) {
                            connection.disconnect();
                            return manejarError(err, res, 'consultar mantenimiento');
                        }
                        if (result.length === 0) {
                            connection.disconnect();
                            return res.status(404).json({ success: false, error: 'Mantenimiento no encontrado.' });
                        }

                        const numeroLab = result[0].NUMERO_LABORATORIO;

                        const sqlUpdate = `
                            UPDATE DBA.MANTENIMIENTOS
                            SET ID_ESTADO_MANTENIMIENTO = ${id_estado_mantenimiento},
                                FECHA_FIN_PREVISTA       = '${fecha_fin_prevista}',
                                OBSERVACIONES             = '${observaciones}'
                            WHERE ID_MANTENIMIENTO = ${id}
                        `;

                        connection.query(sqlUpdate, (err) => {
                            if (err) {
                                connection.disconnect();
                                return manejarError(err, res, 'actualizar mantenimiento');
                            }

                            const estadoLab = ESTADOS_MANT_FINALIZADOS.some(e => e == id_estado_mantenimiento)
                                ? ESTADO_LAB_DISPONIBLE
                                : ESTADO_LAB_MANTENIMIENTO;

                            connection.query(
                                `UPDATE DBA.LABORATORIOS SET ESTADO = ${estadoLab} WHERE NUMERO_LABORATORIO = ${numeroLab}`,
                                (err) => {
                                    connection.disconnect();
                                    if (err) return manejarError(err, res, 'actualizar estado del laboratorio');
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

router.delete('/delete/:id', (req, res) => {
    const { id } = req.params;
    const { usuario, clave } = req.query;
    if (!usuario || !clave)
        return res.status(400).json({ success: false, error: 'Faltan credenciales.' });

    conectar(usuario, clave, (err, connection) => {
        if (err) return manejarError(err, res, 'conectar para eliminar mantenimiento');

        verificarAdmin(connection, usuario, (err, esAdmin) => {
            if (err) {
                connection.disconnect();
                return manejarError(err, res, 'verificar permisos de administrador');
            }
            if (!esAdmin) {
                connection.disconnect();
                return res.status(403).json({ success: false, error: 'Solo un usuario administrativo puede eliminar un mantenimiento.' });
            }

            connection.query(
                `DELETE FROM DBA.MANTENIMIENTOS WHERE ID_MANTENIMIENTO = ${id}`,
                (err) => {
                    connection.disconnect();
                    if (err) return manejarError(err, res, 'eliminar mantenimiento');
                    return res.json({ success: true });
                }
            );
        });
    });
});

module.exports = router;