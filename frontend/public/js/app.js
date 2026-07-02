const express = require('express');
const path = require('path');

const app = express();
const PORT = 3000;

// Middleware para analizar datos en formato JSON
app.use(express.json());

// Hacer accesible Bootstrap desde node_modules
app.use('/bootstrap', express.static(path.join(__dirname, 'node_modules/bootstrap/dist')));


// Sirve archivos estáticos desde la carpeta public
app.use(express.static(path.join(__dirname, 'frontend/public')));

// Ruta principal para mostrar la página de conexión
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'frontend/public/login.html'));
});

// Inicia el servidor
app.listen(PORT, () => {
    console.log(`Servidor iniciado en http://localhost:${PORT}`);
});