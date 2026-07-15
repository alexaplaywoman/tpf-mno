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


    document.getElementById("inicio").addEventListener("click", function(e){
        e.preventDefault();
        window.location.href="menu.html";

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

        let reservaEditar = JSON.parse(
        sessionStorage.getItem("reservaEditar")
    );


    if(reservaEditar){

        console.log("Reserva a editar:", reservaEditar);


        if(reservaEditar.EDIFICIO === "Biblioteca Pablo VI"){
            document.getElementById("edif1").click();
        }


        if(reservaEditar.EDIFICIO === "Ciencias Contables"){
            document.getElementById("edif2").click();
        }


        if(reservaEditar.EDIFICIO === "Ciencias y Tecnología"){
            document.getElementById("edif3").click();
        }


        if(reservaEditar.EDIFICIO === "Bloque G"){
            document.getElementById("edif4").click();
        }

    }
});

function seleccionarEdificio(nombreEdificio) {
    sessionStorage.setItem('edificioSeleccionado', nombreEdificio);

    notificarEdificioAlBackend(nombreEdificio)
        .then(() => {
            window.location.href = "evento.html";
        })
        .catch(error => {
            console.error('❌ No se pudo notificar el edificio al backend:', error);

        window.location.href = "evento.html";
            
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