const express = require('express');
const router = express.Router();
const Sybase = require('sybase');

// Ruta: POST /api/login
router.post('/', (req, res) => {
  const { usuario, clave } = req.body;

  // Crear nueva instancia de conexión
  const db = new Sybase('localhost', 2639, 'labcontrol', usuario, clave);

  db.connect(err => {
    if (err) {
      console.error("❌ Error de conexión:", err);
      return res.status(401).json({ exito: false, mensaje: "Usuario o contraseña inválidos." });
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