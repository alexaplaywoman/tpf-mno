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
});

// Trae los laboratorios reales del backend (capacidad y estado)
function cargarLaboratorios(reservaEvento) {
    const usuario = sessionStorage.getItem('usuario');
    const clave = sessionStorage.getItem('clave');

    fetch(`/api/laboratorios?usuario=${usuario}&clave=${clave}`)
        .then(res => res.json())
        .then(laboratorios => {
            verificarLaboratorios(laboratorios, reservaEvento);
        })
        .catch(err => console.error('Error al cargar laboratorios:', err));
}

function verificarLaboratorios(laboratorios, reservaEvento) {

    laboratorios.forEach(function (laboratorio) {

        let disponible = validarLaboratorio(
            laboratorio,
            reservaEvento
        );

        const radio = document.querySelector(`input[name="laboratorio"][value="${laboratorio.NUMERO_LABORATORIO}"]`);

        if (disponible) {

            console.log(
                "Laboratorio " + laboratorio.NUMERO_LABORATORIO + " habilitado"
            );

            if (radio) radio.disabled = false;

        } else {

            console.log(
                "Laboratorio " + laboratorio.NUMERO_LABORATORIO + " deshabilitado"
            );

            if (radio) radio.disabled = true;

        }

    });

}

function validarLaboratorio(laboratorio, reservaEvento) {

    // ESTADO = 1 es "Disponible" (ver ESTADOS_OPERATIVOS)
    if (laboratorio.ESTADO !== 1) {
        return false;
    }

    // Verifica cantidad de alumnos
    if (reservaEvento.alumnos > laboratorio.CAPACIDAD_ALUMNOS) {
        return false;
    }

    // Recursos: pendiente hasta que exista /api/recursos
    // (por ahora no se filtra por esto acá)

    return true;

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

    fetch(`/api/laboratorios/disponibilidad-horario?usuario=${usuario}&clave=${clave}&fecha=${fecha}&hora_inicio=${horaInicio}&hora_fin=${horaFin}`)
        .then(res => res.json())
        .then(data => {
            data.laboratorios.forEach(lab => {
                const radio = document.querySelector(`input[name="laboratorio"][value="${lab.NUMERO_LABORATORIO}"]`);
                if (radio && lab.disponible !== 'S') radio.disabled = true;
            });
        })
        .catch(err => console.error('Error al chequear disponibilidad:', err));
}