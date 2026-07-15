console.log("JS LOGIN CARGADO");

document.getElementById("formLogin").addEventListener("submit", async function (e) {
  e.preventDefault();

  const usuario = document.getElementById("usuario").value.trim();
  const clave = document.getElementById("clave").value;

  try {
    const respuesta = await fetch("/api/accesos", {   
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ usuario, clave })
    });

    const data = await respuesta.json();
    console.log("Respuesta login completa:", data);
    console.log("¿data.esAdmin?:", data.esAdmin, typeof data.esAdmin);

    if (respuesta.ok && data.exito) {
      sessionStorage.setItem("usuario", usuario);
      sessionStorage.setItem("clave", clave);

      if (data.esAdmin === true) {
        window.location.href = "/menu_administrador.html";
      } else {
        window.location.href = "/menu.html";
      }
    } else {
      document.getElementById("msgError").classList.remove("d-none");
      document.getElementById("msgError").innerText = data.mensaje || "Credenciales incorrectas.";
    }
  } catch (error) {
    console.error("Error:", error);
    document.getElementById("msgError").classList.remove("d-none");
    document.getElementById("msgError").innerText = "Error al conectar al servidor.";
  }
});