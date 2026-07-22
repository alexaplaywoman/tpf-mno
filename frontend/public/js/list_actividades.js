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
            window.location.href = "./menu_administrador.html";
        });
    }

    const btnAgregar = document.getElementById("agregar");

    if (btnAgregar) {
        btnAgregar.addEventListener("click", function (e) {
            e.preventDefault();
            window.location.href = "./add_actividades.html";
        });
    }

    const actividadesList = document.getElementById('actividades-list');
    const errorMessage = document.getElementById('error-message');

    if (!actividadesList) {
        console.error("No existe tbody para mostrar actividades.");
        return;
    }

    const usuario = sessionStorage.getItem('usuario');
    const clave = sessionStorage.getItem('clave');

    let todasLasActividades = [];
    let paginaActual = 1;
    const limite = 10;

    if (!usuario || !clave) {
        if (errorMessage) errorMessage.textContent = "Faltan credenciales.";
        return;
    }

    function loadActividades() {

        fetch(`/api/actividades?usuario=${encodeURIComponent(usuario)}&clave=${encodeURIComponent(clave)}`)
            .then(async response => {

                const data = await parseJsonSafe(response);

                if (!response.ok) {
                    throw new Error(data.error || "Error al cargar actividades");
                }

                let actividades = data;

                if (!Array.isArray(actividades)) {
                    actividades = data.actividades || data.rows || [];
                }

                todasLasActividades = actividades;
                paginaActual = 1;

                mostrarActividades();
                crearPaginacion();

            })
            .catch(error => {
                console.error(error);
                if (errorMessage) errorMessage.textContent = error.message;
            });

    }

    function mostrarActividades() {

        const inicio = (paginaActual - 1) * limite;
        const fin = inicio + limite;

        const actividades = todasLasActividades.slice(inicio, fin);

        console.log("ACTIVIDADES RECIBIDOS:", actividades);

        actividadesList.innerHTML = "";

        if (!actividades || actividades.length === 0) {
            actividadesList.innerHTML = `
                <tr>
                    <td colspan="6">
                        No hay actividades cargadas.
                    </td>
                </tr>
            `;
            return;
        }

        actividades.forEach(act => {

            actividadesList.innerHTML += `
                <tr>
                    <td>${escapeHtml(act.ID_TIPO_ACTIVIDAD)}</td>
                    <td>${escapeHtml(act.prioridad_nombre)}</td>
                    <td>${escapeHtml(act.NOMBRE)}</td>
                    <td>${escapeHtml(act.NIVEL_PRIORIDAD)}</td>
                    <td>${escapeHtml(act.DURACION_MAX_HORAS)}</td>
                    <td>
                        <div class="d-flex justify-content-center gap-2">

                            <button
                                class="btn btn-dark btn-sm"
                                onclick="editarActividad(${act.ID_TIPO_ACTIVIDAD})">
                                <i class="bi bi-pencil-square"></i>
                                Editar
                            </button>

                            <button
                                class="btn btn-dark btn-sm"
                                onclick="confirmarEliminar(${act.ID_TIPO_ACTIVIDAD})">
                                <i class="bi bi-trash"></i>
                                Eliminar
                            </button>

                        </div>
                    </td>
                </tr>
            `;

        });

    }

    function crearPaginacion(){

        const items = document.getElementById("items");

        if(!items) return;

        items.innerHTML = "";

        const cantidadPaginas = Math.ceil(todasLasActividades.length / limite);


        for(let i = 1; i <= cantidadPaginas; i++){

            items.innerHTML += `
                <li class="page-item ${paginaActual === i ? "active" : ""}">
                    <button class="page-link" onclick="cambiarPagina(${i})">
                        ${i}
                    </button>
                </li>
            `;

        }

    }


    window.cambiarPagina = function(numero){

        paginaActual = numero;

        mostrarActividades();
        crearPaginacion();

    };

    window.nextPage = function(){

        const cantidadPaginas = Math.ceil(todasLasActividades.length / limite);

        if(paginaActual < cantidadPaginas){
            paginaActual++;

            mostrarActividades();
            crearPaginacion();
        }
    };

    window.previusPage = function(){

        if(paginaActual > 1){
            paginaActual--;

            mostrarActividades();
            crearPaginacion();
        }
    }

    window.editarActividad = function (id) {
        window.location.href = `/upd_actividades.html?id=${id}`;
    };

    window.confirmarEliminar = function (id) {

        const dialog = document.getElementById("alertaEliminar");
        const btnSi = document.getElementById("btnConfirmarEliminarSi");
        const btnNo = document.getElementById("btnConfirmarEliminarNo");

        if (!dialog) {
            eliminarActividad(id);
            return;
        }

        dialog.showModal();

        btnNo.onclick = function () {
            dialog.close();
        };

        btnSi.onclick = function () {
            dialog.close();
            eliminarActividad(id);
        };

    };

    function eliminarActividad(id) {

        fetch(
            `/api/actividades/delete/${id}?usuario=${encodeURIComponent(usuario)}&clave=${encodeURIComponent(clave)}`,
            { method: "DELETE" }
        )
            .then(parseJsonSafe)
            .then((data) => {
                if (data.success === false) {
                    throw new Error(data.error || "Error al eliminar actividad");
                }
                loadActividades();
            })
            .catch(error => {
                console.error(error);
                if (errorMessage) errorMessage.textContent = error.message;
            });

    }

    loadActividades();

});
