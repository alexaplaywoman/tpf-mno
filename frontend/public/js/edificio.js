document.addEventListener('DOMContentLoaded', function () {

    document.getElementById("inicio").addEventListener("click", function () {
        window.location.href = "menu.html";
    });

    document.getElementById("edif1").addEventListener("click", () => seleccionarEdificio(1));
    document.getElementById("edif2").addEventListener("click", () => seleccionarEdificio(2));
    document.getElementById("edif3").addEventListener("click", () => seleccionarEdificio(3));
    document.getElementById("edif4").addEventListener("click", () => seleccionarEdificio(4));

});

function seleccionarEdificio(id) {
    sessionStorage.setItem('edificioSeleccionado', id);

    notificarEdificioAlBackend(id)
        .then(() => {
            window.location.href = `evento.html?edificio=${id}`;
        })
        .catch(error => {
            console.error('❌ No se pudo notificar el edificio al backend:', error);
            alert('No se pudo procesar la selección. Intentá de nuevo.');
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