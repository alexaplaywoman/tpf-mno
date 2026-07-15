document.addEventListener("DOMContentLoaded", function () {


    const btnInicio = document.getElementById("inicio");
    const form = document.getElementById("add-laboratorio-form");
    const errorMessage = document.getElementById("error-message");
    const selectEdificio = document.getElementById("edificio");
    const selectPiso = document.getElementById("piso");


    const usuario = sessionStorage.getItem("usuario");
    const clave = sessionStorage.getItem("clave");



    // BOTÓN ATRÁS

    if (btnInicio) {

        btnInicio.addEventListener("click", function (e) {

            e.preventDefault();

            window.location.href = "/list_laboratorios.html";

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


    function cargarEdificios() {


        fetch(`/api/laboratorios/edificios/listar?usuario=${encodeURIComponent(usuario)}&clave=${encodeURIComponent(clave)}`)


        .then(async response => {


            const data = await response.json();


            console.log("Edificios recibidos:", data);



            if (!response.ok) {


                throw new Error(
                    data.error || "Error al cargar edificios"
                );

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


            console.error(error);


            errorMessage.textContent =
                "No se pudieron cargar los edificios.";


        });



    }




    cargarEdificios();


    // =====================================
    // CARGAR PISOS SEGÚN EL EDIFICIO ELEGIDO
    // =====================================

    function cargarPisos(idEdificio) {

        selectPiso.innerHTML = `
            <option value="">
                Seleccione un piso
            </option>
        `;

        if (!idEdificio) return;

        fetch(`/api/laboratorios/pisos/listar?usuario=${encodeURIComponent(usuario)}&clave=${encodeURIComponent(clave)}&id_edificio=${idEdificio}`)
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
            })
            .catch(error => {
                console.error(error);
                errorMessage.textContent = "No se pudieron cargar los pisos.";
            });
    }

    selectEdificio.addEventListener("change", function () {
        cargarPisos(selectEdificio.value);
    });









    // =====================================
    // AGREGAR LABORATORIO
    // =====================================


    form.addEventListener("submit", function (e) {


        e.preventDefault();



        errorMessage.textContent = "";





        const edificioSelect =
            document.getElementById("edificio");



        const nombreEdificio =
            edificioSelect.options[
                edificioSelect.selectedIndex
            ].text;






        const laboratorioData = {


            usuario: usuario,

            clave: clave,



            id_edificio:
                edificioSelect.value,

            nro_piso:
                selectPiso.value,



            edificio:
                nombreEdificio,



            capacidad_alumnos:
                document.getElementById("capacidad").value,



            cantidad_computadoras:
                document.getElementById("computadoras").value,



            velocidad_conexion_internet:
                document.getElementById("internet").value



        };





        console.log(
            "Datos enviados:",
            laboratorioData
        );







        fetch("/api/laboratorios/add", {


            method: "POST",


            headers: {


                "Content-Type": "application/json"


            },


            body: JSON.stringify(laboratorioData)



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
                    "Error al agregar laboratorio"
                );


            }





            window.location.href =
                "/list_laboratorios.html";



        })



        .catch(error => {


            console.error(error);


            errorMessage.textContent =
                error.message;


        });



    });



});