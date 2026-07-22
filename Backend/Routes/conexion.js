const Sybase = require('sybase');

// Cache de conexiones activas: una por combinacion usuario+clave.
// La primera peticion de cada usuario abre la conexion; las siguientes
// reusan la misma. Cada conexion tiene su propia cola de queries para
// serializar (el driver 'sybase' no soporta queries paralelos).
const conexiones = new Map();  // key: "usuario|clave"  ->  { connection, cola }

function obtenerOAbrirConexion(usuario, clave, callback) {
    const key = `${usuario}|${clave}`;
    const cached = conexiones.get(key);

    if (cached && cached.connection) {
        return callback(null, cached);
    }

    const connection = new Sybase('localhost', 2639, 'tpf_reservas', usuario, clave);
    connection.connect((err) => {
        if (err) {
            console.error(`Error de conexion Sybase para ${usuario}:`, err.message || err);
            return callback(err, null);
        }
        console.log(`[conexion] abierta para usuario="${usuario}"`);
        const entry = { connection, cola: Promise.resolve() };
        conexiones.set(key, entry);
        callback(null, entry);
    });
}

// Wrapper de la conexion que expone el metodo .query serializado por la cola
// del usuario, y un .disconnect() NO-OP (no cerramos entre requests).
function wrapConnection(entry) {
    return {
        query: function (sql, cb) {
            entry.cola = entry.cola.then(() => new Promise((resolve) => {
                entry.connection.query(sql, (err, result) => {
                    try { cb(err, result); } finally { resolve(); }
                });
            }));
        },
        // No-op: la conexion queda viva para reusar. La cerramos al bajar
        // el server (ver process.on abajo).
        disconnect: function () { }
    };
}

function conectar(usuario, clave, callback) {
    obtenerOAbrirConexion(usuario, clave, (err, entry) => {
        if (err) return callback(err, null);
        callback(null, wrapConnection(entry));
    });
}

// Cerrar TODAS las conexiones cuando el server baja (Ctrl+C).
function cerrarTodo() {
    console.log('[conexion] cerrando conexiones cacheadas...');
    for (const [key, entry] of conexiones.entries()) {
        try { entry.connection.disconnect(); } catch (e) { }
    }
    conexiones.clear();
    process.exit(0);
}
process.on('SIGINT',  cerrarTodo);
process.on('SIGTERM', cerrarTodo);

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