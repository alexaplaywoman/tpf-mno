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
        if (form.documento.value === "") desabilitar = true;
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
});