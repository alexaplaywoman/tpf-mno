document.addEventListener('DOMContentLoaded', function () {

    const btnInicio = document.getElementById("inicio");

    if (btnInicio) {
        btnInicio.addEventListener("click", function (e) {
            e.preventDefault();
            window.location.href = "/list_reservas.html";
        });
    }

    const form = document.getElementById('update-reserva-form');
    const errorMessage = document.getElementById('error-message');
    const selectLaboratorio = document.getElementById('laboratorio');

    const id = new URLSearchParams(window.location.search).get('id');

    if (!id) {
        errorMessage.textContent = "Falta el ID de la reserva en la URL.";
        return;
    }

    const usuario = sessionStorage.getItem('usuario');
    const clave = sessionStorage.getItem('clave');

    if (!usuario || !clave) {
        errorMessage.textContent = "Faltan credenciales.";
        return;
    }

    // ==================================
    // CARGAR LABORATORIOS EN EL SELECT
    // ==================================
    function cargarLaboratorios() {

        return fetch(`/api/laboratorios?usuario=${encodeURIComponent(usuario)}&clave=${encodeURIComponent(clave)}`)
            .then(res => res.json())
            .then(laboratorios => {

                selectLaboratorio.innerHTML = `
                    <option value="">Seleccione un laboratorio</option>
                `;

                laboratorios.forEach(lab => {
                    const option = document.createElement("option");
                    option.value = lab.NUMERO_LABORATORIO;
                    option.textContent = `Laboratorio ${lab.NUMERO_LABORATORIO} - ${lab.EDIFICIO}`;
                    selectLaboratorio.appendChild(option);
                });

            })
            .catch(error => {
                console.error(error);
                errorMessage.textContent = "No se pudieron cargar los laboratorios.";
            });

    }

    // ==================================
    // CARGAR DATOS DE LA RESERVA
    // ==================================
    function cargarReserva() {

        return fetch(`/api/reservas/${id}?usuario=${encodeURIComponent(usuario)}&clave=${encodeURIComponent(clave)}`)
            .then(async response => {

                const data = await response.json().catch(() => null);

                if (!response.ok || !data || data.success === false) {
                    throw new Error(
                        data?.error ||
                        "No se encontró la reserva."
                    );
                }

                const reserva = data.reserva;

                selectLaboratorio.value = reserva.NUMERO_LABORATORIO ?? "";

                // FECHA_A_RESERVAR puede venir con la hora pegada (ISO),
                // el input date solo quiere la parte YYYY-MM-DD.
                document.getElementById("fecha").value =
                    String(reserva.FECHA_A_RESERVAR).split('T')[0];

                // HORA_INICIO/HORA_FIN pueden venir con segundos (HH:MM:SS),
                // el input time solo quiere HH:MM.
                document.getElementById("horaInicio").value =
                    String(reserva.HORA_INICIO).slice(0, 5);

                document.getElementById("horaFin").value =
                    String(reserva.HORA_FIN).slice(0, 5);

            })
            .catch(error => {
                console.error(error);
                errorMessage.textContent = error.message;
            });

    }

    // Primero los laboratorios, después la reserva (para que el select
    // ya tenga las opciones y pueda marcar el laboratorio correcto).
    cargarLaboratorios().then(cargarReserva);

    // ==================================
    // REPROGRAMAR RESERVA
    // ==================================
    form.addEventListener("submit", function (event) {

        event.preventDefault();

        errorMessage.textContent = "";

        const datos = {

            usuario,
            clave,

            numero_laboratorio: selectLaboratorio.value,

            fecha_a_reservar: document.getElementById("fecha").value,

            hora_inicio: document.getElementById("horaInicio").value,

            hora_fin: document.getElementById("horaFin").value

        };

        fetch(`/api/reservas/reprogramar/${id}`, {

            method: "POST",

            headers: {
                "Content-Type": "application/json"
            },

            body: JSON.stringify(datos)

        })
            .then(async response => {

                const data = await response.json().catch(() => null);

                if (!response.ok || !data || data.success === false) {
                    throw new Error(
                        data?.error ||
                        "Error al reprogramar la reserva."
                    );
                }

                window.location.href = "/list_reservas.html";

            })
            .catch(error => {
                console.error(error);
                errorMessage.textContent = error.message;
            });

    });

});
