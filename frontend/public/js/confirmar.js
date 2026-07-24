// Helper: escapa credenciales antes de meterlas en la query string.
function credsQueryString() {
    const usuario = encodeURIComponent(sessionStorage.getItem('usuario') || '');
    const clave   = encodeURIComponent(sessionStorage.getItem('clave')   || '');
    return `usuario=${usuario}&clave=${clave}`;
}

document.addEventListener("DOMContentLoaded", function () {

    document.getElementById("inicio").addEventListener("click", function (e) {
        e.preventDefault();
        window.location.href = "menu.html";
    });

    document.getElementById("botonAtras").addEventListener("click", function (e) {
        e.preventDefault();

        // Guardar los datos del solicitante para que si el usuario vuelve,
        // no tenga que llenar el formulario de nuevo. Los datos "de la
        // reserva" (fecha, actividad, laboratorio, horario, recursos) ya
        // estan guardados en reservaEvento / reservaLaboratorio, no hace
        // falta re-guardarlos aca.
        let datosSolicitante = {
            tipoDocumento:   document.getElementById("tipoDocumento").value   || "",
            numeroDocumento: document.getElementById("numeroDocumento").value || "",
            nombre:          document.getElementById("nombre").value          || "",
            apellido:        document.getElementById("apellido").value        || "",
            correo:          document.getElementById("correo").value          || "",
            telefono:        document.getElementById("telefono").value        || "",
            departamento:    document.getElementById("departamento").value    || "",
            solicitante:     document.getElementById("solicitante").value     || ""
        };

        sessionStorage.setItem("datosSolicitante", JSON.stringify(datosSolicitante));
        window.location.href = "laboratorios.html";
    });

    let form = document.getElementById("form");
    let botonConfirmar = document.getElementById("botonConfirmar");

    function validar() {
        let deshabilitar = false;
        if (form.tipoDocumento.value === "")   deshabilitar = true;
        if (form.numeroDocumento.value === "") deshabilitar = true;
        if (form.nombre.value === "")          deshabilitar = true;
        if (form.apellido.value === "")        deshabilitar = true;
        if (form.correo.value === "")          deshabilitar = true;
        if (form.telefono.value === "")        deshabilitar = true;
        if (form.departamento.value === "")    deshabilitar = true;
        if (form.solicitante.value === "")     deshabilitar = true;
        botonConfirmar.disabled = deshabilitar;
    }

    form.addEventListener("input", validar);
    validar();

    // Departamentos por edificio. Las siglas de Ciencias y Tecnologia son
    // las que ya veniamos usando (DA, DAS, DEI, DICIA, DIS); las de
    // Ciencias Contables son propuestas (no hay siglas oficiales todavia).
    const DEPARTAMENTOS_CIENCIAS_TECNOLOGIA = [
        "DA - Arquitectura",
        "DAS - Analisis de Sistemas",
        "DEI - Ing. Informatica y Electronica",
        "DICIA - Ing. Civil, Industrial y Ambiental",
        "DIS - Diseno Grafico e Industrial"
    ];

    const DEPARTAMENTOS_CIENCIAS_CONTABLES = [
        "DCC - Ciencias Contables",
        "DECO - Economia",
        "DMK - Marketing",
        "DADE - Administracion de Empresas",
        "DCI - Comercio Internacional",
        "DENF - Enfermeria",
        "DFON - Fonoaudiologia",
        "DMED - Medicina",
        "DNUT - Nutricion"
    ];

    const DEPARTAMENTOS_POR_EDIFICIO = {
        "Ciencias y Tecnología": DEPARTAMENTOS_CIENCIAS_TECNOLOGIA,
        "Bloque G": DEPARTAMENTOS_CIENCIAS_TECNOLOGIA,
        "Ciencias Contables": DEPARTAMENTOS_CIENCIAS_CONTABLES,
        "Biblioteca Pablo VI": [
            ...DEPARTAMENTOS_CIENCIAS_CONTABLES,
            ...DEPARTAMENTOS_CIENCIAS_TECNOLOGIA
        ]
    };

    function cargarDepartamentosPorEdificio(nombreEdificio) {
        const selectDepartamento = document.getElementById("departamento");
        const opciones = DEPARTAMENTOS_POR_EDIFICIO[nombreEdificio] || [];

        selectDepartamento.innerHTML = '<option value="">Seleccionar</option>';

        opciones.forEach(nombreDepartamento => {
            const option = document.createElement("option");
            option.textContent = nombreDepartamento;
            selectDepartamento.appendChild(option);
        });
    }

    // Recuperar datos anteriores
    let edificio = sessionStorage.getItem("edificioSeleccionado");
    cargarDepartamentosPorEdificio(edificio);

    // Restaurar datos del solicitante si el usuario volvio con "Atras".
    // Va DESPUES de cargarDepartamentosPorEdificio para que el <select>
    // de departamento ya tenga sus <option> cuando le seteemos el value.
    const solicitantePrevio = JSON.parse(sessionStorage.getItem("datosSolicitante"));
    if (solicitantePrevio) {
        if (solicitantePrevio.tipoDocumento)   document.getElementById("tipoDocumento").value   = solicitantePrevio.tipoDocumento;
        if (solicitantePrevio.numeroDocumento) document.getElementById("numeroDocumento").value = solicitantePrevio.numeroDocumento;
        if (solicitantePrevio.nombre)          document.getElementById("nombre").value          = solicitantePrevio.nombre;
        if (solicitantePrevio.apellido)        document.getElementById("apellido").value        = solicitantePrevio.apellido;
        if (solicitantePrevio.correo)          document.getElementById("correo").value          = solicitantePrevio.correo;
        if (solicitantePrevio.telefono)        document.getElementById("telefono").value        = solicitantePrevio.telefono;
        if (solicitantePrevio.solicitante)     document.getElementById("solicitante").value     = solicitantePrevio.solicitante;
        if (solicitantePrevio.departamento)    document.getElementById("departamento").value    = solicitantePrevio.departamento;
        validar();
    }

    let reservaEvento = JSON.parse(sessionStorage.getItem("reservaEvento"));
    let reservaLaboratorio = JSON.parse(sessionStorage.getItem("reservaLaboratorio"));

    // Mostrar resumen reserva
    if (reservaEvento && reservaLaboratorio) {
        let fecha = new Date(reservaEvento.fecha);

        document.getElementById("fechaReserva").textContent = fecha.toLocaleDateString("es-PY");
        document.getElementById("cantidadReserva").textContent = reservaEvento.alumnos;
        document.getElementById("actividadReserva").textContent = reservaEvento.actividadNombre;
        document.getElementById("edificioReserva").textContent = edificio;
        document.getElementById("laboratorioReserva").textContent = reservaLaboratorio.laboratorio;
        document.getElementById("horarioReserva").textContent =
            reservaLaboratorio.horaInicio + " - " + reservaLaboratorio.horaFin;
    }

    // Primer boton confirmar (abre modal)
    botonConfirmar.addEventListener("click", function () {
        let datosSolicitante = {
            tipoDocumento:   document.getElementById("tipoDocumento").value,
            numeroDocumento: document.getElementById("numeroDocumento").value,
            nombre:          document.getElementById("nombre").value,
            apellido:        document.getElementById("apellido").value,
            correo:          document.getElementById("correo").value,
            telefono:        document.getElementById("telefono").value,
            departamento:    document.getElementById("departamento").value,
            solicitante:     document.getElementById("solicitante").value
        };

        sessionStorage.setItem("datosSolicitante", JSON.stringify(datosSolicitante));

        let modal = new bootstrap.Modal(document.getElementById("modalConfirmar"));
        modal.show();
    });

    // Confirmacion definitiva
    document.getElementById("confirmarReservaFinal").addEventListener("click", async function () {

        let datosSolicitante = JSON.parse(sessionStorage.getItem("datosSolicitante"));
        let reservaEvento = JSON.parse(sessionStorage.getItem("reservaEvento"));
        let reservaLaboratorio = JSON.parse(sessionStorage.getItem("reservaLaboratorio"));

        const usuario = sessionStorage.getItem("usuario");
        const clave = sessionStorage.getItem("clave");

        try {
            // 1. Verificar si el solicitante ya existe
            const respuestaCheck = await fetch(
                `/api/solicitantes/${encodeURIComponent(datosSolicitante.numeroDocumento)}?${credsQueryString()}`
            );
            const dataCheck = await respuestaCheck.json();

            // SOLICITANTES tiene clave primaria compuesta (CEDULA_IDENTIDAD +
            // CORREO). El chequeo de arriba busca solo por cedula, asi que si
            // ya existe un solicitante con esa cedula pero otro correo, no
            // hay que crear uno nuevo (dataCheck.success ya da true) - pero
            // tampoco hay que usar el correo recien tipeado para la reserva,
            // porque ese par (cedula, correo) no existe en la base y la FK
            // de RESERVAS lo rechaza. Usamos el correo real ya registrado.
            const correoParaReserva = dataCheck.success
                ? dataCheck.solicitante.CORREO
                : datosSolicitante.correo;

            // 2. Si no existe, lo creamos
            if (!dataCheck.success) {
                const nuevoSolicitante = {
                    cedula_identidad: datosSolicitante.numeroDocumento,
                    correo: datosSolicitante.correo,
                    nombre: datosSolicitante.nombre,
                    apellido: datosSolicitante.apellido,
                    telefono: datosSolicitante.telefono,
                    departamento: datosSolicitante.departamento,
                    usuario: usuario,
                    clave: clave
                };

                const respuestaSolicitante = await fetch("/api/solicitantes/add", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(nuevoSolicitante)
                });

                const dataSolicitante = await respuestaSolicitante.json();

                if (!dataSolicitante.success) {
                    alert(dataSolicitante.error || "No se pudo registrar el solicitante.");
                    return;
                }
            }

            // 3. Ahora si, creamos la reserva
            let reservaCompleta = {
                numero_laboratorio: Number(reservaLaboratorio.laboratorio),
                cedula_identidad: datosSolicitante.numeroDocumento,
                correo: correoParaReserva,
                id_estado_reserva: 1,
                id_tipo_actividad: reservaEvento.actividad,
                fecha_a_reservar: reservaEvento.fecha.split("T")[0],
                hora_inicio: reservaLaboratorio.horaInicio,
                hora_fin: reservaLaboratorio.horaFin,
                cantidad_alumnos: Number(reservaEvento.alumnos),
                recursos: reservaEvento.recursos,
                usuario: usuario,
                clave: clave
            };

            const respuestaReserva = await fetch("/api/reservas/add", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(reservaCompleta)
            });

            const data = await respuestaReserva.json();

                if(data.success){

                    mostrarMensaje(
                        "success",
                        "Reserva creada correctamente"
                    );

                }else{

                    mostrarMensaje(
                        "error",
                        data.error
                    );

                }

            const dataReserva = await respuestaReserva.json();

            if (dataReserva.success) {

                const modalConfirmar = bootstrap.Modal.getInstance(
                    document.getElementById("modalConfirmar")
                );

                if (modalConfirmar) modalConfirmar.hide();

                setTimeout(() => {
                    mostrarMensaje(
                        "success",
                        dataReserva.mensaje || "La reserva se realizo con exito"
                    );
                }, 300);

                // Al cerrar el modal de exito, limpiamos el sessionStorage
                // de la reserva (usuario/clave se mantienen porque son la
                // sesion de conexion a la base) y volvemos al menu.
                document.getElementById("modalMensaje").addEventListener(
                    "hidden.bs.modal",
                    function () {
                        sessionStorage.removeItem("reservaEvento");
                        sessionStorage.removeItem("reservaLaboratorio");
                        sessionStorage.removeItem("datosSolicitante");
                        sessionStorage.removeItem("edificioSeleccionado");
                        window.location.href = "menu.html";
                    },
                    { once: true }
                );

            } else {

                mostrarMensaje(
                    "error",
                    dataReserva.error || dataReserva.mensaje || "No se pudo realizar la reserva"
                );

            }

        } catch (error) {
            console.error("Error:", error);
            mostrarMensaje("error", "Error al realizar la reserva");
        }
    });
});

function mostrarMensaje(tipo, mensaje) {

    const modalConfirmarElement = document.getElementById("modalConfirmar");
    const modalConfirmar = bootstrap.Modal.getInstance(modalConfirmarElement);

    if (modalConfirmar) {
        modalConfirmar.hide();
    }

    const tituloModal = document.getElementById("tituloMensaje");
    const texto = document.getElementById("textoMensaje");

    switch (tipo) {
        case "success":
            tituloModal.textContent = "Éxito";
            break;
        case "error":
            tituloModal.textContent = "Error";
            break;
        case "warning":
            tituloModal.textContent = "Advertencia";
            break;
        default:
            tituloModal.textContent = "Mensaje";
    }

    texto.textContent = mensaje;


    // Esperar a que Bootstrap termine de cerrar el primer modal
    setTimeout(() => {
        const modalMensaje = new bootstrap.Modal(
            document.getElementById("modalMensaje")
        );

        modalMensaje.show();

    }, 800);
}

document.getElementById("cerrarMensaje").addEventListener("click", function(){

    document.body.classList.remove("modal-open");

    document.querySelectorAll(".modal-backdrop").forEach(function(backdrop){
        backdrop.remove();
    });

});