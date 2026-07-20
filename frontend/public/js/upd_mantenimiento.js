document.addEventListener('DOMContentLoaded', async function () {

    const btnInicio = document.getElementById("inicio");

    if (btnInicio) {
        btnInicio.addEventListener("click", function (e) {
            e.preventDefault();
            window.location.href = "/list_mantenimientos.html";
        });
    }


    const form = document.getElementById("update-mantenimiento-form");
    const errorMessage = document.getElementById("error-message");
    const selectEstado = document.getElementById("estado");


    const monthYearEl = document.getElementById("month-year");
    const daysEl = document.getElementById("days");
    const prevMonthBtn = document.getElementById("prev-month");
    const nextMonthBtn = document.getElementById("next-month");
    const todayBtn = document.getElementById("today-btn");


    const inputFecha = document.getElementById("fechaFinPrevista");


    const ESTADOS_MANTENIMIENTO_LABELS = {
        P: "Pendiente",
        E: "En proceso",
        R: "Realizado",
        C: "Cancelado"
    };


    const id = new URLSearchParams(window.location.search).get("id");


    if (!id) {
        errorMessage.textContent = "Falta el ID del mantenimiento.";
        return;
    }


    const usuario = sessionStorage.getItem("usuario");
    const clave = sessionStorage.getItem("clave");


    if (!usuario || !clave) {
        errorMessage.textContent = "Faltan credenciales.";
        return;
    }


    let currentDate = new Date();
    let selectedDate = null;
    let reservasOcupadas = [];


    async function cargarFechasOcupadas() {

        try {

            const respuesta = await fetch(
                `/api/reservas/fechas-ocupadas?usuario=${encodeURIComponent(usuario)}&clave=${encodeURIComponent(clave)}`
            );


            if (respuesta.ok) {

                reservasOcupadas = await respuesta.json();

            } else {

                reservasOcupadas = [];

            }


        } catch(error) {

            console.error(error);

            reservasOcupadas = [];

        }

    }

        function renderCalendar() {

        daysEl.innerHTML = "";


        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();


        const meses = [
            "Enero",
            "Febrero",
            "Marzo",
            "Abril",
            "Mayo",
            "Junio",
            "Julio",
            "Agosto",
            "Septiembre",
            "Octubre",
            "Noviembre",
            "Diciembre"
        ];


        monthYearEl.textContent = `${meses[month]} ${year}`;


        const primerDia = new Date(year, month, 1).getDay();

        const ultimoDia = new Date(year, month + 1, 0).getDate();


        for (let i = 0; i < primerDia; i++) {

            daysEl.appendChild(document.createElement("div"));

        }


        const hoy = new Date();

        hoy.setHours(0,0,0,0);



        for (let i = 1; i <= ultimoDia; i++) {


            const day = document.createElement("div");

            day.classList.add("day");

            day.textContent = i;



            const fecha = new Date(year, month, i);


            const fechaString =
                `${year}-${String(month + 1).padStart(2,"0")}-${String(i).padStart(2,"0")}`;



            const esFinSemana =
                fecha.getDay() === 0 ||
                fecha.getDay() === 6;


            const esPasado =
                fecha < hoy;



            const reservaEseDia =
                reservasOcupadas.find(
                    r => r.fecha === fechaString
                );



            if (esPasado || esFinSemana) {


                day.classList.add("deshabilitado");


                day.title = esPasado
                    ? "Fecha pasada"
                    : "No se permiten reservas los fines de semana";



            } else {


                if (reservaEseDia) {

                    day.classList.add("has-events");

                    day.title = "Hay reservas ese día";

                }



                day.addEventListener("click", function () {


                    selectedDate = new Date(
                        year,
                        month,
                        i
                    );


                    inputFecha.value = fechaString;



                    renderCalendar();


                });


            }



            if (
                hoy.getDate() === i &&
                hoy.getMonth() === month &&
                hoy.getFullYear() === year
            ) {

                day.classList.add("today");

            }




            if(
                selectedDate &&
                selectedDate.getDate() === i &&
                selectedDate.getMonth() === month &&
                selectedDate.getFullYear() === year
            ) {

                console.log("SELECCIONADO:", i);

                day.classList.add("selected");

            }

            daysEl.appendChild(day);


        }


    }

    if (prevMonthBtn) {

        prevMonthBtn.addEventListener("click", function () {

            currentDate.setMonth(
                currentDate.getMonth() - 1
            );

            renderCalendar();

        });

    }



    if (nextMonthBtn) {

        nextMonthBtn.addEventListener("click", function () {

            currentDate.setMonth(
                currentDate.getMonth() + 1
            );

            renderCalendar();

        });

    }



    if (todayBtn) {

        todayBtn.addEventListener("click", function () {

            currentDate = new Date();

            renderCalendar();

        });

    }

        function cargarEstados() {

        return fetch(
            `/api/mantenimientos/estados/listar?usuario=${encodeURIComponent(usuario)}&clave=${encodeURIComponent(clave)}`
        )
        .then(res => res.json())
        .then(estados => {


            selectEstado.innerHTML = `
                <option value="">Seleccione un estado</option>
            `;



            estados.forEach(estado => {

                const option = document.createElement("option");

                option.value =
                    estado.ID_ESTADO_MANTENIMIENTO;


                option.textContent =
                    ESTADOS_MANTENIMIENTO_LABELS[estado.ESTADO_MANTENIMIENTO]
                    || estado.ESTADO_MANTENIMIENTO;



                selectEstado.appendChild(option);

            });


        })
        .catch(error => {

            console.error(error);

            errorMessage.textContent =
                "No se pudieron cargar los estados.";

        });


    }



    function cargarMantenimiento() {


        return fetch(
            `/api/mantenimientos/${id}?usuario=${encodeURIComponent(usuario)}&clave=${encodeURIComponent(clave)}`
        )
        .then(async response => {


            const data =
                await response.json();



            if (!response.ok || data.success === false) {

                throw new Error(
                    data.error ||
                    "No se encontró el mantenimiento."
                );

            }



            const mant =
                data.mantenimiento;



            selectEstado.value =
                mant.ID_ESTADO_MANTENIMIENTO || "";



            inputFecha.value =
                String(mant.FECHA_FIN_PREVISTA)
                .split("T")[0];



            selectedDate =
                new Date(inputFecha.value + "T00:00:00");



            document.getElementById("observaciones").value =
                mant.OBSERVACIONES || "";



            renderCalendar();



        })
        .catch(error => {

            console.error(error);

            errorMessage.textContent =
                error.message;

        });


    }




    form.addEventListener("submit", async function(event) {


        event.preventDefault();


        errorMessage.textContent = "";



        const datos = {


            usuario,

            clave,


            id_estado_mantenimiento:
                selectEstado.value,


            fecha_fin_prevista:
                inputFecha.value,


            observaciones:
                document.getElementById("observaciones").value


        };



        try {


            const response =
                await fetch(
                    `/api/mantenimientos/estado/${id}`,
                    {

                        method: "POST",

                        headers: {

                            "Content-Type":
                                "application/json"

                        },


                        body:
                            JSON.stringify(datos)

                    }
                );



            const data =
                await response.json();



            if (!response.ok || data.success === false) {

                throw new Error(
                    data.error ||
                    "Error al actualizar mantenimiento."
                );

            }



            window.location.href =
                "/list_mantenimientos.html";



        } catch(error) {


            console.error(error);

            errorMessage.textContent =
                error.message;


        }



    });




    await cargarFechasOcupadas();


    await cargarEstados();


    await cargarMantenimiento();


    renderCalendar();


});