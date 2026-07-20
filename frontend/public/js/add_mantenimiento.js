document.addEventListener("DOMContentLoaded", function () {

    const btnInicio = document.getElementById("inicio");
    const form = document.getElementById("add-mantenimiento-form");
    const errorMessage = document.getElementById("error-message");
    const selectLaboratorio = document.getElementById("laboratorio");

    const usuario = sessionStorage.getItem("usuario");
    const clave = sessionStorage.getItem("clave");


    if (btnInicio) {
        btnInicio.addEventListener("click", function (e) {
            e.preventDefault();
            window.location.href = "/list_mantenimientos.html";
        });
    }


    if (!usuario || !clave) {
        errorMessage.textContent = "Faltan las credenciales del usuario.";
        return;
    }

    function cargarLaboratorios() {

        fetch(`/api/laboratorios?usuario=${encodeURIComponent(usuario)}&clave=${encodeURIComponent(clave)}`)

            .then(res => res.json())

            .then(laboratorios => {

                selectLaboratorio.innerHTML = `
                    <option value="">Seleccione un laboratorio</option>
                `;


                laboratorios.forEach(lab => {

                    const option = document.createElement("option");

                    option.value = lab.NUMERO_LABORATORIO;

                    option.textContent =
                        `Laboratorio ${lab.NUMERO_LABORATORIO} - ${lab.EDIFICIO}`;


                    selectLaboratorio.appendChild(option);

                });

            })

            .catch(error => {

                console.error(error);

                errorMessage.textContent =
                    "No se pudieron cargar los laboratorios.";

            });

    }


    cargarLaboratorios();

    form.addEventListener("submit", function (e) {

        e.preventDefault();


        errorMessage.textContent = "";


        const mantenimientoData = {

            usuario,
            clave,

            numero_laboratorio:
                selectLaboratorio.value,


            fecha_inicio:
                document.getElementById("fechaInicio").value,


            fecha_fin_prevista:
                document.getElementById("fechaFinPrevista").value,


            observaciones:
                document.getElementById("observaciones").value

        };



        fetch("/api/mantenimientos/add", {

            method: "POST",

            headers: {

                "Content-Type": "application/json"

            },

            body: JSON.stringify(mantenimientoData)

        })


        .then(async response => {

            const data = await response.json();


            if (!response.ok || data.success === false) {

                throw new Error(
                    data.error ||
                    "Error al agregar mantenimiento"
                );

            }


            window.location.href =
                "/list_mantenimientos.html";


        })


        .catch(error => {

            console.error(error);

            errorMessage.textContent =
                error.message;

        });


    });





    // =====================================
    // VARIABLES CALENDARIO INICIO
    // =====================================


    const calendarioInicio = {

        currentDate: new Date(),

        selectedDate: null,

        monthYear:
            document.getElementById("month-year-inicio"),

        days:
            document.getElementById("days-inicio"),

        prev:
            document.getElementById("prev-month-inicio"),

        next:
            document.getElementById("next-month-inicio"),

        today:
            document.getElementById("today-btn-inicio"),

        input:
            document.getElementById("fechaInicio")

    };





    // =====================================
    // VARIABLES CALENDARIO FIN
    // =====================================


    const calendarioFin = {

        currentDate: new Date(),

        selectedDate: null,

        monthYear:
            document.getElementById("month-year-fin"),

        days:
            document.getElementById("days-fin"),

        prev:
            document.getElementById("prev-month-fin"),

        next:
            document.getElementById("next-month-fin"),

        today:
            document.getElementById("today-btn-fin"),

        input:
            document.getElementById("fechaFinPrevista")

    };





    let reservasOcupadas = [];





    // =====================================
    // CARGAR RESERVAS
    // =====================================


    async function cargarFechasOcupadas() {


        try {


            const respuesta = await fetch(
                `/api/reservas/fechas-ocupadas?usuario=${usuario}&clave=${clave}`
            );



            if (respuesta.ok) {

                reservasOcupadas =
                    await respuesta.json();

            } else {

                reservasOcupadas = [];

            }


        } catch(error) {


            console.error(error);

            reservasOcupadas = [];


        }


    }

        // =====================================
    // RENDER CALENDARIO GENERAL
    // =====================================

    function renderCalendar(calendario) {


        calendario.days.innerHTML = "";


        const year = calendario.currentDate.getFullYear();

        const month = calendario.currentDate.getMonth();



        const meses = [
            "Enero", "Febrero", "Marzo", "Abril",
            "Mayo", "Junio", "Julio", "Agosto",
            "Septiembre", "Octubre", "Noviembre", "Diciembre"
        ];



        calendario.monthYear.textContent =
            `${meses[month]} ${year}`;



        const primerDia =
            new Date(year, month, 1).getDay();



        const ultimoDia =
            new Date(year, month + 1, 0).getDate();



        for (let i = 0; i < primerDia; i++) {

            calendario.days.appendChild(
                document.createElement("div")
            );

        }



        const hoy = new Date();

        hoy.setHours(0,0,0,0);



        for (let i = 1; i <= ultimoDia; i++) {


            const day = document.createElement("div");


            day.classList.add("day");


            day.textContent = i;



            const fecha =
                new Date(year, month, i);



            const fechaString =
                `${year}-${String(month + 1).padStart(2,"0")}-${String(i).padStart(2,"0")}`;



            const diaSemana =
                fecha.getDay();



            const esFinSemana =
                diaSemana === 0 ||
                diaSemana === 6;



            const esPasado =
                fecha < hoy;



            const reservaEseDia =
                reservasOcupadas.find(
                    r => r.fecha === fechaString
                );



            if (esPasado || esFinSemana) {


                day.classList.add("deshabilitado");


                day.title =
                    esPasado
                        ? "Fecha pasada"
                        : "Fin de semana: no permitido";



            } else {



                if (reservaEseDia) {

                    day.classList.add("has-events");

                    day.title =
                        "Hay una reserva ese día";

                }



                day.addEventListener("click", function () {


                    calendario.selectedDate =
                        new Date(year, month, i);



                    calendario.selectedDate.setHours(
                        0,0,0,0
                    );



                    calendario.input.value =
                        fechaString;



                    renderCalendar(calendario);



                });



            }




            // marcar hoy

            if (

                hoy.getDate() === i &&

                hoy.getMonth() === month &&

                hoy.getFullYear() === year

            ) {

                day.classList.add("today");

            }





            // marcar seleccionado

            if (
                calendario.selectedDate &&
                calendario.selectedDate.getDate() === i &&
                calendario.selectedDate.getMonth() === month &&
                calendario.selectedDate.getFullYear() === year
            ) {

                console.log("PINTANDO SELECCIONADO:", i);

                day.classList.add("selected");

            }

            calendario.days.appendChild(day);


        }


    }





    // =====================================
    // BOTONES CALENDARIO INICIO
    // =====================================


    if (calendarioInicio.prev) {

        calendarioInicio.prev.addEventListener(
            "click",
            function(){

                calendarioInicio.currentDate.setMonth(
                    calendarioInicio.currentDate.getMonth() - 1
                );


                renderCalendar(calendarioInicio);

            }
        );

    }



    if (calendarioInicio.next) {

        calendarioInicio.next.addEventListener(
            "click",
            function(){

                calendarioInicio.currentDate.setMonth(
                    calendarioInicio.currentDate.getMonth() + 1
                );


                renderCalendar(calendarioInicio);

            }
        );

    }



    if (calendarioInicio.today) {

        calendarioInicio.today.addEventListener(
            "click",
            function(){

                calendarioInicio.currentDate =
                    new Date();


                renderCalendar(calendarioInicio);

            }
        );

    }





    // =====================================
    // BOTONES CALENDARIO FIN
    // =====================================


    if (calendarioFin.prev) {

        calendarioFin.prev.addEventListener(
            "click",
            function(){

                calendarioFin.currentDate.setMonth(
                    calendarioFin.currentDate.getMonth() - 1
                );


                renderCalendar(calendarioFin);

            }
        );

    }



    if (calendarioFin.next) {

        calendarioFin.next.addEventListener(
            "click",
            function(){

                calendarioFin.currentDate.setMonth(
                    calendarioFin.currentDate.getMonth() + 1
                );


                renderCalendar(calendarioFin);

            }
        );

    }



    if (calendarioFin.today) {

        calendarioFin.today.addEventListener(
            "click",
            function(){

                calendarioFin.currentDate =
                    new Date();


                renderCalendar(calendarioFin);

            }
        );

    }





    // =====================================
    // INICIAR CALENDARIOS
    // =====================================


    async function iniciarCalendarios(){


        await cargarFechasOcupadas();


        renderCalendar(calendarioInicio);


        renderCalendar(calendarioFin);


    }



    iniciarCalendarios();


});