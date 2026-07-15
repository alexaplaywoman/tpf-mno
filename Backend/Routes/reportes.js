const express = require('express');
const Sybase = require('sybase');
const router = express.Router();

<<<<<<< HEAD
const { conectar } = require('./conexion');
=======
function getConnection(usuario, clave) {
    return new Sybase('localhost', 2639, 'tpf_reservas', usuario, clave);
}

>>>>>>> 6d8136055d594a7f0273ba8e99b3313f54281ddb
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

function esFecha(value) {
    return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function validarRango(req, res) {
    const { usuario, clave, desde, hasta } = req.query;
    if (!usuario || !clave || !esFecha(desde) || !esFecha(hasta)) {
        res.status(400).json({ success: false, error: 'Faltan credenciales o el rango de fechas es inválido (YYYY-MM-DD).' });
        return null;
    }
    return { usuario, clave, desde, hasta };
}

router.get('/laboratorios-mas-utilizados', (req, res) => {
    const params = validarRango(req, res);
    if (!params) return;

    const connection = getConnection(params.usuario, params.clave);

    connection.connect((err) => {
        if (err) return res.status(500).json({ success: false, error: 'Error de conexión.' });

        const sql = `
            SELECT r.NUMERO_LABORATORIO, l.EDIFICIO, COUNT(*) AS cantidad_reservas
            FROM DBA.RESERVAS r
            JOIN DBA.LABORATORIOS l ON r.NUMERO_LABORATORIO = l.NUMERO_LABORATORIO
            WHERE r.FECHA_A_RESERVAR BETWEEN '${params.desde}' AND '${params.hasta}'
            GROUP BY r.NUMERO_LABORATORIO, l.EDIFICIO
            ORDER BY cantidad_reservas DESC
        `;

        connection.query(sql, (err, result) => {
            connection.disconnect();
            if (err) return manejarError(err, res, 'generar reporte de laboratorios más utilizados');
            return res.json(result);
        });
    });
});

router.get('/horarios-mas-ocupados', (req, res) => {
    const params = validarRango(req, res);
    if (!params) return;

    const connection = getConnection(params.usuario, params.clave);

    connection.connect((err) => {
        if (err) return res.status(500).json({ success: false, error: 'Error de conexión.' });

        const sql = `
            SELECT HORA_INICIO, COUNT(*) AS cantidad_reservas
            FROM DBA.RESERVAS
            WHERE FECHA_A_RESERVAR BETWEEN '${params.desde}' AND '${params.hasta}'
            GROUP BY HORA_INICIO
            ORDER BY cantidad_reservas DESC
        `;

        connection.query(sql, (err, result) => {
            connection.disconnect();
            if (err) return manejarError(err, res, 'generar reporte de horarios de mayor ocupación');
            return res.json(result);
        });
    });
});

router.get('/solicitantes-top', (req, res) => {
    const params = validarRango(req, res);
    if (!params) return;

    const connection = getConnection(params.usuario, params.clave);

    connection.connect((err) => {
        if (err) return res.status(500).json({ success: false, error: 'Error de conexión.' });

        const sql = `
            SELECT r.CEDULA_IDENTIDAD, s.NOMBRE, s.APELLIDO, COUNT(*) AS cantidad_reservas
            FROM DBA.RESERVAS r
            JOIN DBA.SOLICITANTES s ON r.CEDULA_IDENTIDAD = s.CEDULA_IDENTIDAD AND r.CORREO = s.CORREO
            WHERE r.FECHA_A_RESERVAR BETWEEN '${params.desde}' AND '${params.hasta}'
            GROUP BY r.CEDULA_IDENTIDAD, s.NOMBRE, s.APELLIDO
            ORDER BY cantidad_reservas DESC
        `;

        connection.query(sql, (err, result) => {
            connection.disconnect();
            if (err) return manejarError(err, res, 'generar reporte de solicitantes con más reservas');
            return res.json(result);
        });
    });
});

router.get('/cancelaciones-inasistencias', (req, res) => {
    const params = validarRango(req, res);
    if (!params) return;

    const connection = getConnection(params.usuario, params.clave);

    connection.connect((err) => {
        if (err) return res.status(500).json({ success: false, error: 'Error de conexión.' });

        const sql = `
            SELECT er.ESTADO_RESERVA, COUNT(*) AS cantidad
            FROM DBA.RESERVAS r
            JOIN DBA.ESTADO_RESERVA er ON r.ID_ESTADO_RESERVA = er.ID_ESTADO_RESERVA
            WHERE r.FECHA_A_RESERVAR BETWEEN '${params.desde}' AND '${params.hasta}'
              AND r.ID_ESTADO_RESERVA IN (3, 4)
            GROUP BY er.ESTADO_RESERVA
        `;

        connection.query(sql, (err, result) => {
            connection.disconnect();
            if (err) return manejarError(err, res, 'generar reporte de cancelaciones e inasistencias');
            return res.json(result);
        });
    });
});

module.exports = router;