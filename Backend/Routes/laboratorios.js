const express = require('express');
const Sybase = require('sybase');
const router = express.Router();

function getConnection(usuario, clave) {
    return new Sybase('localhost', 2639, 'tpf_reservas', usuario, clave);
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

function verificarAdmin(connection, usuario, callback) {
    connection.query(
        `SELECT COUNT(*) AS es_admin
         FROM sys.sysgroup sg
         JOIN sys.sysuserperm g ON g.user_id = sg.group_id
         JOIN sys.sysuserperm m ON m.user_id = sg.group_member
         WHERE g.user_name = 'ADMINISTRADORES' AND m.user_name = '${usuario}'`,
        (err, permiso) => {
            if (err) return callback(err, false);
            callback(null, !!(permiso[0] && permiso[0].es_admin));
        }
    );
}

function calcularHorariosDisponibles(reservasDelDia, duracionHoras, horaApertura = 7, horaCierre = 22) {
    const disponibles = [];

    for (let inicio = horaApertura; inicio + duracionHoras <= horaCierre; inicio++) {
        const fin = inicio + duracionHoras;

        const solapa = reservasDelDia.some(r => {
            const rInicio = parseInt(r.HORA_INICIO.split(':')[0]);
            const rFin = parseInt(r.HORA_FIN.split(':')[0]);
            return inicio < rFin && fin > rInicio;
        });

        if (!solapa) {
            disponibles.push({
                hora_inicio: `${String(inicio).padStart(2, '0')}:00`,
                hora_fin: `${String(fin).padStart(2, '0')}:00`
            });
        }
    }

    return disponibles;
}

router.get('/', (req, res) => {
    const { usuario, clave } = req.query;
    if (!usuario || !clave)
        return res.status(400).json({ success: false, error: 'Faltan credenciales.' });

    const connection = getConnection(usuario, clave);

    connection.connect((err) => {
        if (err) return res.status(500).json({ success: false, error: 'Error de conexión.' });

        const sql = `
            SELECT l.NUMERO_LABORATORIO, l.EDIFICIO, l.CAPACIDAD_ALUMNOS,
                   l.CANTIDAD_COMPUTADORAS, l.VELOCIDAD_CONEXION_INTERNET,
                   l.ID_EDIFICIO, l.ESTADO,
                   e.NOMBRE_EDIFICIO,
                   eo.TIPO AS estado_tipo
            FROM DBA.LABORATORIOS l
            LEFT JOIN DBA.EDIFICIOS e ON l.ID_EDIFICIO = e.ID_EDIFICIO
            LEFT JOIN DBA.ESTADOS_OPERATIVOS eo ON l.ESTADO = eo.ESTADO
            ORDER BY l.NUMERO_LABORATORIO
        `;

        connection.query(sql, (err, result) => {
            connection.disconnect();
            if (err) return manejarError(err, res, 'consultar laboratorios');
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

        const sql = `
            SELECT l.NUMERO_LABORATORIO, l.EDIFICIO, l.CAPACIDAD_ALUMNOS,
                   l.CANTIDAD_COMPUTADORAS, l.VELOCIDAD_CONEXION_INTERNET,
                   l.ID_EDIFICIO, l.ESTADO,
                   e.NOMBRE_EDIFICIO,
                   eo.TIPO AS estado_tipo
            FROM DBA.LABORATORIOS l
            LEFT JOIN DBA.EDIFICIOS e ON l.ID_EDIFICIO = e.ID_EDIFICIO
            LEFT JOIN DBA.ESTADOS_OPERATIVOS eo ON l.ESTADO = eo.ESTADO
            WHERE l.NUMERO_LABORATORIO = ${id}
        `;

        connection.query(sql, (err, result) => {
            connection.disconnect();
            if (err) return manejarError(err, res, 'consultar laboratorio');
            if (result.length > 0) return res.json({ success: true, laboratorio: result[0] });
            return res.json({ success: false, error: 'Laboratorio no encontrado.' });
        });
    });
});

router.post('/add', (req, res) => {
    const {
        id_edificio, edificio, capacidad_alumnos,
        cantidad_computadoras, velocidad_conexion_internet,
        usuario, clave
    } = req.body;

    if (!usuario || !clave || !edificio || !capacidad_alumnos || !cantidad_computadoras)
        return res.status(400).json({ success: false, error: 'Faltan datos obligatorios.' });

    const connection = getConnection(usuario, clave);

    connection.connect((err) => {
        if (err) return res.status(500).json({ success: false, error: 'Error de conexión.' });

        const sql = `
            INSERT INTO DBA.LABORATORIOS
                (ID_EDIFICIO, EDIFICIO, CAPACIDAD_ALUMNOS,
                 CANTIDAD_COMPUTADORAS, VELOCIDAD_CONEXION_INTERNET, ESTADO)
            VALUES
                (${id_edificio || 'NULL'}, '${edificio}', ${capacidad_alumnos},
                 ${cantidad_computadoras}, ${velocidad_conexion_internet || 0}, 1)
        `;

        connection.query(sql, (err) => {
            connection.disconnect();
            if (err) return manejarError(err, res, 'agregar laboratorio');
            return res.json({ success: true });
        });
    });
});

router.post('/update/:id', (req, res) => {
    const { id } = req.params;
    const {
        id_edificio, edificio, capacidad_alumnos,
        cantidad_computadoras, velocidad_conexion_internet,
        usuario, clave
    } = req.body;

    if (!usuario || !clave || !edificio || !capacidad_alumnos)
        return res.status(400).json({ success: false, error: 'Faltan datos obligatorios.' });

    const connection = getConnection(usuario, clave);

    connection.connect((err) => {
        if (err) return res.status(500).json({ success: false, error: 'Error de conexión.' });

        const sql = `
            UPDATE DBA.LABORATORIOS
            SET ID_EDIFICIO                = ${id_edificio || 'NULL'},
                EDIFICIO                   = '${edificio}',
                CAPACIDAD_ALUMNOS          = ${capacidad_alumnos},
                CANTIDAD_COMPUTADORAS      = ${cantidad_computadoras},
                VELOCIDAD_CONEXION_INTERNET = ${velocidad_conexion_internet || 0}
            WHERE NUMERO_LABORATORIO = ${id}
        `;

        connection.query(sql, (err) => {
            connection.disconnect();
            if (err) return manejarError(err, res, 'actualizar laboratorio');
            return res.json({ success: true });
        });
    });
});

router.post('/estado/:id', (req, res) => {
    const { id } = req.params;
    const { estado, usuario, clave } = req.body;

    if (!usuario || !clave || !estado)
        return res.status(400).json({ success: false, error: 'Faltan datos.' });

    const connection = getConnection(usuario, clave);

    connection.connect((err) => {
        if (err) return res.status(500).json({ success: false, error: 'Error de conexión.' });

        verificarAdmin(connection, usuario, (err, esAdmin) => {
            if (err) {
                connection.disconnect();
                return manejarError(err, res, 'verificar permisos de administrador');
            }
            if (!esAdmin) {
                connection.disconnect();
                return res.status(403).json({ success: false, error: 'Solo un usuario administrativo puede cambiar el estado del laboratorio.' });
            }

            connection.query(
                `SELECT ESTADO FROM DBA.ESTADOS_OPERATIVOS WHERE ESTADO = ${estado}`,
                (err, result) => {
                    if (err) {
                        connection.disconnect();
                        return manejarError(err, res, 'verificar estado');
                    }
                    if (result.length === 0) {
                        connection.disconnect();
                        return res.status(400).json({ success: false, error: 'Estado no válido.' });
                    }

                    connection.query(
                        `UPDATE DBA.LABORATORIOS SET ESTADO = ${estado} WHERE NUMERO_LABORATORIO = ${id}`,
                        (err) => {
                            connection.disconnect();
                            if (err) return manejarError(err, res, 'cambiar estado');
                            return res.json({ success: true });
                        }
                    );
                }
            );
        });
    });
});

router.get('/disponibilidad/:id', (req, res) => {
    const { id } = req.params;
    const { usuario, clave, fecha, duracion } = req.query;

    if (!usuario || !clave || !fecha)
        return res.status(400).json({ success: false, error: 'Faltan credenciales o fecha.' });

    const duracionHoras = duracion ? parseInt(duracion) : 1;

    const connection = getConnection(usuario, clave);

    connection.connect((err) => {
        if (err) return res.status(500).json({ success: false, error: 'Error de conexión.' });

        const sql = `
            SELECT HORA_INICIO, HORA_FIN, ID_ESTADO_RESERVA
            FROM DBA.RESERVAS
            WHERE NUMERO_LABORATORIO = ${id}
              AND FECHA_A_RESERVAR = '${fecha}'
              AND ID_ESTADO_RESERVA != 3
            ORDER BY HORA_INICIO
        `;

        connection.query(sql, (err, result) => {
            connection.disconnect();
            if (err) return manejarError(err, res, 'consultar disponibilidad');

            const horariosDisponibles = calcularHorariosDisponibles(result, duracionHoras);

            return res.json({
                success: true,
                reservas_del_dia: result,
                horarios_disponibles: horariosDisponibles
            });
        });
    });
});

router.get('/disponibilidad-horario', (req, res) => {
    const { usuario, clave, fecha, hora_inicio, hora_fin, recursos } = req.query;

    if (!usuario || !clave || !fecha || !hora_inicio || !hora_fin)
        return res.status(400).json({ success: false, error: 'Faltan credenciales, fecha u horario.' });

    const idsRecursos = recursos ? recursos.split(',').map(r => r.trim()) : [];

    const connection = getConnection(usuario, clave);

    connection.connect((err) => {
        if (err) return res.status(500).json({ success: false, error: 'Error de conexión.' });

        const condicionRecursos = idsRecursos.length > 0
            ? `WHEN (SELECT COUNT(*) FROM DBA.RECURSOS rec
                     WHERE rec.NUMERO_LABORATORIO = l.NUMERO_LABORATORIO
                       AND rec.ID_RECURSO IN (${idsRecursos.join(',')})
                       AND rec.DISPONIBILIDAD = 'S') != ${idsRecursos.length} THEN 'N'`
            : '';

        const sql = `
            SELECT l.NUMERO_LABORATORIO, l.EDIFICIO, l.CAPACIDAD_ALUMNOS, l.ESTADO,
                   CASE
                       WHEN l.ESTADO != 1 THEN 'N'
                       WHEN EXISTS (
                           SELECT 1 FROM DBA.RESERVAS r
                           WHERE r.NUMERO_LABORATORIO = l.NUMERO_LABORATORIO
                             AND r.FECHA_A_RESERVAR = '${fecha}'
                             AND r.ID_ESTADO_RESERVA != 3
                             AND r.HORA_INICIO < '${hora_fin}'
                             AND r.HORA_FIN > '${hora_inicio}'
                       ) THEN 'N'
                       ${condicionRecursos}
                       ELSE 'S'
                   END AS disponible
            FROM DBA.LABORATORIOS l
            ORDER BY l.NUMERO_LABORATORIO
        `;

        connection.query(sql, (err, result) => {
            connection.disconnect();
            if (err) return manejarError(err, res, 'consultar disponibilidad por horario');
            return res.json({ success: true, laboratorios: result });
        });
    });
});

router.delete('/delete/:id', (req, res) => {
    const { id } = req.params;
    const { usuario, clave } = req.query;
    if (!usuario || !clave)
        return res.status(400).json({ success: false, error: 'Faltan credenciales.' });

    const connection = getConnection(usuario, clave);

    connection.connect((err) => {
        if (err) return manejarError(err, res, 'conectar para eliminar laboratorio');

        verificarAdmin(connection, usuario, (err, esAdmin) => {
            if (err) {
                connection.disconnect();
                return manejarError(err, res, 'verificar permisos de administrador');
            }
            if (!esAdmin) {
                connection.disconnect();
                return res.status(403).json({ success: false, error: 'Solo un usuario administrativo puede eliminar un laboratorio.' });
            }

            connection.query(
                `SELECT ID_RESERVA FROM DBA.RESERVAS WHERE NUMERO_LABORATORIO = ${id}`,
                (err, reservas) => {
                    if (err) {
                        connection.disconnect();
                        return manejarError(err, res, 'verificar reservas del laboratorio');
                    }
                    if (reservas.length > 0) {
                        connection.disconnect();
                        return res.status(409).json({
                            success: false,
                            error: 'No se puede eliminar el laboratorio: tiene reservas históricas asociadas.'
                        });
                    }

                    connection.query(
                        `DELETE FROM DBA.LABORATORIOS WHERE NUMERO_LABORATORIO = ${id}`,
                        (err) => {
                            connection.disconnect();
                            if (err) return manejarError(err, res, 'eliminar laboratorio');
                            return res.json({ success: true });
                        }
                    );
                }
            );
        });
    });
});

module.exports = router;