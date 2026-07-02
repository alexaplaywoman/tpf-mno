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

    // Si se conecta correctamente, desconectar y retornar éxito
    db.disconnect();
    return res.json({ exito: true });
  });
});

module.exports = router;
