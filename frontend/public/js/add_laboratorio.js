document.addEventListener("DOMContentLoaded", function () {


    const btnInicio = document.getElementById("inicio");
    const form = document.getElementById("add-laboratorio-form");
    const errorMessage = document.getElementById("error-message");
    const selectEdificio = document.getElementById("edificio");
    const selectPiso = document.getElementById("piso");
    const contenedorRecursos = document.getElementById("listaRecursos");


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
    // CARGAR RECURSOS (CHECKBOXES)
    // =====================================

    function cargarRecursos() {

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

    cargarRecursos();


    // Crea un recurso por cada checkbox tildado, para el laboratorio
    // recién creado.
    function crearRecursosElegidos(numeroLaboratorio) {

        const checkboxes = Array.from(contenedorRecursos.querySelectorAll('input[type="checkbox"]:checked'));

        const pedidos = checkboxes.map(checkbox =>
            fetch('/api/recursos/add', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    usuario, clave,
                    numero_laboratorio: numeroLaboratorio,
                    nombre: checkbox.value,
                    descripcion: checkbox.value,
                    disponibilidad: 'S'
                })
            })
        );

        return Promise.all(pedidos);
    }









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


            return crearRecursosElegidos(data.numero_laboratorio);


        })


        .then(() => {

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