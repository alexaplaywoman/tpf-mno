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
    const selectPiso = document.getElementById('piso');
    const contenedorRecursos = document.getElementById('listaRecursos');

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

    // Recursos que ya tenía el laboratorio al entrar a esta pantalla,
    // para poder comparar qué se agregó y qué se sacó al guardar.
    let recursosOriginales = []; // [{ID_RECURSO, NOMBRE}, ...]

    // ==================================
    // CARGAR EDIFICIOS EN EL SELECT
    // ==================================
    function cargarEdificios() {

        return fetch(`/api/laboratorios/edificios/listar?usuario=${encodeURIComponent(usuario)}&clave=${encodeURIComponent(clave)}`)
        .then(async response => {

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || "Error al cargar edificios");
            }

            let edificios = data;

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
                option.value = edificio.ID_EDIFICIO;
                option.textContent = edificio.NOMBRE_EDIFICIO;

                selectEdificio.appendChild(option);

            });

        })
        .catch(error => {
            console.error("Error cargando edificios:", error);
            errorMessage.textContent = "No se pudieron cargar los edificios.";
        });

    }

    // ==================================
    // CARGAR PISOS SEGÚN EL EDIFICIO ELEGIDO
    // ==================================
    function cargarPisos(idEdificio, pisoAPreseleccionar) {

        selectPiso.innerHTML = `
            <option value="">
                Seleccione un piso
            </option>
        `;

        if (!idEdificio) return Promise.resolve();

        return fetch(`/api/laboratorios/pisos/listar?usuario=${encodeURIComponent(usuario)}&clave=${encodeURIComponent(clave)}&id_edificio=${idEdificio}`)
            .then(async response => {
                const data = await response.json();

                if (!response.ok) {
                    throw new Error(data.error || "Error al cargar pisos");
                }

                data.forEach(piso => {
                    const option = document.createElement("option");
                    option.value = piso.NRO_PISO;
                    option.textContent = "Piso " + piso.NRO_PISO;
                    selectPiso.appendChild(option);
                });

                if (pisoAPreseleccionar !== undefined && pisoAPreseleccionar !== null) {
                    selectPiso.value = pisoAPreseleccionar;
                }
            })
            .catch(error => {
                console.error(error);
                errorMessage.textContent = "No se pudieron cargar los pisos.";
            });
    }

    selectEdificio.addEventListener("change", function () {
        cargarPisos(selectEdificio.value);
    });

    // ==================================
    // CARGAR RECURSOS (CHECKBOXES)
    // ==================================
    function cargarRecursos() {

        return fetch(`/api/recursos/tipos?usuario=${encodeURIComponent(usuario)}&clave=${encodeURIComponent(clave)}`)
            .then(res => res.json())
            .then(tipos => {

                contenedorRecursos.innerHTML = '';

                if (!tipos || tipos.length === 0) {
                    contenedorRecursos.innerHTML = "<p class='text-muted mb-0'>No hay recursos disponibles.</p>";
                    return;
                }

                tipos.forEach(tipo => {
                    const nombre = tipo.NOMBRE;
                    const id = "recurso" + nombre.replace(/\s+/g, '');

                    const div = document.createElement('div');
                    div.className = 'form-check';
                    div.innerHTML = `
                        <input class="form-check-input" type="checkbox" id="${id}" value="${nombre}">
                        <label class="form-check-label" for="${id}">${nombre}</label>
                    `;
                    contenedorRecursos.appendChild(div);
                });
            })
            .catch(error => {
                console.error('Error al cargar recursos:', error);
                contenedorRecursos.innerHTML = "<p class='text-muted mb-0'>No se pudieron cargar los recursos.</p>";
            });
    }

    // Marca como tildados los recursos que ya tiene este laboratorio.
    function marcarRecursosActuales() {

        return fetch(`/api/recursos?usuario=${encodeURIComponent(usuario)}&clave=${encodeURIComponent(clave)}&laboratorio=${laboratorioId}`)
            .then(res => res.json())
            .then(recursos => {

                recursosOriginales = recursos || [];

                recursosOriginales.forEach(recurso => {
                    const id = "recurso" + recurso.NOMBRE.replace(/\s+/g, '');
                    const checkbox = document.getElementById(id);
                    if (checkbox) checkbox.checked = true;
                });
            })
            .catch(error => {
                console.error('Error al cargar recursos del laboratorio:', error);
            });
    }

    // ==================================
    // CARGAR DATOS DEL LABORATORIO
    // ==================================
    function cargarLaboratorio() {

        return fetch(`/api/laboratorios/${encodeURIComponent(laboratorioId)}?usuario=${encodeURIComponent(usuario)}&clave=${encodeURIComponent(clave)}`)
        .then(async response => {

            const data = await response.json().catch(() => null);

            if (!response.ok || !data || data.success === false) {
                throw new Error(
                    data?.error ||
                    "No se encontró el laboratorio."
                );
            }

            const lab = data.laboratorio;

            selectEdificio.value = lab.ID_EDIFICIO ?? "";

            document.getElementById("capacidad_alumnos").value =
                lab.CAPACIDAD_ALUMNOS ?? "";

            document.getElementById("cantidad_computadoras").value =
                lab.CANTIDAD_COMPUTADORAS ?? "";

            document.getElementById("velocidad_internet").value =
                lab.VELOCIDAD_CONEXION_INTERNET ?? "";

            return cargarPisos(lab.ID_EDIFICIO, lab.NRO_PISO);

        })
        .catch(error => {
            console.error(error);
            errorMessage.textContent = error.message;
        });

    }

    // Primero edificios, después el laboratorio (para seleccionar el
    // edificio y el piso correctos), y en paralelo los recursos.
    cargarEdificios()
        .then(cargarLaboratorio)
        .then(() => cargarRecursos())
        .then(() => marcarRecursosActuales());

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
            nro_piso: selectPiso.value,

            edificio: opcionSeleccionada ? opcionSeleccionada.textContent.trim() : "",

            capacidad_alumnos:
                document.getElementById("capacidad_alumnos").value,

            cantidad_computadoras:
                document.getElementById("cantidad_computadoras").value,

            velocidad_conexion_internet:
                document.getElementById("velocidad_internet").value

        };

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

            return actualizarRecursos();

        })
        .then(() => {
            window.location.href = "/list_laboratorios.html";
        })
        .catch(error => {
            console.error(error);
            errorMessage.textContent = error.message;
        });

    });

    // Compara los checkboxes tildados contra los recursos que ya tenía
    // el laboratorio, y agrega/elimina lo que cambió.
    function actualizarRecursos() {

        const checkboxes = Array.from(contenedorRecursos.querySelectorAll('input[type="checkbox"]'));
        const nombresElegidos = checkboxes.filter(c => c.checked).map(c => c.value);
        const nombresOriginales = recursosOriginales.map(r => r.NOMBRE);

        const paraAgregar = nombresElegidos.filter(n => !nombresOriginales.includes(n));
        const paraEliminar = recursosOriginales.filter(r => !nombresElegidos.includes(r.NOMBRE));

        const agregados = paraAgregar.map(nombre =>
            fetch('/api/recursos/add', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    usuario, clave,
                    numero_laboratorio: laboratorioId,
                    nombre,
                    descripcion: nombre,
                    disponibilidad: 'S'
                })
            })
        );

        const eliminados = paraEliminar.map(recurso =>
            fetch(`/api/recursos/delete/${recurso.ID_RECURSO}?usuario=${encodeURIComponent(usuario)}&clave=${encodeURIComponent(clave)}`, {
                method: 'DELETE'
            })
        );

        return Promise.all([...agregados, ...eliminados]);
    }

});
