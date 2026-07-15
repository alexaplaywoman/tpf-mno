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
    // CARGAR EDIFICIOS EN EL SELECT
    // =====================================


    function cargarSolicitantes() {


        fetch(`/api/solicitantes/add/listar?usuario=${encodeURIComponent(usuario)}&clave=${encodeURIComponent(clave)}`)


        .then(async response => {


            const data = await response.json();


            console.log("Solicitantes recibidos:", data);



            if (!response.ok) {


                throw new Error(
                    data.error || "Error al cargar solicitantes"
                );

            }



            let solicitantes = data;



            if (!Array.isArray(solicitantes)) {


                solicitantes = data.solicitantes || data.rows || [];


            }





            selectCarrera.innerHTML = `

                <option value="">
                    Seleccione una Carrera
                </option>

            `;





            solicitantes.forEach(solicitante => {


                const option = document.createElement("option");


                option.value = solicitante.ID_CARRERA;


                option.textContent = solicitante.NOMBRE_CARRERA;



                selectCarrera.appendChild(option);


            });

            selectSolicitante.innerHTML = `

                <option value="">
                    Seleccione un solicitante
                </option>

            `;





            solicitantes.forEach(solicitante => {


                const option = document.createElement("option");


                option.value = solicitante.ID_SOLICITANTE;


                option.textContent = solicitante.NOMBRE_SOLICITANTE;



                selectSolicitante.appendChild(option);


            });


            selectTipoDocumento.innerHTML = `

                <option value="">
                    Seleccione un tipo de documento
                </option>

            `;





            solicitantes.forEach(solicitante => {


                const option = document.createElement("option");


                option.value = solicitante.TIPO_DOCUMENTO;


                option.textContent = solicitante.TIPO_DOCUMENTO;



                selectTipoDocumento.appendChild(option);


            });



        })


        .catch(error => {


            console.error(error);


            errorMessage.textContent =
                "No se pudieron cargar los solicitantes.";


        });



    }




    cargarSolicitantes();


    








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

            ID_CARRERA:
                selectCarrera.value,

            ID_SOLICITANTE:
                selectSolicitante.value,

            TIPO_DOCUMENTO:
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