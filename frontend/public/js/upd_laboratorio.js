document.addEventListener('DOMContentLoaded', function () {

    const btnInicio = document.getElementById("inicio");

    if (btnInicio) {
        btnInicio.addEventListener("click", function (e) {
            e.preventDefault();
            window.location.href = "/list_laboratorios.html";
        });
    }

    const form = document.getElementById('update-laboratorio-form');
    const errorMessage = document.getElementById('error-message');
    const selectEdificio = document.getElementById('edificio');

    const laboratorioId = new URLSearchParams(window.location.search).get('id');

    if (!laboratorioId) {
        errorMessage.textContent = "Falta el ID del laboratorio en la URL.";
        return;
    }

    const usuario = sessionStorage.getItem('usuario');
    const clave = sessionStorage.getItem('clave');

    if (!usuario || !clave) {
        errorMessage.textContent = "Faltan credenciales.";
        return;
    }

    // ==================================
    // CARGAR EDIFICIOS EN EL SELECT
    // ==================================
    function cargarEdificios() {

        return fetch(`/api/edificios?usuario=${encodeURIComponent(usuario)}&clave=${encodeURIComponent(clave)}`)
        .then(async response => {

            const data = await response.json();

            console.log("Respuesta edificios:", data);

            if (!response.ok) {
                throw new Error(data.error || "Error al cargar edificios");
            }

            let edificios = data;

            // Si viene como {edificios:[...]}
            if (!Array.isArray(edificios)) {
                edificios = data.edificios || data.rows || [];
            }

            selectEdificio.innerHTML = `
                <option value="">
                    Seleccione un edificio
                </option>
            `;

            edificios.forEach(edificio => {

                const option = document.createElement("option");

                // ID que va a la BD
                option.value =
                    edificio.ID_EDIFICIO ??
                    edificio.id_edificio ??
                    edificio.ID;

                // Nombre que ve el usuario
                option.textContent =
                    edificio.NOMBRE_EDIFICIO ??
                    edificio.nombre_edificio ??
                    edificio.NOMBRE ??
                    edificio.nombre;

                selectEdificio.appendChild(option);

            });

        })
        .catch(error => {
            console.error("Error cargando edificios:", error);
            errorMessage.textContent = "No se pudieron cargar los edificios.";
        });

    }

    // ==================================
    // CARGAR DATOS DEL LABORATORIO
    // ==================================
    function cargarLaboratorio() {

        return fetch(`/api/laboratorios/${encodeURIComponent(laboratorioId)}?usuario=${encodeURIComponent(usuario)}&clave=${encodeURIComponent(clave)}`)
        .then(async response => {

            const data = await response.json().catch(() => null);

            console.log("Laboratorio recibido:", data);

            if (!response.ok || !data || data.success === false) {
                throw new Error(
                    data?.error ||
                    "No se encontró el laboratorio."
                );
            }

            const lab = data.laboratorio;

            // Ahora que el select ya tiene las opciones cargadas
            // (cargarEdificios corrió antes), esto sí selecciona
            // el edificio correcto en vez de quedar vacío.
            selectEdificio.value = lab.ID_EDIFICIO ?? "";

            document.getElementById("capacidad_alumnos").value =
                lab.CAPACIDAD_ALUMNOS ?? "";

            document.getElementById("cantidad_computadoras").value =
                lab.CANTIDAD_COMPUTADORAS ?? "";

            document.getElementById("velocidad_internet").value =
                lab.VELOCIDAD_CONEXION_INTERNET ?? "";

        })
        .catch(error => {
            console.error(error);
            errorMessage.textContent = error.message;
        });

    }

    // Primero cargamos los edificios en el select, y recién cuando
    // ya tiene las <option>, cargamos el laboratorio para poder
    // marcar el edificio correcto como seleccionado.
    cargarEdificios().then(cargarLaboratorio);

    // ==================================
    // ACTUALIZAR LABORATORIO
    // ==================================
    form.addEventListener("submit", function (event) {

        event.preventDefault();

        errorMessage.textContent = "";

        const opcionSeleccionada = selectEdificio.options[selectEdificio.selectedIndex];

        const laboratorioData = {

            usuario,
            clave,

            id_edificio: selectEdificio.value,

            // El backend también guarda el nombre del edificio en la
            // columna EDIFICIO, así que mandamos el texto de la opción elegida.
            edificio: opcionSeleccionada ? opcionSeleccionada.textContent.trim() : "",

            capacidad_alumnos:
                document.getElementById("capacidad_alumnos").value,

            cantidad_computadoras:
                document.getElementById("cantidad_computadoras").value,

            velocidad_conexion_internet:
                document.getElementById("velocidad_internet").value

        };

        console.log("Datos enviados:", laboratorioData);

        fetch(`/api/laboratorios/update/${laboratorioId}`, {

            method: "POST",

            headers: {
                "Content-Type": "application/json"
            },

            body: JSON.stringify(laboratorioData)

        })
        .then(async response => {

            const data = await response.json().catch(() => null);

            if (!response.ok || !data || data.success === false) {
                throw new Error(
                    data?.error ||
                    "Error al actualizar laboratorio."
                );
            }

            window.location.href = "/list_laboratorios.html";

        })
        .catch(error => {
            console.error(error);
            errorMessage.textContent = error.message;
        });

    });

});