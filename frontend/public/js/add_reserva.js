document.addEventListener("DOMContentLoaded", function () {

    const btnInicio = document.getElementById("inicio");
    const form = document.getElementById("add-recurso-form");
    const errorMessage = document.getElementById("error-message");
    const selectLaboratorio = document.getElementById("laboratorio");
    const selectEstadoReserva = document.getElementById("estadoReserva");
    const selectTipoActividad = document.getElementById("tipoActividad");

    const usuario = sessionStorage.getItem("usuario");
    const clave = sessionStorage.getItem("clave");

    if (btnInicio) {
        btnInicio.addEventListener("click", function (e) {
            e.preventDefault();
            window.location.href = "/list_reservas.html";
        });
    }

    if (!usuario || !clave) {
        errorMessage.textContent = "Faltan las credenciales del usuario.";
        return;
    }

    // =====================================
    // CARGAR LABORATORIOS EN EL SELECT
    // =====================================

    function cargarLaboratorios() {

        fetch(`/api/laboratorios?usuario=${encodeURIComponent(usuario)}&clave=${encodeURIComponent(clave)}`)
            .then(async response => {

                const data = await response.json();

                if (!response.ok) {
                    throw new Error(data.error || "Error al cargar laboratorios");
                }

                let laboratorios = data;

                if (!Array.isArray(laboratorios)) {
                    laboratorios = data.laboratorios || data.rows || [];
                }

                selectLaboratorio.innerHTML = `
                    <option value="">
                        Seleccione un laboratorio
                    </option>
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

    cargarLaboratorios();


    
    function cargarTipoActividad() {

        fetch(`/api/tipoActividades?usuario=${encodeURIComponent(usuario)}&clave=${encodeURIComponent(clave)}`)
            .then(async response => {

                const data = await response.json();

                if (!response.ok) {
                    throw new Error(data.error || "Error al cargar tipos actividades");
                }

                let tipoActividad = data;

                if (!Array.isArray(tipoActividad)) {
                    tipoActividad = data.tipoActividad || data.rows || [];
                }

                selectTipoActividad.innerHTML = `
                    <option value="">
                        Seleccione un tipo de actividad
                    </option>
                `;

                tipoActividad.forEach(tip => {
                    const option = document.createElement("option");
                    option.value = tip.ID_TIPO_ACTIVIDAD;
                    option.textContent = `Tipo Actividad ${tip.NOMBRE}`;
                    selectTipoActividad.appendChild(option);
                });

            })
            .catch(error => {
                console.error(error);
                errorMessage.textContent = "No se pudieron cargar los tipos de actividad.";
            });

    }

    cargarTipoActividad();

    // =====================================
    // AGREGAR RECURSO
    // =====================================

    form.addEventListener("submit", function (e) {

        e.preventDefault();

        errorMessage.textContent = "";

        const reservaData = {

            usuario,
            clave,

            numero_laboratorio: selectLaboratorio.value,

            cedula: document.getElementById("cedulaIdentidad").value,

            correo: document.getElementById("correo").value,

            estado_reserva: selectEstadoReserva.value,

            numero_laboratorio: selectLaboratorio.value,

            fecha_a_reservar: document.getElementById("fechaAReservar").value,

            hora_inicio: document.getElementById("horaInicio").value,

            hora_fin: document.getElementById("horaFin").value,

            cantidad_alumnos: document.getElementById("cantidadAlumnos").value,

            fecha_solicitud: document.getElementById("fechaSolicitud").value,

            motivo_cancelacion: document.getElementById("motivoCancelacion").value,

            usuario_cancelacion: document.getElementById("usuarioCancelacion").value

        };

        fetch("/api/reservas/add", {

            method: "POST",

            headers: {
                "Content-Type": "application/json"
            },

            body: JSON.stringify(reservaData)

        })
            .then(async response => {

                const data = await response.json();

                if (!response.ok || data.success === false) {
                    throw new Error(data.error || "Error al agregar reserva");
                }

                window.location.href = "/list_reservas.html";

            })
            .catch(error => {
                console.error(error);
                errorMessage.textContent = error.message;
            });

    });

});
