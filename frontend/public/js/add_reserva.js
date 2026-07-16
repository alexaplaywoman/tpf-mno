document.addEventListener("DOMContentLoaded", function () {

    const btnInicio = document.getElementById("inicio");
    const form = document.getElementById("add-reserva-form");
    const errorMessage = document.getElementById("error-message");
    const selectLaboratorio = document.getElementById("laboratorio");
    const selectSolicitante = document.getElementById("solicitante");
    const selectTipoActividad = document.getElementById("tipoActividad");
    const contenedorRecursos = document.getElementById("listaRecursos");

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
    // CARGAR LABORATORIOS, SOLICITANTES, TIPOS DE ACTIVIDAD Y RECURSOS
    // =====================================

    function cargarOpciones() {

        fetch(`/api/laboratorios?usuario=${encodeURIComponent(usuario)}&clave=${encodeURIComponent(clave)}`)
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

        fetch(`/api/solicitantes?usuario=${encodeURIComponent(usuario)}&clave=${encodeURIComponent(clave)}`)
            .then(res => res.json())
            .then(solicitantes => {
                selectSolicitante.innerHTML = `
                    <option value="">Seleccione un solicitante</option>
                `;

                solicitantes.forEach(soli => {
                    const option = document.createElement("option");
                    option.value = soli.CEDULA_IDENTIDAD;
                    option.textContent = `${soli.NOMBRE} ${soli.APELLIDO} - ${soli.CEDULA_IDENTIDAD}`;
                    // Guardamos el correo acá porque el backend lo necesita
                    // junto con la cédula
                    option.dataset.correo = soli.CORREO;
                    selectSolicitante.appendChild(option);
                });
            })
            .catch(error => {
                console.error(error);
                errorMessage.textContent = "No se pudieron cargar los solicitantes.";
            });

        fetch(`/api/actividades?usuario=${encodeURIComponent(usuario)}&clave=${encodeURIComponent(clave)}`)
            .then(res => res.json())
            .then(tipos => {
                selectTipoActividad.innerHTML = `
                    <option value="">Seleccione un tipo de actividad</option>
                `;

                tipos.forEach(tipo => {
                    const option = document.createElement("option");
                    option.value = tipo.ID_TIPO_ACTIVIDAD;
                    option.textContent = tipo.NOMBRE;
                    selectTipoActividad.appendChild(option);
                });
            })
            .catch(error => {
                console.error(error);
                errorMessage.textContent = "No se pudieron cargar los tipos de actividad.";
            });

        fetch(`/api/recursos/tipos?usuario=${encodeURIComponent(usuario)}&clave=${encodeURIComponent(clave)}`)
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

    cargarOpciones();

    // =====================================
    // AGREGAR RESERVA
    // =====================================

    form.addEventListener("submit", function (e) {

        e.preventDefault();

        errorMessage.textContent = "";

        const opcionSolicitante = selectSolicitante.options[selectSolicitante.selectedIndex];
        const correo = opcionSolicitante ? opcionSolicitante.dataset.correo : "";

        const recursosElegidos = Array.from(
            contenedorRecursos.querySelectorAll('input[type="checkbox"]:checked')
        ).map(checkbox => checkbox.value);

        const reservaData = {

            usuario,
            clave,

            numero_laboratorio: selectLaboratorio.value,

            cedula_identidad: selectSolicitante.value,
            correo: correo,

            id_tipo_actividad: selectTipoActividad.value,

            fecha_a_reservar: document.getElementById("fecha").value,

            hora_inicio: document.getElementById("horaInicio").value,

            hora_fin: document.getElementById("horaFin").value,

            cantidad_alumnos: document.getElementById("cantidadAlumnos").value,

            recursos: recursosElegidos

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
