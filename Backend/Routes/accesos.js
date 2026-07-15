const express = require('express');
const router = express.Router();
const { conectar } = require('./conexion');   // misma carpeta: Backend/Routes/conexion.js

// Ruta: POST /api/login
router.post('/', (req, res) => {
  const { usuario, clave } = req.body;

<<<<<<< HEAD
  if (!usuario || !clave) {
    return res.status(400).json({ exito: false, mensaje: 'Faltan usuario o clave.' });
  }
=======
  // Crear nueva instancia de conexión
  const db = new Sybase('localhost', 2639, 'tpf_reservas', usuario, clave);
>>>>>>> 6d8136055d594a7f0273ba8e99b3313f54281ddb

  conectar(usuario, clave, (err, db) => {
    if (err) {
      // conectar ya loguea el error real con console.error internamente
      return res.status(401).json({ exito: false, mensaje: 'Usuario o contraseña inválidos.' });
    }

    db.query(
      `SELECT COUNT(*) AS es_admin FROM SYSGROUPS WHERE group_name = 'ADMINISTRADORES' AND member_name = '${usuario}'`,
      (err, result) => {
        db.disconnect();

        if (err) {
          console.error("❌ Error al verificar permisos:", err);
          return res.status(500).json({ exito: false, mensaje: "Error al verificar permisos." });
        }

        const esAdmin = !!(result[0] && result[0].es_admin);
        return res.json({ exito: true, esAdmin });
      }
    );
  });
});

module.exports = router;