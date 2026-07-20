const express = require('express');
const ical = require('node-ical');
const router = express.Router();

const URL_FERIADOS_PY =
    'https://calendar.google.com/calendar/ical/es.py%23holiday%40group.v.calendar.google.com/public/basic.ics';

let cache = null;
let cacheFecha = null;

async function obtenerFeriados() {
    const hoy = new Date().toDateString();

    // Reusa el cache si ya se trajo hoy
    if (cache && cacheFecha === hoy) return cache;

    const eventos = await ical.async.fromURL(URL_FERIADOS_PY);

    const feriados = Object.values(eventos)
        .filter(ev => ev.type === 'VEVENT')
        .map(ev => ({
            FECHA: ev.start.toISOString().split('T')[0],
            DESCRIPCION: ev.summary
        }));

    cache = feriados;
    cacheFecha = hoy;
    return feriados;
}

// GET /api/feriados
router.get('/', async (req, res) => {
    const { usuario, clave } = req.query;
    if (!usuario || !clave)
        return res.status(400).json({ success: false, error: 'Faltan credenciales.' });

    try {
        const feriados = await obtenerFeriados();
        return res.json(feriados);
    } catch (err) {
        console.error('Error al traer feriados de Google:', err);
        // Si falla (sin internet, feed caido), devolvemos vacio en vez de
        // romper el calendario entero.
        return res.json([]);
    }
});

module.exports = router;
