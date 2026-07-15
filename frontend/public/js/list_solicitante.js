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

            window.location.href = "./add_solicitante.html";

        });

    }







    let solicitantesList = document.getElementById('solicitantes-list');



    if (!solicitantesList) {

        solicitantesList = document.querySelector('table tbody');

    }






    const errorMessage = document.getElementById('error-message');



    if (!solicitantesList) {

        console.error("No existe tbody para mostrar solicitantes.");

        return;

    }






    const usuario = sessionStorage.getItem('usuario');

    const clave = sessionStorage.getItem('clave');





    if (!usuario || !clave) {


        if(errorMessage){

            errorMessage.textContent = "Faltan credenciales.";

        }


        return;

    }








    function loadSolicitantes() {



        fetch(`/api/solicitantes?usuario=${encodeURIComponent(usuario)}&clave=${encodeURIComponent(clave)}`)


        .then(async response => {



            const data = await parseJsonSafe(response);



            if(!response.ok){

                throw new Error(data.error || "Error al cargar solicitantes");

            }



            let solicitantes = data;



            if(!Array.isArray(solicitantes)){

                solicitantes = data.solicitantes || data.rows || [];

            }




            mostrarSolicitantes(solicitantes);



        })


        .catch(error => {



            console.error(error);



            if(errorMessage){

                errorMessage.textContent = error.message;

            }



        });



    }









    function mostrarSolicitantes(solicitantes) {



        solicitantesList.innerHTML = "";




        if(!solicitantes || solicitantes.length === 0){


            solicitantesList.innerHTML = `

                <tr>

                    <td colspan="6">

                        No hay solicitantes cargados.

                    </td>

                </tr>

            `;


            return;


        }







        solicitantes.forEach(soli => {



            solicitantesList.innerHTML += `



            <tr>



                <td>

                    ${escapeHtml(soli.CEDULA_IDENTIDAD)}

                </td>




                <td>

                    ${escapeHtml(lab.EDIFICIO)}

                </td>




                <td>

                    ${escapeHtml(lab.CAPACIDAD_ALUMNOS)}

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