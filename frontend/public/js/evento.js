document.addEventListener('DOMContentLoaded', function () {

    // BOTONES DE NAVEGACIÓN
    document.getElementById("botonSiguiente").addEventListener("click", function (e) {
        e.preventDefault();
        window.location.href = "laboratorios.html";
    });

    document.getElementById("botonAtras").addEventListener("click", function (e) {
        e.preventDefault();
        window.location.href = "edificio.html";
    });

    document.getElementById("inicio").addEventListener("click", function (e) {
        e.preventDefault();
        window.location.href = "menu.html";
    });

    let form = document.querySelector("#form");
    let btn = document.querySelector("#botonSiguiente");

    function validar() {
        let deshabilitar = false;

        if (form.alumnos.value === "") deshabilitar = true;
        if (form.evento.value === "") deshabilitar = true;
        if (selectedDate === null) deshabilitar = true;

        let recursosSeleccionados = document.querySelectorAll('input[type="checkbox"]:checked');

        if (recursosSeleccionados.length === 0) deshabilitar = true;

        btn.disabled = deshabilitar;
    }

    form.addEventListener("input", validar);
    document.addEventListener("change", validar);

    //ejecuta la validación inicial por si ya hay datos 
    validar();
});

let selectedDate = null;

document.addEventListener('DOMContentLoaded', function () {

    const monthYearEl = document.getElementById('month-year');
    const daysEl = document.getElementById('days');
    const prevMonthBtn = document.getElementById('prev-month');
    const nextMonthBtn = document.getElementById('next-month');
    const todayBtn = document.getElementById('today-btn');

    let currentDate = new Date();

    function renderCalendar() {

        daysEl.innerHTML = "";

        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();

        const firstDayIndex = new Date(year, month, 1).getDay();
        const lastDate = new Date(year, month + 1, 0).getDate();

        const months = [
            "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
            "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
        ];

        monthYearEl.textContent = months[month] + " " + year;

        //Espacios vacíos antes del día 1
        for (let i = 0; i < firstDayIndex; i++) {
            daysEl.appendChild(document.createElement("div"));
        }

        const today = new Date();

        //crear los días del mes
        for (let i = 1; i <= lastDate; i++) {

            const day = document.createElement("div");
            day.classList.add("day");
            day.textContent = i;

            const thisDate = new Date(year, month, i);

            //marca el día de hoy
            if (
                i === today.getDate() &&
                month === today.getMonth() &&
                year === today.getFullYear()
            ) {
                day.classList.add("today");
            }

            //si habia un día seleccionado, vuelve a marcar la fecha de hoy
            if (
                selectedDate &&
                i === selectedDate.getDate() &&
                month === selectedDate.getMonth() &&
                year === selectedDate.getFullYear()
            ) {
                day.classList.add("selected");
            }

            day.addEventListener("click", function () {
                selectedDate = thisDate;
                renderCalendar();
            });

            daysEl.appendChild(day);
        }
    }

    //mes anterior
    prevMonthBtn.addEventListener("click", function () {
        currentDate.setMonth(currentDate.getMonth() - 1);
        renderCalendar();
    });

    //mes siguiente
    nextMonthBtn.addEventListener("click", function () {
        currentDate.setMonth(currentDate.getMonth() + 1);
        renderCalendar();
    });

    //ir al mes actual
    todayBtn.addEventListener("click", function () {
        currentDate = new Date();
        selectedDate = new Date();
        renderCalendar();
    });

    renderCalendar();
});


//aca lo que hace es recorrer los datos de los checkboxs, 
// guarda los nombres en un array de los que estan seleccioandos
function obtenerRecursos() {
    let recursos = [];

    document.querySelectorAll('input[type="checkbox"]:checked').forEach(r => {
        recursos.push(r.parentElement.textContent.trim());
    });

    return recursos;
}


// esto es como un "paquete" que guarda las reservas que se hacen, cuando se da click en sgte
//se inicializa con cada reserva
document.getElementById("botonSiguiente").addEventListener("click", function () {

    let reservaEvento = {
        alumnos: document.querySelector("#alumnos").value,
        actividad: document.querySelector("#evento").value,
        fecha: selectedDate,
        recursos: obtenerRecursos()
    };

    sessionStorage.setItem(
        "reservaEvento",
        JSON.stringify(reservaEvento)
    );
});