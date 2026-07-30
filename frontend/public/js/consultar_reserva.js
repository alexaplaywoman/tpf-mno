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

    // Esta consulta es publica (sin login previo): usamos la cuenta de
    // base de datos generica "solicitante" (solo lectura) para poder
    // conectar, y filtramos igual por la cedula que la persona escribio.
    // Sin esto, datos_reserva.js nunca tiene "usuario"/"clave" y siempre
    // muestra "No hay una sesión activa" sin importar los datos ingresados.
    sessionStorage.setItem("usuario", "solicitante");
    sessionStorage.setItem("clave", "soli123");

    window.location.href = "datos_reserva.html";
});
