//En archivos separados, todas van a poder hacer el mismo require('../db/conexion') y 
// compartir la misma función — así si en algún momento 
//cambia el puerto, el nombre de la base, o querés 
// loguear algo más, lo tocás en un solo lugar.conexion.js
const Sybase = require('sybase');

function conectar(usuario, clave, callback) {
<<<<<<< HEAD
    const connection = new Sybase('localhost', 2639, 'tpf_reservas', usuario, clave);
=======
    const connection = new Sybase('localhost', 2638, 'tpf_reservas', usuario, clave);
>>>>>>> dcaf5874e0e00f84e19175ded03905fc76363786
    connection.connect((err) => {
        if (err) {
            console.error('Error de conexión Sybase:', err);
            return callback(err, null);
        }
        callback(null, connection);
    });
}

module.exports = { conectar };