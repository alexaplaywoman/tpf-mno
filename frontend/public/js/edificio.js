document.addEventListener('DOMContentLoaded', function () {

    document.getElementById("inicio").addEventListener("click", function (e) {
        e.preventDefault();
        window.location.href = "menu.html";
    });

    document.getElementById("edif1").addEventListener("click", function () {
        seleccionarEdificio("Biblioteca Pablo VI");
    });

    document.getElementById("edif2").addEventListener("click", function () {
        seleccionarEdificio("Ciencias Contables");
    });

    document.getElementById("edif3").addEventListener("click", function () {
        seleccionarEdificio("Ciencias y Tecnología");
    });

    document.getElementById("edif4").addEventListener("click", function () {
        seleccionarEdificio("Bloque G");
    });

    // Si el usuario esta editando una reserva, marcamos el edificio previo.
    // Solo dispara el click del boton correspondiente (que ya navega).
    let reservaEditar = JSON.parse(sessionStorage.getItem("reservaEditar"));

    if (reservaEditar) {
        console.log("Reserva a editar:", reservaEditar);

        if (reservaEditar.EDIFICIO === "Biblioteca Pablo VI")   document.getElementById("edif1").click();
        if (reservaEditar.EDIFICIO === "Ciencias Contables")    document.getElementById("edif2").click();
        if (reservaEditar.EDIFICIO === "Ciencias y Tecnología") document.getElementById("edif3").click();
        if (reservaEditar.EDIFICIO === "Bloque G")              document.getElementById("edif4").click();
    }
});

function seleccionarEdificio(nombreEdificio) {
    sessionStorage.setItem('edificioSeleccionado', nombreEdificio);

    notificarEdificioAlBackend(nombreEdificio)
        .then(() => {
            // Antes tenia `evento.html?edificio=${id}` con `id` undefined:
            // resultaba en literal "undefined" en la URL. La pantalla siguiente
            // lee el edificio de sessionStorage, no del query, asi que la
            // URL puede quedar limpia.
            window.location.href = "evento.html";
        })
        .catch(error => {
            console.error('No se pudo notificar el edificio al backend:', error);
            // Igual navegamos; el edificio ya quedo guardado en sessionStorage.
            window.location.href = "evento.html";
        });
}

function notificarEdificioAlBackend(nombreEdificio) {
    const usuario = sessionStorage.getItem('usuario');
    const clave = sessionStorage.getItem('clave');

    if (!usuario || !clave) {
        console.error('Usuario o clave no definidos en sessionStorage');
        return Promise.reject('Sin credenciales');
    }

    return fetch('/api/edificios/seleccionar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            usuario: usuario,
            clave: clave,
            edificio: nombreEdificio
        })
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('Error al notificar el edificio seleccionado');
        }
        return response.json();
    });
}

// =========================
// HISTORIAL LOCAL DE EDIFICIOS
// =========================
// Registro visual local (no viaja al backend). Sirve como accesorio de la UI.

const botones = [
    document.getElementById('edif1'),
    document.getElementById('edif2'),
    document.getElementById('edif3'),
    document.getElementById('edif4')
];
const listaHistorial = document.getElementById('lista-historial');

let historial = JSON.parse(localStorage.getItem('historialEdificios')) || [];

function mostrarHistorial() {
    if (!listaHistorial) return;
    listaHistorial.innerHTML = '';
    historial.forEach(item => {
        const li = document.createElement('li');
        li.textContent = `${item.fecha || ''} - Seleccionaste: Edificio ${item.edificio}`;
        listaHistorial.appendChild(li);
    });
}

botones.forEach((boton, index) => {
    if (!boton) return;
    const numeroEdificio = index + 1;

    boton.addEventListener('click', () => {
        const nuevoRegistro = { edificio: numeroEdificio };
        historial.unshift(nuevoRegistro);
        localStorage.setItem('historialEdificios', JSON.stringify(historial));
        mostrarHistorial();
    });
});

mostrarHistorial();