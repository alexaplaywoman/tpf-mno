document.addEventListener("DOMContentLoaded", function () {

    const btnInicio = document.getElementById("inicio");
    const form = document.getElementById("add-recurso-form");
    const errorMessage = document.getElementById("error-message");
    const selectLaboratorio = document.getElementById("laboratorio");

    const usuario = sessionStorage.getItem("usuario");
    const clave = sessionStorage.getItem("clave");

    if (btnInicio) {
        btnInicio.addEventListener("click", function (e) {
            e.preventDefault();
            window.location.href = "/list_recursos.html";
        });
    }

    if (!usuario || !clave) {
        errorMessage.textContent = "Faltan las credenciales del usuario.";
        return;
    }

    // =====================================
    // CARGAR LABORATORIOS EN EL SELECT
    // =====================================

    function cargarLaboratorios() {

        fetch(`/api/laboratorios?usuario=${encodeURIComponent(usuario)}&clave=${encodeURIComponent(clave)}`)
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
                console.error(error);
                errorMessage.textContent = "No se pudieron cargar los laboratorios.";
            });

    }

    cargarLaboratorios();

    // =====================================
    // AGREGAR RECURSO
    // =====================================

    form.addEventListener("submit", function (e) {

        e.preventDefault();

        errorMessage.textContent = "";

        const recursoData = {

            usuario,
            clave,

            numero_laboratorio: selectLaboratorio.value,

            nombre: document.getElementById("nombre").value,

            descripcion: document.getElementById("descripcion").value,

            disponibilidad: document.getElementById("disponibilidad").value

        };

        fetch("/api/recursos/add", {

            method: "POST",

            headers: {
                "Content-Type": "application/json"
            },

            body: JSON.stringify(recursoData)

        })
            .then(async response => {

                const data = await response.json();

                if (!response.ok || data.success === false) {
                    throw new Error(data.error || "Error al agregar recurso");
                }

                window.location.href = "/list_recursos.html";

            })
            .catch(error => {
                console.error(error);
                errorMessage.textContent = error.message;
            });

    });

});
