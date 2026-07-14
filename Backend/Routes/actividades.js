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

router.get('/', (req, res) => {
    const { usuario, clave } = req.query;
    if (!usuario || !clave)
        return res.status(400).json({ success: false, error: 'Faltan credenciales.' });

    const connection = getConnection(usuario, clave);

    connection.connect((err) => {
        if (err) return res.status(500).json({ success: false, error: 'Error de conexión.' });

        const sql = `
            SELECT ta.ID_TIPO_ACTIVIDAD, ta.NOMBRE, ta.PRIORIDAD, ta.DURACION_MAX_HORAS,
                   ta.ID_PRIORIDAD, p.NOMBRE AS prioridad_nombre
            FROM DBA.TIPO_ACTIVIDAD ta
            LEFT JOIN DBA.PRIORIDADES p ON ta.ID_PRIORIDAD = p.ID_PRIORIDAD
            ORDER BY ta.PRIORIDAD, ta.NOMBRE
        `;

        connection.query(sql, (err, result) => {
            connection.disconnect();
            if (err) return manejarError(err, res, 'consultar tipos de actividad');
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
            `SELECT * FROM DBA.TIPO_ACTIVIDAD WHERE ID_TIPO_ACTIVIDAD = ${id}`,
            (err, result) => {
                connection.disconnect();
                if (err) return manejarError(err, res, 'consultar tipo de actividad');
                if (result.length > 0) return res.json({ success: true, tipo_actividad: result[0] });
                return res.json({ success: false, error: 'Tipo de actividad no encontrada.' });
            }
        );
    });
});

router.post('/add', (req, res) => {
    const {
        id_prioridad, nombre, prioridad, duracion_max_horas,
        usuario, clave
    } = req.body;

    if (!usuario || !clave || !nombre || !duracion_max_horas)
        return res.status(400).json({ success: false, error: 'Faltan datos obligatorios.' });

    const connection = getConnection(usuario, clave);

    connection.connect((err) => {
        if (err) return res.status(500).json({ success: false, error: 'Error de conexión.' });

        const sql = `
            INSERT INTO DBA.TIPO_ACTIVIDAD
                (ID_PRIORIDAD, NOMBRE, PRIORIDAD, DURACION_MAX_HORAS)
            VALUES
                (${id_prioridad ?? 'NULL'}, '${nombre}', ${prioridad}, ${duracion_max_horas})
        `;

        connection.query(sql, (err) => {
            connection.disconnect();
            if (err) return manejarError(err, res, 'agregar tipo de actividad');
            return res.json({ success: true });
        });
    });
});

router.post('/update/:id', (req, res) => {
    const { id } = req.params;
    const {
        id_prioridad, nombre, prioridad, duracion_max_horas,
        usuario, clave
    } = req.body;

    if (!usuario || !clave || !nombre || !duracion_max_horas)
        return res.status(400).json({ success: false, error: 'Faltan datos obligatorios.' });

    const connection = getConnection(usuario, clave);

    connection.connect((err) => {
        if (err) return res.status(500).json({ success: false, error: 'Error de conexión.' });

        const sql = `
            UPDATE DBA.TIPO_ACTIVIDAD
            SET ID_PRIORIDAD       = ${id_prioridad ?? 'NULL'},
                NOMBRE             = '${nombre}',
                PRIORIDAD          = ${prioridad},
                DURACION_MAX_HORAS = ${duracion_max_horas}
            WHERE ID_TIPO_ACTIVIDAD = ${id}
        `;

        connection.query(sql, (err) => {
            connection.disconnect();
            if (err) return manejarError(err, res, 'actualizar tipo de actividad');
            return res.json({ success: true });
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
        if (err) return manejarError(err, res, 'conectar para eliminar tipo de actividad');

        verificarAdmin(connection, usuario, (err, esAdmin) => {
            if (err) {
                connection.disconnect();
                return manejarError(err, res, 'verificar permisos de administrador');
            }
            if (!esAdmin) {
                connection.disconnect();
                return res.status(403).json({ success: false, error: 'Solo un usuario administrativo puede eliminar un tipo de actividad.' });
            }

            connection.query(
                `DELETE FROM DBA.TIPO_ACTIVIDAD WHERE ID_TIPO_ACTIVIDAD = ${id}`,
                (err) => {
                    connection.disconnect();
                    if (err) return manejarError(err, res, 'eliminar tipo de actividad');
                    return res.json({ success: true });
                }
            );
        });
    });
});

module.exports = router;