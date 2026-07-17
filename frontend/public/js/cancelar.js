document.addEventListener("DOMContentLoaded", function () {

    const usuario = sessionStorage.getItem("usuario");
    const clave   = sessionStorage.getItem("clave");
    const idReserva = sessionStorage.getItem("reservaCancelar");
    const mensajeError = document.getElementById("mensajeError");

    // Cargar los motivos desde el backend
    cargarMotivos();

    function cargarMotivos() {
        fetch("/api/reservas/motivos-cancelacion")
            .then(res => res.json())
            .then(motivos => {
                const select = document.getElementById("motivo");

                if (!motivos || motivos.length === 0) {
                    console.warn("No se recibieron motivos del backend.");
                    return;
                }

                motivos.forEach(function (motivo) {
                    const option = document.createElement("option");
                    option.value = motivo;       // el value viaja al backend y debe coincidir con la lista
                    option.textContent = motivo;
                    select.appendChild(option);
                });
            })
            .catch(err => {
                console.error("Error al cargar los motivos:", err);
            });
    }

    function mostrarError(texto) {
        mensajeError.textContent = texto;
        mensajeError.style.display = "block";
    }

    document.getElementById("botonAtras").addEventListener("click", function () {
        window.location.href = "datos_reserva.html";
    });

    document.getElementById("botonCancelar").addEventListener("click", async function () {

        const numeroDocumento = document.getElementById("numeroDocumento").value.trim();
        const motivo          = document.getElementById("motivo").value;

        if (!idReserva) {
            mostrarError("No se identificó la reserva a cancelar. Volvé a la lista de reservas.");
            return;
        }
        if (numeroDocumento === "") {
            mostrarError("Ingrese el número de documento del responsable.");
            return;
        }
        if (motivo === "") {
            mostrarError("Seleccione un motivo de cancelación.");
            return;
        }

        try {
            const respuesta = await fetch(`/api/reservas/cancelar/${encodeURIComponent(idReserva)}`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    usuario: usuario,
                    clave: clave,
                    motivo: motivo,
                    cedula_responsable: numeroDocumento
                })
            });

            const data = await respuesta.json();

            if (data.success) {
                alert("Reserva cancelada correctamente.");
                sessionStorage.removeItem("reservaCancelar");
                window.location.href = "datos_reserva.html";
            } else {
                mostrarError(data.error || "No se pudo cancelar la reserva.");
            }

        } catch (error) {
            console.error("Error al cancelar:", error);
            mostrarError("Error de conexión al cancelar la reserva.");
        }
    });

});