document.addEventListener('DOMContentLoaded', function () {

    const btnInicio = document.getElementById("inicio");

    if (btnInicio) {
        btnInicio.addEventListener("click", function (e) {
            e.preventDefault();
            window.location.href = "/list_mantenimientos.html";
        });
    }

    const form = document.getElementById('update-mantenimiento-form');
    const errorMessage = document.getElementById('error-message');
    const selectEstado = document.getElementById('estado');

    const ESTADOS_MANTENIMIENTO_LABELS = {
        P: 'Pendiente',
        E: 'En proceso',
        R: 'Realizado',
        C: 'Cancelado'
    };

    const id = new URLSearchParams(window.location.search).get('id');

    if (!id) {
        errorMessage.textContent = "Falta el ID del mantenimiento en la URL.";
        return;
    }

    const usuario = sessionStorage.getItem('usuario');
    const clave = sessionStorage.getItem('clave');

    if (!usuario || !clave) {
        errorMessage.textContent = "Faltan credenciales.";
        return;
    }

    // ==================================
    // CARGAR ESTADOS EN EL SELECT
    // ==================================
    function cargarEstados() {

        return fetch(`/api/mantenimientos/estados/listar?usuario=${encodeURIComponent(usuario)}&clave=${encodeURIComponent(clave)}`)
            .then(res => res.json())
            .then(estados => {

                selectEstado.innerHTML = `
                    <option value="">Seleccione un estado</option>
                `;

                estados.forEach(estado => {
                    const option = document.createElement("option");
                    option.value = estado.ID_ESTADO_MANTENIMIENTO;
                    option.textContent = ESTADOS_MANTENIMIENTO_LABELS[estado.ESTADO_MANTENIMIENTO] || estado.ESTADO_MANTENIMIENTO;
                    selectEstado.appendChild(option);
                });

            })
            .catch(error => {
                console.error(error);
                errorMessage.textContent = "No se pudieron cargar los estados.";
            });

    }

    // ==================================
    // CARGAR DATOS DEL MANTENIMIENTO
    // ==================================
    function cargarMantenimiento() {

        return fetch(`/api/mantenimientos/${id}?usuario=${encodeURIComponent(usuario)}&clave=${encodeURIComponent(clave)}`)
            .then(async response => {

                const data = await response.json().catch(() => null);

                if (!response.ok || !data || data.success === false) {
                    throw new Error(
                        data?.error ||
                        "No se encontró el mantenimiento."
                    );
                }

                const mant = data.mantenimiento;

                selectEstado.value = mant.ID_ESTADO_MANTENIMIENTO ?? "";

                document.getElementById("fechaFinPrevista").value =
                    String(mant.FECHA_FIN_PREVISTA).split('T')[0];

                document.getElementById("observaciones").value =
                    mant.OBSERVACIONES ?? "";

            })
            .catch(error => {
                console.error(error);
                errorMessage.textContent = error.message;
            });

    }

    // Primero los estados, después el mantenimiento (para marcar el
    // estado correcto en el select).
    cargarEstados().then(cargarMantenimiento);

    // ==================================
    // ACTUALIZAR MANTENIMIENTO
    // ==================================
    form.addEventListener("submit", function (event) {

        event.preventDefault();

        errorMessage.textContent = "";

        const datos = {

            usuario,
            clave,

            id_estado_mantenimiento: selectEstado.value,

            fecha_fin_prevista: document.getElementById("fechaFinPrevista").value,

            observaciones: document.getElementById("observaciones").value

        };

        fetch(`/api/mantenimientos/estado/${id}`, {

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
                        "Error al actualizar el mantenimiento."
                    );
                }

                window.location.href = "/list_mantenimientos.html";

            })
            .catch(error => {
                console.error(error);
                errorMessage.textContent = error.message;
            });

    });

});