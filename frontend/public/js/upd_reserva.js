document.addEventListener('DOMContentLoaded', async function () {


    const btnInicio = document.getElementById("inicio");


    if (btnInicio) {

        btnInicio.addEventListener(
            "click",
            function (e) {

                e.preventDefault();

                window.location.href = "/list_reservas.html";

            }
        );

    }



    const form = document.getElementById(
        'update-reserva-form'
    );


    const errorMessage = document.getElementById(
        'error-message'
    );

    const selectEstado = document.getElementById(
        'estado'
    );

    const selectMotivoCancelacion = document.getElementById(
        'motivoCancelacion'
    );

    const grupoMotivoCancelacion = document.getElementById(
        'grupoMotivoCancelacion'
    );

    const id = new URLSearchParams(
        window.location.search
    ).get('id');

    if (!id) {

        errorMessage.textContent =
            "Falta el ID de la reserva en la URL.";

        return;

    }

    const usuario = sessionStorage.getItem(
        'usuario'
    );

    const clave = sessionStorage.getItem(
        'clave'
    );


    if (!usuario || !clave) {

        errorMessage.textContent =
            "Faltan credenciales.";

        return;

    }

    let estadoOriginal = "";
    let motivoCancelacionOriginal = "";
    let programacionOriginal = null;

    function cargarEstados() {

        return fetch(
            `/api/reservas/estados/listar`
        )

        .then(res => res.json())

        .then(estados => {

            selectEstado.innerHTML = `

                <option value="">
                    Seleccione un estado
                </option>

            `;

            estados.forEach(estado => {

                const option =
                    document.createElement("option");

                option.value =
                    estado.id_estado_reserva;

                option.textContent =
                    estado.nombre;

                selectEstado.appendChild(
                    option
                );

            });

        })

        .catch(error => {

            console.error(error);

            errorMessage.textContent =
                "No se pudieron cargar los estados.";

        });

    }


    function cargarMotivosCancelacion() {

        return fetch(
            `/api/reservas/motivos-cancelacion`
        )

        .then(res => res.json())

        .then(motivos => {

            selectMotivoCancelacion.innerHTML = `

                <option value="">
                    Seleccione el motivo de cancelación
                </option>

            `;

            motivos.forEach(motivo => {

                const option =
                    document.createElement("option");

                option.value = motivo;
                option.textContent = motivo;

                selectMotivoCancelacion.appendChild(
                    option
                );

            });

        })

        .catch(error => {

            console.error(error);

            errorMessage.textContent =
                "No se pudieron cargar los motivos de cancelación.";

        });

    }

    function actualizarVisibilidadMotivo() {

        const esCancelada = Number(selectEstado.value) === 3;

        grupoMotivoCancelacion.style.display = esCancelada ? "" : "none";
        selectMotivoCancelacion.required = esCancelada;

    }

    selectEstado.addEventListener("change", actualizarVisibilidadMotivo);

    function cargarReserva() {

        return fetch(
            `/api/reservas/${id}?usuario=${encodeURIComponent(usuario)}&clave=${encodeURIComponent(clave)}`
        )

        .then(async response => {

            const data =
                await response.json().catch(() => null);

            if(
                !response.ok ||
                !data ||
                data.success === false
            ) {


                throw new Error(
                    data?.error ||
                    "No se encontró la reserva."
                );


            }

            const reserva =
                data.reserva;

            selectEstado.value =
                reserva.ID_ESTADO_RESERVA ?? "";

            selectMotivoCancelacion.value =
                reserva.MOTIVO_CANCELACION ?? "";

            actualizarVisibilidadMotivo();

            estadoOriginal = String(reserva.ID_ESTADO_RESERVA ?? "");
            motivoCancelacionOriginal = String(reserva.MOTIVO_CANCELACION ?? "");

        })

        .catch(error => {

            console.error(error);

            errorMessage.textContent = error.message;

        });


    }

    await cargarEstados();
    await cargarMotivosCancelacion();
    await cargarReserva();

});