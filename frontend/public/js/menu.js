document.getElementById("botonReserva").addEventListener("click", function(e) {
  e.preventDefault();
  window.location.href = "edificio.html";
});

document.getElementById("botonConsultar").addEventListener("click", function(e) {
  e.preventDefault();
  window.location.href = "consultar_reserva.html";
});

document.getElementById("botonCerrarSesion").addEventListener("click", function(e) {
  e.preventDefault();
  sessionStorage.removeItem("usuario");
  sessionStorage.removeItem("clave");
  window.location.href = "login.html";
});