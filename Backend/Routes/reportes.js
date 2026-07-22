const express = require('express');
const { conectar, manejarError } = require('./conexion');
const router = express.Router();

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

    conectar(params.usuario, params.clave, (err, connection) => {
        if (err) return res.status(500).json({ success: false, error: 'Error de conexión.' });

        const sql = `CALL DBA.sp_reporte_laboratorios_mas_utilizados('${params.desde}', '${params.hasta}')`;

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

    conectar(params.usuario, params.clave, (err, connection) => {
        if (err) return res.status(500).json({ success: false, error: 'Error de conexión.' });

        const sql = `CALL DBA.sp_reporte_horarios_mas_ocupados('${params.desde}', '${params.hasta}')`;

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

    conectar(params.usuario, params.clave, (err, connection) => {
        if (err) return res.status(500).json({ success: false, error: 'Error de conexión.' });

        const sql = `CALL DBA.sp_reporte_solicitantes_top('${params.desde}', '${params.hasta}')`;

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

    conectar(params.usuario, params.clave, (err, connection) => {
        if (err) return res.status(500).json({ success: false, error: 'Error de conexión.' });

        const sql = `CALL DBA.sp_reporte_cancelaciones_inasistencias('${params.desde}', '${params.hasta}')`;

        connection.query(sql, (err, result) => {
            connection.disconnect();
            if (err) return manejarError(err, res, 'generar reporte de cancelaciones e inasistencias');
            return res.json(result);
        });
    });
});

router.get('/porcentaje-recursos', (req, res) => {
    const params = validarRango(req, res);
    if (!params) return;

    conectar(params.usuario, params.clave, (err, connection) => {
        if (err) return res.status(500).json({ success: false, error: 'Error de conexión.' });

        const sql = `CALL DBA.sp_reporte_porcentaje_recursos('${params.desde}', '${params.hasta}')`;

        connection.query(sql, (err, result) => {
            connection.disconnect();
            if (err) return manejarError(err, res, 'generar reporte de porcentaje de recursos');
            return res.json(result);
        });
    });
});

module.exports = router;
