console.log("JS LOGIN CARGADO");
document.getElementById("formLogin").addEventListener("submit", async function(e) {
  e.preventDefault();
  window.location.href = "/menu.html";

  const usuario = document.getElementById("usuario").value;
  const clave = document.getElementById("clave").value;

  const respuesta = await fetch("/api/login", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ usuario, clave })
  });

  const data = await respuesta.json();

  if (respuesta.ok && data.exito) {
    sessionStorage.setItem("usuario", usuario);
    sessionStorage.setItem("clave", clave);
    window.location.href = "/home.html";
  } else {
    document.getElementById("msgError").classList.remove("d-none");
    document.getElementById("msgError").innerText = data.mensaje || "Credenciales incorrectas.";
  }
});