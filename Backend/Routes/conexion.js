//En archivos separados, todas van a poder hacer el mismo require('../db/conexion') y 
// compartir la misma función — así si en algún momento 
//cambia el puerto, el nombre de la base, o querés 
// loguear algo más, lo tocás en un solo lugar.conexion.js
const Sybase = require('sybase');

function conectar(usuario, clave, callback) {
    const connection = new Sybase('localhost', 2638, 'tpf_reservas', usuario, clave);
    connection.connect((err) => {
        if (err) {
            console.error('Error de conexión Sybase:', err);
            return callback(err, null);
        }
        callback(null, connection);
    });
}

module.exports = { conectar };

const manejarError = (err, res, action) => {
    let mensajeCrudo;
    if (err && typeof err === 'object') {
        mensajeCrudo = err.message || JSON.stringify(err);
    } else {
        mensajeCrudo = String(err || 'Error de Base de Datos Desconocido');
    }
    let mensajeUsuario = mensajeCrudo;
    const partes = mensajeCrudo.split('\n').map(s => s.trim()).filter(Boolean);
    if (partes.length > 0) mensajeUsuario = partes[partes.length - 1];
    mensajeUsuario = mensajeUsuario.replace(/^\[.*?\]\s*/g, '').trim();

    console.error(`Error al ${action}:`, err);
    return res.status(500).json({
        success: false,
        error: mensajeUsuario,
        contexto: action,
    });
};

module.exports = { conectar, manejarError };