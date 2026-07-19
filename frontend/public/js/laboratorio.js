document.addEventListener('DOMContentLoaded', function () {
    document.getElementById("inicio").addEventListener("click", function (e) {
        e.preventDefault();
        window.location.href = "menu.html";
    });

    document.getElementById("botonSiguiente").addEventListener("click", function (e) {
        e.preventDefault();

        let reservaLaboratorio = {
            laboratorio: document.querySelector('input[name="laboratorio"]:checked').value,
            horaInicio: document.querySelector("#horaInicio").value,
            horaFin: document.querySelector("#horaFin").value
        };

        sessionStorage.setItem("reservaLaboratorio", JSON.stringify(reservaLaboratorio));

        window.location.href = "confirmar.html";
    });

    document.getElementById("botonAtras").addEventListener("click", function (e) {
        e.preventDefault();
        window.location.href = "evento.html";
    });

    let form = document.querySelector("#form");
    let btn = document.querySelector("#botonSiguiente");

    function validar() {
        let deshabilitar = false;

        if (form.laboratorio.value === "") deshabilitar = true;
        if (form.horaInicio.value === "") deshabilitar = true;
        if (form.horaFin.value === "") deshabilitar = true;

        btn.disabled = deshabilitar;
    }

    form.addEventListener("input", validar);

    //ejecuta la validación inicial por si ya hay datos
    validar();

    // Recupera la información que el usuario eligió en la pantalla anterior
    let reservaEvento = JSON.parse(
        sessionStorage.getItem("reservaEvento")
    );

    cargarLaboratorios(reservaEvento);

    // Vuelve a chequear disponibilidad (solapamiento) cada vez que
    // el usuario termina de elegir horaInicio u horaFin
    document.getElementById("horaInicio").addEventListener("change", actualizarDisponibilidadPorHorario);
    document.getElementById("horaFin").addEventListener("change", actualizarDisponibilidadPorHorario);

    // Al elegir laboratorio, deshabilitamos en los <select> las horas
    // que ya están ocupadas para ESE laboratorio en la fecha elegida
    document.getElementById("horaInicio").addEventListener("change", actualizarOpcionesHoraFin);
    document.getElementById("listaLaboratorios").addEventListener("change", function (e) {
        if (e.target.name !== "laboratorio") return;
        actualizarHorariosOcupadosDelLab();
    });
});

// Franjas ocupadas del laboratorio actualmente seleccionado, para el
// dia elegido. Se recalcula cada vez que cambia el laboratorio.
let horariosOcupadosLab = [];

function actualizarHorariosOcupadosDelLab() {
    const laboratorio = document.querySelector('input[name="laboratorio"]:checked');
    const reservaEvento = JSON.parse(sessionStorage.getItem("reservaEvento"));

    if (!laboratorio || !reservaEvento) {
        horariosOcupadosLab = [];
        habilitarTodasLasHoras();
        return;
    }

    const usuario = sessionStorage.getItem('usuario');
    const clave = sessionStorage.getItem('clave');
    const fecha = reservaEvento.fecha.split('T')[0];

    fetch(`/api/laboratorios/horarios-ocupados?usuario=${usuario}&clave=${clave}` +
          `&numero_laboratorio=${laboratorio.value}&fecha=${fecha}` +
          `&id_tipo_actividad=${reservaEvento.actividad}`)
        .then(res => res.json())
        .then(ocupados => {
            // El backend devuelve "HH:MM:SS"; los <option> usan "HH:MM".
            horariosOcupadosLab = (ocupados || []).map(o => ({
                HORA_INICIO: String(o.HORA_INICIO).slice(0, 5),
                HORA_FIN: String(o.HORA_FIN).slice(0, 5)
            }));
            actualizarOpcionesHoraInicio();
            actualizarOpcionesHoraFin();
        })
        .catch(err => {
            console.error('Error al consultar horarios ocupados del laboratorio:', err);
            horariosOcupadosLab = [];
        });
}

function habilitarTodasLasHoras() {
    document.querySelectorAll("#horaInicio option, #horaFin option").forEach(op => {
        op.disabled = false;
        op.title = "";
    });
}

// Una hora de inicio no sirve si cae DENTRO de una franja ya ocupada
// (arrancar ahí ya se solapa, sin importar cuándo termine).
function actualizarOpcionesHoraInicio() {
    const select = document.getElementById("horaInicio");

    Array.from(select.options).forEach(option => {
        if (option.value === "") return;

        const ocupada = horariosOcupadosLab.some(o =>
            option.value >= o.HORA_INICIO && option.value < o.HORA_FIN
        );

        option.disabled = ocupada;
        option.title = ocupada ? "Horario ocupado" : "";
    });

    if (select.selectedOptions[0] && select.selectedOptions[0].disabled) {
        select.value = "";
    }
}

// Dado el horaInicio ya elegido, una hora de fin no sirve si el rango
// [horaInicio, horaFin) se solapa con alguna franja ya ocupada.
function actualizarOpcionesHoraFin() {
    const horaInicio = document.getElementById("horaInicio").value;
    const select = document.getElementById("horaFin");

    Array.from(select.options).forEach(option => {
        if (option.value === "") return;

        if (!horaInicio || option.value <= horaInicio) {
            option.disabled = true;
            option.title = "Debe ser posterior a la hora de inicio";
            return;
        }

        const seSolapa = horariosOcupadosLab.some(o =>
            horaInicio < o.HORA_FIN && option.value > o.HORA_INICIO
        );

        option.disabled = seSolapa;
        option.title = seSolapa ? "Horario ocupado" : "";
    });

    if (select.selectedOptions[0] && select.selectedOptions[0].disabled) {
        select.value = "";
    }
}

// Trae los laboratorios reales del backend (capacidad y estado)
function cargarLaboratorios(reservaEvento) {
    const usuario = sessionStorage.getItem('usuario');
    const clave = sessionStorage.getItem('clave');

    Promise.all([
        fetch(`/api/laboratorios?usuario=${usuario}&clave=${clave}`).then(r => r.json()),
        fetch(`/api/recursos?usuario=${usuario}&clave=${clave}`).then(r => r.json())
    ])
    .then(([laboratorios, recursos]) => {
        console.log('recursos crudos:', recursos);
        console.log('reservaEvento.recursos:', reservaEvento.recursos);

        // Agrupar recursos disponibles por lab
        const recursosPorLab = {};
        recursos.forEach(r => {
            if (r.DISPONIBILIDAD !== 'S') return;
            if (!recursosPorLab[r.NUMERO_LABORATORIO]) {
                recursosPorLab[r.NUMERO_LABORATORIO] = [];
            }
            recursosPorLab[r.NUMERO_LABORATORIO].push(r.NOMBRE);
        });

        laboratorios.forEach(lab => {
            lab.recursos_disponibles = recursosPorLab[lab.NUMERO_LABORATORIO] || [];
        });

        verificarLaboratorios(laboratorios, reservaEvento);
    })
    .catch(err => console.error('Error al cargar laboratorios o recursos:', err));
}

function verificarLaboratorios(laboratorios, reservaEvento) {
    laboratorios.forEach(function (laboratorio) {
        const radio = document.querySelector(`input[name="laboratorio"][value="${laboratorio.NUMERO_LABORATORIO}"]`);
        if (!radio) return;

        const label = radio.parentElement.querySelector('label');
        const motivo = validarLaboratorio(laboratorio, reservaEvento);

        if (motivo === null) {
            radio.disabled = false;
            radio.dataset.bloqueadoPermanente = 'false';
            if (label) label.removeAttribute('title');
            console.log(`Laboratorio ${laboratorio.NUMERO_LABORATORIO} habilitado`);
        } else {
            radio.disabled = true;
            radio.dataset.bloqueadoPermanente = 'true';
            if (label) label.title = descripcionMotivo(motivo);
            console.log(`Laboratorio ${laboratorio.NUMERO_LABORATORIO} deshabilitado (${motivo})`);
        }
    });
}

function descripcionMotivo(motivo) {
    const mensajes = {
        estado: 'Laboratorio en mantenimiento, fuera de servicio o bloqueado',
        capacidad: 'La capacidad del laboratorio es menor a la cantidad de alumnos',
        recursos: 'El laboratorio no cuenta con los recursos solicitados',
        horario: 'El laboratorio ya tiene una reserva en ese horario'
    };
    return mensajes[motivo] || 'No disponible';
}

function validarLaboratorio(laboratorio, reservaEvento) {
    if (laboratorio.estado_tipo !== 'D') {
        return 'estado';
    }

    if (reservaEvento.alumnos > laboratorio.CAPACIDAD_ALUMNOS) {
        return 'capacidad';
    }

    if (reservaEvento.recursos && reservaEvento.recursos.length > 0) {
        const disponibles = laboratorio.recursos_disponibles || [];
        const tieneTodos = reservaEvento.recursos.every(r => disponibles.includes(r));
        if (!tieneTodos) return 'recursos';
    }

    return null;
}

// Vuelve a consultar disponibilidad (solapamiento) apenas el usuario
// completa horaInicio y horaFin, y deshabilita los laboratorios que
// ya tienen una reserva en ese rango horario
function actualizarDisponibilidadPorHorario() {
    const horaInicio = document.getElementById("horaInicio").value;
    const horaFin = document.getElementById("horaFin").value;

    if (!horaInicio || !horaFin) return;

    const usuario = sessionStorage.getItem('usuario');
    const clave = sessionStorage.getItem('clave');
    const reservaEvento = JSON.parse(sessionStorage.getItem("reservaEvento"));
    const fecha = reservaEvento.fecha.split('T')[0];
    /*const recursos = reservaEvento.recursos && reservaEvento.recursos.length > 0
        ? `&recursos=${encodeURIComponent(reservaEvento.recursos.join(','))}`
        : '';*/
    fetch(`/api/laboratorios/disponibilidad-horario?usuario=${usuario}&clave=${clave}` +
          `&fecha=${fecha}&hora_inicio=${horaInicio}&hora_fin=${horaFin}` +
          `&id_tipo_actividad=${reservaEvento.actividad}`)
    
        .then(res => res.json())
        .then(data => {
            data.laboratorios.forEach(lab => {
                const radio = document.querySelector(`input[name="laboratorio"][value="${lab.NUMERO_LABORATORIO}"]`);
                if (!radio) return;

                if (radio.dataset.bloqueadoPermanente === 'true') return;

                const label = radio.parentElement.querySelector('label');
                radio.disabled = (lab.disponible !== 'S');

                if (radio.disabled) {
                    if (label) label.title = descripcionMotivo('horario');
                    if (radio.checked) {
                        radio.checked = false;
                        validar();
                    }
                } else {
                    if (label) label.removeAttribute('title');
                }
            });
        })
        .catch(err => console.error('Error al chequear disponibilidad:', err));
}