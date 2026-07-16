//En archivos separados, todas van a poder hacer el mismo require('../db/conexion') y 
// compartir la misma función — así si en algún momento 
//cambia el puerto, el nombre de la base, o querés 
// loguear algo más, lo tocás en un solo lugar.conexion.js
const Sybase = require('sybase');

function conectar(usuario, clave, callback) {
    const connection = new Sybase('localhost', 2639, 'labcontrol', usuario, clave);

    connection.connect((err) => {
        if (err) {
            console.error('Error de conexión Sybase:', err);
            return callback(err, null);
        }
        callback(null, connection);
    });
}

module.exports = { conectar };