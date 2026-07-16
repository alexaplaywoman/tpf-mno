document.addEventListener('DOMContentLoaded', function () {

    // ==============================
    // BOTÓN ATRÁS
    // ==============================

    const btnInicio = document.getElementById("inicio");

    if (btnInicio) {

        btnInicio.addEventListener("click", function (e) {

            e.preventDefault();

            window.location.href = "/list_solicitantes.html";

        });

    }


    const form = document.getElementById("update-solicitante-form");
    const errorMessage = document.getElementById("error-message");

    const selectCarrera = document.getElementById("carrera");
    const selectSolicitante = document.getElementById("solicitante");
    const selectTipoDocumento = document.getElementById("tipoDocumento");


    const cedula = new URLSearchParams(window.location.search).get("cedula");

    if (!cedula) {

        errorMessage.textContent =
            "Falta la cédula del solicitante en la URL.";

        return;

    }


    const usuario = sessionStorage.getItem("usuario");
    const clave = sessionStorage.getItem("clave");

    if (!usuario || !clave) {

        errorMessage.textContent =
            "Faltan credenciales.";

        return;

    }


    // ==============================
    // CARGAR CARRERAS, TIPOS DE SOLICITANTE Y TIPOS DE DOCUMENTO
    // ==============================

    function cargarOpciones() {

        const pedidoCarreras = fetch(
            `/api/solicitantes/carreras/listar?usuario=${encodeURIComponent(usuario)}&clave=${encodeURIComponent(clave)}`
        )
            .then(res => res.json())
            .then(carreras => {

                selectCarrera.innerHTML = `
                    <option value="">
                        Seleccione una Carrera
                    </option>
                `;

                carreras.forEach(carrera => {
                    const option = document.createElement("option");
                    option.value = carrera.ID_CARRERA;
                    option.textContent = carrera.NOMBRE;
                    selectCarrera.appendChild(option);
                });

            })
            .catch(error => {
                console.error(error);
                errorMessage.textContent = "No se pudieron cargar las carreras.";
            });

        const pedidoTiposSolicitante = fetch(
            `/api/solicitantes/tipos-solicitantes/listar?usuario=${encodeURIComponent(usuario)}&clave=${encodeURIComponent(clave)}`
        )
            .then(res => res.json())
            .then(tipos => {

                selectSolicitante.innerHTML = `
                    <option value="">
                        Seleccione un tipo de solicitante
                    </option>
                `;

                tipos.forEach(tipo => {
                    const option = document.createElement("option");
                    option.value = tipo.ID_SOLICITANTE;
                    option.textContent = tipo.TIPO_SOLICITANTE;
                    selectSolicitante.appendChild(option);
                });

            })
            .catch(error => {
                console.error(error);
                errorMessage.textContent = "No se pudieron cargar los tipos de solicitante.";
            });

        const pedidoTiposDocumento = fetch(
            `/api/solicitantes/tipos-documentos/listar?usuario=${encodeURIComponent(usuario)}&clave=${encodeURIComponent(clave)}`
        )
            .then(res => res.json())
            .then(tipos => {

                selectTipoDocumento.innerHTML = `
                    <option value="">
                        Seleccione un tipo de documento
                    </option>
                `;

                tipos.forEach(tipo => {
                    const option = document.createElement("option");
                    option.value = tipo.TIPO_DOCUMENTO;
                    option.textContent = tipo.NOMBRE;
                    selectTipoDocumento.appendChild(option);
                });

            })
            .catch(error => {
                console.error(error);
                errorMessage.textContent = "No se pudieron cargar los tipos de documento.";
            });

        return Promise.all([pedidoCarreras, pedidoTiposSolicitante, pedidoTiposDocumento]);

    }


    // ==============================
    // CARGAR DATOS DEL SOLICITANTE
    // ==============================

    function cargarSolicitante() {

        return fetch(`/api/solicitantes/${cedula}?usuario=${encodeURIComponent(usuario)}&clave=${encodeURIComponent(clave)}`)
            .then(async response => {

                const data = await response.json().catch(() => null);

                if (!response.ok || !data || data.success === false) {
                    throw new Error(
                        data?.error ||
                        "No se encontró el solicitante."
                    );
                }

                const soli = data.solicitante;

                document.getElementById("cedulaIdentidad").value =
                    soli.CEDULA_IDENTIDAD ?? "";

                document.getElementById("correo").value =
                    soli.CORREO ?? "";

                document.getElementById("nombre").value =
                    soli.NOMBRE ?? "";

                document.getElementById("apellido").value =
                    soli.APELLIDO ?? "";

                document.getElementById("telefono").value =
                    soli.TELEFONO ?? "";

                document.getElementById("departamento").value =
                    soli.DEPARTAMENTO ?? "";

                selectCarrera.value =
                    soli.ID_CARRERA ?? "";

                selectSolicitante.value =
                    soli.ID_SOLICITANTE ?? "";

                selectTipoDocumento.value =
                    soli.TIPO_DOCUMENTO ?? "";

            })
            .catch(error => {
                console.error(error);
                errorMessage.textContent = error.message;
            });

    }


    // Primero los 3 combos, y recién cuando ya tienen las opciones
    // cargamos el solicitante, para poder marcar los valores correctos.
    cargarOpciones().then(cargarSolicitante);


    // ==============================
    // ACTUALIZAR SOLICITANTE
    // ==============================

    form.addEventListener("submit", function (e) {

        e.preventDefault();

        errorMessage.textContent = "";

        const datos = {

            usuario,
            clave,

            correo:
                document.getElementById("correo").value,

            id_carrera:
                selectCarrera.value,

            id_solicitante:
                selectSolicitante.value,

            tipo_documento:
                selectTipoDocumento.value,

            nombre:
                document.getElementById("nombre").value,

            apellido:
                document.getElementById("apellido").value,

            telefono:
                document.getElementById("telefono").value,

            departamento:
                document.getElementById("departamento").value

        };

        fetch(`/api/solicitantes/update/${cedula}`, {

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
                        "Error al actualizar solicitante."
                    );
                }

                window.location.href = "/list_solicitantes.html";

            })
            .catch(error => {
                console.error(error);
                errorMessage.textContent = error.message;
            });

    });

});
