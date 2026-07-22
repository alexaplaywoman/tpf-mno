document.addEventListener("DOMContentLoaded", function () {

    document.getElementById("botonAtras").addEventListener("click", function () {
        window.location.href = "consultar_reserva.html";
    });

    const usuario = sessionStorage.getItem("usuario");
    const clave = sessionStorage.getItem("clave");

    const numeroCedula = sessionStorage.getItem("numeroCedula");
    const correo = sessionStorage.getItem("correo");

    console.log("Usuario:", usuario);
    console.log("Clave presente:", !!clave);
    console.log("Número de cédula:", numeroCedula);
    console.log("Correo:", correo);

    const contenedor = document.getElementById("contenedorReservas");

    const NOMBRES_ESTADO_RESERVA = {
        P: "Pendiente",
        U: "Utilizada",
        C: "Cancelada",
        A: "Ausente"
    };

    function formatearHora(hora) {

        if (hora === null || hora === undefined)
            return "-";


        let horas;
        let minutos;


        if (hora instanceof Date) {

            horas = hora.getHours();
            minutos = hora.getMinutes();

        } else {

            const partes = String(hora).split(":");

            horas = parseInt(partes[0],10);
            minutos = parseInt(partes[1],10);

        }


        if(Number.isNaN(horas) || Number.isNaN(minutos))
            return String(hora);



        const periodo = horas < 12 ? "a. m." : "p. m.";

        let horas12 = horas % 12;

        if(horas12 === 0)
            horas12 = 12;


        const minutosStr = String(minutos).padStart(2,"0");


        return `${horas12}:${minutosStr} ${periodo}`;

    }

    function formatearFecha(fecha){

        if(!fecha)
            return "-";

        let anio;
        let mes;
        let dia;

        if(fecha instanceof Date){

            anio = fecha.getFullYear();
            mes = fecha.getMonth();
            dia = fecha.getDate();

        }else{

            const soloFecha = String(fecha).split("T")[0];
            const partes = soloFecha.split("-");

            if(partes.length !== 3)
                return String(fecha);

            anio = parseInt(partes[0],10);
            mes = parseInt(partes[1],10)-1;
            dia = parseInt(partes[2],10);

        }

        const fechaLocal = new Date(anio,mes,dia);

        if(Number.isNaN(fechaLocal.getTime()))
            return String(fecha);

        return fechaLocal.toLocaleDateString("es-PY",{

            weekday:"long",
            day:"numeric",
            month:"long",
            year:"numeric"

        });

    }

    if(!usuario || !clave){

        contenedor.innerHTML = `
            <div class="alert alert-warning text-center">
                No hay una sesión activa. Volvé a iniciar sesión.
            </div>
        `;

        return;

    }

    let reservasActuales = [];
    let paginaActual = 1;
    const limite = 5;

    function mostrarReservas(){

        const inicio = (paginaActual - 1) * limite;
        const fin = inicio + limite;
        const reservas = reservasActuales.slice(inicio,fin);

        contenedor.innerHTML = "";

        if(reservas.length === 0){
            contenedor.innerHTML = `
                <div class="alert alert-info text-center">
                    No posee reservas futuras.
                </div>
            `;

            return;

        }

        reservas.forEach(reserva => {

            const recursos = reserva.recursos && reserva.recursos.trim() !== ""
            ? reserva.recursos
            : "Sin recursos asociados";

            contenedor.innerHTML += `

            <div class="card shadow-sm border-0 mb-4"
                 data-id="${reserva.ID_RESERVA}">
                <div class="card-header text-white"
                     style="background:#6c6480;">
                    <h5 class="mb-0">
                        Datos de la Reserva
                    </h5>

                </div>

                <div class="card-body">

                    <p><strong>Fecha:</strong>
                    ${formatearFecha(reserva.FECHA_A_RESERVAR)}</p>

                    <hr>

                    <p><strong>Horario:</strong>
                    ${formatearHora(reserva.HORA_INICIO)}
                    a
                    ${formatearHora(reserva.HORA_FIN)}</p>

                    <hr>

                    <p><strong>Cantidad de alumnos:</strong>
                    ${reserva.CANTIDAD_ALUMNOS}</p>

                    <hr>

                    <p><strong>Tipo de actividad:</strong>
                    ${reserva.tipo_actividad}</p>

                    <hr>

                    <p><strong>Estado:</strong>
                    ${NOMBRES_ESTADO_RESERVA[reserva.estado] 
                    ?? reserva.estado 
                    ?? "-"}</p>

                    <hr>

                    <p><strong>Edificio:</strong>
                    ${reserva.EDIFICIO}</p>

                    <hr>

                    <p><strong>Laboratorio:</strong>
                    ${reserva.NUMERO_LABORATORIO}</p>

                    <hr>

                    <p><strong>Recursos:</strong>
                    ${recursos}</p>

                    <br>

                    <div class="d-flex justify-content-center gap-3">

                        <button
                        class="btn px-4 text-white btn-cancelar"
                        data-id="${reserva.ID_RESERVA}"
                        style="background:#6c6480;border-color:#6c6480;"
                        data-bs-toggle="modal"
                        data-bs-target="#modalCancelar">
                            Cancelar Reserva
                        </button>

                    </div>

                </div>

            </div>

            `;

        });

    }

        function crearPaginacion(){

        const items = document.getElementById("items");

        if(!items)
            return;

        items.innerHTML = "";

        const cantidadPaginas = Math.ceil(
            reservasActuales.length / limite
        );

        for(let i = 1; i <= cantidadPaginas; i++){

            items.innerHTML += `

                <li class="page-item ${paginaActual === i ? "active" : ""}">

                    <button 
                        class="page-link"
                        onclick="cambiarPagina(${i})">

                        ${i}

                    </button>

                </li>

            `;

        }

    }

    window.cambiarPagina = function(numero){

        paginaActual = numero;

        mostrarReservas();
        crearPaginacion();

    };

    window.nextPage = function(){

        const cantidadPaginas = Math.ceil(
            reservasActuales.length / limite
        );

        if(paginaActual < cantidadPaginas){

            paginaActual++;

            mostrarReservas();
            crearPaginacion();

        }

    };

    window.previusPage = function(){

        if(paginaActual > 1){

            paginaActual--;

            mostrarReservas();
            crearPaginacion();

        }

    };

    const url = `/api/reservas/mis-reservas/${encodeURIComponent(numeroCedula)}`
        + `?usuario=${encodeURIComponent(usuario)}`
        + `&clave=${encodeURIComponent(clave)}`
        + `&correo=${encodeURIComponent(correo)}`;

    fetch(url)

        .then(response => {

            if(!response.ok){

                return response.json()

                .then(body => {

                    throw new Error(
                        body.error || 
                        "Error al consultar las reservas."
                    );

                })

                .catch(()=>{

                    throw new Error(
                        "Error al consultar las reservas."
                    );

                });


            }

            return response.json();

        })

        .then(reservas => {

            console.log(
                "Reservas futuras del usuario:",
                reservas
            );

            reservasActuales = reservas;
            paginaActual = 1;

            mostrarReservas();
            crearPaginacion();

        })

        .catch(error => {

            console.error(error);
            contenedor.innerHTML = `
                <div class="alert alert-danger text-center">
                    ${error.message || 
                    "Error al consultar las reservas."}
                </div>
            `;

        });

    contenedor.addEventListener("click", function(e){

        if(!e.target.classList.contains("btn-cancelar"))
            return;

        const card = e.target.closest("[data-id]");

        if(!card)
            return;

        const idReserva = Number(card.dataset.id);

        const reserva = reservasActuales.find(r =>

            Number(r.ID_RESERVA) === idReserva

        );

        if(!reserva)
            return;

        sessionStorage.setItem(
            "reservaCancelar",
            idReserva
        );

        window.location.href = "cancelar.html";

    });

});