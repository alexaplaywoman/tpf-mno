document.addEventListener('DOMContentLoaded', async function () {


    const btnInicio = document.getElementById("inicio");


    if (btnInicio) {

        btnInicio.addEventListener(
            "click",
            function (e) {

                e.preventDefault();

                window.location.href = "/list_reservas.html";

            }
        );

    }



    const form = document.getElementById(
        'update-reserva-form'
    );


    const errorMessage = document.getElementById(
        'error-message'
    );


    const selectLaboratorio = document.getElementById(
        'laboratorio'
    );

    const selectEstado = document.getElementById(
        'estado'
    );

    const selectMotivoCancelacion = document.getElementById(
        'motivoCancelacion'
    );

    const grupoMotivoCancelacion = document.getElementById(
        'grupoMotivoCancelacion'
    );



    const id = new URLSearchParams(
        window.location.search
    ).get('id');



    if (!id) {

        errorMessage.textContent =
            "Falta el ID de la reserva en la URL.";

        return;

    }



    const usuario = sessionStorage.getItem(
        'usuario'
    );


    const clave = sessionStorage.getItem(
        'clave'
    );



    if (!usuario || !clave) {

        errorMessage.textContent =
            "Faltan credenciales.";

        return;

    }



    let estadoOriginal = "";
    let motivoCancelacionOriginal = "";
    let programacionOriginal = null;





    function cargarEstados() {

        return fetch(
            `/api/reservas/estados/listar`
        )

        .then(res => res.json())

        .then(estados => {

            selectEstado.innerHTML = `

                <option value="">
                    Seleccione un estado
                </option>

            `;

            estados.forEach(estado => {

                const option =
                    document.createElement("option");

                option.value =
                    estado.id_estado_reserva;

                option.textContent =
                    estado.nombre;

                selectEstado.appendChild(
                    option
                );

            });

        })

        .catch(error => {

            console.error(error);

            errorMessage.textContent =
                "No se pudieron cargar los estados.";

        });

    }


    function cargarMotivosCancelacion() {

        return fetch(
            `/api/reservas/motivos-cancelacion`
        )

        .then(res => res.json())

        .then(motivos => {

            selectMotivoCancelacion.innerHTML = `

                <option value="">
                    Seleccione el motivo de cancelación
                </option>

            `;

            motivos.forEach(motivo => {

                const option =
                    document.createElement("option");

                option.value = motivo;
                option.textContent = motivo;

                selectMotivoCancelacion.appendChild(
                    option
                );

            });

        })

        .catch(error => {

            console.error(error);

            errorMessage.textContent =
                "No se pudieron cargar los motivos de cancelación.";

        });

    }

    // El motivo solo aplica (y solo es obligatorio) cuando el estado
    // elegido es Cancelada (3). El select arranca oculto y sin "required"
    // en el HTML; esto lo prende/apaga segun corresponda.
    function actualizarVisibilidadMotivo() {

        const esCancelada = Number(selectEstado.value) === 3;

        grupoMotivoCancelacion.style.display = esCancelada ? "" : "none";
        selectMotivoCancelacion.required = esCancelada;

    }

    selectEstado.addEventListener("change", actualizarVisibilidadMotivo);



    function cargarLaboratorios() {


        return fetch(
            `/api/laboratorios?usuario=${encodeURIComponent(usuario)}&clave=${encodeURIComponent(clave)}`
        )


        .then(res => res.json())


        .then(laboratorios => {


            selectLaboratorio.innerHTML = `

                <option value="">
                    Seleccione un laboratorio
                </option>

            `;



            laboratorios.forEach(lab => {


                const option =
                    document.createElement("option");



                option.value =
                    lab.NUMERO_LABORATORIO;



                option.textContent =
                    `Laboratorio ${lab.NUMERO_LABORATORIO} - ${lab.EDIFICIO}`;



                selectLaboratorio.appendChild(
                    option
                );


            });


        })


        .catch(error => {


            console.error(error);


            errorMessage.textContent =
                "No se pudieron cargar los laboratorios.";


        });


    }






    function cargarReserva() {


        return fetch(
            `/api/reservas/${id}?usuario=${encodeURIComponent(usuario)}&clave=${encodeURIComponent(clave)}`
        )


        .then(async response => {


            const data =
                await response.json().catch(() => null);



            if(
                !response.ok ||
                !data ||
                data.success === false
            ) {


                throw new Error(
                    data?.error ||
                    "No se encontró la reserva."
                );


            }



            const reserva =
                data.reserva;



            selectLaboratorio.value =
                reserva.NUMERO_LABORATORIO ?? "";



            selectEstado.value =
                reserva.ID_ESTADO_RESERVA ?? "";

            selectMotivoCancelacion.value =
                reserva.MOTIVO_CANCELACION ?? "";

            actualizarVisibilidadMotivo();



            document.getElementById("fecha").value =
                String(reserva.FECHA_A_RESERVAR)
                .split("T")[0];



            document.getElementById("horaInicio").value =
                String(reserva.HORA_INICIO)
                .slice(0,5);



            document.getElementById("horaFin").value =
                String(reserva.HORA_FIN)
                .slice(0,5);



            // Guardamos los valores originales para saber, al enviar el
            // formulario, que cambio realmente el usuario: si el estado
            // (-> /marcar) y/o el laboratorio/fecha/horario (-> /reprogramar).
            estadoOriginal = String(reserva.ID_ESTADO_RESERVA ?? "");
            motivoCancelacionOriginal = String(reserva.MOTIVO_CANCELACION ?? "");
            programacionOriginal = {
                numero_laboratorio: String(reserva.NUMERO_LABORATORIO ?? ""),
                fecha_a_reservar: String(reserva.FECHA_A_RESERVAR).split("T")[0],
                hora_inicio: String(reserva.HORA_INICIO).slice(0, 5),
                hora_fin: String(reserva.HORA_FIN).slice(0, 5)
            };



        })



        .catch(error => {


            console.error(error);


            errorMessage.textContent =
                error.message;


        });


    }




    await cargarLaboratorios();

    await cargarEstados();

    await cargarMotivosCancelacion();

    await cargarReserva();

    const monthYearEl = document.getElementById("month-year");
    const daysEl = document.getElementById("days");
    const prevMonthBtn = document.getElementById("prev-month");
    const nextMonthBtn = document.getElementById("next-month");
    const todayBtn = document.getElementById("today-btn");
    let currentDate = new Date();
    let selectedDate = null;
    let reservasOcupadas = [];
    let feriados = [];

    async function cargarFechasOcupadas() {

        try {

            const respuesta =
                await fetch(
                    `/api/reservas/fechas-ocupadas?usuario=${encodeURIComponent(usuario)}&clave=${encodeURIComponent(clave)}`
                );

            if(respuesta.ok) {

                reservasOcupadas = await respuesta.json();

            } else {

                reservasOcupadas = [];

            }

        } catch(error) {

            console.error(error);

            reservasOcupadas = [];

        }

    }

    async function cargarFeriados() {

        try {

            const respuesta =
                await fetch(
                    `/api/feriados?usuario=${encodeURIComponent(usuario)}&clave=${encodeURIComponent(clave)}`
                );

            feriados = respuesta.ok ? await respuesta.json() : [];

        } catch(error) {

            console.error(error);

            feriados = [];

        }

    }

    function renderCalendar() {
        daysEl.innerHTML = "";

        const year =
            currentDate.getFullYear();

        const month =
            currentDate.getMonth();

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

        monthYearEl.textContent =
            `${meses[month]} ${year}`;

        const primerDia =
            new Date(year, month, 1).getDay();

        const ultimoDia =
            new Date(year, month + 1, 0).getDate();

        for(let i = 0; i < primerDia; i++) {

            daysEl.appendChild(
                document.createElement("div")
            );

        }

        let hoy = new Date();

        hoy.setHours(
            0,
            0,
            0,
            0
        );

        for(let i = 1; i <= ultimoDia; i++) {

            let day =
                document.createElement("div");

            day.classList.add(
                "day"
            );

            day.textContent = i;

            let fecha = new Date(year, month, i);
            let fechaString = `${year}-${String(month + 1).padStart(2,"0")}-${String(i).padStart(2,"0")}`;
            let esFinSemana = fecha.getDay() === 0 || fecha.getDay() === 6;
            let esPasado = fecha < hoy;
            let reservaEseDia = reservasOcupadas.find(r => r.fecha === fechaString);
            let feriadoEseDia = feriados.find(f => String(f.FECHA).split('T')[0] === fechaString);

            if(esPasado || esFinSemana || feriadoEseDia) {

                day.classList.add(
                    "deshabilitado"
                );

                if(esPasado) {

                    day.title =
                        "Fecha pasada";

                } else if(esFinSemana) {

                    day.title =
                        "No se permiten reservas los fines de semana";

                } else {

                    day.title =
                        `Feriado: ${feriadoEseDia.DESCRIPCION || ''}`;

                }

            } else {

                if(reservaEseDia) {

                    day.classList.add(
                        "has-events"
                    );

                    day.title =
                        "Hay reservas ese día";

                }

                day.addEventListener("click",
                    function() {

                        selectedDate = fecha;

                        document.getElementById("fecha").value = fechaString;

                        renderCalendar();

                    }
                );

            }

            if(
                hoy.getDate() === i &&
                hoy.getMonth() === month &&
                hoy.getFullYear() === year
            ) {

                day.classList.add(
                    "today"
                );


            }

            if(
                selectedDate &&
                selectedDate.getDate() === i &&
                selectedDate.getMonth() === month &&
                selectedDate.getFullYear() === year
            ) {

                day.classList.add(
                    "selected"
                );


            }

            daysEl.appendChild(
                day
            );

        }

    }

    if(prevMonthBtn) {

        prevMonthBtn.addEventListener(
            "click",
            function() {

                currentDate.setMonth(
                    currentDate.getMonth() - 1
                );

                renderCalendar();

            }
        );


    }

    if(nextMonthBtn) {

        nextMonthBtn.addEventListener(
            "click",
            function() {

                currentDate.setMonth(
                    currentDate.getMonth() + 1
                );

                renderCalendar();


            }
        );


    }

    if(todayBtn) {

        todayBtn.addEventListener(
            "click",
            function() {

                currentDate =
                    new Date();

                renderCalendar();


            }
        );


    }

    await cargarFechasOcupadas();
    await cargarFeriados();

    renderCalendar();

        form.addEventListener(
        "submit",
        async function(event) {

            event.preventDefault();

            errorMessage.textContent = "";

            const nuevaProgramacion = {
                numero_laboratorio: selectLaboratorio.value,
                fecha_a_reservar: document.getElementById("fecha").value,
                hora_inicio: document.getElementById("horaInicio").value,
                hora_fin: document.getElementById("horaFin").value
            };

            const cambioEstado =
                selectEstado.value !== "" &&
                selectEstado.value !== estadoOriginal;

            const cambioMotivo =
                Number(selectEstado.value) === 3 &&
                selectMotivoCancelacion.value !== motivoCancelacionOriginal;

            const cambioProgramacion =
                programacionOriginal &&
                (nuevaProgramacion.numero_laboratorio !== programacionOriginal.numero_laboratorio ||
                 nuevaProgramacion.fecha_a_reservar !== programacionOriginal.fecha_a_reservar ||
                 nuevaProgramacion.hora_inicio !== programacionOriginal.hora_inicio ||
                 nuevaProgramacion.hora_fin !== programacionOriginal.hora_fin);

            try {

                // El estado (Pendiente/Utilizada/Cancelada/Ausente) se
                // actualiza por /marcar, que no tiene la restriccion de
                // "ya Cancelada o Utilizada" que si tiene /reprogramar.
                if (cambioEstado || cambioMotivo) {

                    const bodyMarcar = {
                        usuario,
                        clave,
                        id_estado_reserva: Number(selectEstado.value)
                    };

                    if (Number(selectEstado.value) === 3) {
                        bodyMarcar.motivo_cancelacion = selectMotivoCancelacion.value;
                    }

                    const respuestaEstado = await fetch(`/api/reservas/marcar/${id}`,
                        {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify(bodyMarcar)
                        }
                    );

                    const dataEstado =
                        await respuestaEstado.json()
                        .catch(() => null);

                    if(
                        !respuestaEstado.ok ||
                        !dataEstado ||
                        dataEstado.success === false
                    ) {

                        throw new Error(
                            dataEstado?.error ||
                            "Error al actualizar el estado de la reserva."
                        );

                    }

                    estadoOriginal = selectEstado.value;
                    motivoCancelacionOriginal = selectMotivoCancelacion.value;

                }

                // El laboratorio/fecha/horario se actualizan por
                // /reprogramar, que bloquea si la reserva ya esta
                // Cancelada o Utilizada.
                if (cambioProgramacion) {

                    const response = await fetch(`/api/reservas/reprogramar/${id}`,
                            {
                                method: "POST",
                                headers: {

                                    "Content-Type":
                                        "application/json"

                                },

                                body: JSON.stringify({ usuario, clave, ...nuevaProgramacion })

                            }
                        );

                    const data =
                        await response.json()
                        .catch(() => null);

                    if(
                        !response.ok ||
                        !data ||
                        data.success === false
                    ) {

                        throw new Error(
                            data?.error ||
                            "Error al reprogramar la reserva."
                        );


                    }

                    programacionOriginal = nuevaProgramacion;

                }

                window.location.href = "/list_reservas.html";

            } catch(error) {

                console.error(error);

                errorMessage.textContent =
                    error.message;

            }

        }
    );

});