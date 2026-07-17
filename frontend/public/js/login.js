
document.getElementById("formLogin").addEventListener("submit", async function (e) {
  e.preventDefault();

  const usuario = document.getElementById("usuario").value;
  const clave = document.getElementById("clave").value;

  try {
    const respuesta = await fetch("/api/accesos", {   // 👈 acá el cambio
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ usuario, clave })
    });

    const data = await respuesta.json();
    console.log("Respuesta login:", data);

    if (respuesta.ok && data.exito) {
      sessionStorage.setItem("usuario", usuario);
      sessionStorage.setItem("clave", clave);
      window.location.href = "/menu.html";
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