const express = require('express');
const Sybase = require('sybase');
const router = express.Router();

function getConnection(usuario, clave) {
    return new Sybase('localhost', 2638, 'labcontrol', usuario, clave);
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
            FROM LABORATORIOS l
            LEFT JOIN EDIFICIOS e ON l.ID_EDIFICIO = e.ID_EDIFICIO
            LEFT JOIN ESTADOS_OPERATIVOS eo ON l.ESTADO = eo.ESTADO
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
            FROM LABORATORIOS l
            LEFT JOIN EDIFICIOS e ON l.ID_EDIFICIO = e.ID_EDIFICIO
            LEFT JOIN ESTADOS_OPERATIVOS eo ON l.ESTADO = eo.ESTADO
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
            INSERT INTO LABORATORIOS
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
            UPDATE LABORATORIOS
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

        connection.query(
            `SELECT ESTADO FROM ESTADOS_OPERATIVOS WHERE ESTADO = ${estado}`,
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
                    `UPDATE LABORATORIOS SET ESTADO = ${estado} WHERE NUMERO_LABORATORIO = ${id}`,
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


router.get('/disponibilidad/:id', (req, res) => {
    const { id } = req.params;
    const { usuario, clave, fecha } = req.query;

    if (!usuario || !clave || !fecha)
        return res.status(400).json({ success: false, error: 'Faltan credenciales o fecha.' });

    const connection = getConnection(usuario, clave);

    connection.connect((err) => {
        if (err) return res.status(500).json({ success: false, error: 'Error de conexión.' });

        const sql = `
            SELECT HORA_INICIO, HORA_FIN, ID_ESTADO_RESERVA
            FROM RESERVAS
            WHERE NUMERO_LABORATORIO = ${id}
              AND FECHA_A_RESERVAR = '${fecha}'
              AND ID_ESTADO_RESERVA != 3
            ORDER BY HORA_INICIO
        `;

        connection.query(sql, (err, result) => {
            connection.disconnect();
            if (err) return manejarError(err, res, 'consultar disponibilidad');
            return res.json({ success: true, reservas_del_dia: result });
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

        connection.query(
            `DELETE FROM LABORATORIOS WHERE NUMERO_LABORATORIO = ${id}`,
            (err) => {
                connection.disconnect();
                if (err) return manejarError(err, res, 'eliminar laboratorio');
                return res.json({ success: true });
            }
        );
    });
});

module.exports = router;