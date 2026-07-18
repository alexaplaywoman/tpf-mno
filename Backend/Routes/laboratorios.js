const express = require('express');
const { conectar , manejarError} = require('./conexion');
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

    conectar(usuario, clave, (err, connection) => {
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

router.get('/edificios/listar', (req, res) => {
    const { usuario, clave } = req.query;
    if (!usuario || !clave)
        return res.status(400).json({ success: false, error: 'Faltan credenciales.' });

    conectar(usuario, clave, (err, connection) => {
        if (err) return res.status(500).json({ success: false, error: 'Error de conexión.' });

        connection.query(
            'SELECT ID_EDIFICIO, NOMBRE_EDIFICIO FROM DBA.EDIFICIOS ORDER BY NOMBRE_EDIFICIO',
            (err, result) => {
                connection.disconnect();
                if (err) return manejarError(err, res, 'consultar edificios');
                return res.json(result);
            }
        );
    });
});

router.get('/pisos/listar', (req, res) => {
    const { usuario, clave, id_edificio } = req.query;
    if (!usuario || !clave || !id_edificio)
        return res.status(400).json({ success: false, error: 'Faltan credenciales o el edificio.' });

    conectar(usuario, clave, (err, connection) => {
        if (err) return res.status(500).json({ success: false, error: 'Error de conexión.' });

        connection.query(
            `SELECT NRO_PISO FROM DBA.PISOS WHERE ID_EDIFICIO = ${id_edificio} ORDER BY NRO_PISO`,
            (err, result) => {
                connection.disconnect();
                if (err) return manejarError(err, res, 'consultar pisos');
                return res.json(result);
            }
        );
    });
});

router.get('/disponibilidad/:id', (req, res) => {
    const { id } = req.params;
    const { usuario, clave, fecha, duracion } = req.query;

    if (!usuario || !clave || !fecha)
        return res.status(400).json({ success: false, error: 'Faltan credenciales o fecha.' });

    const duracionHoras = duracion ? parseInt(duracion) : 1;

    conectar(usuario, clave, (err, connection) => {
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

    const nombresRecursos = recursos ? recursos.split(',').map(r => r.trim()).filter(r => r.length > 0) : [];
   


    conectar(usuario, clave, (err, connection) => {
        if (err) return res.status(500).json({ success: false, error: 'Error de conexión.' });

        const condicionRecursos = nombresRecursos.length > 0
            ? `WHEN (SELECT COUNT(DISTINCT NOMBRE) FROM DBA.RECURSOS rec
                     WHERE rec.NUMERO_LABORATORIO = l.NUMERO_LABORATORIO
                       AND rec.NOMBRE IN (${nombresRecursos.map(n => `'${n}'`).join(',')})
                       AND rec.DISPONIBILIDAD = 'S') != ${nombresRecursos.length} THEN 'N'`
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
            if (err) {
                return manejarError(err, res, 'consultar disponibilidad por horario');
            }


            return res.json({ success: true, laboratorios: result });
        });
    });
});

// Franjas ya reservadas de un laboratorio en una fecha puntual, para
// deshabilitar en el front las horas de inicio/fin que se solapan.
router.get('/horarios-ocupados', (req, res) => {
    const { usuario, clave, numero_laboratorio, fecha } = req.query;

    if (!usuario || !clave || !numero_laboratorio || !fecha)
        return res.status(400).json({ success: false, error: 'Faltan credenciales, laboratorio o fecha.' });

    conectar(usuario, clave, (err, connection) => {
        if (err) return res.status(500).json({ success: false, error: 'Error de conexión.' });

        const sql = `
            SELECT HORA_INICIO, HORA_FIN
            FROM DBA.RESERVAS
            WHERE NUMERO_LABORATORIO = ${numero_laboratorio}
              AND FECHA_A_RESERVAR = '${fecha}'
              AND ID_ESTADO_RESERVA != 3
            ORDER BY HORA_INICIO
        `;

        connection.query(sql, (err, result) => {
            connection.disconnect();
            if (err) return manejarError(err, res, 'consultar horarios ocupados');
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

        const sql = `
            SELECT l.NUMERO_LABORATORIO, l.EDIFICIO, l.CAPACIDAD_ALUMNOS,
                   l.CANTIDAD_COMPUTADORAS, l.VELOCIDAD_CONEXION_INTERNET,
                   l.ID_EDIFICIO, l.NRO_PISO, l.ESTADO,
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
        id_edificio, nro_piso, edificio, capacidad_alumnos,
        cantidad_computadoras, velocidad_conexion_internet,
        usuario, clave
    } = req.body;

    if (!usuario || !clave || !edificio || !id_edificio || !nro_piso || !capacidad_alumnos || !cantidad_computadoras)
        return res.status(400).json({ success: false, error: 'Faltan datos obligatorios.' });

    const velocidadNum = parseInt(velocidad_conexion_internet, 10) || 0;

    conectar(usuario, clave, (err, connection) => {
        if (err) return res.status(500).json({ success: false, error: 'Error de conexión.' });

        const sql = `
            INSERT INTO DBA.LABORATORIOS
                (ID_EDIFICIO, NRO_PISO, EDIFICIO, CAPACIDAD_ALUMNOS,
                 CANTIDAD_COMPUTADORAS, VELOCIDAD_CONEXION_INTERNET, ESTADO)
            VALUES
                (${id_edificio}, ${nro_piso}, '${edificio}', ${capacidad_alumnos},
                 ${cantidad_computadoras}, ${velocidadNum}, 1)
        `;

        connection.query(sql, (err) => {
            if (err) {
                connection.disconnect();
                return manejarError(err, res, 'agregar laboratorio');
            }

            connection.query('SELECT @@IDENTITY AS NUMERO_LABORATORIO', (err, idResult) => {
                connection.disconnect();
                if (err) return manejarError(err, res, 'obtener id del laboratorio creado');
                return res.json({ success: true, numero_laboratorio: idResult[0].NUMERO_LABORATORIO });
            });
        });
    });
});

router.post('/update/:id', (req, res) => {
    const { id } = req.params;
    const {
        id_edificio, nro_piso, edificio, capacidad_alumnos,
        cantidad_computadoras, velocidad_conexion_internet,
        usuario, clave
    } = req.body;

    if (!usuario || !clave || !edificio || !id_edificio || !nro_piso || !capacidad_alumnos)
        return res.status(400).json({ success: false, error: 'Faltan datos obligatorios.' });

    const velocidadNum = parseInt(velocidad_conexion_internet, 10) || 0;

    conectar(usuario, clave, (err, connection) => {
        if (err) return res.status(500).json({ success: false, error: 'Error de conexión.' });

        const sql = `
            UPDATE DBA.LABORATORIOS
            SET ID_EDIFICIO                = ${id_edificio},
                NRO_PISO                   = ${nro_piso},
                EDIFICIO                   = '${edificio}',
                CAPACIDAD_ALUMNOS          = ${capacidad_alumnos},
                CANTIDAD_COMPUTADORAS      = ${cantidad_computadoras},
                VELOCIDAD_CONEXION_INTERNET = ${velocidadNum}
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

    conectar(usuario, clave, (err, connection) => {
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

router.delete('/delete/:id', (req, res) => {
    const { id } = req.params;
    const { usuario, clave } = req.query;
    if (!usuario || !clave)
        return res.status(400).json({ success: false, error: 'Faltan credenciales.' });

    conectar(usuario, clave, (err, connection) => {
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