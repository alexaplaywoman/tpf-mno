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
    const selectSolicitante = document.getElementById('solicitante');
    const selectTipoActividad = document.getElementById('tipoActividad');
    const inputCantidadAlumnos = document.getElementById('cantidadAlumnos');
    const contenedorRecursos = document.getElementById('listaRecursos');

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

    function cargarSolicitantes() {

        return fetch(`/api/solicitantes?usuario=${encodeURIComponent(usuario)}&clave=${encodeURIComponent(clave)}`)

        .then(res => res.json())

        .then(solicitantes => {

            selectSolicitante.innerHTML = `

                <option value="">
                    Seleccione un solicitante
                </option>

            `;

            solicitantes.forEach(solic => {

                const option = document.createElement("option");
                option.value = solic.CEDULA_IDENTIDAD;
                option.textContent = `${solic.NOMBRE} ${solic.APELLIDO} - ${solic.CEDULA_IDENTIDAD}`;
                selectSolicitante.appendChild(option);

            });

        })

        .catch(error => {

            console.error(error);

            errorMessage.textContent =
                "No se pudieron cargar los solicitantes.";

        });

    }

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

                const option =
                    document.createElement("option");

                option.value = tipo.ID_TIPO_ACTIVIDAD;

                option.textContent = tipo.NOMBRE;

                selectTipoActividad.appendChild(
                    option
                );

            });

        })

        .catch(error => {

            console.error(error);

            errorMessage.textContent =
                "No se pudieron cargar los tipos de actividad.";

        });

    }

    // Los recursos se muestran marcados segun lo que ya tiene la reserva
    // (rellenado en cargarReserva), y desde aca se pueden tildar/destildar
    // libremente; /reprogramar reemplaza los
    // recursos de la reserva por lo que este formulario mande.
    function cargarRecursos() {

        return fetch(`/api/recursos/tipos?usuario=${encodeURIComponent(usuario)}&clave=${encodeURIComponent(clave)}`)

        .then(res => res.json())

        .then(tipos => {

            contenedorRecursos.innerHTML = "";

            if (!Array.isArray(tipos) || tipos.length === 0) {
                contenedorRecursos.innerHTML = "<p class='text-muted mb-0'>No hay recursos disponibles.</p>";
                return;
            }

            tipos.forEach(tipo => {

                const nombre = tipo.NOMBRE;
                const idCheckbox = "recurso" + nombre.replace(/\s+/g, '');

                const div = document.createElement("div");
                div.className = "form-check";
                div.innerHTML = `
                    <input class="form-check-input" type="checkbox" id="${idCheckbox}" value="${nombre}">
                    <label class="form-check-label" for="${idCheckbox}">${nombre}</label>
                `;

                contenedorRecursos.appendChild(div);

            });

        })

        .catch(error => {

            console.error('Error al cargar recursos:', error);

            contenedorRecursos.innerHTML = "<p class='text-muted mb-0'>No se pudieron cargar los recursos.</p>";

        });

    }

    // Marca los checkboxes de los recursos que la reserva ya tiene
    // asociados (nombresRecursos viene como "Proyector,Aire Acondicionado").
    function marcarRecursosDeReserva(nombresRecursos) {

        const nombres = (nombresRecursos || "")
            .split(",")
            .map(n => n.trim())
            .filter(Boolean);

        nombres.forEach(nombre => {

            const idCheckbox = "recurso" + nombre.replace(/\s+/g, '');
            const checkbox = document.getElementById(idCheckbox);

            if (checkbox) checkbox.checked = true;

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

            // Solicitante, tipo de actividad y cantidad de alumnos se
            // muestran para contexto, pero no se pueden cambiar desde aca:
            // /reprogramar solo actualiza laboratorio/fecha/horario.
            selectSolicitante.value =
                reserva.CEDULA_IDENTIDAD ?? "";
            selectSolicitante.disabled = true;

            selectTipoActividad.value =
                reserva.ID_TIPO_ACTIVIDAD ?? "";
            selectTipoActividad.disabled = true;

            inputCantidadAlumnos.value =
                reserva.CANTIDAD_ALUMNOS ?? "";
            inputCantidadAlumnos.disabled = true;

            marcarRecursosDeReserva(reserva.NOMBRES_RECURSOS);

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
            // formulario, si el usuario realmente cambio laboratorio,
            // fecha u horario.
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

    await cargarSolicitantes();

    await cargarTipoActividad();

    await cargarRecursos();

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

            const recursosElegidos = Array.from(
                contenedorRecursos.querySelectorAll('input[type="checkbox"]:checked')
            ).map(checkbox => checkbox.value);

            try {

                const response = await fetch(`/api/reservas/reprogramar/${id}`,
                        {
                            method: "POST",
                            headers: {
                                "Content-Type": "application/json"
                            },
                            body: JSON.stringify({ usuario, clave, ...nuevaProgramacion, recursos: recursosElegidos })
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

                window.location.href = "/list_reservas.html";

            } catch(error) {

                console.error(error);

                errorMessage.textContent =
                    error.message;

            }

        }
    );

});
