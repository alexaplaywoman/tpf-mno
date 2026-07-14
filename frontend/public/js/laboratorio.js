console.log("laboratorio.js cargado");

document.addEventListener('DOMContentLoaded', function () {

    document.getElementById("inicio").addEventListener("click", function (e) {
        e.preventDefault();
        window.location.href = "menu.html";
    });


    document.getElementById("botonSiguiente").addEventListener("click", function (e) {
        e.preventDefault();

        // Guarda la información del laboratorio y horario seleccionado
        let reservaLaboratorio = {
            laboratorio: document.querySelector('input[name="laboratorio"]:checked').value,
            horaInicio: document.querySelector("#horaInicio").value,
            horaFin: document.querySelector("#horaFin").value
        };


        sessionStorage.setItem(
            "reservaLaboratorio",
            JSON.stringify(reservaLaboratorio)
        );


        window.location.href = "confirmar.html";

    });



    document.getElementById("botonAtras").addEventListener("click", function (e) {
        e.preventDefault();
        window.location.href = "evento.html";
    });



    let form = document.querySelector("#form");
    let btn = document.querySelector("#botonSiguiente");


    function validar() {

        let desabilitar = false;


        if (form.laboratorio.value === "") desabilitar = true;
        if (form.horaInicio.value === "") desabilitar = true;
        if (form.horaFin.value === "") desabilitar = true;


        btn.disabled = desabilitar;

    }

    form.addEventListener("input", validar);

    // ejecuta la validación inicial por si ya hay datos
    validar();

    // Recupera la información que el usuario eligió en la pantalla anterior
    let reservaEvento = JSON.parse(
        sessionStorage.getItem("reservaEvento")
    );


    cargarLaboratorios(reservaEvento);


});


// Esta función después se conectará con el backend
function cargarLaboratorios(reservaEvento) {


    // Después esto vendrá del backend
    // fetch("/api/laboratorios")
    // .then(res => res.json())
    // .then(laboratorios => {
    //     verificarLaboratorios(laboratorios, reservaEvento);
    // });



    // Ejemplo temporal de cómo vendría del backend
    let laboratorios = [

        {
            numero: 1,
            capacidad: 40,
            recursos: [
                "internet",
                "proyector",
                "pizarraDigital"
            ],
            estado: "habilitado"
        },


        {
            numero: 2,
            capacidad: 20,
            recursos: [
                "internet"
            ],
            estado: "habilitado"
        },


        {
            numero: 3,
            capacidad: 60,
            recursos: [
                "internet",
                "proyector",
                "aireAcondicionado"
            ],
            estado: "deshabilitado"
        }

    ];


    verificarLaboratorios(
        laboratorios,
        reservaEvento
    );


}

function verificarLaboratorios(laboratorios, reservaEvento) {


    laboratorios.forEach(function (laboratorio) {


        let disponible = validarLaboratorio(
            laboratorio,
            reservaEvento
        );


        if (disponible) {


            console.log(
                "Laboratorio " + laboratorio.numero + " habilitado"
            );


        } else {


            console.log(
                "Laboratorio " + laboratorio.numero + " deshabilitado"
            );


        }


    });


}

function validarLaboratorio(laboratorio, reservaEvento) {


    // Verifica si el laboratorio está habilitado
    if (laboratorio.estado === "deshabilitado") {

        return false;

    }


    // Verifica cantidad de alumnos
    if (reservaEvento.alumnos > laboratorio.capacidad) {

        return false;

    }


    // Verifica recursos necesarios
    for (let recurso of reservaEvento.recursos) {


        if (!laboratorio.recursos.includes(recurso)) {

            return false;

        }


    }


    // Si pasó todos los controles
    return true;

}