document.addEventListener('DOMContentLoaded', function () {

document.getElementById("inicio").addEventListener("click", function () {
    window.location.href = "menu.html";
});

document.getElementById("botonAtras").addEventListener("click", function () {
    window.location.href = "laboratorios.html";
});

document.getElementById("botonConfirmar").addEventListener("click", function () {
    window.location.href = "menu.html";
});

// FORMULARIO - Desahabilitar siguiente si el campo está en blanco
    let form = document.querySelector("#form");
    let btn = document.querySelector("#botonConfirmar");

    function validar() {
        let desabilitar = false;
        if (form.tipoDocumento.value === "") desabilitar = true;
        if (form.numeroDocumento.value === "") desabilitar = true;
        if (form.nombre.value === "") desabilitar = true;
        if (form.apellido.value === "") desabilitar = true;
        if (form.correo.value === "") desabilitar = true;
        if (form.telefono.value === "") desabilitar = true;
        if (form.departamento.value === "") desabilitar = true;
        if (form.solicitante.value === "") desabilitar = true;

        btn.disabled = desabilitar;

    }

    form.addEventListener("input", validar);

    // ejecutar validación inicial por si ya hay datos
    validar();

    //recupera los datos guadados anteriormente

    let edificio = sessionStorage.getItem("edificioSeleccionado");

    let reservaEvento = JSON.parse(sessionStorage.getItem("reservaEvento"));

    let reservaLaboratorio = JSON.parse(sessionStorage.getItem("reservaLaboratorio"));

    //muestra los datos de la reserva

    let fecha = new Date(reservaEvento.fecha);

    document.getElementById("fechaReserva").textContent = fecha.toLocaleDateString("es-PY");

    document.getElementById("cantidadReserva").textContent = reservaEvento.alumnos;

    document.getElementById("actividadReserva").textContent = reservaEvento.actividad;

    document.getElementById("edificioReserva").textContent = edificio;

    document.getElementById("laboratorioReserva").textContent = reservaLaboratorio.laboratorio;

    document.getElementById("horarioReserva").textContent = reservaLaboratorio.horaInicio + " - " + reservaLaboratorio.horaFin;
});

