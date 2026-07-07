document.getElementById("botonSiguiente").addEventListener("click", function () {
    window.location.href = "laboratorios.html";
});

document.getElementById("botonAtras").addEventListener("click", function () {
    window.location.href = "edificio.html";
});

document.getElementById("inicio").addEventListener("click", function () {
    window.location.href = "menu.html";
});



let form = document.querySelector("#form");
let btn = document.querySelector("#botonSiguiente");

function validar(){
    let desabilitar = false;

    if (form.alumnos.value === ""){
        desabilitar = true;
    }

    if (form.evento.value === ""){
        desabilitar = true;
    }

    if (form.fecha.value === ""){
        desabilitar = true;
    }

    if (desabilitar === true){
        btn.disabled = true;
    } else {
        btn.disabled = false;
    }
}

form.addEventListener("keyup", validar)