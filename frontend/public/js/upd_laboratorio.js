document.addEventListener('DOMContentLoaded', function () {


    const btnInicio = document.getElementById("inicio");

    if(btnInicio){

        btnInicio.addEventListener("click", function(e){

            e.preventDefault();

            window.location.href="/list_laboratorios.html";

        });

    }



    const form = document.getElementById('update-laboratorio-form');
    const errorMessage = document.getElementById('error-message');


    const laboratorioId = new URLSearchParams(window.location.search).get('id');


    if(!laboratorioId){

        errorMessage.textContent =
        "Falta el ID del laboratorio en la URL.";

        return;

    }



    const usuario = sessionStorage.getItem('usuario');
    const clave = sessionStorage.getItem('clave');



    if(!usuario || !clave){

        errorMessage.textContent =
        "Faltan credenciales.";

        return;

    }





    // Cargar datos del laboratorio

    fetch(`/api/laboratorios/${encodeURIComponent(laboratorioId)}?usuario=${encodeURIComponent(usuario)}&clave=${encodeURIComponent(clave)}`)

    .then(async response=>{


        const data = await response.json().catch(()=>null);



        console.log("Laboratorio recibido:",data);



        if(!response.ok || !data || data.success === false){

            throw new Error(
                data?.error || 
                "No se encontró el laboratorio."
            );

        }



        const lab = data.laboratorio;



        document.getElementById("edificio").value =
        lab.EDIFICIO ?? "";



        document.getElementById("capacidad_alumnos").value =
        lab.CAPACIDAD_ALUMNOS ?? "";



        document.getElementById("cantidad_computadoras").value =
        lab.CANTIDAD_COMPUTADORAS ?? "";



        document.getElementById("velocidad_internet").value =
        lab.VELOCIDAD_CONEXION_INTERNET ?? "";



    })

    .catch(error=>{

        console.error(error);

        errorMessage.textContent = error.message;

    });






    // Actualizar laboratorio

    form.addEventListener("submit",function(event){


        event.preventDefault();



        errorMessage.textContent="";



        const laboratorioData = {


            usuario,
            clave,


            edificio:
            document.getElementById("edificio").value,


            capacidad_alumnos:
            document.getElementById("capacidad_alumnos").value,


            cantidad_computadoras:
            document.getElementById("cantidad_computadoras").value,


            velocidad_conexion_internet:
            document.getElementById("velocidad_internet").value


        };



        console.log("Datos enviados:",laboratorioData);




        fetch(`/api/laboratorios/update/${laboratorioId}`,{


            method:"POST",


            headers:{


                "Content-Type":"application/json"


            },


            body:JSON.stringify(laboratorioData)


        })


        .then(async response=>{


            const data =
            await response.json().catch(()=>null);



            if(!response.ok || !data || data.success===false){


                throw new Error(
                    data?.error ||
                    "Error al actualizar laboratorio."
                );


            }



            window.location.href =
            "/list_laboratorios.html";


        })



        .catch(error=>{


            console.error(error);


            errorMessage.textContent =
            error.message;


        });



    });



});