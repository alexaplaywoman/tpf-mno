document.addEventListener("DOMContentLoaded", function () {

    const usuario = sessionStorage.getItem("usuario");
    const clave = sessionStorage.getItem("clave");
    const idReserva = sessionStorage.getItem("reservaCancelar");

    const mensajeError = document.getElementById("mensajeError");



    // Cargar motivos de cancelación
    cargarMotivos();


    function cargarMotivos() {

        fetch("/api/reservas/motivos-cancelacion")

            .then(res => res.json())

            .then(motivos => {

                const select = document.getElementById("motivo");


                if (!motivos || motivos.length === 0) {
                    console.warn("No se recibieron motivos.");
                    return;
                }


                motivos.forEach(function (motivo) {

                    const option = document.createElement("option");

                    option.value = motivo;
                    option.textContent = motivo;

                    select.appendChild(option);

                });


            })

            .catch(error => {

                console.error("Error al cargar motivos:", error);

            });

    }




    function mostrarError(texto) {

        mensajeError.textContent = texto;
        mensajeError.style.display = "block";

    }





    document.getElementById("botonAtras")
        .addEventListener("click", function () {

            window.location.href = "datos_reserva.html";

        });







    document.getElementById("botonCancelar")
        .addEventListener("click", async function () {


            const numeroDocumento =
                document.getElementById("numeroDocumento").value.trim();


            const motivo =
                document.getElementById("motivo").value;




            if (!idReserva) {

                mostrarError(
                    "No se identificó la reserva a cancelar."
                );

                return;

            }



            if (numeroDocumento === "") {

                mostrarError(
                    "Ingrese el número de documento del responsable."
                );

                return;

            }



            if (motivo === "") {

                mostrarError(
                    "Seleccione un motivo de cancelación."
                );

                return;

            }






            try {


                const respuesta = await fetch(
                    `/api/reservas/cancelar/${encodeURIComponent(idReserva)}`,
                    {

                        method: "POST",

                        headers: {
                            "Content-Type": "application/json"
                        },


                        body: JSON.stringify({

                            usuario: usuario,
                            clave: clave,
                            motivo: motivo,
                            cedula_responsable: numeroDocumento

                        })

                    }
                );





                const data = await respuesta.json();






                if (data.success) {



                    sessionStorage.removeItem("reservaCancelar");



                    const modal = new bootstrap.Modal(
                        document.getElementById("modalExito")
                    );


                    modal.show();



                } else {


                    mostrarError(
                        data.error || 
                        "No se pudo cancelar la reserva."
                    );


                }





            } catch (error) {


                console.error(
                    "Error al cancelar:",
                    error
                );


                mostrarError(
                    "Error de conexión al cancelar la reserva."
                );


            }


        });








    document.getElementById("aceptarCancelar")
        .addEventListener("click", function () {


            window.location.href = "datos_reserva.html";


        });



});