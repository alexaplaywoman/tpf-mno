// app.js - Configuración inicial del servidor
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const express = require('express');

const app = express();
const PORT = 4000;

// Middleware para analizar datos en formato JSON
app.use(express.json());

// Hacer accesible Bootstrap desde node_modules
app.use('/bootstrap', express.static(path.join(__dirname, 'node_modules/bootstrap/dist')));

// Servir archivos estáticos desde la carpeta frontend/public
app.use(express.static(path.join(__dirname, 'frontend/public')));

// Página principal (login.html)
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'frontend/public/login_administrador.html'));
});

// Páginas del sistema para que en el url se escriba un valor y lo busque en el sitema
app.get('/menú_administrador', (req, res) => {
    res.sendFile(path.join(__dirname, 'frontend/public/menú_administrador.html'));
});

app.get('/laboratorios_administrador', (req, res) => {
    res.sendFile(path.join(__dirname, 'frontend/public/laboratorios_administrador.html'));
});

app.get('/list_laboratorios', (req, res) => {
    res.sendFile(path.join(__dirname, 'frontend/public/list_laboratorios.html'));
});

app.get('/add_laboratorios', (req, res) => {
    res.sendFile(path.join(__dirname, 'frontend/public/add_laboratorios.html'));
});

app.get('/upd_laboratorios', (req, res) => {
    res.sendFile(path.join(__dirname, 'frontend/public/upd_laboratorios.html'));
});

app.get('/list_solicitantes', (req, res) => {
    res.sendFile(path.join(__dirname, 'frontend/public/list_solicitantes.html'));
});

app.get('/add_solicitantes', (req, res) => {
    res.sendFile(path.join(__dirname, 'frontend/public/add_solicitantes.html'));
});

app.get('/upd_solicitantes', (req, res) => {
    res.sendFile(path.join(__dirname, 'frontend/public/upd_solicitantes.html'));
});

app.get('/list_reservas', (req, res) => {
    res.sendFile(path.join(__dirname, 'frontend/public/list_reservas.html'));
});

app.get('/add_reservas', (req, res) => {
    res.sendFile(path.join(__dirname, 'frontend/public/add_reservas.html'));
});

app.get('/upd_reservas', (req, res) => {
    res.sendFile(path.join(__dirname, 'frontend/public/upd_reservas.html'));
});

app.get('/list_mantenimientos', (req, res) => {
    res.sendFile(path.join(__dirname, 'frontend/public/list_mantenimientos.html'));
});

app.get('/add_mantenimientos', (req, res) => {
    res.sendFile(path.join(__dirname, 'frontend/public/add_mantenimientos.html'));
});

app.get('/uod_mantenimientos', (req, res) => {
    res.sendFile(path.join(__dirname, 'frontend/public/upd_mantenimientos.html'));
});

app.get('/list_actividades', (req, res) => {
    res.sendFile(path.join(__dirname, 'frontend/public/list_actividades.html'));
});

app.get('/add_actividades', (req, res) => {
    res.sendFile(path.join(__dirname, 'frontend/public/add_actividades.html'));
});

app.get('/upd_mantenimientos', (req, res) => {
    res.sendFile(path.join(__dirname, 'frontend/public/upd_actividades.html'));
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
