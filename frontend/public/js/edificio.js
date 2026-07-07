/* document.getElementById("inicio").addEventListener("click", function () {
        window.location.href = "menu.html";
    });

    document.getElementById("edif1").addEventListener("click", function () {
        window.location.href = "evento.html";
    });

    document.getElementById("edif2").addEventListener("click", function () {
        window.location.href = "evento.html";
    });

    document.getElementById("edif3").addEventListener("click", function () {
        window.location.href = "evento.html";
    });

    document.getElementById("edif4").addEventListener("click", function () {
        window.location.href = "evento.html";
    });
*/
    document.addEventListener('DOMContentLoaded', function () {


    document.getElementById("inicio").addEventListener("click", function () {
        window.location.href = "menu.html";
    });
    document.getElementById("inicio").addEventListener("click", function () {
        window.location.href = "menu.html";
    });

    document.getElementById("edif1").addEventListener("click", function () {
        window.location.href = "evento.html";
    });

    document.getElementById("edif2").addEventListener("click", function () {
        window.location.href = "evento.html";
    });

    document.getElementById("edif3").addEventListener("click", function () {
        window.location.href = "evento.html";
    });

    document.getElementById("edif4").addEventListener("click", function () {
        window.location.href = "evento.html";
    });
});

function seleccionarEdificio(id) {
    sessionStorage.setItem('edificioSeleccionado', id);

    notificarEdificioAlBackend(id)
        .then(() => {
            window.location.href = `evento.html?edificio=${id}`;
        })
        .catch(error => {
            console.error('❌ No se pudo notificar el edificio al backend:', error);
            
        });
}

function notificarEdificioAlBackend(idEdificio) {
    const usuario = sessionStorage.getItem('usuario');
    const clave = sessionStorage.getItem('clave');

    if (!usuario || !clave) {
        console.error('Usuario o clave no definidos en sessionStorage');
        return Promise.reject('Sin credenciales');
    }

    return fetch('/api/edificios/seleccionar', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            usuario: usuario,
            clave: clave,
            edificio: idEdificio
        })
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('Error al notificar el edificio seleccionado');
        }
        return response.json();
    });
}

// 1. Elementos del DOM
const botones = [
    document.getElementById('edif1'),
    document.getElementById('edif2'),
    document.getElementById('edif3'),
    document.getElementById('edif4')
];
const listaHistorial = document.getElementById('lista-historial');

// 2. Cargar historial desde localStorage o iniciar vacío
let historial = JSON.parse(localStorage.getItem('historialEdificios')) || []; //historialEdificios a definir

// 3. Función para renderizar el historial en pantalla
function mostrarHistorial() {
    listaHistorial.innerHTML = '';

    historial.forEach(item => {
        const li = document.createElement('li');
        li.textContent = `${item.fecha} - Seleccionaste: Edificio ${item.edificio}`;
        listaHistorial.appendChild(li);
    });
}

// 4. Agregar una nueva selección al historial
botones.forEach((boton, index) => {
    const numeroEdificio = index + 1; // edif1 -> 1, edif2 -> 2, etc.

    boton.addEventListener('click', () => {

        const nuevoRegistro = {
            edificio: numeroEdificio,
        };

        historial.unshift(nuevoRegistro);
        localStorage.setItem('historialEdificios', JSON.stringify(historial));
        mostrarHistorial();
    });
});

// 5. Mostrar el historial al cargar la página
mostrarHistorial();
