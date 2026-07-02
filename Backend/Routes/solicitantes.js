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
            FROM SOLICITANTES s
            LEFT JOIN CARRERAS c ON s.ID_CARRERA = c.ID_CARRERA
            LEFT JOIN TIPOS_SOLICITANTES ts ON s.ID_SOLICITANTE = ts.ID_TIPO_SOLICITANTE
            LEFT JOIN TIPOS_DOCUMENTOS td ON s.TIPO_DOCUMENTO = td.ID_TIPO_DOCUMENTO
            ORDER BY s.APELLIDO, s.NOMBRE
        `;

        connection.query(sql, (err, result) => {
            connection.disconnect();
            if (err) return manejarError(err, res, 'consultar solicitante');
        });
    });
});

router.get('/:cedula', (req, res) => {
    const { id } = req.params;
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
            FROM SOLICITANTES s
            LEFT JOIN CARRERAS c ON s.ID_CARRERA = c.ID_CARRERA
            LEFT JOIN TIPOS_SOLICITANTES ts ON s.ID_SOLICITANTE = ts.ID_TIPO_SOLICITANTE
            LEFT JOIN TIPOS_DOCUMENTOS td ON s.TIPO_DOCUMENTO = td.ID_TIPO_DOCUMENTO
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
        nombre, apellido, telefono, departamento,
        usuario, clave
    } = req.body;

    const cedula = toInt(cedula_identidad);
    if (!usuario || !clave || !correo || !nombre || !apellido)
        return res.status(400).json({ success: false, error: 'Faltan datos obligatorios.' });
    if (cedula === null){
        return res.status(400).json({ success: false, error: 'Cedula invalida.' });
    }
    const connection = getConnection(usuario, clave);

    connection.connect((err) => {
        if (err) return res.status(500).json({ success: false, error: 'Error de conexión.' });

        const sql = `
            INSERT INTO SOLICITANTES
                (CEDULA_IDENTIDAD, CORREO, ID_CARRERA, ID_SOLICITANTE,
                TIPO_SOLICITANTE, NOMBRE, APELLIDO, TELEFONO, DEPARTAMENTO)
            VALUES
                ${cedula}, ${esc(correo)}, ${toInt(id_carrera) ?? 'NULL'}, ${toInt(id_solicitante) ?? 'NULL'},
                ${toInt(tipo_documento) ?? 'NULL'}, ${esc(nombre)}, ${esc(apellido)}, ${esc(telefono)}, ${esc(departamento)})
        `;

        connection.query(sql, (err) => {
            connection.disconnect();
            if (err) return manejarError(err, res, 'agregar solicitante');
            return res.json({ success: true });
        });
    });
});

router.post('/update/:cedula', (req, res) => {
    const cedula = toInt(req.params.cedula);
    const {
        correo, id_carrera, id_solicitante,
        tipo_documento, nombre, apellido, telefono, departamento,
        usuario, clave
    } = req.body;

    if (!usuario || !clave || !correo || !nombre || !apellido)
        return res.status(400).json({ success: false, error: 'Faltan datos obligatorios.' });
    if (cedula === null){
        return res.status(400).json({ success: false, error: 'Cedula invalida.' });
    }
    const connection = getConnection(usuario, clave);

    connection.connect((err) => {
        if (err) return res.status(500).json({ success: false, error: 'Error de conexión.' });

        const sql = `
            UPDATE SOLICITANTES
            SET CORREO         = ${esc(correo)},
                ID_CARRERA     = ${toInt(id_carrera) ?? 'NULL'},
                ID_SOLICITANTE = ${toInt(id_solicitante) ?? 'NULL'},
                TIPO_DOCUMENTO = ${toInt(tipo_documento) ?? 'NULL'},
                NOMBRE         = ${esc(nombre)},
                APELLIDO       = ${esc(apellido)},
                TELEFONO       = ${esc(telefono)},
                DEPARTAMENTO   = ${esc(departamento)}
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
    const cedula = toInt(req.params.cedula);
    const { usuario, clave } = req.query;
    if (!usuario || !clave)
        return res.status(400).json({ success: false, error: 'Faltan credenciales.' });
    if (cedula === null)
        return res.status(400).json({ success: false, error: 'Cédula inválida.' });

    const connection = getConnection(usuario, clave);

    connection.connect((err) => {
        if (err) return manejarError(err, res, 'conectar para eliminar solicitante');

        connection.query(
            `DELETE FROM SOLICITANTES WHERE CEDULA_IDENTIDAD = ${cedula}`,
            (err) => {
                connection.disconnect();
                if (err) return manejarError(err, res, 'eliminar solicitante');
                return res.json({ success: true });
            }
        );
    });
});

module.exports = router;