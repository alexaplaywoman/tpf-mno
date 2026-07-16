document.addEventListener("DOMContentLoaded", function () {

    const btnInicio = document.getElementById("inicio");
    const form = document.getElementById("add-actividades-form");
    const errorMessage = document.getElementById("error-message");
    const selectPrioridad = document.getElementById("prioridad");

    const usuario = sessionStorage.getItem("usuario");
    const clave = sessionStorage.getItem("clave");

    if (btnInicio) {
        btnInicio.addEventListener("click", function (e) {
            e.preventDefault();
            window.location.href = "/list_actividades.html";
        });
    }

    if (!usuario || !clave) {
        errorMessage.textContent = "Faltan las credenciales del usuario.";
        return;
    }

    // =====================================
    // CARGAR LABORATORIOS EN EL SELECT
    // =====================================

    function cargarPrioridades() {

        fetch(`/api/actividades/prioridades/listar?usuario=${encodeURIComponent(usuario)}&clave=${encodeURIComponent(clave)}`)
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

    cargarPrioridades();

    // =====================================
    // AGREGAR TIPO DE ACTIVIDAD
    // =====================================

    form.addEventListener("submit", function (e) {

        e.preventDefault();

        errorMessage.textContent = "";

        const actividadesData = {   

            usuario,
            clave,

            nombre: document.getElementById("nombre").value,

            prioridad: document.getElementById("prioridad_numero").value,

            id_prioridad: selectPrioridad.value,

            duracion_max_horas: document.getElementById("duracionMaxHoras").value

        };

        fetch("/api/actividades/add", {

            method: "POST",

            headers: {
                "Content-Type": "application/json"
            },

            body: JSON.stringify(actividadesData)

        })
            .then(async response => {

                const data = await response.json();

                if (!response.ok || data.success === false) {
                    throw new Error(data.error || "Error al agregar actividades");
                }

                window.location.href = "/list_actividades.html";

            })
            .catch(error => {
                console.error(error);
                errorMessage.textContent = error.message;
            });

    });

});
