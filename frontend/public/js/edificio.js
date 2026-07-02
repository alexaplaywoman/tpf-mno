document.addEventListener('DOMContentLoaded', function () {

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

    loadEdificios();
});

function loadEdificios() {
    const usuario = sessionStorage.getItem('usuario');
    const clave = sessionStorage.getItem('clave');

    if (!usuario || !clave) {
        console.error('Usuario o clave no definidos en sessionStorage');
        return;
    }

    const url = `/api/edificios?usuario=${encodeURIComponent(usuario)}&clave=${encodeURIComponent(clave)}`;

    fetch(url)
        .then(response => {
            if (!response.ok) {
                throw new Error('Error al obtener los edificios');
            }
            return response.json();
        })
        .then(data => {
            mostrarEdificios(data.edificios);
        })
        .catch(error => {
            console.error('❌ Error al cargar edificios:', error);
        });
}

