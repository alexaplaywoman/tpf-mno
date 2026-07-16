function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = String(str ?? '');
    return div.innerHTML;
}


async function parseJsonSafe(response) {

    const text = await response.text();

    try {
        return JSON.parse(text);
    } catch (e) {
        console.error("Respuesta no es JSON. Status:", response.status);
        console.error("Contenido recibido:", text.slice(0, 300));
        throw new Error(
            `El servidor respondió con algo que no es JSON (status ${response.status}). ` +
            `Revisá la ruta del endpoint en el backend.`
        );
    }

}


document.addEventListener('DOMContentLoaded', function () {

    const btnInicio = document.getElementById("inicio");

    if (btnInicio) {
        btnInicio.addEventListener("click", function (e) {
            e.preventDefault();
            window.location.href = "./list_reservas.html";
        });
    }

    const btnAgregar = document.getElementById("agregar");

    if (btnAgregar) {
        btnAgregar.addEventListener("click", function (e) {
            e.preventDefault();
            window.location.href = "./add_reservas.html";
        });
    }

    const reservasList = document.getElementById('reservas-list');
    const errorMessage = document.getElementById('error-message');

    if (!reservasList) {
        console.error("No existe tbody para mostrar reservas.");
        return;
    }

    const usuario = sessionStorage.getItem('usuario');
    const clave = sessionStorage.getItem('clave');

    if (!usuario || !clave) {
        if (errorMessage) errorMessage.textContent = "Faltan credenciales.";
        return;
    }

    function loadReservas() {

        fetch(`/api/reservas?usuario=${encodeURIComponent(usuario)}&clave=${encodeURIComponent(clave)}`)
            .then(async response => {

                const data = await parseJsonSafe(response);

                if (!response.ok) {
                    throw new Error(data.error || "Error al cargar reservas");
                }

                let reservas = data;

                if (!Array.isArray(reservas)) {
                    reservas = data.reservas || data.rows || [];
                }

                mostrarReservas(reservas);

            })
            .catch(error => {
                console.error(error);
                if (errorMessage) errorMessage.textContent = error.message;
            });

    }

    function mostrarReservas(reservas) {

        reservasList.innerHTML = "";

        if (!reservas || reservas.length === 0) {
            reservasList.innerHTML = `
                <tr>
                    <td colspan="5">
                        No hay reservas cargadas.
                    </td>
                </tr>
            `;
            return;
        }

        recursos.forEach(reserva => {

            reservasList.innerHTML += `
                <tr>
                    <td>${escapeHtml(reserva.ID_RESERVA)}</td>
                    <td>${escapeHtml(reserva.NUMERO_LABORATORIO)}</td>
                    <td>${escapeHtml(reserva.CED)}</td>
                    <td>${escapeHtml(reserva.DESCRIPCION)}</td>
                    <td>${escapeHtml(reserva.DESCRIPCION)}</td>
                    <td>${escapeHtml(reserva.DESCRIPCION)}</td>
                    <td>
                        <div class="d-flex justify-content-center gap-2">

                            <button
                                class="btn btn-dark btn-sm"
                                onclick="editarRecurso(${recurso.ID_RECURSO})">
                                <i class="bi bi-pencil-square"></i>
                                Editar
                            </button>

                            <button
                                class="btn btn-dark btn-sm"
                                onclick="confirmarEliminar(${recurso.ID_RECURSO})">
                                <i class="bi bi-trash"></i>
                                Eliminar
                            </button>

                        </div>
                    </td>
                </tr>
            `;

        });

    }

    window.editarRecurso = function (id) {
        window.location.href = `/upd_recursos.html?id=${id}`;
    };

    window.confirmarEliminar = function (id) {

        const dialog = document.getElementById("alertaEliminar");
        const btnSi = document.getElementById("btnConfirmarEliminarSi");
        const btnNo = document.getElementById("btnConfirmarEliminarNo");

        if (!dialog) {
            eliminarRecurso(id);
            return;
        }

        dialog.showModal();

        btnNo.onclick = function () {
            dialog.close();
        };

        btnSi.onclick = function () {
            dialog.close();
            eliminarRecurso(id);
        };

    };

    function eliminarRecurso(id) {

        fetch(
            `/api/recursos/delete/${id}?usuario=${encodeURIComponent(usuario)}&clave=${encodeURIComponent(clave)}`,
            { method: "DELETE" }
        )
            .then(parseJsonSafe)
            .then((data) => {
                if (data.success === false) {
                    throw new Error(data.error || "Error al eliminar recurso");
                }
                loadRecursos();
            })
            .catch(error => {
                console.error(error);
                if (errorMessage) errorMessage.textContent = error.message;
            });

    }

    loadRecursos();

});
