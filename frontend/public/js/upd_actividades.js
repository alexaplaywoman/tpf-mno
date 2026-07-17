document.addEventListener('DOMContentLoaded', function () {

    const btnInicio = document.getElementById("inicio");

    if (btnInicio) {
        btnInicio.addEventListener("click", function (e) {
            e.preventDefault();
            window.location.href = "/list_actividades.html";
        });
    }

    const form = document.getElementById('update-actividad-form');
    const errorMessage = document.getElementById('error-message');
    const selectPrioridad = document.getElementById('prioridad');

    const actividadId = new URLSearchParams(window.location.search).get('id');

    if (!actividadId) {
        errorMessage.textContent = "Falta el ID de la actividad en la URL.";
        return;
    }

    const usuario = sessionStorage.getItem('usuario');
    const clave = sessionStorage.getItem('clave');

    if (!usuario || !clave) {
        errorMessage.textContent = "Faltan credenciales.";
        return;
    }

    // ==================================
    // CARGAR PRIORIDADES EN EL SELECT
    // ==================================
    function cargarPrioridades() {

        return fetch(`/api/actividades/prioridades/listar?usuario=${encodeURIComponent(usuario)}&clave=${encodeURIComponent(clave)}`)
            .then(async response => {

                const data = await response.json();

                if (!response.ok) {
                    throw new Error(data.error || "Error al cargar prioridades");
                }

                let prioridades = data;

                if (!Array.isArray(prioridades)) {
                    prioridades = data.prioridades || data.rows || [];
                }

                selectPrioridad.innerHTML = `
                    <option value="">
                        Seleccione una Prioridad
                    </option>
                `;

                prioridades.forEach(prioridad => {
                    const option = document.createElement("option");
                    option.value = prioridad.ID_PRIORIDAD;
                    option.textContent = prioridad.NOMBRE;
                    selectPrioridad.appendChild(option);
                });

            })
            .catch(error => {
                console.error(error);
                errorMessage.textContent = "No se pudieron cargar las prioridades.";
            });

    }

    // ==================================
    // CARGAR DATOS DE LA ACTIVIDAD
    // ==================================
    function cargarActividad() {

        return fetch(`/api/actividades/${actividadId}?usuario=${encodeURIComponent(usuario)}&clave=${encodeURIComponent(clave)}`)
            .then(async response => {

                const data = await response.json().catch(() => null);

                if (!response.ok || !data || data.success === false) {
                    throw new Error(
                        data?.error ||
                        "No se encontró la actividad."
                    );
                }

                const actividad = data.tipo_actividad;

                selectPrioridad.value = actividad.ID_PRIORIDAD ?? "";

                document.getElementById("nombre").value = actividad.NOMBRE ?? "";
                document.getElementById("prioridad_numero").value = actividad.NIVEL_PRIORIDAD ?? "";
                document.getElementById("duracionMaxHoras").value = actividad.DURACION_MAX_HORAS ?? "";

            })
            .catch(error => {
                console.error(error);
                errorMessage.textContent = error.message;
            });

    }

    // Primero las prioridades, después la actividad (para que el select
    // ya tenga las opciones y pueda marcar la prioridad correcta).
    cargarPrioridades().then(cargarActividad);

    // ==================================
    // ACTUALIZAR ACTIVIDAD
    // ==================================
    form.addEventListener("submit", function (event) {

        event.preventDefault();

        errorMessage.textContent = "";

        const actividadesData = {

            usuario,
            clave,

            nombre: document.getElementById("nombre").value,

            prioridad: document.getElementById("prioridad_numero").value,

            id_prioridad: selectPrioridad.value,

            duracion_max_horas: document.getElementById("duracionMaxHoras").value

        };

        fetch(`/api/actividades/update/${actividadId}`, {

            method: "POST",

            headers: {
                "Content-Type": "application/json"
            },

            body: JSON.stringify(actividadesData)

        })
            .then(async response => {

                const data = await response.json().catch(() => null);

                if (!response.ok || !data || data.success === false) {
                    throw new Error(
                        data?.error ||
                        "Error al actualizar actividad."
                    );
                }

                window.location.href = "/list_actividades.html";

            })
            .catch(error => {
                console.error(error);
                errorMessage.textContent = error.message;
            });

    });

});