document.addEventListener('DOMContentLoaded', function () {

    const btnInicio = document.getElementById("inicio");

    if (btnInicio) {
        btnInicio.addEventListener("click", function (e) {
            e.preventDefault();
            window.location.href = "/list_recursos.html";
        });
    }

    const form = document.getElementById('update-recurso-form');
    const errorMessage = document.getElementById('error-message');
    const selectLaboratorio = document.getElementById('laboratorio');

    const recursoId = new URLSearchParams(window.location.search).get('id');

    if (!recursoId) {
        errorMessage.textContent = "Falta el ID del recurso en la URL.";
        return;
    }

    const usuario = sessionStorage.getItem('usuario');
    const clave = sessionStorage.getItem('clave');

    if (!usuario || !clave) {
        errorMessage.textContent = "Faltan credenciales.";
        return;
    }

    // ==================================
    // CARGAR LABORATORIOS EN EL SELECT
    // ==================================
    function cargarLaboratorios() {

        return fetch(`/api/laboratorios?usuario=${encodeURIComponent(usuario)}&clave=${encodeURIComponent(clave)}`)
            .then(async response => {

                const data = await response.json();

                if (!response.ok) {
                    throw new Error(data.error || "Error al cargar laboratorios");
                }

                let laboratorios = data;

                if (!Array.isArray(laboratorios)) {
                    laboratorios = data.laboratorios || data.rows || [];
                }

                selectLaboratorio.innerHTML = `
                    <option value="">
                        Seleccione un laboratorio
                    </option>
                `;

                laboratorios.forEach(lab => {
                    const option = document.createElement("option");
                    option.value = lab.NUMERO_LABORATORIO;
                    option.textContent = `Laboratorio ${lab.NUMERO_LABORATORIO} - ${lab.EDIFICIO}`;
                    selectLaboratorio.appendChild(option);
                });

            })
            .catch(error => {
                console.error("Error cargando laboratorios:", error);
                errorMessage.textContent = "No se pudieron cargar los laboratorios.";
            });

    }

    // ==================================
    // CARGAR DATOS DEL RECURSO
    // ==================================
    function cargarRecurso() {

        return fetch(`/api/recursos/${encodeURIComponent(recursoId)}?usuario=${encodeURIComponent(usuario)}&clave=${encodeURIComponent(clave)}`)
            .then(async response => {

                const data = await response.json().catch(() => null);

                if (!response.ok || !data || data.success === false) {
                    throw new Error(
                        data?.error ||
                        "No se encontró el recurso."
                    );
                }

                const recurso = data.recurso;

                selectLaboratorio.value = recurso.NUMERO_LABORATORIO ?? "";

                document.getElementById("nombre").value = recurso.NOMBRE ?? "";
                document.getElementById("descripcion").value = recurso.DESCRIPCION ?? "";
                document.getElementById("disponibilidad").value = recurso.DISPONIBILIDAD ?? "S";

            })
            .catch(error => {
                console.error(error);
                errorMessage.textContent = error.message;
            });

    }

    cargarLaboratorios().then(cargarRecurso);

    // ==================================
    // ACTUALIZAR RECURSO
    // ==================================
    form.addEventListener("submit", function (event) {

        event.preventDefault();

        errorMessage.textContent = "";

        const recursoData = {

            usuario,
            clave,

            numero_laboratorio: selectLaboratorio.value,

            nombre: document.getElementById("nombre").value,

            descripcion: document.getElementById("descripcion").value,

            disponibilidad: document.getElementById("disponibilidad").value

        };

        fetch(`/api/recursos/update/${recursoId}`, {

            method: "POST",

            headers: {
                "Content-Type": "application/json"
            },

            body: JSON.stringify(recursoData)

        })
            .then(async response => {

                const data = await response.json().catch(() => null);

                if (!response.ok || !data || data.success === false) {
                    throw new Error(
                        data?.error ||
                        "Error al actualizar recurso."
                    );
                }

                window.location.href = "/list_recursos.html";

            })
            .catch(error => {
                console.error(error);
                errorMessage.textContent = error.message;
            });

    });

});
