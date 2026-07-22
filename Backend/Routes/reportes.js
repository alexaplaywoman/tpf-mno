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
/*
 * ============================================================
 *  Endpoint de auditoria
 *  Pegar dentro de Backend/Routes/reportes.js, entre los otros
 *  router.get(...) del archivo. Los imports (express, conectar,
 *  manejarError, router) ya deberian estar arriba del archivo.
 * ============================================================
 */

// GET /api/reportes/auditoria
//
// Query params:
//   usuario, clave           (obligatorios, credenciales de BD)
//   fecha_desde, fecha_hasta (opcionales, formato YYYY-MM-DD)
//   grupo                    (opcional: 'Reservas'|'Laboratorios'|'Mantenimientos'|'Todos')
//   usuario_filtro           (opcional, match parcial - NO confundir con 'usuario' de credenciales)
//   id_referencia            (opcional, entero)
//   pagina                   (opcional, default 1)
//   limite                   (opcional, default 20)
//
// Responde:
//   { datos: [...], total: N }
//
router.get('/auditoria', (req, res) => {
    const { usuario, clave } = req.query;
    if (!usuario || !clave) {
        return res.status(400).json({ success: false, error: 'Faltan credenciales.' });
    }

    // Leer filtros (todos opcionales)
    const fechaDesde   = (req.query.fecha_desde   || '').trim() || null;
    const fechaHasta   = (req.query.fecha_hasta   || '').trim() || null;
    const grupo        = (req.query.grupo         || '').trim() || null;
    const usuarioFiltro = (req.query.usuario_filtro || '').trim() || null;

    const idRefRaw = req.query.id_referencia;
    const idReferencia = (idRefRaw && !isNaN(parseInt(idRefRaw, 10)))
        ? parseInt(idRefRaw, 10) : null;

    // Paginacion: el frontend maneja "pagina" (1-based); el SP quiere "offset" (0-based)
    const pagina = Math.max(1, parseInt(req.query.pagina, 10) || 1);
    const limite = Math.min(100, Math.max(1, parseInt(req.query.limite, 10) || 20));
    const offset = (pagina - 1) * limite;

    // Helpers para armar el CALL con el estilo del resto del sistema
    const q = (v) => v === null ? 'NULL' : `'${String(v).replace(/'/g, "''")}'`;
    const n = (v) => v === null ? 'NULL' : String(v);

    conectar(usuario, clave, (err, connection) => {
        if (err) return manejarError(err, res, 'conectar a la base de datos');

        const sqlCall = `CALL DBA.sp_reporte_auditoria(
            ${q(fechaDesde)}, ${q(fechaHasta)}, ${q(grupo)},
            ${q(usuarioFiltro)}, ${n(idReferencia)},
            ${offset}, ${limite})`;

        connection.query(sqlCall, (err, result) => {
            connection.disconnect();
            if (err) return manejarError(err, res, 'consultar auditoria');

            // COUNT(*) OVER () trae TOTAL como columna extra en cada fila.
            // Si no hay resultados, total = 0.
            const total = (result && result.length > 0) ? result[0].TOTAL : 0;

            // Sacamos TOTAL de cada fila antes de mandar al frontend
            const datos = (result || []).map(fila => {
                const { TOTAL, ...resto } = fila;
                return resto;
            });

            return res.json({ datos, total });
        });
    });
});

module.exports = router;
