document.getElementById("botonAtras").addEventListener("click", function () {
    window.location.href = "menu.html";
});

document.getElementById("botonConsultar").addEventListener("click", () => {

    //el usuario ingresa sus datos
    const tipoCedula = document.getElementById("tipoCedula").value;
    const numeroCedula = document.getElementById("numeroCedula").value;
    const correo = document.getElementById("correo").value;

    //esto es si no ingresa alguno de sus datos para ver la reserva, sale el modal con el error
    if(!tipoCedula || !numeroCedula || !correo){

    const modal = new bootstrap.Modal(
        document.getElementById("modalError")
    );

    modal.show();

    return;
}
    //y acá se guardan los datos para mostrar la reserva al darle click al botón
    sessionStorage.setItem("tipoCedula", tipoCedula);
    sessionStorage.setItem("numeroCedula", numeroCedula);
    sessionStorage.setItem("correo", correo);

    window.location.href = "datos_reserva.html";
});
