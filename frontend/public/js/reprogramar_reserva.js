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

    const form = document.getElementById('reprogramar-reserva-form');
    const errorMessage = document.getElementById('error-message');
    const selectLaboratorio = document.getElementById('laboratorio');
    const selectTipoActividad = document.getElementById('tipoActividad');
    const inputCantidadAlumnos = document.getElementById('cantidadAlumnos');
    const listaRecursos = document.getElementById('listaRecursos');

    const id = new URLSearchParams(
        window.location.search
    ).get('id');

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

    let programacionOriginal = null;

    function cargarTipoActividad() {

        return fetch(`/api/actividades?usuario=${encodeURIComponent(usuario)}&clave=${encodeURIComponent(clave)}`)

        .then(res => res.json())

        .then(tipos => {

            selectTipoActividad.innerHTML = `

                <option value="">
                    Seleccione un tipo de actividad
                </option>

            `;

            tipos.forEach(tipo => {

                const option = document.createElement("option");

                option.value = tipo.ID_TIPO_ACTIVIDAD;

                option.textContent = tipo.NOMBRE;

                selectTipoActividad.appendChild(option);

            });

        })

        .catch(error => {

            console.error(error);

            errorMessage.textContent =
                "No se pudieron cargar los tipos de actividad.";

        });

    }

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

    // Trae los recursos del laboratorio elegido y marca los que ya tenia
    // la reserva (recursosSeleccionados = array de ID_RECURSO en string).
    function cargarRecursos(numeroLaboratorio, recursosSeleccionados = []) {

        listaRecursos.innerHTML = "";

        if (!numeroLaboratorio) return Promise.resolve();

        return fetch(`/api/recursos?usuario=${encodeURIComponent(usuario)}&clave=${encodeURIComponent(clave)}&laboratorio=${encodeURIComponent(numeroLaboratorio)}`)

        .then(res => res.json())

        .then(recursos => {

            listaRecursos.innerHTML = "";

            if (!Array.isArray(recursos) || recursos.length === 0) {
                listaRecursos.innerHTML = "<p class='text-muted mb-0'>No hay recursos disponibles para este laboratorio.</p>";
                return;
            }

            recursos.forEach(recurso => {

                const marcado = recursosSeleccionados.includes(
                    String(recurso.ID_RECURSO)
                );

                const div = document.createElement("div");
                div.className = "form-check";
                div.innerHTML = `
                    <input
                        class="form-check-input"
                        type="checkbox"
                        value="${recurso.ID_RECURSO}"
                        id="recurso${recurso.ID_RECURSO}"
                        ${marcado ? "checked" : ""}
                    >
                    <label class="form-check-label" for="recurso${recurso.ID_RECURSO}">
                        ${recurso.NOMBRE}
                    </label>
                `;

                listaRecursos.appendChild(div);

            });

        })

        .catch(error => {

            console.error(error);

            errorMessage.textContent =
                "No se pudieron cargar los recursos.";

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

            selectTipoActividad.value =
                reserva.ID_TIPO_ACTIVIDAD ?? "";

            inputCantidadAlumnos.value =
                reserva.CANTIDAD_ALUMNOS ?? "";

            const idsRecursosReserva = Array.isArray(reserva.RECURSOS)
                ? reserva.RECURSOS.map(r => String(r.ID_RECURSO))
                : [];

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
            // formulario, que cambio realmente el usuario.
            programacionOriginal = {
                numero_laboratorio: String(reserva.NUMERO_LABORATORIO ?? ""),
                id_tipo_actividad: String(reserva.ID_TIPO_ACTIVIDAD ?? ""),
                cantidad_alumnos: String(reserva.CANTIDAD_ALUMNOS ?? ""),
                fecha_a_reservar: String(reserva.FECHA_A_RESERVAR).split("T")[0],
                hora_inicio: String(reserva.HORA_INICIO).slice(0, 5),
                hora_fin: String(reserva.HORA_FIN).slice(0, 5),
                recursos: idsRecursosReserva
            };

            await cargarRecursos(reserva.NUMERO_LABORATORIO, idsRecursosReserva);

        })

        .catch(error => {

            console.error(error);

            errorMessage.textContent =
                error.message;

        });

    }

    await cargarLaboratorios();

    await cargarTipoActividad();

    await cargarReserva();

    // Si el admin cambia de laboratorio, recargamos los recursos
    // disponibles para ese laboratorio (no se puede tildar un recurso
    // que pertenece a otro lab).
    selectLaboratorio.addEventListener("change", function () {
        cargarRecursos(selectLaboratorio.value, []);
    });

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

            const recursosElegidos = Array.from(
                listaRecursos.querySelectorAll('input[type="checkbox"]:checked')
            ).map(checkbox => checkbox.value);

            const nuevaProgramacion = {
                numero_laboratorio: selectLaboratorio.value,
                id_tipo_actividad: selectTipoActividad.value,
                cantidad_alumnos: inputCantidadAlumnos.value,
                fecha_a_reservar: document.getElementById("fecha").value,
                hora_inicio: document.getElementById("horaInicio").value,
                hora_fin: document.getElementById("horaFin").value
            };

            const cambioProgramacion =
                programacionOriginal &&
                (nuevaProgramacion.numero_laboratorio !== programacionOriginal.numero_laboratorio ||
                 nuevaProgramacion.id_tipo_actividad !== programacionOriginal.id_tipo_actividad ||
                 nuevaProgramacion.cantidad_alumnos !== programacionOriginal.cantidad_alumnos ||
                 nuevaProgramacion.fecha_a_reservar !== programacionOriginal.fecha_a_reservar ||
                 nuevaProgramacion.hora_inicio !== programacionOriginal.hora_inicio ||
                 nuevaProgramacion.hora_fin !== programacionOriginal.hora_fin);

            const recursosOriginales = (programacionOriginal?.recursos || []).slice().sort();
            const cambioRecursos =
                JSON.stringify(recursosElegidos.slice().sort()) !== JSON.stringify(recursosOriginales);

            if (!cambioProgramacion && !cambioRecursos) {
                window.location.href = "/list_reservas.html";
                return;
            }

            try {

                const response = await fetch(`/api/reservas/reprogramar/${id}`,
                        {
                            method: "POST",
                            headers: {
                                "Content-Type": "application/json"
                            },
                            body: JSON.stringify({
                                usuario,
                                clave,
                                ...nuevaProgramacion,
                                recursos: recursosElegidos
                            })
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

                window.location.href = "/list_reservas.html";

            } catch(error) {

                console.error(error);

                errorMessage.textContent =
                    error.message;

            }

        }
    );

});
