const express = require('express');
const { conectar, manejarError } = require('./conexion');
const router = express.Router();


function verificarAdmin(connection, usuario, callback) {
    connection.query(
        `SELECT COUNT(*) AS es_admin
         FROM SYSGROUPS
         WHERE group_name = 'ADMINISTRADORES' AND member_name = '${usuario}'`,
        (err, permiso) => {
            if (err) return callback(err, false);
            callback(null, !!(permiso[0] && permiso[0].es_admin));
        }
    );
}

// El texto libre de SOLICITANTES.DEPARTAMENTO no siempre coincide letra por
// letra con DEPARTAMENTOS.NOMBRE (tildes, mayusculas: "Analisis" vs
// "Análisis"). Hacer esa comparacion con UPPER/REPLACE del lado de SQL
// Anywhere corrompe el texto (problema de codificacion del driver con
// caracteres acentuados), asi que la resolvemos en JS, que maneja
// Unicode sin problemas.
function normalizarTexto(texto) {
    return String(texto || '')
        .normalize('NFD')
        .replace(/[̀-ͯ]/g, '') // saca los acentos
        .toUpperCase()
        .trim();
}

// Completa el campo "carrera" de cada solicitante buscando su DEPARTAMENTO
// (texto libre) entre los departamentos conocidos, cuando no vino ya
// resuelta por ID_CARRERA.
function completarCarrerasPorDepartamento(connection, solicitantes, callback) {
    const faltantes = solicitantes.filter(s => !s.carrera && s.DEPARTAMENTO);
    if (faltantes.length === 0) return callback(solicitantes);

    connection.query(
        `SELECT d.NOMBRE AS departamento, c.NOMBRE AS carrera
         FROM DBA.DEPARTAMENTOS d
         JOIN DBA.CARRERAS c ON c.ID_DEPARTAMENTO = d.ID_DEPARTAMENTO`,
        (err, filas) => {
            if (err || !filas) return callback(solicitantes);

            const mapa = new Map();
            filas.forEach(f => mapa.set(normalizarTexto(f.departamento), f.carrera));

            solicitantes.forEach(s => {
                if (!s.carrera && s.DEPARTAMENTO) {
                    s.carrera = mapa.get(normalizarTexto(s.DEPARTAMENTO)) || s.carrera;
                }
            });

            callback(solicitantes);
        }
    );
}

router.get('/', (req, res) => {
    const { usuario, clave } = req.query;
    if (!usuario || !clave)
        return res.status(400).json({ success: false, error: 'Faltan credenciales.' });

    conectar(usuario, clave, (err, connection) => {
        if (err) return res.status(500).json({ success: false, error: 'Error de conexión.' });

        const sql = `
            SELECT s.CEDULA_IDENTIDAD, s.CORREO, s.NOMBRE, s.APELLIDO, s.TELEFONO,
                   s.DEPARTAMENTO, s.ID_CARRERA, s.ID_SOLICITANTE, s.TIPO_DOCUMENTO,
                   c.NOMBRE AS carrera,
                   ts.TIPO_SOLICITANTE AS tipo_solicitante,
                   td.NOMBRE AS tipo_documento
            FROM DBA.SOLICITANTES s
            LEFT JOIN DBA.CARRERAS c ON s.ID_CARRERA = c.ID_CARRERA
            LEFT JOIN DBA.TIPOS_SOLICITANTES ts ON s.ID_SOLICITANTE = ts.ID_SOLICITANTE
            LEFT JOIN DBA.TIPOS_DOCUMENTOS td ON s.TIPO_DOCUMENTO = td.TIPO_DOCUMENTO
            ORDER BY s.APELLIDO, s.NOMBRE
        `;

        connection.query(sql, (err, result) => {
            if (err) { connection.disconnect(); return manejarError(err, res, 'consultar solicitantes'); }
            completarCarrerasPorDepartamento(connection, result, (resultCompletado) => {
                connection.disconnect();
                return res.json(resultCompletado);
            });
        });
    });
});

router.get('/carreras/listar', (req, res) => {
    const { usuario, clave } = req.query;
    if (!usuario || !clave)
        return res.status(400).json({ success: false, error: 'Faltan credenciales.' });

    conectar(usuario, clave, (err, connection) => {
        if (err) return res.status(500).json({ success: false, error: 'Error de conexión.' });

        connection.query(
            'SELECT ID_CARRERA, NOMBRE FROM DBA.CARRERAS ORDER BY NOMBRE',
            (err, result) => {
                connection.disconnect();
                if (err) return manejarError(err, res, 'consultar carreras');
                return res.json(result);
            }
        );
    });
});

router.get('/tipos-solicitantes/listar', (req, res) => {
    const { usuario, clave } = req.query;
    if (!usuario || !clave)
        return res.status(400).json({ success: false, error: 'Faltan credenciales.' });

    conectar(usuario, clave, (err, connection) => {
        if (err) return res.status(500).json({ success: false, error: 'Error de conexión.' });

        connection.query(
            'SELECT ID_SOLICITANTE, TIPO_SOLICITANTE FROM DBA.TIPOS_SOLICITANTES ORDER BY TIPO_SOLICITANTE',
            (err, result) => {
                connection.disconnect();
                if (err) return manejarError(err, res, 'consultar tipos de solicitante');
                return res.json(result);
            }
        );
    });
});

router.get('/tipos-documentos/listar', (req, res) => {
    const { usuario, clave } = req.query;
    if (!usuario || !clave)
        return res.status(400).json({ success: false, error: 'Faltan credenciales.' });

    conectar(usuario, clave, (err, connection) => {
        if (err) return res.status(500).json({ success: false, error: 'Error de conexión.' });

        connection.query(
            'SELECT TIPO_DOCUMENTO, NOMBRE FROM DBA.TIPOS_DOCUMENTOS ORDER BY NOMBRE',
            (err, result) => {
                connection.disconnect();
                if (err) return manejarError(err, res, 'consultar tipos de documento');
                return res.json(result);
            }
        );
    });
});

router.get('/:cedula', (req, res) => {
    const { cedula } = req.params;
    const { usuario, clave } = req.query;
    if (!usuario || !clave)
        return res.status(400).json({ success: false, error: 'Faltan credenciales.' });

    conectar(usuario, clave, (err, connection) => {
        if (err) return res.status(500).json({ success: false, error: 'Error de conexión.' });

        const sql = `
            SELECT s.CEDULA_IDENTIDAD, s.CORREO, s.NOMBRE, s.APELLIDO, s.TELEFONO,
                   s.DEPARTAMENTO, s.ID_CARRERA, s.ID_SOLICITANTE, s.TIPO_DOCUMENTO,
                   c.NOMBRE AS carrera,
                   ts.TIPO_SOLICITANTE AS tipo_solicitante,
                   td.NOMBRE AS tipo_documento
            FROM DBA.SOLICITANTES s
            LEFT JOIN DBA.CARRERAS c ON s.ID_CARRERA = c.ID_CARRERA
            LEFT JOIN DBA.TIPOS_SOLICITANTES ts ON s.ID_SOLICITANTE = ts.ID_SOLICITANTE
            LEFT JOIN DBA.TIPOS_DOCUMENTOS td ON s.TIPO_DOCUMENTO = td.TIPO_DOCUMENTO
            WHERE s.CEDULA_IDENTIDAD = ${cedula}
        `;

        connection.query(sql, (err, result) => {
            if (err) { connection.disconnect(); return manejarError(err, res, 'consultar solicitante'); }
            if (result.length === 0) { connection.disconnect(); return res.json({ success: false, error: 'Solicitante no encontrado.' }); }
            completarCarrerasPorDepartamento(connection, result, (resultCompletado) => {
                connection.disconnect();
                return res.json({ success: true, solicitante: resultCompletado[0] });
            });
        });
    });
});

router.post('/add', (req, res) => {
    const {
        cedula_identidad, correo, id_carrera, id_solicitante, tipo_documento,
        nombre, apellido, telefono, departamento, usuario, clave
    } = req.body;

    if (!usuario || !clave || !cedula_identidad || !correo || !nombre || !apellido)
        return res.status(400).json({ success: false, error: 'Faltan datos obligatorios.' });

    conectar(usuario, clave, (err, connection) => {
        if (err) return res.status(500).json({ success: false, error: 'Error de conexión.' });

        const sql = `
            INSERT INTO DBA.SOLICITANTES
                (CEDULA_IDENTIDAD, CORREO, ID_CARRERA, ID_SOLICITANTE, TIPO_DOCUMENTO,
                 NOMBRE, APELLIDO, TELEFONO, DEPARTAMENTO)
            VALUES
                (${cedula_identidad}, '${correo}', ${id_carrera || 'NULL'}, ${id_solicitante || 'NULL'},
                 ${tipo_documento || 'NULL'}, '${nombre}', '${apellido}', '${telefono}', '${departamento}')
        `;

        connection.query(sql, (err) => {
            connection.disconnect();
            if (err) return manejarError(err, res, 'agregar solicitante');
            return res.json({ success: true });
        });
    });
});

router.post('/update/:cedula', (req, res) => {
    const { cedula } = req.params;
    const {
        correo, id_carrera, id_solicitante, tipo_documento,
        nombre, apellido, telefono, departamento, usuario, clave
    } = req.body;

    if (!usuario || !clave || !correo || !nombre || !apellido)
        return res.status(400).json({ success: false, error: 'Faltan datos obligatorios.' });

    conectar(usuario, clave, (err, connection) => {
        if (err) return res.status(500).json({ success: false, error: 'Error de conexión.' });

        const sql = `
            UPDATE DBA.SOLICITANTES
            SET ID_CARRERA     = ${id_carrera || 'NULL'},
                ID_SOLICITANTE = ${id_solicitante || 'NULL'},
                TIPO_DOCUMENTO = ${tipo_documento || 'NULL'},
                NOMBRE         = '${nombre}',
                APELLIDO       = '${apellido}',
                TELEFONO       = '${telefono}',
                DEPARTAMENTO   = '${departamento}'
            WHERE CEDULA_IDENTIDAD = ${cedula}
        `;

        connection.query(sql, (err) => {
            connection.disconnect();
            if (err) return manejarError(err, res, 'actualizar solicitante');
            return res.json({ success: true });
        });
    });
});

router.delete('/delete/:cedula', (req, res) => {
    const { cedula } = req.params;
    const { usuario, clave } = req.query;
    if (!usuario || !clave)
        return res.status(400).json({ success: false, error: 'Faltan credenciales.' });

    conectar(usuario, clave, (err, connection) => {
        if (err) return manejarError(err, res, 'conectar para eliminar solicitante');

        verificarAdmin(connection, usuario, (err, esAdmin) => {
            if (err) {
                connection.disconnect();
                return manejarError(err, res, 'verificar permisos de administrador');
            }
            if (!esAdmin) {
                connection.disconnect();
                return res.status(403).json({ success: false, error: 'Solo un usuario administrativo puede eliminar un solicitante.' });
            }

            connection.query(
                `DELETE FROM DBA.SOLICITANTES WHERE CEDULA_IDENTIDAD = ${cedula}`,
                (err) => {
                    connection.disconnect();
                    if (err) {
                        if (err.message && err.message.includes('referenced by foreign key')) {
                            return res.status(409).json({
                                success: false,
                                error: 'No se puede eliminar el solicitante porque tiene reservas asociadas.'
                            });
                        }
                        return manejarError(err, res, 'eliminar solicitante');
                    }
                    return res.json({ success: true });
                }
            );
        });
    });
});

module.exports = router;