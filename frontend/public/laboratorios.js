const API = 'http://localhost:3005';

const edificio_id      = sessionStorage.getItem('edificio_id');
const cantidad_alumnos = sessionStorage.getItem('cantidad_alumnos');
const fecha            = sessionStorage.getItem('fecha');

const usuario = sessionStorage.getItem('usuario') || 'dba';
const clave   = sessionStorage.getItem('clave') || 'sql';

window.addEventListener('load', () => {
    fetch(`${API}/api/laboratorios?usuario=${usuario}&clave=${clave}`)
        .then(res => res.json())
        .then(data => {
            if (!Array.isArray(data)) {
                console.error('Error del servidor:', data.error);
                alert('Error al cargar laboratorios: ' + data.error);
                return;
            }

            const disponibles = data.filter(lab =>
                lab.ESTADO_TIPO === 'D' &&
                lab.CAPACIDAD_ALUMNOS >= cantidad_alumnos
            );

            disponibles.forEach((lab, i) => {
                const btn = document.getElementById(`lab${i + 1}`);
                if (btn) {
                    btn.querySelector('strong').textContent = `Lab ${lab.NUMERO_LABORATORIO}`;
                    btn.querySelectorAll('p')[0].textContent = `Cap: ${lab.CAPACIDAD_ALUMNOS}`;
                    btn.setAttribute('data-id', lab.NUMERO_LABORATORIO);
                    btn.style.opacity = '1';
                }
            });

            for (let i = disponibles.length + 1; i <= 5; i++) {
                const btn = document.getElementById(`lab${i}`);
                if (btn) {
                    btn.disabled = true;
                    btn.style.opacity = '0.4';
                }
            }
        })
        .catch(err => {
            console.error('Error al cargar laboratorios:', err);
            alert('Error al conectar con el servidor.');
        });
});

function laboratorio1() { seleccionarLab(document.getElementById('lab1')); }
function laboratorio2() { seleccionarLab(document.getElementById('lab2')); }
function laboratorio3() { seleccionarLab(document.getElementById('lab3')); }
function laboratorio4() { seleccionarLab(document.getElementById('lab4')); }
function laboratorio5() { seleccionarLab(document.getElementById('lab5')); }

function seleccionarLab(btn) {
    const id = btn.getAttribute('data-id');
    if (!id) return; // botón sin lab asignado
    sessionStorage.setItem('laboratorio_id', id);
    window.location.href = 'confirmar.html';
}

document.getElementById('inicio').addEventListener('click', () => {
    sessionStorage.clear();
    window.location.href = 'menu.html';
});