const express = require('express');
const Sybase = require('sybase');
const router = express.Router();

const { conectar } = require('./conexion');

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

router.get('/', (req, res) => {
    const { usuario, clave } = req.query;
    if (!usuario || !clave)
        return res.status(400).json({ success: false, error: 'Faltan credenciales.' });

    const connection = getConnection(usuario, clave);

    connection.connect((err) => {
        if (err) return res.status(500).json({ success: false, error: 'Error de conexión.' });

        const sql = `
            SELECT s.CEDULA_IDENTIDAD, s.CORREO, s.NOMBRE, s.APELLIDO, s.TELEFONO,
                   s.DEPARTAMENTO, s.ID_CARRERA, s.ID_SOLICITANTE, s.TIPO_DOCUMENTO,
                   c.NOMBRE AS carrera,
                   ts.TIPO_SOLICITANTE AS tipo_solicitante,
                   td.NOMBRE AS tipo_documento
            FROM DBA.SOLICITANTES s
            LEFT JOIN DBA.CARRERAS c ON s.ID_CARRERA = c.ID_CARRERA
            LEFT JOIN DBA.TIPOS_SOLICITANTES ts ON s.ID_SOLICITANTE = ts.ID_SOLICITANTE
            LEFT JOIN DBA.TIPOS_DOCUMENTOS td ON s.TIPO_DOCUMENTO = td.TIPO_DOCUMENTO
            ORDER BY s.APELLIDO, s.NOMBRE
        `;

        connection.query(sql, (err, result) => {
            connection.disconnect();
            if (err) return manejarError(err, res, 'consultar solicitantes');
            return res.json(result);
        });
    });
});

router.get('/:cedula', (req, res) => {
    const { cedula } = req.params;
    const { usuario, clave } = req.query;
    if (!usuario || !clave)
        return res.status(400).json({ success: false, error: 'Faltan credenciales.' });

    const connection = getConnection(usuario, clave);

    connection.connect((err) => {
        if (err) return res.status(500).json({ success: false, error: 'Error de conexión.' });

        const sql = `
            SELECT s.CEDULA_IDENTIDAD, s.CORREO, s.NOMBRE, s.APELLIDO, s.TELEFONO,
                   s.DEPARTAMENTO, s.ID_CARRERA, s.ID_SOLICITANTE, s.TIPO_DOCUMENTO,
                   c.NOMBRE AS carrera,
                   ts.TIPO_SOLICITANTE AS tipo_solicitante,
                   td.NOMBRE AS tipo_documento
            FROM DBA.SOLICITANTES s
            LEFT JOIN DBA.CARRERAS c ON s.ID_CARRERA = c.ID_CARRERA
            LEFT JOIN DBA.TIPOS_SOLICITANTES ts ON s.ID_SOLICITANTE = ts.ID_SOLICITANTE
            LEFT JOIN DBA.TIPOS_DOCUMENTOS td ON s.TIPO_DOCUMENTO = td.TIPO_DOCUMENTO
            WHERE s.CEDULA_IDENTIDAD = ${cedula}
        `;

        connection.query(sql, (err, result) => {
            connection.disconnect();
            if (err) return manejarError(err, res, 'consultar solicitante');
            if (result.length > 0) return res.json({ success: true, solicitante: result[0] });
            return res.json({ success: false, error: 'Solicitante no encontrado.' });
        });
    });
});

router.post('/add', (req, res) => {
    const {
        cedula_identidad, correo, id_carrera, id_solicitante, tipo_documento,
        nombre, apellido, telefono, departamento, usuario, clave
    } = req.body;

    if (!usuario || !clave || !cedula_identidad || !correo || !nombre || !apellido)
        return res.status(400).json({ success: false, error: 'Faltan datos obligatorios.' });

    const connection = getConnection(usuario, clave);

    connection.connect((err) => {
        if (err) return res.status(500).json({ success: false, error: 'Error de conexión.' });

        const sql = `
            INSERT INTO DBA.SOLICITANTES
                (CEDULA_IDENTIDAD, CORREO, ID_CARRERA, ID_SOLICITANTE, TIPO_DOCUMENTO,
                 NOMBRE, APELLIDO, TELEFONO, DEPARTAMENTO)
            VALUES
                (${cedula_identidad}, '${correo}', ${id_carrera || 'NULL'}, ${id_solicitante || 'NULL'},
                 ${tipo_documento || 'NULL'}, '${nombre}', '${apellido}', '${telefono}', '${departamento}')
        `;

        connection.query(sql, (err) => {
            connection.disconnect();
            if (err) return manejarError(err, res, 'agregar solicitante');
            return res.json({ success: true });
        });
    });
});

router.post('/update/:cedula', (req, res) => {
    const { cedula } = req.params;
    const {
        correo, id_carrera, id_solicitante, tipo_documento,
        nombre, apellido, telefono, departamento, usuario, clave
    } = req.body;

    if (!usuario || !clave || !correo || !nombre || !apellido)
        return res.status(400).json({ success: false, error: 'Faltan datos obligatorios.' });

    const connection = getConnection(usuario, clave);

    connection.connect((err) => {
        if (err) return res.status(500).json({ success: false, error: 'Error de conexión.' });

        const sql = `
            UPDATE DBA.SOLICITANTES
            SET CORREO         = '${correo}',
                ID_CARRERA     = ${id_carrera || 'NULL'},
                ID_SOLICITANTE = ${id_solicitante || 'NULL'},
                TIPO_DOCUMENTO = ${tipo_documento || 'NULL'},
                NOMBRE         = '${nombre}',
                APELLIDO       = '${apellido}',
                TELEFONO       = '${telefono}',
                DEPARTAMENTO   = '${departamento}'
            WHERE CEDULA_IDENTIDAD = ${cedula}
        `;

        connection.query(sql, (err) => {
            connection.disconnect();
            if (err) return manejarError(err, res, 'actualizar solicitante');
            return res.json({ success: true });
        });
    });
});

router.delete('/delete/:cedula', (req, res) => {
    const { cedula } = req.params;
    const { usuario, clave } = req.query;
    if (!usuario || !clave)
        return res.status(400).json({ success: false, error: 'Faltan credenciales.' });

    const connection = getConnection(usuario, clave);

    connection.connect((err) => {
        if (err) return manejarError(err, res, 'conectar para eliminar solicitante');

        verificarAdmin(connection, usuario, (err, esAdmin) => {
            if (err) {
                connection.disconnect();
                return manejarError(err, res, 'verificar permisos de administrador');
            }
            if (!esAdmin) {
                connection.disconnect();
                return res.status(403).json({ success: false, error: 'Solo un usuario administrativo puede eliminar un solicitante.' });
            }

            connection.query(
                `DELETE FROM DBA.SOLICITANTES WHERE CEDULA_IDENTIDAD = ${cedula}`,
                (err) => {
                    connection.disconnect();
                    if (err) return manejarError(err, res, 'eliminar solicitante');
                    return res.json({ success: true });
                }
            );
        });
    });
});

module.exports = router;