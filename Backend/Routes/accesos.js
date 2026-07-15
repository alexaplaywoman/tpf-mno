const express = require('express');
const router = express.Router();
const Sybase = require('sybase');

// Ruta: POST /api/accesos
router.post('/', (req, res) => {
  const { usuario, clave } = req.body;

  // Crear nueva instancia de conexión
  const db = new Sybase('localhost', 2639, 'labcontrol', usuario, clave);

  db.connect(err => {
    if (err) {
      console.error("❌ Error de conexión:", err);
      return res.status(401).json({ exito: false, mensaje: "Usuario o contraseña inválidos." });
    }

    // Si se conecta correctamente, desconectar
    db.disconnect();

    // Determinar si el usuario es administrador
    // (por ahora, comparamos directamente contra el nombre de usuario 'admin',
    // que es el único que pertenece al grupo ADMINISTRADORES según el script SQL)
    const esAdmin = usuario.toLowerCase() === 'admin';

    return res.json({ exito: true, esAdmin: esAdmin });
  });
});

module.exports = router;