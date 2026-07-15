document.addEventListener("DOMContentLoaded", function () {

    // Botón Atrás
    document.getElementById("botonAtras").addEventListener("click", function () {
        window.location.href = "consultar_reserva.html";
    });

    // Datos guardados al iniciar sesión
    const usuario = sessionStorage.getItem("usuario");
    const clave = sessionStorage.getItem("clave");

    // Datos ingresados en consultar_reserva.html
    const numeroCedula = sessionStorage.getItem("numeroCedula");
    const correo = sessionStorage.getItem("correo");

    console.log("Usuario:", usuario);
    console.log("Número de cédula:", numeroCedula);
    console.log("Correo:", correo);

    // Consulta todas las reservas
    fetch(`/api/reservas?usuario=${usuario}&clave=${clave}`)
        .then(response => {

            if (!response.ok) {
                throw new Error("Error al consultar las reservas.");
            }

            return response.json();

        })
        .then(reservas => {

            console.log("Todas las reservas:", reservas);

            // Filtrar únicamente las reservas del usuario
            const reservasUsuario = reservas.filter(reserva =>

                reserva.CEDULA_IDENTIDAD == numeroCedula &&
                reserva.CORREO == correo

            );

            console.log("Reservas del usuario:", reservasUsuario);

            // Filtrar solamente las reservas futuras
            const hoy = new Date();

            const reservasFuturas = reservasUsuario.filter(reserva =>

                new Date(reserva.FECHA_A_RESERVAR) >= hoy

            );

            console.log("Reservas futuras:", reservasFuturas);

            // Contenedor donde se mostrarán las tarjetas
            const contenedor = document.getElementById("contenedorReservas");

            contenedor.innerHTML = "";

            // Si no existen reservas futuras
            if (reservasFuturas.length === 0) {

                contenedor.innerHTML = `
                    <div class="alert alert-info text-center">
                        No posee reservas futuras.
                    </div>
                `;

                return;
            }

            // Crear una tarjeta por cada reserva
            reservasFuturas.forEach(reserva => {

                contenedor.innerHTML += `

                    <div class="card shadow-sm border-0 mb-4">

                        <div class="card-header text-white"
                             style="background:#6c6480;">

                            <h5 class="mb-0">
                                Datos de la Reserva
                            </h5>

                        </div>

                        <div class="card-body">

                            <p><strong>Fecha:</strong> ${reserva.FECHA_A_RESERVAR}</p>

                            <hr>

                            <p><strong>Cantidad de alumnos:</strong> ${reserva.CANTIDAD_ALUMNOS}</p>

                            <hr>

                            <p><strong>Tipo de actividad:</strong> ${reserva.tipo_actividad}</p>

                            <hr>

                            <p><strong>Edificio:</strong> ${reserva.EDIFICIO}</p>

                            <hr>

                            <p><strong>Laboratorio:</strong> ${reserva.NUMERO_LABORATORIO}</p>

                            <br>

                            <div class="d-flex justify-content-center gap-3">

                                <button id="botonEditar" class="btn btn-outline-secondary px-4">
                                    Editar
                                </button>

                                <button id="botonCancelar" class="btn px-4 text-white"
                                        style="background:#6c6480; border-color:#6c6480;"
                                        data-bs-toggle="modal"
                                        data-bs-target="#modalCancelar">
                                    Cancelar Reserva
                                </button>

                            </div>

                        </div>

                    </div>

                `;

            });

            document.getElementById("botonEditar").addEventListener("click", function(e){

                e.preventDefault();

                let reserva = reservasFuturas[0];


                sessionStorage.setItem(
                    "reservaEditar",
                    JSON.stringify(reserva)
                );


                window.location.href = "edificio.html";

            });

        })

        

        .catch(error => {

            console.error(error);

            document.getElementById("contenedorReservas").innerHTML = `
                <div class="alert alert-danger text-center">
                    Error al consultar las reservas.
                </div>
            `;

        });

});

