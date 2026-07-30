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

document.addEventListener("DOMContentLoaded", function () {

    const btnInicio = document.getElementById("inicio");
    const form = document.getElementById("add-reserva-form");
    const errorMessage = document.getElementById("error-message");
    const selectLaboratorio = document.getElementById("laboratorio");
    const selectSolicitante = document.getElementById("solicitante");
    const selectTipoActividad = document.getElementById("tipoActividad");
    const contenedorRecursos = document.getElementById("listaRecursos");
    const selectHoraInicio = document.getElementById("horaInicio");
    const selectHoraFin = document.getElementById("horaFin");
    const inputCantidadAlumnos = document.getElementById("cantidadAlumnos");

    const usuario = sessionStorage.getItem("usuario");
    const clave = sessionStorage.getItem("clave");

    if (btnInicio) {
        btnInicio.addEventListener("click", function (e) {
            e.preventDefault();
            window.location.href = "/list_reservas.html";
        });
    }

    if (!usuario || !clave) {
        errorMessage.textContent = "Faltan las credenciales del usuario.";
        return;
    }

    // =====================================
    // CARGAR SOLICITANTES, TIPOS DE ACTIVIDAD Y RECURSOS
    // =====================================

    function cargarOpciones() {

        fetch(`/api/solicitantes?usuario=${encodeURIComponent(usuario)}&clave=${encodeURIComponent(clave)}`)
            .then(res => res.json())
            .then(solicitantes => {
                selectSolicitante.innerHTML = `
                    <option value="">Seleccione un solicitante</option>
                `;

                solicitantes.forEach(soli => {
                    const option = document.createElement("option");
                    option.value = soli.CEDULA_IDENTIDAD;
                    option.textContent = `${soli.NOMBRE} ${soli.APELLIDO} - ${soli.CEDULA_IDENTIDAD}`;
                    // Guardamos el correo acá porque el backend lo necesita
                    // junto con la cédula
                    option.dataset.correo = soli.CORREO;
                    selectSolicitante.appendChild(option);
                });
            })
            .catch(error => {
                console.error(error);
                errorMessage.textContent = "No se pudieron cargar los solicitantes.";
            });

        fetch(`/api/actividades?usuario=${encodeURIComponent(usuario)}&clave=${encodeURIComponent(clave)}`)
            .then(res => res.json())
            .then(tipos => {
                selectTipoActividad.innerHTML = `
                    <option value="">Seleccione un tipo de actividad</option>
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
                errorMessage.textContent = "No se pudieron cargar los tipos de actividad.";
            });

        fetch(`/api/recursos/tipos?usuario=${encodeURIComponent(usuario)}&clave=${encodeURIComponent(clave)}`)
            .then(res => res.json())
            .then(tipos => {
                contenedorRecursos.innerHTML = '';

                if (!tipos || tipos.length === 0) {
                    contenedorRecursos.innerHTML = "<p class='text-muted mb-0'>No hay recursos disponibles.</p>";
                    return;
                }

                tipos.forEach(tipo => {
                    const nombre = tipo.NOMBRE;
                    const id = "recurso" + nombre.replace(/\s+/g, '');

                    const div = document.createElement('div');
                    div.className = 'form-check';
                    div.innerHTML = `
                        <input class="form-check-input" type="checkbox" id="${id}" value="${nombre}">
                        <label class="form-check-label" for="${id}">${nombre}</label>
                    `;
                    contenedorRecursos.appendChild(div);
                });
            })
            .catch(error => {
                console.error('Error al cargar recursos:', error);
                contenedorRecursos.innerHTML = "<p class='text-muted mb-0'>No se pudieron cargar los recursos.</p>";
            });

    }

    cargarOpciones();

    // =====================================
    // FILTRAR LABORATORIOS DISPONIBLES
    // (el laboratorio se elige al final: recien cuando ya se conoce
    // fecha, horario, tipo de actividad, alumnos y recursos, se puede
    // saber cuales laboratorios realmente sirven)
    // =====================================

    function mostrarLaboratorioPlaceholder(texto) {
        selectLaboratorio.innerHTML = `<option value="">${texto}</option>`;
        selectLaboratorio.disabled = true;
    }

    // =====================================
    // BLOQUEO DE HORAS YA RESERVADAS
    // Como el laboratorio se elige al final, todavia no hay uno solo
    // contra el cual chequear ocupacion. En cambio, se calculan los
    // laboratorios "candidatos" (los que cumplen capacidad/recursos/
    // estado para lo ya cargado) y una hora queda bloqueada solo si
    // TODOS los candidatos estan ocupados en ese momento -- si alguno
    // esta libre, la hora sigue habilitada (mismo criterio que
    // laboratorio.js del lado del solicitante, pero agregado entre labs).
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

    // Recalcula los laboratorios candidatos (capacidad/recursos/estado,
    // sin mirar todavia el horario) y trae sus horarios ya ocupados para
    // poder bloquear las horas imposibles.
    function actualizarCandidatosYBloqueos() {

        const fecha = document.getElementById("fecha").value;
        const idTipoActividad = selectTipoActividad.value;
        const cantidadAlumnos = Number(inputCantidadAlumnos.value) || 0;

        if (!fecha || !idTipoActividad || !cantidadAlumnos) {
            ocupadosPorLabCandidato = null;
            actualizarOpcionesHoraInicio();
            return;
        }

        const recursosElegidos = Array.from(
            contenedorRecursos.querySelectorAll('input[type="checkbox"]:checked')
        ).map(checkbox => checkbox.value);

        Promise.all([
            fetch(`/api/laboratorios?usuario=${encodeURIComponent(usuario)}&clave=${encodeURIComponent(clave)}`).then(r => r.json()),
            fetch(`/api/recursos?usuario=${encodeURIComponent(usuario)}&clave=${encodeURIComponent(clave)}`).then(r => r.json())
        ])
            .then(([laboratorios, recursos]) => {

                if (!Array.isArray(laboratorios) || !Array.isArray(recursos)) {
                    ocupadosPorLabCandidato = [];
                    actualizarOpcionesHoraInicio();
                    return;
                }

                const recursosPorLab = {};
                recursos.forEach(r => {
                    if (r.DISPONIBILIDAD !== 'S') return;
                    if (!recursosPorLab[r.NUMERO_LABORATORIO]) recursosPorLab[r.NUMERO_LABORATORIO] = [];
                    recursosPorLab[r.NUMERO_LABORATORIO].push(r.NOMBRE);
                });

                const candidatos = laboratorios.filter(lab => {
                    if (lab.estado_tipo !== 'D') return false;
                    if (lab.CAPACIDAD_ALUMNOS < cantidadAlumnos) return false;
                    const disponiblesLab = recursosPorLab[lab.NUMERO_LABORATORIO] || [];
                    return recursosElegidos.every(r => disponiblesLab.includes(r));
                });

                if (candidatos.length === 0) {
                    ocupadosPorLabCandidato = [];
                    actualizarOpcionesHoraInicio();
                    return;
                }

                return Promise.all(candidatos.map(lab =>
                    fetch(`/api/laboratorios/horarios-ocupados?usuario=${encodeURIComponent(usuario)}&clave=${encodeURIComponent(clave)}` +
                          `&numero_laboratorio=${lab.NUMERO_LABORATORIO}&fecha=${fecha}&id_tipo_actividad=${idTipoActividad}`)
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

        const recursosElegidos = Array.from(
            contenedorRecursos.querySelectorAll('input[type="checkbox"]:checked')
        ).map(checkbox => checkbox.value);

        const valorPrevio = selectLaboratorio.value;

        const params = `usuario=${encodeURIComponent(usuario)}&clave=${encodeURIComponent(clave)}` +
            `&fecha=${fecha}&hora_inicio=${horaInicio}&hora_fin=${horaFin}` +
            `&id_tipo_actividad=${idTipoActividad}` +
            (recursosElegidos.length > 0 ? `&recursos=${encodeURIComponent(recursosElegidos.join(','))}` : '');

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

                // Si el laboratorio elegido antes sigue siendo valido, lo
                // mantenemos seleccionado en vez de resetear la eleccion.
                if (disponibles.some(lab => String(lab.NUMERO_LABORATORIO) === valorPrevio)) {
                    selectLaboratorio.value = valorPrevio;
                }
            })
            .catch(error => {
                console.error('Error al consultar disponibilidad de laboratorios:', error);
                mostrarLaboratorioPlaceholder("No se pudieron cargar los laboratorios");
            });
    }

    selectTipoActividad.addEventListener("change", actualizarCandidatosYBloqueos);
    selectHoraInicio.addEventListener("change", actualizarOpcionesHoraFin);
    selectHoraFin.addEventListener("change", actualizarLaboratoriosDisponibles);
    inputCantidadAlumnos.addEventListener("input", actualizarCandidatosYBloqueos);
    contenedorRecursos.addEventListener("change", actualizarCandidatosYBloqueos);

    // =====================================
    // AGREGAR RESERVA
    // =====================================

    form.addEventListener("submit", function (e) {

        e.preventDefault();

        errorMessage.textContent = "";

        const opcionSolicitante = selectSolicitante.options[selectSolicitante.selectedIndex];
        const correo = opcionSolicitante ? opcionSolicitante.dataset.correo : "";

        const recursosElegidos = Array.from(
            contenedorRecursos.querySelectorAll('input[type="checkbox"]:checked')
        ).map(checkbox => checkbox.value);

        const reservaData = {

            usuario,
            clave,

            numero_laboratorio: selectLaboratorio.value,

            cedula_identidad: selectSolicitante.value,
            correo: correo,

            id_tipo_actividad: selectTipoActividad.value,

            fecha_a_reservar: document.getElementById("fecha").value,

            hora_inicio: document.getElementById("horaInicio").value,

            hora_fin: document.getElementById("horaFin").value,

            cantidad_alumnos: document.getElementById("cantidadAlumnos").value,

            recursos: recursosElegidos

        };

        fetch("/api/reservas/add", {

            method: "POST",

            headers: {
                "Content-Type": "application/json"
            },

            body: JSON.stringify(reservaData)

        })
            .then(async response => {

                const data = await response.json();

                if (!response.ok || data.success === false) {
                    throw new Error(data.error || "Error al agregar reserva");
                }

                window.location.href = "/list_reservas.html";

            })
            .catch(error => {
                console.error(error);
                errorMessage.textContent = error.message.replace("RAISERROR executed:", "").trim();
            });

    });

const monthYearEl = document.getElementById("month-year");
const daysEl = document.getElementById("days");

const prevMonthBtn = document.getElementById("prev-month");
const nextMonthBtn = document.getElementById("next-month");
const todayBtn = document.getElementById("today-btn");


let currentDate = new Date();
let reservasOcupadas = [];
let selectedDate = null;
let feriados = [];


// Traer fechas reservadas del backend
async function cargarFechasOcupadas() {

    try {

        const usuario = sessionStorage.getItem("usuario");
        const clave = sessionStorage.getItem("clave");

        const respuesta = await fetch(
            `/api/reservas/fechas-ocupadas?usuario=${usuario}&clave=${clave}`
        );


        if (respuesta.ok) {

            reservasOcupadas = await respuesta.json();

            console.log("Reservas:", reservasOcupadas);

        } else {

            reservasOcupadas = [];

        }


    } catch (error) {

        console.error(error);
        reservasOcupadas = [];

    }

}


// Traer feriados del backend
async function cargarFeriados() {

    try {

        const usuario = sessionStorage.getItem("usuario");
        const clave = sessionStorage.getItem("clave");

        const respuesta = await fetch(
            `/api/feriados?usuario=${usuario}&clave=${clave}`
        );

        feriados = respuesta.ok ? await respuesta.json() : [];

    } catch (error) {

        console.error(error);
        feriados = [];

    }

}



function renderCalendar() {

    daysEl.innerHTML = "";


    let year = currentDate.getFullYear();
    let month = currentDate.getMonth();


    const meses = [
        "Enero", "Febrero", "Marzo", "Abril",
        "Mayo", "Junio", "Julio", "Agosto",
        "Septiembre", "Octubre", "Noviembre", "Diciembre"
    ];


    monthYearEl.textContent = meses[month] + " " + year;


    let primerDia = new Date(year, month, 1).getDay();
    let ultimoDia = new Date(year, month + 1, 0).getDate();



    // espacios antes del día 1
    for (let i = 0; i < primerDia; i++) {

        daysEl.appendChild(document.createElement("div"));

    }



    let hoy = new Date();
    hoy.setHours(0,0,0,0);



    for (let i = 1; i <= ultimoDia; i++) {


        let day = document.createElement("div");

        day.classList.add("day");

        day.textContent = i;



        let fecha = new Date(year, month, i);


        let fechaString =
            `${year}-${String(month + 1).padStart(2,"0")}-${String(i).padStart(2,"0")}`;



        let dow = fecha.getDay();

        let esFinDeSemana = (dow === 0 || dow === 6);

        let esPasado = fecha < hoy;



        let reservaEseDia =
            reservasOcupadas.find(r => r.fecha === fechaString);

        let feriadoEseDia =
            feriados.find(f => String(f.FECHA).split('T')[0] === fechaString);



        if (esPasado || esFinDeSemana || feriadoEseDia) {


            day.classList.add("deshabilitado");


            day.title = esPasado
                ? "Fecha pasada"
                : esFinDeSemana
                    ? "Fin de semana: no se permiten reservas"
                    : `Feriado: ${feriadoEseDia.DESCRIPCION || ''}`;


        } else {



            if (reservaEseDia) {

                day.classList.add("has-events");

                day.title =
                    "Hay una reserva ese día";

            }



            day.addEventListener("click", function () {


                selectedDate = fecha;


                document.getElementById("fecha").value =
                    fechaString;


                renderCalendar();

                actualizarCandidatosYBloqueos();


                validar();


            });


        }




        // Hoy

        if (
            hoy.getDate() === i &&
            hoy.getMonth() === month &&
            hoy.getFullYear() === year
        ) {

            day.classList.add("today");

        }



        // Seleccionado

        if (
            selectedDate &&
            selectedDate.getDate() === i &&
            selectedDate.getMonth() === month &&
            selectedDate.getFullYear() === year
        ) {

            day.classList.add("selected");

        }



        daysEl.appendChild(day);

    }

}



// Mes anterior

if (prevMonthBtn) {
    prevMonthBtn.addEventListener("click", function(){

        currentDate.setMonth(currentDate.getMonth() - 1);

        renderCalendar();

    });
}


if (nextMonthBtn) {
    nextMonthBtn.addEventListener("click", function(){

        currentDate.setMonth(currentDate.getMonth() + 1);

        renderCalendar();

    });
}


if (todayBtn) {
    todayBtn.addEventListener("click", function(){

        currentDate = new Date();

        renderCalendar();

    });
}



// Inicializar calendario

async function iniciarCalendario(){

    await cargarFechasOcupadas();
    await cargarFeriados();

    renderCalendar();

}


iniciarCalendario();

});
