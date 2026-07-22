function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = String(str ?? '');
    return div.innerHTML;
}


async function parseJsonSafe(response) {

    const text = await response.text();

    try {

        return JSON.parse(text);

    } catch (e) {

        console.error("Respuesta no es JSON. Status:", response.status);
        console.error("Contenido recibido:", text.slice(0, 300));

        throw new Error(
            `El servidor respondió con algo que no es JSON (status ${response.status}). ` +
            `Revisá la ruta del endpoint en el backend.`
        );

    }

}



document.addEventListener('DOMContentLoaded', function () {



    const btnInicio = document.getElementById("inicio");

    if (btnInicio) {

        btnInicio.addEventListener("click", function(e) {

            e.preventDefault();

            window.location.href = "./menu_administrador.html";

        });

    }






    const btnAgregar = document.getElementById("agregar");


    if (btnAgregar) {

        btnAgregar.addEventListener("click", function(e) {

            e.preventDefault();

            window.location.href = "./add_laboratorios.html";

        });

    }


    const btnRecursos = document.getElementById("recursos");


    if (btnRecursos) {

        btnRecursos.addEventListener("click", function(e) {

            e.preventDefault();

            window.location.href = "./list_recursos.html";

        });

    }



    let laboratoriosList = document.getElementById('laboratorios-list');



    if (!laboratoriosList) {

        laboratoriosList = document.querySelector('table tbody');

    }






    const errorMessage = document.getElementById('error-message');



    if (!laboratoriosList) {

        console.error("No existe tbody para mostrar laboratorios.");

        return;

    }

    const usuario = sessionStorage.getItem('usuario');
    const clave = sessionStorage.getItem('clave');

    let todosLosLaboratorios = [];
    let paginaActual = 1;
    const limite = 10;

    if (!usuario || !clave) {


        if(errorMessage){

            errorMessage.textContent = "Faltan credenciales.";

        }


        return;

    }

    function loadLaboratorios() {

        fetch(`/api/laboratorios?usuario=${encodeURIComponent(usuario)}&clave=${encodeURIComponent(clave)}`)


        .then(async response => {



            const data = await parseJsonSafe(response);



            if(!response.ok){

                throw new Error(data.error || "Error al cargar laboratorios");

            }



            let laboratorios = data;



            if(!Array.isArray(laboratorios)){

                laboratorios = data.laboratorios || data.rows || [];

            }




            todosLosLaboratorios = laboratorios;
            paginaActual = 1;

            mostrarLaboratorios();
            crearPaginacion();



        })


        .catch(error => {



            console.error(error);



            if(errorMessage){

                errorMessage.textContent = error.message;

            }



        });



    }









    function mostrarLaboratorios() {

        const inicio = (paginaActual - 1) * limite;
        const fin = inicio + limite;

        const laboratorios = todosLosLaboratorios.slice(inicio, fin);


        console.log("LABORATORIOS RECIBIDOS:", laboratorios);

        laboratoriosList.innerHTML = "";




        if(!laboratorios || laboratorios.length === 0){


            laboratoriosList.innerHTML = `

                <tr>

                    <td colspan="6">

                        No hay laboratorios cargados.

                    </td>

                </tr>

            `;


            return;


        }







        laboratorios.forEach(lab => {



            laboratoriosList.innerHTML += `



            <tr>



                <td>

                    ${escapeHtml(lab.NUMERO_LABORATORIO)}

                </td>




                <td>
                    ${escapeHtml(lab.NOMBRE_EDIFICIO ?? lab.EDIFICIO)}
                </td>




                <td>

                    ${escapeHtml(lab.CAPACIDAD_ALUMNOS ?? '')}

                </td>




                <td>

                    ${escapeHtml(lab.CANTIDAD_COMPUTADORAS)}

                </td>




                <td>

                    ${escapeHtml(lab.VELOCIDAD_CONEXION_INTERNET)}

                </td>





                <td>



                    <div class="d-flex justify-content-center gap-2">





                        <button 

                            class="btn btn-dark btn-sm"

                            onclick="editarLaboratorio(${lab.NUMERO_LABORATORIO})">


                            <i class="bi bi-pencil-square"></i>

                            Editar


                        </button>







                        <button 

                            class="btn btn-dark btn-sm"

                            onclick="confirmarEliminar(${lab.NUMERO_LABORATORIO})">


                            <i class="bi bi-trash"></i>

                            Eliminar


                        </button>





                    </div>




                </td>




            </tr>



            `;



        });



    }

    function crearPaginacion(){
        const items = document.getElementById("items");

        if(!items) return;

        items.innerHTML = "";

        const cantidadPaginas = Math.ceil(todosLosLaboratorios.length / limite);

        for(let i = 1; i <= cantidadPaginas; i++){

            items.innerHTML += `
            <li class="page-item ${paginaActual === i ? "active" : ""}">
                <button class="page-link" onclick="cambiarPagina(${i})">
                    ${i}
                </button>
            </li>
        `;
        }
    }

    window.cambiarPagina = function(numero){

        paginaActual = numero;

        mostrarLaboratorios();
        crearPaginacion();
    }

    window.nextPage = function(){

        const cantidadPaginas = Math.ceil(todasLosLaboratorios.length / limite);

        if(paginaActual < cantidadPaginas){
            paginaActual++;

            mostrarLaboratorios();
            crearPaginacion();
        }
    };

    window.previusPage = function(){

        if(paginaActual > 1){
            paginaActual--;

            mostrarLaboratorios();
            crearPaginacion();
        }
    }





    window.editarLaboratorio = function(id){


        window.location.href = `/upd_laboratorios.html?id=${id}`;


    };









    window.confirmarEliminar = function(id){



        const dialog = document.getElementById("alertaEliminar");

        const btnSi = document.getElementById("btnConfirmarEliminarSi");

        const btnNo = document.getElementById("btnConfirmarEliminarNo");





        if(!dialog){


            eliminarLaboratorio(id);

            return;


        }






        dialog.showModal();






        btnNo.onclick = function(){


            dialog.close();


        };







        btnSi.onclick = function(){



            dialog.close();



            eliminarLaboratorio(id);



        };




    };









    function eliminarLaboratorio(id){



        fetch(

            `/api/laboratorios/delete/${id}?usuario=${encodeURIComponent(usuario)}&clave=${encodeURIComponent(clave)}`,

            {

                method:"DELETE"

            }

        )



        .then(parseJsonSafe)



        .then(()=>{


            loadLaboratorios();


        })



        .catch(error=>{



            console.error(error);



            if(errorMessage){


                errorMessage.textContent = "Error al eliminar laboratorio";


            }


        });



    }








    loadLaboratorios();



});