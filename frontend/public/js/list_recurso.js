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
            window.location.href = "./list_laboratorios.html";
        });
    }

    const btnAgregar = document.getElementById("agregar");

    if (btnAgregar) {
        btnAgregar.addEventListener("click", function (e) {
            e.preventDefault();
            window.location.href = "./add_recursos.html";
        });
    }

    const recursosList = document.getElementById('recursos-list');
    const errorMessage = document.getElementById('error-message');

    if (!recursosList) {
        console.error("No existe tbody para mostrar recursos.");
        return;
    }

    const usuario = sessionStorage.getItem('usuario');
    const clave = sessionStorage.getItem('clave');

    if (!usuario || !clave) {
        if (errorMessage) errorMessage.textContent = "Faltan credenciales.";
        return;
    }

    function loadRecursos() {

        fetch(`/api/recursos?usuario=${encodeURIComponent(usuario)}&clave=${encodeURIComponent(clave)}`)
            .then(async response => {

                const data = await parseJsonSafe(response);

                if (!response.ok) {
                    throw new Error(data.error || "Error al cargar recursos");
                }

                let recursos = data;

                if (!Array.isArray(recursos)) {
                    recursos = data.recursos || data.rows || [];
                }

                mostrarRecursos(recursos);

            })
            .catch(error => {
                console.error(error);
                if (errorMessage) errorMessage.textContent = error.message;
            });

    }

    function mostrarRecursos(recursos) {

        recursosList.innerHTML = "";

        if (!recursos || recursos.length === 0) {
            recursosList.innerHTML = `
                <tr>
                    <td colspan="5">
                        No hay recursos cargados.
                    </td>
                </tr>
            `;
            return;
        }

        recursos.forEach(recurso => {

            recursosList.innerHTML += `
                <tr>
                    <td>${escapeHtml(recurso.NUMERO_LABORATORIO)}</td>
                    <td>${escapeHtml(recurso.NOMBRE)}</td>
                    <td>${escapeHtml(recurso.DESCRIPCION)}</td>
                    <td>${recurso.DISPONIBILIDAD === 'S' ? 'Disponible' : 'No disponible'}</td>
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
