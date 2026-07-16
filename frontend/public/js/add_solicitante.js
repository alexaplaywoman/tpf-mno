document.addEventListener("DOMContentLoaded", function () {


    const btnInicio = document.getElementById("inicio");
    const form = document.getElementById("add-solicitante-form");
    const errorMessage = document.getElementById("error-message");
    const selectCarrera = document.getElementById("carrera");
    const selectSolicitante = document.getElementById("solicitante");
    const selectTipoDocumento = document.getElementById("tipoDocumento");


    const usuario = sessionStorage.getItem("usuario");
    const clave = sessionStorage.getItem("clave");



    // BOTÓN ATRÁS

    if (btnInicio) {

        btnInicio.addEventListener("click", function (e) {

            e.preventDefault();

            window.location.href = "/list_solicitantes.html";

        });

    }




    if (!usuario || !clave) {

        errorMessage.textContent =
            "Faltan las credenciales del usuario.";

        return;

    }






    // =====================================
    // CARGAR CARRERAS, TIPOS DE SOLICITANTE Y TIPOS DE DOCUMENTO
    // =====================================

    function cargarOpciones() {

        fetch(`/api/solicitantes/carreras/listar?usuario=${encodeURIComponent(usuario)}&clave=${encodeURIComponent(clave)}`)
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

        fetch(`/api/solicitantes/tipos-solicitantes/listar?usuario=${encodeURIComponent(usuario)}&clave=${encodeURIComponent(clave)}`)
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

        fetch(`/api/solicitantes/tipos-documentos/listar?usuario=${encodeURIComponent(usuario)}&clave=${encodeURIComponent(clave)}`)
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

    }


    cargarOpciones();


    








    // =====================================
    // AGREGAR LABORATORIO
    // =====================================


    form.addEventListener("submit", function (e) {


        e.preventDefault();



        errorMessage.textContent = "";





        const solicitanteSelect =
            document.getElementById("solicitante");



        const nombreSolicitante =
            solicitanteSelect.options[
                solicitanteSelect.selectedIndex
            ].text;






        const solicitanteData = {


            usuario: usuario,

            clave: clave,


            cedula_identidad:
                document.getElementById("cedulaIdentidad").value,

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
                document.getElementById("departamento").value,


        };





        console.log(
            "Datos enviados:",
            solicitanteData
        );







        fetch("/api/solicitantes/add", {


            method: "POST",


            headers: {


                "Content-Type": "application/json"


            },


            body: JSON.stringify(solicitanteData)



        })



        .then(async response => {


            const data = await response.json();


            console.log(
                "Respuesta backend:",
                data
            );



            if (!response.ok || data.success === false) {

                if (data.error && data.error.includes("Primary key")) {

                    throw new Error(
                        "El solicitante ya existe en el sistema."
                    );

                }

                throw new Error(
                    data.error || 
                    "Error al agregar solicitante"
                );

            }





            window.location.href =
                "/list_solicitantes.html";



        })



        .catch(error => {


            console.error(error);


            errorMessage.textContent =
                error.message;


        });



    });



});