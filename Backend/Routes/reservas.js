const express = require('express');
const Sybase = require('sybase');
const router = express.Router();

function getConnection(usuario, clave) {
    return new Sybase('localhost', 2638, 'labcontrol', usuario, clave);
}

const manejarError = (err, res, action) => {
    let errorMessage;
    if (err && typeof err === 'object') {
        errorMessage = err.message || JSON.stringify(err);
    } else {
        errorMessage = String(err || 'Error de Base de Datos Desconocido');
    }
    console.error(`Error al ${action}:`, err);
    return res.status(500).json({
        success: false,
        error: `Error de base de datos al ${action}: ${errorMessage}`
    });
};

router.get('/', (req, res) => {
    const { usuario, clave } = req.query;
    if (!usuario || !clave)
        return res.status(400).json({ success: false, error: 'Faltan credenciales.' });

    const connection = getConnection(usuario, clave);

    connection.connect((err) => {
        if (err) return res.status(500).json({ success: false, error: 'Error de conexión.' });

        const sql = `
            SELECT r.*, l.EDIFICIO, s.NOMBRE, s.APELLIDO, ta.NOMBRE AS tipo_actividad
            FROM RESERVAS r
            JOIN LABORATORIOS l ON r.NUMERO_LABORATORIO = l.NUMERO_LABORATORIO
            JOIN SOLICITANTES s ON r.CEDULA_IDENTIDAD = s.CEDULA_IDENTIDAD AND r.CORREO = s.CORREO
            JOIN TIPO_ACTIVIDAD ta ON r.ID_TIPO_ACTIVIDAD = ta.ID_TIPO_ACTIVIDAD
            ORDER BY r.FECHA_A_RESERVAR, r.HORA_INICIO
        `;

        connection.query(sql, (err, result) => {
            connection.disconnect();
            if (err) return manejarError(err, res, 'consultar reservas');
            return res.json(result);
        });
    });
});

router.get('/:id', (req, res) => {
    const { id } = req.params;
    const { usuario, clave } = req.query;
    if (!usuario || !clave)
        return res.status(400).json({ success: false, error: 'Faltan credenciales.' });

    const connection = getConnection(usuario, clave);

    connection.connect((err) => {
        if (err) return res.status(500).json({ success: false, error: 'Error de conexión.' });

        connection.query(
            `SELECT * FROM RESERVAS WHERE ID_RESERVA = ${id}`,
            (err, result) => {
                connection.disconnect();
                if (err) return manejarError(err, res, 'consultar reserva');
                if (result.length > 0) return res.json({ success: true, reserva: result[0] });
                return res.json({ success: false, error: 'Reserva no encontrada.' });
            }
        );
    });
});

router.post('/add', (req, res) => {
    const {
        numero_laboratorio, cedula_identidad, correo,
        id_estado_reserva, id_tipo_actividad,
        fecha_a_reservar, hora_inicio, hora_fin,
        cantidad_alumnos, usuario, clave
    } = req.body;

    if (!usuario || !clave || !numero_laboratorio || !cedula_identidad ||
        !correo || !fecha_a_reservar || !hora_inicio || !hora_fin || !cantidad_alumnos)
        return res.status(400).json({ success: false, error: 'Faltan datos obligatorios.' });

    const diaSemana = new Date(fecha_a_reservar).getDay();
    if (diaSemana === 0 || diaSemana === 6)
        return res.status(400).json({ success: false, error: 'No se puede reservar los fines de semana.' });

    const connection = getConnection(usuario, clave);

    connection.connect((err) => {
        if (err) return res.status(500).json({ success: false, error: 'Error de conexión.' });

        const sqlSolapamiento = `
            SELECT ID_RESERVA FROM RESERVAS
            WHERE NUMERO_LABORATORIO = ${numero_laboratorio}
              AND FECHA_A_RESERVAR = '${fecha_a_reservar}'
              AND ID_ESTADO_RESERVA != 3
              AND HORA_INICIO < '${hora_fin}'
              AND HORA_FIN > '${hora_inicio}'
        `;

        connection.query(sqlSolapamiento, (err, solapados) => {
            if (err) {
                connection.disconnect();
                return manejarError(err, res, 'verificar solapamiento');
            }

            if (solapados.length > 0) {
                connection.disconnect();
                return res.status(409).json({ success: false, error: 'Ya existe una reserva en ese horario.' });
            }

            const sqlCapacidad = `
                SELECT CAPACIDAD_ALUMNOS FROM LABORATORIOS
                WHERE NUMERO_LABORATORIO = ${numero_laboratorio}
            `;

            connection.query(sqlCapacidad, (err, labs) => {
                if (err) {
                    connection.disconnect();
                    return manejarError(err, res, 'verificar capacidad');
                }

                if (labs.length === 0) {
                    connection.disconnect();
                    return res.status(404).json({ success: false, error: 'Laboratorio no encontrado.' });
                }

                if (cantidad_alumnos > labs[0].CAPACIDAD_ALUMNOS) {
                    connection.disconnect();
                    return res.status(400).json({
                        success: false,
                        error: `Cantidad de alumnos (${cantidad_alumnos}) supera la capacidad (${labs[0].CAPACIDAD_ALUMNOS}).`
                    });
                }
                const sql = `
                    INSERT INTO RESERVAS
                        (NUMERO_LABORATORIO, CEDULA_IDENTIDAD, CORREO, ID_ESTADO_RESERVA,
                         ID_TIPO_ACTIVIDAD, FECHA_A_RESERVAR, HORA_INICIO, HORA_FIN,
                         CANTIDAD_ALUMNOS, FECHA_SOLICITUD)
                    VALUES
                        (${numero_laboratorio}, ${cedula_identidad}, '${correo}', ${id_estado_reserva || 1},
                         ${id_tipo_actividad}, '${fecha_a_reservar}', '${hora_inicio}', '${hora_fin}',
                         ${cantidad_alumnos}, GETDATE())
                `;

                connection.query(sql, (err) => {
                    connection.disconnect();
                    if (err) return manejarError(err, res, 'crear reserva');
                    return res.json({ success: true });
                });
            });
        });
    });
});

router.post('/cancelar/:id', (req, res) => {
    const { id } = req.params;
    const { usuario, clave } = req.body;
    if (!usuario || !clave)
        return res.status(400).json({ success: false, error: 'Faltan credenciales.' });

    const connection = getConnection(usuario, clave);

    connection.connect((err) => {
        if (err) return res.status(500).json({ success: false, error: 'Error de conexión.' });

        connection.query(
            `UPDATE RESERVAS SET ID_ESTADO_RESERVA = 3 WHERE ID_RESERVA = ${id}`,
            (err) => {
                connection.disconnect();
                if (err) return manejarError(err, res, 'cancelar reserva');
                return res.json({ success: true });
            }
        );
    });
});

router.delete('/delete/:id', (req, res) => {
    const { id } = req.params;
    const { usuario, clave } = req.query;
    if (!usuario || !clave)
        return res.status(400).json({ success: false, error: 'Faltan credenciales.' });

    const connection = getConnection(usuario, clave);

    connection.connect((err) => {
        if (err) return manejarError(err, res, 'conectar para eliminar reserva');

        connection.query(
            `DELETE FROM RESERVAS WHERE ID_RESERVA = ${id}`,
            (err) => {
                connection.disconnect();
                if (err) return manejarError(err, res, 'eliminar reserva');
                return res.json({ success: true });
            }
        );
    });
});

module.exports = router;