let selectedDate = null;
let reservasOcupadas = [];

// Los recursos se traen del backend (DBA.RECURSOS), no se hardcodean acá,
// porque los tipos y su disponibilidad por laboratorio los administra el admin.
function renderRecursos() {
    const usuario = sessionStorage.getItem('usuario');
    const clave = sessionStorage.getItem('clave');
    const contenedor = document.getElementById("listaRecursos");

    fetch(`/api/recursos/tipos?usuario=${usuario}&clave=${clave}`)
        .then(res => res.json())
        .then(tipos => {
            contenedor.innerHTML = "";

            if (!tipos || tipos.length === 0) {
                contenedor.innerHTML = "<p class='text-muted'>No hay recursos disponibles.</p>";
                return;
            }

            tipos.forEach(function (tipo) {
                const nombre = tipo.NOMBRE;
                const id = "recurso" + nombre.replace(/\s+/g, '');

                const div = document.createElement("div");
                div.className = "form-check mb-2";

                div.innerHTML = `
                    <input class="form-check-input" type="checkbox" id="${id}" value="${nombre}">
                    <label class="form-check-label" for="${id}">${nombre}</label>
                `;

                contenedor.appendChild(div);
            });
        })
        .catch(err => {
            console.error('Error al cargar recursos:', err);
            contenedor.innerHTML = "<p class='text-muted'>No se pudieron cargar los recursos.</p>";
        });
}


document.addEventListener("DOMContentLoaded", async function () {

    // Generar los checkboxes de recursos según el laboratorio elegido
    renderRecursos();


    // =========================
    // CARGAR DATOS DE EDICIÓN
    // =========================

    setTimeout(() => {

        let reservaEditar = JSON.parse(
            sessionStorage.getItem("reservaEditar")
        );


        if(reservaEditar){

            console.log(
                "Reserva cargada para editar:",
                reservaEditar
            );


            // Cantidad de alumnos
            document.getElementById("alumnos").value =
                reservaEditar.CANTIDAD_ALUMNOS;



            // Tipo de actividad
            document.getElementById("evento").value =
                reservaEditar.ID_TIPO_ACTIVIDAD;



            // Fecha seleccionada
            selectedDate =
                new Date(reservaEditar.FECHA_A_RESERVAR);



            // Recursos (si existen)
            if(reservaEditar.recursos){

                reservaEditar.recursos.forEach(nombre => {

                    let checkbox =
                        document.getElementById(
                            "recurso" + nombre.replace(/\s+/g, '')
                        );


                    if(checkbox){

                        checkbox.checked = true;

                    }

                });

            }

        }


    },100);

    // =========================
    // BOTONES DE NAVEGACIÓN
    // =========================

    document.getElementById("botonSiguiente").addEventListener("click", function (e) {

        e.preventDefault();

        let reservaEvento = {
            alumnos: parseInt(document.querySelector("#alumnos").value),
            actividad: document.querySelector("#evento").value,
            fecha: selectedDate,
            recursos: obtenerRecursos()
        };

        console.log(reservaEvento);

        sessionStorage.setItem(
            "reservaEvento",
            JSON.stringify(reservaEvento)
        );


        window.location.href = "laboratorios.html";

    });


    document.getElementById("botonAtras").addEventListener("click", function (e) {

        e.preventDefault();

        window.location.href = "edificio.html";

    });


    document.getElementById("inicio").addEventListener("click", function(e){
        e.preventDefault();
        window.location.href="menu.html";

    });



    // =========================
    // VALIDACIÓN FORMULARIO
    // =========================


    let form = document.querySelector("#form");
    let btn = document.querySelector("#botonSiguiente");


    function validar() {


        let deshabilitar = false;


        if (form.alumnos.value === "") {
            deshabilitar = true;
        }


        if (form.evento.value === "") {
            deshabilitar = true;
        }


        if (selectedDate === null) {
            deshabilitar = true;
        }



        let recursosSeleccionados =
            document.querySelectorAll('input[type="checkbox"]:checked');



        if (recursosSeleccionados.length === 0) {
            deshabilitar = true;
        }



        btn.disabled = deshabilitar;

    }



    form.addEventListener("input", validar);

    document.addEventListener("change", validar);



    // =========================
    // CALENDARIO
    // =========================


    const monthYearEl = document.getElementById("month-year");
    const daysEl = document.getElementById("days");

    const prevMonthBtn = document.getElementById("prev-month");
    const nextMonthBtn = document.getElementById("next-month");
    const todayBtn = document.getElementById("today-btn");


    let currentDate = new Date();

    // Traer fechas reservadas del backend

   async function cargarFechasOcupadas(){


    try{


        const usuario =
        sessionStorage.getItem("usuario");


        const clave =
        sessionStorage.getItem("clave");



        const respuesta =
        await fetch(
            `/api/reservas/fechas-ocupadas?usuario=${usuario}&clave=${clave}`
        );



        if(respuesta.ok){


            reservasOcupadas =
            await respuesta.json();


            console.log(
                "Reservas:",
                reservasOcupadas
            );


        }else{


            reservasOcupadas=[];


        }



    }catch(error){


        console.error(error);

        reservasOcupadas=[];


    }


}



function renderCalendar() {

        daysEl.innerHTML = "";

        let year  = currentDate.getFullYear();
        let month = currentDate.getMonth();

        const meses = [
            "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
            "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
        ];

        monthYearEl.textContent = meses[month] + " " + year;

        let primerDia = new Date(year, month, 1).getDay();
        let ultimoDia = new Date(year, month + 1, 0).getDate();

        // espacios vacíos antes del día 1
        for (let i = 0; i < primerDia; i++) {
            daysEl.appendChild(document.createElement("div"));
        }

        let hoy = new Date();
        hoy.setHours(0, 0, 0, 0);   // comparar solo la fecha, sin la hora

        for (let i = 1; i <= ultimoDia; i++) {

            let day = document.createElement("div");
            day.classList.add("day");
            day.textContent = i;

            let fecha = new Date(year, month, i);
            let fechaString =
                `${year}-${String(month + 1).padStart(2, "0")}-${String(i).padStart(2, "0")}`;

            // Reglas que dependen SOLO de la fecha (espejo de fn_validar_fechas_y_fin_semana).
            // SQL DOW(): 1=domingo, 7=sabado.  JS getDay(): 0=domingo, 6=sabado.
            let dow           = fecha.getDay();
            let esFinDeSemana = (dow === 0 || dow === 6);
            let esPasado      = fecha < hoy;   // hoy NO es pasado (igual que "fecha < CURRENT DATE")

            let reservaEseDia = reservasOcupadas.find(r => r.fecha === fechaString);

            if (esPasado || esFinDeSemana) {

                day.classList.add("deshabilitado");
                day.title = esPasado
                    ? "Fecha pasada"
                    : "Fin de semana: no se permiten reservas";

            } else if (reservaEseDia) {

                day.classList.add("fecha-ocupada");
                day.title = "Reservado: " + reservaEseDia.inicio + " - " + reservaEseDia.fin;

            } else {

                day.addEventListener("click", function () {
                    selectedDate = fecha;
                    renderCalendar();
                    validar();
                });
            }

            // Día actual
            if (hoy.getDate() === i && hoy.getMonth() === month && hoy.getFullYear() === year) {
                day.classList.add("today");
            }

            // Día seleccionado
            if (selectedDate &&
                selectedDate.getDate() === i &&
                selectedDate.getMonth() === month &&
                selectedDate.getFullYear() === year) {
                day.classList.add("selected");
            }

            daysEl.appendChild(day);
        }
    }





    // Cambiar mes anterior

    prevMonthBtn.addEventListener(
        "click",
        function(){


            currentDate.setMonth(
                currentDate.getMonth()-1
            );


            renderCalendar();


        }
    );




    // Cambiar mes siguiente

    nextMonthBtn.addEventListener(
        "click",
        function(){


            currentDate.setMonth(
                currentDate.getMonth()+1
            );


            renderCalendar();


        }
    );





    // Volver a hoy

    todayBtn.addEventListener(
        "click",
        function(){


            currentDate = new Date();

            renderCalendar();


        }
    );




    // cargar una sola vez

    await cargarFechasOcupadas();


    renderCalendar();


    validar();



});




// =========================
// OBTENER RECURSOS
// =========================


function obtenerRecursos(){

    let recursos = [];

    document
    .querySelectorAll(
        'input[type="checkbox"]:checked'
    )
    .forEach(r => {

        recursos.push(
            r.value
        );

    });

    return recursos;
}