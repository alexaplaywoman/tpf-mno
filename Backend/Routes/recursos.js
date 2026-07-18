const express = require('express');
const { conectar , manejarError } = require('./conexion');
const router = express.Router();



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

router.get('/tipos', (req, res) => {
    const { usuario, clave } = req.query;
    if (!usuario || !clave)
        return res.status(400).json({ success: false, error: 'Faltan credenciales.' });

    conectar(usuario, clave, (err, connection) => {
        if (err) return res.status(500).json({ success: false, error: 'Error de conexión.' });

        connection.query(
            'SELECT DISTINCT NOMBRE FROM DBA.RECURSOS ORDER BY NOMBRE',
            (err, result) => {
                connection.disconnect();
                if (err) return manejarError(err, res, 'consultar tipos de recursos');
                return res.json(result);
            }
        );
    });
});

router.get('/', (req, res) => {
    const { usuario, clave, laboratorio } = req.query;
    if (!usuario || !clave)
        return res.status(400).json({ success: false, error: 'Faltan credenciales.' });

    conectar(usuario, clave, (err, connection) => {
        if (err) return res.status(500).json({ success: false, error: 'Error de conexión.' });

        const condicionLab = laboratorio ? `WHERE NUMERO_LABORATORIO = ${laboratorio}` : '';

        connection.query(
            `SELECT * FROM DBA.RECURSOS ${condicionLab} ORDER BY NOMBRE`,
            (err, result) => {
                connection.disconnect();
                if (err) return manejarError(err, res, 'consultar recursos');
                return res.json(result);
            }
        );
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
            `SELECT * FROM DBA.RECURSOS WHERE ID_RECURSO = ${id}`,
            (err, result) => {
                connection.disconnect();
                if (err) return manejarError(err, res, 'consultar recurso');
                if (result.length > 0) return res.json({ success: true, recurso: result[0] });
                return res.json({ success: false, error: 'Recurso no encontrado.' });
            }
        );
    });
});

router.post('/add', (req, res) => {
    const { numero_laboratorio, nombre, descripcion, disponibilidad, usuario, clave } = req.body;

    if (!usuario || !clave || !numero_laboratorio || !nombre || !descripcion)
        return res.status(400).json({ success: false, error: 'Faltan datos obligatorios.' });

    conectar(usuario, clave, (err, connection) => {
        if (err) return res.status(500).json({ success: false, error: 'Error de conexión.' });

        verificarAdmin(connection, usuario, (err, esAdmin) => {
            if (err) {
                connection.disconnect();
                return manejarError(err, res, 'verificar permisos de administrador');
            }
            if (!esAdmin) {
                connection.disconnect();
                return res.status(403).json({ success: false, error: 'Solo un usuario administrativo puede agregar recursos.' });
            }

            connection.query(
                `SELECT NUMERO_LABORATORIO FROM DBA.LABORATORIOS WHERE NUMERO_LABORATORIO = ${numero_laboratorio}`,
                (err, labs) => {
                    if (err) {
                        connection.disconnect();
                        return manejarError(err, res, 'verificar laboratorio');
                    }
                    if (labs.length === 0) {
                        connection.disconnect();
                        return res.status(404).json({ success: false, error: 'Laboratorio no encontrado.' });
                    }

                    const disp = disponibilidad === 'N' ? 'N' : 'S';

                    connection.query(
                        `INSERT INTO DBA.RECURSOS (NUMERO_LABORATORIO, NOMBRE, DESCRIPCION, DISPONIBILIDAD)
                         VALUES (${numero_laboratorio}, '${nombre}', '${descripcion}', '${disp}')`,
                        (err) => {
                            connection.disconnect();
                            if (err) return manejarError(err, res, 'crear recurso');
                            return res.json({ success: true });
                        }
                    );
                }
            );
        });
    });
});

router.post('/update/:id', (req, res) => {
    const { id } = req.params;
    const { numero_laboratorio, nombre, descripcion, disponibilidad, usuario, clave } = req.body;

    if (!usuario || !clave || !numero_laboratorio || !nombre || !descripcion || !disponibilidad)
        return res.status(400).json({ success: false, error: 'Faltan datos obligatorios.' });

    conectar(usuario, clave, (err, connection) => {
        if (err) return res.status(500).json({ success: false, error: 'Error de conexión.' });

        verificarAdmin(connection, usuario, (err, esAdmin) => {
            if (err) {
                connection.disconnect();
                return manejarError(err, res, 'verificar permisos de administrador');
            }
            if (!esAdmin) {
                connection.disconnect();
                return res.status(403).json({ success: false, error: 'Solo un usuario administrativo puede modificar recursos.' });
            }

            connection.query(
                `UPDATE DBA.RECURSOS
                 SET NUMERO_LABORATORIO = ${numero_laboratorio},
                     NOMBRE = '${nombre}',
                     DESCRIPCION = '${descripcion}',
                     DISPONIBILIDAD = '${disponibilidad}'
                 WHERE ID_RECURSO = ${id}`,
                (err) => {
                    connection.disconnect();
                    if (err) return manejarError(err, res, 'actualizar recurso');
                    return res.json({ success: true });
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
        if (err) return manejarError(err, res, 'conectar para eliminar recurso');

        verificarAdmin(connection, usuario, (err, esAdmin) => {
            if (err) {
                connection.disconnect();
                return manejarError(err, res, 'verificar permisos de administrador');
            }
            if (!esAdmin) {
                connection.disconnect();
                return res.status(403).json({ success: false, error: 'Solo un usuario administrativo puede eliminar recursos.' });
            }

            connection.query(
                `DELETE FROM DBA.RECURSOS WHERE ID_RECURSO = ${id}`,
                (err) => {
                    connection.disconnect();
                    if (err) return manejarError(err, res, 'eliminar recurso');
                    return res.json({ success: true });
                }
            );
        });
    });
});

module.exports = router;
