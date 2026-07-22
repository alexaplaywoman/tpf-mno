function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = String(str ?? '');
    return div.innerHTML;
}

const ESTADOS_MANTENIMIENTO_LABELS = {
    P: 'Pendiente',
    E: 'En proceso',
    R: 'Realizado',
    C: 'Cancelado'
};

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

    function formatearFecha(fecha) {

        if (!fecha) return "";

        const fechaCorta = String(fecha).split("T")[0];

        const [anio, mes, dia] = fechaCorta.split("-");

        return `${dia}/${mes}/${anio}`;

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
            window.location.href = "./add_mantenimientos.html";
        });
    }

    const mantenimientosList = document.getElementById('mantenimientos-list');
    const errorMessage = document.getElementById('error-message');

    if (!mantenimientosList) {
        console.error("No existe tbody para mostrar mantenimientos.");
        return;
    }

    const usuario = sessionStorage.getItem('usuario');
    const clave = sessionStorage.getItem('clave');

    let todosLosMantenimientos = [];
    let paginaActual = 1;
    const limite = 10;

    if (!usuario || !clave) {
        if (errorMessage) errorMessage.textContent = "Faltan credenciales.";
        return;
    }

    function loadMantenimientos() {

        fetch(`/api/mantenimientos?usuario=${encodeURIComponent(usuario)}&clave=${encodeURIComponent(clave)}`)
            .then(async response => {

                const data = await parseJsonSafe(response);

                if (!response.ok) {
                    throw new Error(data.error || "Error al cargar mantenimientos");
                }

                let mantenimientos = data;

                if (!Array.isArray(mantenimientos)) {
                    mantenimientos = data.mantenimientos || data.rows || [];
                }

                todosLosMantenimientos = mantenimientos;
                paginaActual = 1;

                mostrarMantenimientos();
                crearPaginacion();

            })
            .catch(error => {
                console.error(error);
                if (errorMessage) errorMessage.textContent = error.message;
            });

    }

    function mostrarMantenimientos() {

        const inicio = (paginaActual - 1) * limite;
        const fin = inicio + limite;

        const mantenimientos = todosLosMantenimientos.slice(inicio, fin);

        console.log("MANTENIMIENTOS RECIBIDOS:", mantenimientos);

        mantenimientosList.innerHTML = "";

        if (!mantenimientos || mantenimientos.length === 0) {
            mantenimientosList.innerHTML = `
                <tr>
                    <td colspan="7">
                        No hay mantenimientos cargados.
                    </td>
                </tr>
            `;
            return;
        }

        mantenimientos.forEach(mant => {

            const estadoLabel = ESTADOS_MANTENIMIENTO_LABELS[mant.estado_mantenimiento] || mant.estado_mantenimiento;

            mantenimientosList.innerHTML += `
                <tr>
                    <td>${escapeHtml(mant.ID_MANTENIMIENTO)}</td>
                    <td>${escapeHtml(estadoLabel)}</td>
                    <td>${escapeHtml(mant.NUMERO_LABORATORIO)} - ${escapeHtml(mant.EDIFICIO)}</td>
                    <td>${escapeHtml(formatearFecha(mant.FECHA_INICIO))}</td>
                    <td>${escapeHtml(formatearFecha(mant.FECHA_FIN_PREVISTA))}</td>
                    <td>${escapeHtml(mant.OBSERVACIONES)}</td>
                    <td>
                        <div class="d-flex justify-content-center gap-2">

                            <button
                                class="btn btn-dark btn-sm"
                                onclick="editarMantenimiento(${mant.ID_MANTENIMIENTO})">
                                <i class="bi bi-pencil-square"></i>
                                Editar
                            </button>

                            <button
                                class="btn btn-dark btn-sm"
                                onclick="confirmarEliminar(${mant.ID_MANTENIMIENTO})">
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

        const cantidadPaginas = Math.ceil(todosLosMantenimientos.length / limite);


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

        mostrarMantenimientos();
        crearPaginacion();

    };

    window.nextPage = function(){

        const cantidadPaginas = Math.ceil(todosLosMantenimientos.length / limite);

        if(paginaActual < cantidadPaginas){
            paginaActual++;

            mostrarMantenimientos();
            crearPaginacion();
        }
    };

    window.previusPage = function(){

        if(paginaActual > 1){
            paginaActual--;

            mostrarMantenimientos();
            crearPaginacion();
        }
    }

    window.editarMantenimiento = function (id) {
        window.location.href = `/upd_mantenimientos.html?id=${id}`;
    };

    window.confirmarEliminar = function (id) {

        const dialog = document.getElementById("alertaEliminar");
        const btnSi = document.getElementById("btnConfirmarEliminarSi");
        const btnNo = document.getElementById("btnConfirmarEliminarNo");

        if (!dialog) {
            eliminarMantenimiento(id);
            return;
        }

        dialog.showModal();

        btnNo.onclick = function () {
            dialog.close();
        };

        btnSi.onclick = function () {
            dialog.close();
            eliminarMantenimiento(id);
        };

    };

    function eliminarMantenimiento(id) {

        fetch(
            `/api/mantenimientos/delete/${id}?usuario=${encodeURIComponent(usuario)}&clave=${encodeURIComponent(clave)}`,
            { method: "DELETE" }
        )
            .then(parseJsonSafe)
            .then((data) => {
                if (data.success === false) {
                    throw new Error(data.error || "Error al eliminar mantenimiento");
                }
                loadMantenimientos();
            })
            .catch(error => {
                console.error(error);
                if (errorMessage) errorMessage.textContent = error.message;
            });

    }

    loadMantenimientos();

});
