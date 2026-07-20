let selectedDate = null;
let reservasOcupadas = [];
let feriados = [];

async function cargarFeriados() {
    try {
        const usuario = sessionStorage.getItem("usuario");
        const clave = sessionStorage.getItem("clave");
        const respuesta = await fetch(`/api/feriados?usuario=${usuario}&clave=${clave}`);
        feriados = respuesta.ok ? await respuesta.json() : [];
    } catch (error) {
        console.error('Error al cargar feriados:', error);
        feriados = [];
    }
}

// Helper: escapa credenciales antes de meterlas en la query string.
// Sin esto, un usuario o clave con '&', '+', '%' o espacio rompia la URL
// y el backend recibia credenciales cortadas -> login failed.
function credsQueryString() {
    const usuario = encodeURIComponent(sessionStorage.getItem('usuario') || '');
    const clave   = encodeURIComponent(sessionStorage.getItem('clave')   || '');
    return `usuario=${usuario}&clave=${clave}`;
}

// Los tipos de actividad se traen del backend (DBA.TIPO_ACTIVIDAD), no
// se hardcodean aca: cada base local puede tener IDs distintos para el
// mismo nombre (autoincrement + altas/bajas propias de cada integrante),
// asi que un <option value="X"> fijo podia guardar una actividad
// distinta a la que el usuario veia en pantalla.
function renderActividades() {
    const select = document.getElementById("evento");

    return fetch(`/api/actividades?${credsQueryString()}`)
        .then(res => res.json())
        .then(actividades => {
            console.log('actividades response:', actividades);
            select.innerHTML = `
                <option value="" selected disabled class="text-muted">Seleccionar una actividad</option>
            `;

            if (!Array.isArray(actividades)) {
                console.error('Respuesta invalida de /api/actividades:', actividades);
                return;
            }

            actividades.forEach(function (actividad) {
                const option = document.createElement("option");
                option.value = actividad.ID_TIPO_ACTIVIDAD;
                option.textContent = actividad.NOMBRE;
                select.appendChild(option);
            });
        })
        .catch(err => {
            console.error('Error al cargar tipos de actividad:', err);
        });
}

// Los recursos se traen del backend (DBA.RECURSOS), no se hardcodean aca,
// porque los tipos y su disponibilidad por laboratorio los administra el admin.
function renderRecursos() {
    const contenedor = document.getElementById("listaRecursos");

    return fetch(`/api/recursos/tipos?${credsQueryString()}`)
        .then(res => res.json())
        .then(tipos => {
            contenedor.innerHTML = "";

            if (!Array.isArray(tipos) || tipos.length === 0) {
                contenedor.innerHTML = "<p class='text-muted'>No hay recursos disponibles.</p>";
                return;
            }

            tipos.forEach(function (tipo) {
                const nombre = tipo.NOMBRE;
                const id = "recurso" + nombre.replace(/\s+/g, '');

                const div = document.createElement("div");
                div.className = "form-check mb-2";

                div.innerHTML = `
                    <input class="form-check-input" type="checkbox" id="${id}" value="${nombre}">
                    <label class="form-check-label" for="${id}">${nombre}</label>
                `;

                contenedor.appendChild(div);
            });
        })
        .catch(err => {
            console.error('Error al cargar recursos:', err);
            contenedor.innerHTML = "<p class='text-muted'>No se pudieron cargar los recursos.</p>";
        });
}


document.addEventListener("DOMContentLoaded", async function () {

    // Generar el select de tipo de actividad y los checkboxes de recursos
    const actividadesListas = renderActividades();
    const recursosListos    = renderRecursos();

    // =========================
    // RESTAURACION DE DATOS
    // =========================
    // Prioridad: si venimos del flujo de edicion -> reservaEditar.
    // Si no, si el usuario volvio con "Atras" -> reservaEvento.
    let reservaEditar = JSON.parse(sessionStorage.getItem("reservaEditar"));
    const reservaEventoPrevia = JSON.parse(sessionStorage.getItem("reservaEvento"));

    const datos = reservaEditar
        ? {
              actividad: reservaEditar.ID_TIPO_ACTIVIDAD,
              alumnos:   reservaEditar.CANTIDAD_ALUMNOS,
              fecha:     reservaEditar.FECHA_A_RESERVAR,
              recursos:  reservaEditar.recursos
          }
        : reservaEventoPrevia;

    // Esperamos a que ambos fetches terminen antes de restaurar, asi
    // el <select> de actividad ya tiene sus <option> y los checkboxes
    // de recursos ya estan en el DOM. Mas robusto que un setTimeout.
    Promise.all([actividadesListas, recursosListos]).then(() => {
        if (!datos) return;

        if (datos.actividad) {
            document.getElementById("evento").value = datos.actividad;
        }
        if (datos.alumnos) {
            document.getElementById("alumnos").value = datos.alumnos;
        }
        if (datos.fecha) {
            selectedDate = new Date(datos.fecha);
        }
        if (Array.isArray(datos.recursos)) {
            datos.recursos.forEach(nombre => {
                const cb = document.getElementById("recurso" + nombre.replace(/\s+/g, ''));
                if (cb) cb.checked = true;
            });
        }

        // El calendario ya se pinto sin selectedDate; lo repintamos.
        renderCalendar();
        validar();
    });

    // =========================
    // BOTONES DE NAVEGACION
    // =========================

    document.getElementById("botonSiguiente").addEventListener("click", function (e) {
        e.preventDefault();
        const selectActividad = document.querySelector("#evento");
        const selOption = selectActividad.options[selectActividad.selectedIndex];

        let reservaEvento = {
            alumnos: parseInt(document.querySelector("#alumnos").value),
            actividad: selectActividad.value,
            actividadNombre: selOption ? selOption.text : "",
            fecha: selectedDate,
            recursos: obtenerRecursos()
        };

        sessionStorage.setItem("reservaEvento", JSON.stringify(reservaEvento));
        window.location.href = "laboratorios.html";
    });


    document.getElementById("botonAtras").addEventListener("click", function (e) {
        e.preventDefault();

        // Guardar el estado actual del formulario para que si el usuario
        // vuelve, encuentre todo como lo dejo. Usamos guardas para no
        // romper si algun campo esta vacio (selOption puede ser null).
        const selectActividad = document.querySelector("#evento");
        const selOption = selectActividad.options[selectActividad.selectedIndex];

        let reservaEvento = {
            alumnos: parseInt(document.querySelector("#alumnos").value) || 0,
            actividad: selectActividad.value || "",
            actividadNombre: selOption ? selOption.text : "",
            fecha: selectedDate,
            recursos: obtenerRecursos()
        };

        sessionStorage.setItem("reservaEvento", JSON.stringify(reservaEvento));
        window.location.href = "edificio.html";
    });


    document.getElementById("inicio").addEventListener("click", function (e) {
        e.preventDefault();
        window.location.href = "menu.html";
    });


    // =========================
    // VALIDACION FORMULARIO
    // =========================

    let form = document.querySelector("#form");
    let btn = document.querySelector("#botonSiguiente");

    function validar() {
        let deshabilitar = false;

        if (form.alumnos.value === "") {
            deshabilitar = true;
        }
        if (form.evento.value === "") {
            deshabilitar = true;
        }
        if (selectedDate === null) {
            deshabilitar = true;
        }

        let recursosSeleccionados =
            document.querySelectorAll('input[type="checkbox"]:checked');

        if (recursosSeleccionados.length === 0) {
            deshabilitar = true;
        }
        btn.disabled = deshabilitar;
    }

    form.addEventListener("input", validar);
    document.addEventListener("change", validar);

    // =========================
    // CALENDARIO
    // =========================

    const monthYearEl = document.getElementById("month-year");
    const daysEl = document.getElementById("days");

    const prevMonthBtn = document.getElementById("prev-month");
    const nextMonthBtn = document.getElementById("next-month");
    const todayBtn = document.getElementById("today-btn");

    let currentDate = new Date();

    async function cargarFechasOcupadas() {
        try {
            const respuesta = await fetch(`/api/reservas/fechas-ocupadas?${credsQueryString()}`);

            if (respuesta.ok) {
                const data = await respuesta.json();
                reservasOcupadas = Array.isArray(data) ? data : [];
                console.log("Reservas:", reservasOcupadas);
            } else {
                reservasOcupadas = [];
            }
        } catch (error) {
            console.error(error);
            reservasOcupadas = [];
        }
    }

    // Se declara como funcion nombrada (no arrow) y a nivel del DOMContentLoaded
    // para que el .then() de restauracion pueda llamarla por nombre.
    function renderCalendar() {
        daysEl.innerHTML = "";

        let year  = currentDate.getFullYear();
        let month = currentDate.getMonth();

        const meses = [
            "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
            "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
        ];

        monthYearEl.textContent = meses[month] + " " + year;

        let primerDia = new Date(year, month, 1).getDay();
        let ultimoDia = new Date(year, month + 1, 0).getDate();

        for (let i = 0; i < primerDia; i++) {
            daysEl.appendChild(document.createElement("div"));
        }

        let hoy = new Date();
        hoy.setHours(0, 0, 0, 0);

        for (let i = 1; i <= ultimoDia; i++) {
            let day = document.createElement("div");
            day.classList.add("day");
            day.textContent = i;

            let fecha = new Date(year, month, i);
            let fechaString =
                `${year}-${String(month + 1).padStart(2, "0")}-${String(i).padStart(2, "0")}`;

            // Reglas que dependen SOLO de la fecha (espejo de fn_validar_fechas_y_fin_semana).
            // SQL DOW(): 1=domingo, 7=sabado.  JS getDay(): 0=domingo, 6=sabado.
            let dow           = fecha.getDay();
            let esFinDeSemana = (dow === 0 || dow === 6);
            let esPasado      = fecha < hoy;

            let reservaEseDia = reservasOcupadas.find(r => r.fecha === fechaString);
            let feriadoEseDia = feriados.find(f => String(f.FECHA).split('T')[0] === fechaString);

            if (esPasado || esFinDeSemana || feriadoEseDia) {

                day.classList.add("deshabilitado");
                day.title = esPasado
                    ? "Fecha pasada"
                    : esFinDeSemana
                        ? "Fin de semana: no se permiten reservas"
                        : `Feriado: ${feriadoEseDia.DESCRIPCION || ''}`;

            } else {
                // Que haya una reserva ese dia no significa que el dia
                // completo este ocupado (puede ser en otro laboratorio
                // u otro horario) - el solapamiento real se valida por
                // laboratorio + horario en el siguiente paso. Aca solo
                // mostramos un indicador, sin bloquear el clic.
                if (reservaEseDia) {
                    day.classList.add("has-events");
                    day.title = "Hay una reserva ese dia: " + reservaEseDia.inicio + " - " + reservaEseDia.fin;
                }

                day.addEventListener("click", function () {
                    selectedDate = fecha;
                    renderCalendar();
                    validar();
                });
            }

            if (hoy.getDate() === i && hoy.getMonth() === month && hoy.getFullYear() === year) {
                day.classList.add("today");
            }

            if (selectedDate &&
                selectedDate.getDate() === i &&
                selectedDate.getMonth() === month &&
                selectedDate.getFullYear() === year) {
                day.classList.add("selected");
            }

            daysEl.appendChild(day);
        }
    }

    prevMonthBtn.addEventListener("click", function () {
        currentDate.setMonth(currentDate.getMonth() - 1);
        renderCalendar();
    });

    nextMonthBtn.addEventListener("click", function () {
        currentDate.setMonth(currentDate.getMonth() + 1);
        renderCalendar();
    });

    todayBtn.addEventListener("click", function () {
        currentDate = new Date();
        renderCalendar();
    });

    await cargarFechasOcupadas();
    await cargarFeriados();
    renderCalendar();
    validar();
});

// =========================
// OBTENER RECURSOS
// =========================

function obtenerRecursos() {
    let recursos = [];
    document
        .querySelectorAll('input[type="checkbox"]:checked')
        .forEach(r => {
            recursos.push(r.value);
        });
    return recursos;
}