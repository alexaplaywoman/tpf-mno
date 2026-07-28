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

    const form = document.getElementById('update-reserva-form');
    const errorMessage = document.getElementById('error-message');
    const selectEstado = document.getElementById('estado');
    const selectMotivoCancelacion = document.getElementById('motivoCancelacion');
    const grupoMotivoCancelacion = document.getElementById('grupoMotivoCancelacion');
    
    const id = new URLSearchParams(window.location.search).get('id');

    if (!id) {

        errorMessage.textContent =
            "Falta el ID de la reserva en la URL.";

        return;

    }

    const usuario = sessionStorage.getItem('usuario');
    const clave = sessionStorage.getItem('clave');

    if (!usuario || !clave) {

        errorMessage.textContent =
            "Faltan credenciales.";

        return;

    }

    let estadoOriginal = "";
    let motivoCancelacionOriginal = "";
    let programacionOriginal = null;

    function cargarEstados() {

        return fetch(`/api/reservas/estados/listar`)

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

        return fetch(`/api/reservas/motivos-cancelacion`)

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

    function actualizarVisibilidadMotivo() {

        const esCancelada = Number(selectEstado.value) === 3;

        grupoMotivoCancelacion.style.display = esCancelada ? "" : "none";
        selectMotivoCancelacion.required = esCancelada;

    }

    selectEstado.addEventListener("change", actualizarVisibilidadMotivo);

    function cargarReserva() {

        return fetch(`/api/reservas/${id}?usuario=${encodeURIComponent(usuario)}&clave=${encodeURIComponent(clave)}`)

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
            
            selectEstado.value =
                reserva.ID_ESTADO_RESERVA ?? "";

            selectMotivoCancelacion.value =
                reserva.MOTIVO_CANCELACION ?? "";

            actualizarVisibilidadMotivo();

            estadoOriginal = String(reserva.ID_ESTADO_RESERVA ?? "");
            motivoCancelacionOriginal = String(reserva.MOTIVO_CANCELACION ?? "");

        })

        .catch(error => {

            console.error(error);

              errorMessage.textContent = error.message.replace("RAISERROR executed:", "").trim();

        });


    }

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

    form.addEventListener(
    "submit",
    async function(event) {

        event.preventDefault();

        errorMessage.textContent = "";

        const body = {
            usuario,
            clave,
            id_estado_reserva: Number(selectEstado.value)
        };


        if (Number(selectEstado.value) === 3) {

            body.motivo_cancelacion =
                selectMotivoCancelacion.value;

        }


        try {

            const respuesta =
                await fetch(`/api/reservas/marcar/${id}`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify(body)
                });


            const data =
                await respuesta.json();


            if (!respuesta.ok || data.success === false) {

                throw new Error(
                    data.error ||
                    "Error al actualizar estado."
                );

            }


            window.location.href =
                "/list_reservas.html";


        } catch(error) {

            console.error(error);

              errorMessage.textContent = error.message.replace("RAISERROR executed:", "").trim();
        }

    }
);

});