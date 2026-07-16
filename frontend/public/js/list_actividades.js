document.addEventListener('DOMContentLoaded', function () {
    document.getElementById("inicio").addEventListener("click", function (e) {
        e.preventDefault();
        window.location.href = "menu_administrador.html";
    });

    document.getElementById("agregar").addEventListener("click", function (e) {
        e.preventDefault();
        window.location.href = "add_actividades.html";
    });

    document.getElementById("botonEditar").addEventListener("click", function (e) {
        e.preventDefault();
        window.location.href = "upd_actividades.html";
    });
})
