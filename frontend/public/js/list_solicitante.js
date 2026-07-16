function escapeHtml(str) {

    const div = document.createElement("div");

    div.textContent = String(str ?? "");

    return div.innerHTML;

}



async function parseJsonSafe(response) {

    const text = await response.text();

    try {

        return JSON.parse(text);

    } catch (e) {

        console.error("Respuesta no es JSON:", text);

        throw new Error(
            "El servidor respondió algo que no es JSON."
        );

    }

}





document.addEventListener("DOMContentLoaded", function () {



    const btnInicio = document.getElementById("inicio");


    if(btnInicio){

        btnInicio.addEventListener("click", function(e){

            e.preventDefault();

            window.location.href = "./menu_administrador.html";

        });

    }





    const btnAgregar = document.getElementById("agregar");


    if(btnAgregar){

        btnAgregar.addEventListener("click", function(e){

            e.preventDefault();

            window.location.href = "./add_solicitantes.html";

        });

    }







    const solicitantesList = document.getElementById("solicitantes-list");

    const errorMessage = document.getElementById("error-message");





    const usuario = sessionStorage.getItem("usuario");

    const clave = sessionStorage.getItem("clave");





    if(!usuario || !clave){

        if(errorMessage){

            errorMessage.textContent =
            "Faltan credenciales.";

        }

        return;

    }







    function loadSolicitantes(){



        fetch(
            `/api/solicitantes?usuario=${encodeURIComponent(usuario)}&clave=${encodeURIComponent(clave)}`
        )


        .then(async response => {


            const data = await parseJsonSafe(response);



            if(!response.ok){

                throw new Error(
                    data.error || "Error al cargar solicitantes"
                );

            }





            let solicitantes = data;



            if(!Array.isArray(solicitantes)){

                solicitantes =
                    data.solicitantes ||
                    data.rows ||
                    [];

            }



            console.log("Solicitantes:", solicitantes);



            mostrarSolicitantes(solicitantes);



        })



        .catch(error => {


            console.error(error);


            if(errorMessage){

                errorMessage.textContent =
                error.message;

            }


        });



    }









    function mostrarSolicitantes(solicitantes){



        solicitantesList.innerHTML = "";





        if(solicitantes.length === 0){


            solicitantesList.innerHTML = `

                <tr>

                    <td colspan="10">

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

                    ${escapeHtml(soli.CORREO)}

                </td>



                <td>

                    ${escapeHtml(soli.carrera)}

                </td>



                <td>

                    ${escapeHtml(soli.tipo_solicitante)}

                </td>



                <td>

                    ${escapeHtml(soli.tipo_documento)}

                </td>



                <td>

                    ${escapeHtml(soli.NOMBRE)}

                </td>



                <td>

                    ${escapeHtml(soli.APELLIDO)}

                </td>



                <td>

                    ${escapeHtml(soli.TELEFONO)}

                </td>



                <td>

                    ${escapeHtml(soli.DEPARTAMENTO)}

                </td>





                <td>



                    <div class="d-flex justify-content-center gap-2">





                        <button

                            class="btn btn-dark btn-sm"

                            onclick="editarSolicitante('${soli.CEDULA_IDENTIDAD}')">


                            <i class="bi bi-pencil-square"></i>

                            Editar


                        </button>







                        <button

                            class="btn btn-dark btn-sm"

                            onclick="confirmarEliminar('${soli.CEDULA_IDENTIDAD}')">


                            <i class="bi bi-trash"></i>

                            Eliminar


                        </button>





                    </div>



                </td>




            </tr>


            `;



        });



    }









    window.editarSolicitante = function(cedula){



        window.location.href =
            `/upd_solicitantes.html?id=${cedula}`;


    };









    window.confirmarEliminar = function(cedula){



        const dialog =
            document.getElementById("alertaEliminar");



        const btnSi =
            document.getElementById("btnConfirmarEliminarSi");



        const btnNo =
            document.getElementById("btnConfirmarEliminarNo");







        if(!dialog){


            eliminarSolicitante(cedula);

            return;

        }






        dialog.showModal();





        btnNo.onclick = function(){

            dialog.close();

        };







        btnSi.onclick = function(){


            dialog.close();


            eliminarSolicitante(cedula);


        };



    };









    function eliminarSolicitante(cedula){



        fetch(

            `/api/solicitantes/delete/${cedula}?usuario=${encodeURIComponent(usuario)}&clave=${encodeURIComponent(clave)}`,

            {

                method:"DELETE"

            }

        )


        .then(parseJsonSafe)


        .then(() => {


            loadSolicitantes();


        })


        .catch(error => {


            console.error(error);


            if(errorMessage){

                errorMessage.textContent =
                "Error al eliminar solicitante";

            }


        });



    }







    loadSolicitantes();



});