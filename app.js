// app.js - Configuración inicial del servidor
const express = require('express');
const path = require('path');

const app = express();
const PORT = 3000;

// Middleware para analizar datos en formato JSON
app.use(express.json());

// Hacer accesible Bootstrap desde node_modules
app.use('/bootstrap', express.static(path.join(__dirname, 'node_modules/bootstrap/dist')));

// Servir archivos estáticos desde la carpeta frontend/public
app.use(express.static(path.join(__dirname, 'frontend/public')));

// Página principal (login.html)
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'frontend/public/login.html'));
});

// Páginas del sistema para que en el url se escriba un valor y lo busque en el sitema
app.get('/menu', (req, res) => {
    res.sendFile(path.join(__dirname, 'frontend/public/menu.html'));
});

app.get('/edificio', (req, res) => {
    res.sendFile(path.join(__dirname, 'frontend/public/edificio.html'));
});

app.get('/evento', (req, res) => {
    res.sendFile(path.join(__dirname, 'frontend/public/evento.html'));
});

app.get('/laboratorios', (req, res) => {
    res.sendFile(path.join(__dirname, 'frontend/public/laboratorios.html'));
});

app.get('/confirmar', (req, res) => {
    res.sendFile(path.join(__dirname, 'frontend/public/confirmar.html'));
});

// Usar la ruta backend desde archivos separados

const accesosRoute = require('./Backend/Routes/accesos');
app.use('/api/accesos', accesosRoute);

const reservasRoute = require('./Backend/Routes/reservas');
app.use('/api/reservas', reservasRoute);

const laboratoriosRoute = require('./Backend/Routes/laboratorios');
app.use('/api/laboratorios', laboratoriosRoute);

const mantenimientosRoute = require('./Backend/Routes/mantenimientos');
app.use('/api/mantenimientos', mantenimientosRoute);

const solicitantesRoute = require('./Backend/Routes/solicitantes');
app.use('/api/solicitantes', solicitantesRoute);

const actividadesRoute = require('./Backend/Routes/actividades');
app.use('/api/actividades', actividadesRoute);

const reportesRoute = require('./Backend/Routes/reportes');
app.use('/api/reportes', reportesRoute);

const recursosRoute = require('./Backend/Routes/recursos');
app.use('/api/recursos', recursosRoute);

//const reservas_pruebasRoute = require('./Backend/Routes/reservas_pruebas');
//app.use('/api/reservas_pruebas', reservas_pruebasRoute);


// Iniciar servidor
app.listen(PORT, () => {
    console.log(`✅ Servidor iniciado en http://localhost:${PORT}`);
});
