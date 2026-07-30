// =========================
// DROPDOWN CUSTOM CON SCROLL (envuelve a un <select> real)
// =========================
function inicializarSelectsCustom() {

    document.querySelectorAll(".custom-select-wrapper").forEach(wrapper => {

        const select = document.getElementById(wrapper.dataset.target);
        const boton = wrapper.querySelector(".custom-select-toggle");
        const menu = wrapper.querySelector(".custom-select-menu");

        function actualizarMenu() {

            menu.innerHTML = "";

            Array.from(select.options).forEach(opcion => {

                if (opcion.value === "") return;

                const item = document.createElement("div");

                item.className = "custom-select-option";
                item.textContent = opcion.textContent;

                if (opcion.disabled) {
                    item.classList.add("disabled");
                    if (opcion.title) item.title = opcion.title;
                } else {
                    item.addEventListener("click", function () {

                        select.value = opcion.value;
                        select.dispatchEvent(new Event("change", { bubbles: true }));

                        boton.textContent = opcion.textContent;

                        menu.classList.remove("show");

                    });
                }

                menu.appendChild(item);

            });

            const seleccionado = select.options[select.selectedIndex];
            boton.textContent = (seleccionado && seleccionado.value !== "")
                ? seleccionado.textContent
                : "Seleccionar";

        }

        boton.addEventListener("click", function (e) {

            e.preventDefault();
            e.stopPropagation();

            document.querySelectorAll(".custom-select-menu").forEach(m => {
                if (m !== menu) m.classList.remove("show");
            });

            menu.classList.toggle("show");

        });

        document.addEventListener("click", function (e) {
            if (!e.target.closest(".custom-select-wrapper")) {
                document.querySelectorAll(".custom-select-menu").forEach(m => {
                    m.classList.remove("show");
                });
            }
        });

        select.addEventListener("change", actualizarMenu);

        actualizarMenu();

    });

}

document.addEventListener("DOMContentLoaded", inicializarSelectsCustom);

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
    const selectHoraInicio = document.getElementById('horaInicio');
    const selectHoraFin = document.getElementById('horaFin');

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
    let laboratorioOriginal = null;

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

    // El laboratorio se elige al final, igual que en el alta de reserva
    // del admin: recien cuando ya se conoce fecha, horario, tipo de
    // actividad y cantidad de alumnos se puede saber cuales laboratorios
    // realmente sirven. Se excluye esta misma reserva de los chequeos de
    // disponibilidad para que no se bloquee contra su propio horario.
    function mostrarLaboratorioPlaceholder(texto) {
        selectLaboratorio.innerHTML = `<option value="">${texto}</option>`;
        selectLaboratorio.disabled = true;
    }

    // =====================================
    // BLOQUEO DE HORAS YA RESERVADAS
    // Como el laboratorio se elige al final, todavia no hay uno solo
    // contra el cual chequear ocupacion. En cambio, se calculan los
    // laboratorios "candidatos" (los que cumplen capacidad/estado para
    // lo ya cargado) y una hora queda bloqueada solo si TODOS los
    // candidatos estan ocupados en ese momento (excluyendo esta misma
    // reserva). Si alguno esta libre, la hora sigue habilitada.
    // =====================================

    let ocupadosPorLabCandidato = null; // null = todavia no se calculo

    function sumarHora(hora, minutos) {
        const [h, m] = hora.split(':').map(Number);
        const total = h * 60 + m + minutos;
        const hh = Math.floor(total / 60) % 24;
        const mm = total % 60;
        return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
    }

    function horaOcupadaEnTodosLosCandidatos(inicio, fin) {
        if (!ocupadosPorLabCandidato || ocupadosPorLabCandidato.length === 0) return true;
        return ocupadosPorLabCandidato.every(ocupados =>
            ocupados.some(o => inicio < o.HORA_FIN && fin > o.HORA_INICIO)
        );
    }

    function actualizarOpcionesHoraInicio() {
        Array.from(selectHoraInicio.options).forEach(option => {
            if (option.value === "") return;

            if (ocupadosPorLabCandidato === null) {
                option.disabled = false;
                option.title = "";
                return;
            }

            const ocupada = horaOcupadaEnTodosLosCandidatos(option.value, sumarHora(option.value, 60));
            option.disabled = ocupada;
            option.title = ocupada ? "Sin laboratorios disponibles a esta hora" : "";
        });

        if (selectHoraInicio.selectedOptions[0] && selectHoraInicio.selectedOptions[0].disabled) {
            selectHoraInicio.value = "";
        }

        selectHoraInicio.dispatchEvent(new Event("change", { bubbles: true }));
    }

    // La hora de fin tiene que ser posterior a la de inicio, y ademas no
    // puede caer en un rango donde todos los candidatos estan ocupados.
    function actualizarOpcionesHoraFin() {
        const horaInicio = selectHoraInicio.value;

        Array.from(selectHoraFin.options).forEach(option => {
            if (option.value === "") return;

            if (!horaInicio || option.value <= horaInicio) {
                option.disabled = true;
                option.title = "Debe ser posterior a la hora de inicio";
                return;
            }

            const ocupada = ocupadosPorLabCandidato !== null &&
                horaOcupadaEnTodosLosCandidatos(horaInicio, option.value);

            option.disabled = ocupada;
            option.title = ocupada ? "Sin laboratorios disponibles en ese horario" : "";
        });

        if (selectHoraFin.selectedOptions[0] && selectHoraFin.selectedOptions[0].disabled) {
            selectHoraFin.value = "";
        }

        selectHoraFin.dispatchEvent(new Event("change", { bubbles: true }));
    }

    // Recalcula los laboratorios candidatos (capacidad/estado, sin mirar
    // todavia el horario) y trae sus horarios ya ocupados (excluyendo
    // esta misma reserva) para poder bloquear las horas imposibles.
    function actualizarCandidatosYBloqueos() {

        const fecha = document.getElementById("fecha").value;
        const idTipoActividad = selectTipoActividad.value;
        const cantidadAlumnos = Number(inputCantidadAlumnos.value) || 0;

        if (!fecha || !idTipoActividad || !cantidadAlumnos) {
            ocupadosPorLabCandidato = null;
            actualizarOpcionesHoraInicio();
            return;
        }

        fetch(`/api/laboratorios?usuario=${encodeURIComponent(usuario)}&clave=${encodeURIComponent(clave)}`)
            .then(res => res.json())
            .then(laboratorios => {

                if (!Array.isArray(laboratorios)) {
                    ocupadosPorLabCandidato = [];
                    actualizarOpcionesHoraInicio();
                    return;
                }

                const candidatos = laboratorios.filter(lab =>
                    lab.estado_tipo === 'D' && lab.CAPACIDAD_ALUMNOS >= cantidadAlumnos
                );

                if (candidatos.length === 0) {
                    ocupadosPorLabCandidato = [];
                    actualizarOpcionesHoraInicio();
                    return;
                }

                return Promise.all(candidatos.map(lab =>
                    fetch(`/api/laboratorios/horarios-ocupados?usuario=${encodeURIComponent(usuario)}&clave=${encodeURIComponent(clave)}` +
                          `&numero_laboratorio=${lab.NUMERO_LABORATORIO}&fecha=${fecha}&id_tipo_actividad=${idTipoActividad}&excluir_id_reserva=${id}`)
                        .then(r => r.json())
                        .then(ocupados => Array.isArray(ocupados)
                            ? ocupados.map(o => ({
                                HORA_INICIO: String(o.HORA_INICIO).slice(0, 5),
                                HORA_FIN: String(o.HORA_FIN).slice(0, 5)
                            }))
                            : []
                        )
                )).then(porLab => {
                    ocupadosPorLabCandidato = porLab;
                    actualizarOpcionesHoraInicio();
                });
            })
            .catch(error => {
                console.error('Error al calcular horas ocupadas:', error);
                ocupadosPorLabCandidato = null;
                actualizarOpcionesHoraInicio();
            });
    }

    function actualizarLaboratoriosDisponibles() {

        const fecha = document.getElementById("fecha").value;
        const horaInicio = selectHoraInicio.value;
        const horaFin = selectHoraFin.value;
        const idTipoActividad = selectTipoActividad.value;
        const cantidadAlumnos = Number(inputCantidadAlumnos.value) || 0;

        if (!fecha || !horaInicio || !horaFin || !idTipoActividad || !cantidadAlumnos) {
            mostrarLaboratorioPlaceholder("Complete los datos anteriores");
            return;
        }

        // Mientras el usuario no haya elegido un laboratorio a mano, se
        // intenta mantener el laboratorio original de la reserva.
        const valorPrevio = selectLaboratorio.value || laboratorioOriginal || "";

        const params = `usuario=${encodeURIComponent(usuario)}&clave=${encodeURIComponent(clave)}` +
            `&fecha=${fecha}&hora_inicio=${horaInicio}&hora_fin=${horaFin}` +
            `&id_tipo_actividad=${idTipoActividad}&excluir_id_reserva=${id}`;

        fetch(`/api/laboratorios/disponibilidad-horario?${params}`)
            .then(res => res.json())
            .then(data => {
                if (!data || !Array.isArray(data.laboratorios)) {
                    console.error('Respuesta invalida de disponibilidad-horario:', data);
                    mostrarLaboratorioPlaceholder("No se pudieron cargar los laboratorios");
                    return;
                }

                const disponibles = data.laboratorios.filter(lab =>
                    lab.disponible === 'S' && lab.CAPACIDAD_ALUMNOS >= cantidadAlumnos
                );

                if (disponibles.length === 0) {
                    mostrarLaboratorioPlaceholder("No hay laboratorios disponibles para estos datos");
                    return;
                }

                selectLaboratorio.innerHTML = `<option value="">Seleccione un laboratorio</option>`;
                selectLaboratorio.disabled = false;

                disponibles.forEach(lab => {
                    const option = document.createElement("option");
                    option.value = lab.NUMERO_LABORATORIO;
                    option.textContent = `Laboratorio ${lab.NUMERO_LABORATORIO} - ${lab.EDIFICIO}`;
                    selectLaboratorio.appendChild(option);
                });

                // Si el laboratorio elegido antes (o el original de la
                // reserva) sigue siendo valido, lo mantenemos seleccionado.
                // No disparamos "change" aca: los recursos de la reserva ya
                // se cargaron por separado con sus checks originales, y
                // ese listener los resetearia a todos destildados.
                if (disponibles.some(lab => String(lab.NUMERO_LABORATORIO) === valorPrevio)) {
                    selectLaboratorio.value = valorPrevio;
                }
            })
            .catch(error => {
                console.error('Error al consultar disponibilidad de laboratorios:', error);
                mostrarLaboratorioPlaceholder("No se pudieron cargar los laboratorios");
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

    selectTipoActividad.addEventListener("change", actualizarCandidatosYBloqueos);
    selectHoraInicio.addEventListener("change", actualizarOpcionesHoraFin);
    selectHoraFin.addEventListener("change", actualizarLaboratoriosDisponibles);
    inputCantidadAlumnos.addEventListener("input", actualizarCandidatosYBloqueos);

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

            // El laboratorio se completa recien mas abajo, cuando
            // actualizarLaboratoriosDisponibles() arma la lista filtrada
            // y preselecciona el laboratorio original de la reserva.

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

            laboratorioOriginal = String(reserva.NUMERO_LABORATORIO ?? "");

            actualizarCandidatosYBloqueos();

            // El dropdown visual (custom-select-wrapper) solo se refresca
            // con el evento "change"; al asignar .value por codigo hay que
            // dispararlo a mano para que el boton muestre la hora elegida.
            // Ese "change" tambien dispara actualizarLaboratoriosDisponibles.
            document.getElementById("horaInicio").dispatchEvent(new Event("change", { bubbles: true }));
            document.getElementById("horaFin").dispatchEvent(new Event("change", { bubbles: true }));

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

            actualizarLaboratoriosDisponibles();

        })

        .catch(error => {

            console.error(error);

            errorMessage.textContent =
                error.message;

        });

    }

    mostrarLaboratorioPlaceholder("Complete los datos anteriores");

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

                        actualizarCandidatosYBloqueos();

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

    // Arrancamos el calendario mostrando el mes y el dia de la fecha
    // actual de la reserva, marcado como seleccionado, para que se sepa
    // desde que fecha se esta reprogramando.
    const fechaActualReserva = document.getElementById("fecha").value;
    if (fechaActualReserva) {
        const [anio, mes, dia] = fechaActualReserva.split("-").map(Number);
        selectedDate = new Date(anio, mes - 1, dia);
        currentDate = new Date(anio, mes - 1, dia);
    }

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
