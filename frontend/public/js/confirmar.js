document.addEventListener("DOMContentLoaded", function () {

    document.getElementById("inicio").addEventListener("click", function(e){
        e.preventDefault();
        window.location.href="menu.html";

    });

    document.getElementById("botonAtras").addEventListener("click", function(){
        window.location.href="laboratorios.html";
    });

    let form = document.getElementById("form");
    let botonConfirmar = document.getElementById("botonConfirmar");


    function validar(){

        let deshabilitar = false;
        if(form.tipoDocumento.value==="")
            deshabilitar=true;
        if(form.numeroDocumento.value==="")
            deshabilitar=true;
        if(form.nombre.value==="")
            deshabilitar=true;
        if(form.apellido.value==="")
            deshabilitar=true;
        if(form.correo.value==="")
            deshabilitar=true;
        if(form.telefono.value==="")
            deshabilitar=true;
        if(form.departamento.value==="")
            deshabilitar=true;
        if(form.solicitante.value==="")
            deshabilitar=true;
        botonConfirmar.disabled=deshabilitar;

    }

    form.addEventListener("input", validar);

    validar();
    // Departamentos por edificio. Las siglas de Ciencias y Tecnología son
    // las que ya venían usando (DA, DAS, DEI, DICIA, DIS); las de Ciencias
    // Contables son propuestas (no hay siglas oficiales todavía).
    const DEPARTAMENTOS_CIENCIAS_TECNOLOGIA = [
        "DA - Arquitectura",
        "DAS - Análisis de Sistemas",
        "DEI - Ing. Informática y Electrónica",
        "DICIA - Ing. Civil, Industrial y Ambiental",
        "DIS - Diseño Gráfico e Industrial"
    ];

    const DEPARTAMENTOS_CIENCIAS_CONTABLES = [
        "DCC - Ciencias Contables",
        "DECO - Economía",
        "DMK - Marketing",
        "DADE - Administración de Empresas",
        "DCI - Comercio Internacional",
        "DENF - Enfermería",
        "DFON - Fonoaudiología",
        "DMED - Medicina",
        "DNUT - Nutrición"
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

    let edificio = sessionStorage.getItem(
        "edificioSeleccionado"
    );

    cargarDepartamentosPorEdificio(edificio);

    let reservaEvento = JSON.parse(
        sessionStorage.getItem("reservaEvento")
    );

    let reservaLaboratorio = JSON.parse(
        sessionStorage.getItem("reservaLaboratorio")
    );

    // Mostrar resumen reserva

    if(reservaEvento && reservaLaboratorio){
        let fecha = new Date(reservaEvento.fecha);

        document.getElementById("fechaReserva").textContent = fecha.toLocaleDateString("es-PY");

        document.getElementById("cantidadReserva").textContent = reservaEvento.alumnos;

        document.getElementById("actividadReserva").textContent = reservaEvento.actividadNombre;

        document.getElementById("edificioReserva").textContent = edificio;

        document.getElementById("laboratorioReserva").textContent = reservaLaboratorio.laboratorio;

        document.getElementById("horarioReserva")
        .textContent =
        reservaLaboratorio.horaInicio + " - " + reservaLaboratorio.horaFin;

    }
    // Primer botón confirmar (abre modal)

    botonConfirmar.addEventListener("click", function(){
        let datosSolicitante = {

            tipoDocumento:
            document.getElementById("tipoDocumento").value,

            numeroDocumento:
            document.getElementById("numeroDocumento").value,

            nombre:
            document.getElementById("nombre").value,

            apellido:
            document.getElementById("apellido").value,

            correo:
            document.getElementById("correo").value,

            telefono:
            document.getElementById("telefono").value,

            departamento:
            document.getElementById("departamento").value,

            solicitante:
            document.getElementById("solicitante").value

        };

        sessionStorage.setItem(
            "datosSolicitante",
            JSON.stringify(datosSolicitante)
        );

        let modal = new bootstrap.Modal(
            document.getElementById("modalConfirmar")
        );

        modal.show();
    });

    // Confirmación definitiva

    document.getElementById("confirmarReservaFinal").addEventListener("click", async function () {

        let datosSolicitante = JSON.parse(
            sessionStorage.getItem("datosSolicitante")
        );

        let reservaEvento = JSON.parse(
            sessionStorage.getItem("reservaEvento")
        );

        let reservaLaboratorio = JSON.parse(
            sessionStorage.getItem("reservaLaboratorio")
        );

        const usuario = sessionStorage.getItem("usuario");
        const clave = sessionStorage.getItem("clave");

        try {

            // 1. Verificar si el solicitante ya existe
            const respuestaCheck = await fetch(
                `/api/solicitantes/${datosSolicitante.numeroDocumento}?usuario=${usuario}&clave=${clave}`
            );
            const dataCheck = await respuestaCheck.json();

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

            // 3. Ahora sí, creamos la reserva
            let reservaCompleta = {
                numero_laboratorio: Number(reservaLaboratorio.laboratorio),
                cedula_identidad: datosSolicitante.numeroDocumento,
                correo: datosSolicitante.correo,
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

            console.log("Datos preparados para backend:");
            console.log(reservaCompleta);
            console.log("Fecha enviada:", reservaCompleta.fecha_a_reservar);

            const respuestaReserva = await fetch("/api/reservas/add", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(reservaCompleta)
            });

            const dataReserva = await respuestaReserva.json();

            console.log("Respuesta backend:");
            console.log(dataReserva);

            if (dataReserva.success) {

                const modalConfirmar = bootstrap.Modal.getInstance(
                    document.getElementById("modalConfirmar")
                );

                if (modalConfirmar) {
                    modalConfirmar.hide();
                }


                setTimeout(() => {
                    mostrarMensaje(
                        "success",
                        "La reserva se realizó con éxito"
                    );
                }, 300);


                document.getElementById("modalMensaje").addEventListener(
                    "hidden.bs.modal",
                    function () {
                     window.location.href = "menu.html";
                    },
                    { once: true }
                );

            }

        } catch (error) {
            console.error("Error:", error);
            mostrarMensaje("error", "Error al realizar la reserva");
        }

    });

});

function mostrarMensaje(tipo, mensaje) {

    const modalConfirmar = bootstrap.Modal.getInstance(
        document.getElementById("modalConfirmar")
    );

    if (modalConfirmar){
        modalConfirmar.hide();
    }

    const tituloModal = document.getElementById("tituloMensaje");
    const texto = document.getElementById("textoMensaje");

    switch(tipo){
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

    setTimeout(() => {
        const modal = new bootstrap.Modal(
            document.getElementById("modalMensaje")
        );

        modal.show();
    }, 300);
}
