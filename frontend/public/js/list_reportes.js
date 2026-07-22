document.addEventListener('DOMContentLoaded', function () {

    const usuario = sessionStorage.getItem('usuario');
    const clave = sessionStorage.getItem('clave');
    const errorMessage = document.getElementById('error-message');

    document.getElementById("inicio").addEventListener("click", function (e) {
        e.preventDefault();
        window.location.href = "menu_administrador.html";
    });

    if (!usuario || !clave) {
        errorMessage.textContent = 'Faltan credenciales.';
        return;
    }

    const PALETA = ['#190933', '#665687', '#B084CC', '#5DD9C1', '#EDD4B2'];
    const NOMBRES_ESTADO = { C: 'Canceladas', A: 'Ausencias' };

    const graficos = {};

    function hexToHsl(hex) {
        const num = parseInt(hex.slice(1), 16);
        const r = ((num >> 16) & 0xff) / 255;
        const g = ((num >> 8) & 0xff) / 255;
        const b = (num & 0xff) / 255;
        const max = Math.max(r, g, b), min = Math.min(r, g, b);
        let h = 0, s = 0;
        const l = (max + min) / 2;
        const d = max - min;
        if (d !== 0) {
            s = d / (1 - Math.abs(2 * l - 1));
            switch (max) {
                case r: h = ((g - b) / d) % 6; break;
                case g: h = (b - r) / d + 2; break;
                case b: h = (r - g) / d + 4; break;
            }
            h *= 60;
            if (h < 0) h += 360;
        }
        return [h, s, l];
    }

    function hslToHex(h, s, l) {
        h = ((h % 360) + 360) % 360;
        const c = (1 - Math.abs(2 * l - 1)) * s;
        const x = c * (1 - Math.abs((h / 60) % 2 - 1));
        const m = l - c / 2;
        let [r, g, b] = h < 60 ? [c, x, 0]
            : h < 120 ? [x, c, 0]
            : h < 180 ? [0, c, x]
            : h < 240 ? [0, x, c]
            : h < 300 ? [x, 0, c]
            : [c, 0, x];
        r = Math.round((r + m) * 255);
        g = Math.round((g + m) * 255);
        b = Math.round((b + m) * 255);
        return '#' + [r, g, b].map(v => v.toString(16).padStart(2, '0')).join('');
    }

    // Cambia la luminosidad y matiz del color base para que la variante se
    // distinga claramente a simple vista, incluso si el color base ya es
    // muy oscuro o muy claro (por eso trabajamos en HSL y no mezclando con
    // blanco/negro en RGB, que en esos extremos casi no se nota).
    function ajustarColor(hex, deltaL, deltaH) {
        const [h, s, l] = hexToHsl(hex);
        const nuevaL = Math.min(0.85, Math.max(0.15, l + deltaL));
        return hslToHex(h + deltaH, s, nuevaL);
    }

    // Genera "cantidad" colores sin repetir: primero los de la paleta tal
    // cual, y si hacen falta mas, va dando otra vuelta con variantes de
    // luminosidad y matiz cada vez mas marcadas para que se noten distintas.
    function generarColores(cantidad) {
        const colores = [];
        let vuelta = 0;
        while (colores.length < cantidad) {
            const paso = Math.ceil(vuelta / 2);
            const deltaL = vuelta === 0 ? 0 : (vuelta % 2 === 1 ? 0.22 : -0.22) * paso;
            const deltaH = vuelta === 0 ? 0 : paso * 25 * (vuelta % 2 === 1 ? 1 : -1);
            for (const base of PALETA) {
                if (colores.length >= cantidad) break;
                colores.push(vuelta === 0 ? base : ajustarColor(base, deltaL, deltaH));
            }
            vuelta++;
        }
        return colores;
    }

    function dibujarBarra(canvasId, labels, valores, label) {
        if (graficos[canvasId]) graficos[canvasId].destroy();
        const ctx = document.getElementById(canvasId);
        const colores = generarColores(labels.length);
        graficos[canvasId] = new Chart(ctx, {
            type: 'bar',
            data: {
                labels,
                datasets: [{
                    label,
                    data: valores,
                    backgroundColor: colores
                }]
            },
            options: {
                responsive: true,
                plugins: { legend: { display: false } },
                scales: { y: { beginAtZero: true, ticks: { precision: 0 } } }
            }
        });
    }

    function dibujarTorta(canvasId, labels, valores) {
        if (graficos[canvasId]) graficos[canvasId].destroy();
        const ctx = document.getElementById(canvasId);
        graficos[canvasId] = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels,
                datasets: [{
                    data: valores,
                    backgroundColor: generarColores(labels.length),
                    borderWidth: labels.length > 1 ? 2 : 0
                }]
            },
            options: {
                responsive: true,
                plugins: { legend: { position: 'bottom' } }
            }
        });
    }

    function mostrarSinDatos(canvasId) {
        if (graficos[canvasId]) graficos[canvasId].destroy();
        const ctx = document.getElementById(canvasId);
        graficos[canvasId] = new Chart(ctx, {
            type: 'bar',
            data: { labels: ['Sin datos'], datasets: [{ data: [0], backgroundColor: '#ccc' }] },
            options: { responsive: true, plugins: { legend: { display: false } } }
        });
    }

    async function pedirReporte(endpoint, desde, hasta) {
        const url = `/api/reportes/${endpoint}?usuario=${encodeURIComponent(usuario)}` +
            `&clave=${encodeURIComponent(clave)}&desde=${desde}&hasta=${hasta}`;
        const respuesta = await fetch(url);
        const data = await respuesta.json();
        if (!respuesta.ok) throw new Error(data.error || `Error al pedir ${endpoint}`);
        return data;
    }

    let ultimoReporte = null;
    const btnExportarPdf = document.getElementById('btnExportarPdf');
    const exportMessage = document.getElementById('export-message');

    async function generarReportes(desde, hasta) {
        errorMessage.textContent = '';
        if (btnExportarPdf) btnExportarPdf.disabled = true;
        ultimoReporte = null;

        try {
            const laboratorios = await pedirReporte('laboratorios-mas-utilizados', desde, hasta);
            if (laboratorios.length === 0) {
                mostrarSinDatos('chartLaboratorios');
            } else {
                dibujarBarra(
                    'chartLaboratorios',
                    laboratorios.map(l => `Lab ${l.NUMERO_LABORATORIO} (${l.EDIFICIO})`),
                    laboratorios.map(l => l.CANTIDAD_RESERVAS),
                    'Reservas'
                );
            }

            const horarios = await pedirReporte('horarios-mas-ocupados', desde, hasta);
            if (horarios.length === 0) {
                mostrarSinDatos('chartHorarios');
            } else {
                dibujarBarra(
                    'chartHorarios',
                    horarios.map(h => String(h.HORA_INICIO).slice(0, 5)),
                    horarios.map(h => h.CANTIDAD_RESERVAS),
                    'Reservas'
                );
            }

            const solicitantes = await pedirReporte('solicitantes-top', desde, hasta);
            if (solicitantes.length === 0) {
                mostrarSinDatos('chartSolicitantes');
            } else {
                dibujarBarra(
                    'chartSolicitantes',
                    solicitantes.map(s => `${s.NOMBRE} ${s.APELLIDO}`),
                    solicitantes.map(s => s.CANTIDAD_RESERVAS),
                    'Reservas'
                );
            }

            const cancelaciones = await pedirReporte('cancelaciones-inasistencias', desde, hasta);
            if (cancelaciones.length === 0) {
                mostrarSinDatos('chartCancelaciones');
            } else {
                dibujarTorta(
                    'chartCancelaciones',
                    cancelaciones.map(c => NOMBRES_ESTADO[c.ESTADO_RESERVA] || c.ESTADO_RESERVA),
                    cancelaciones.map(c => c.CANTIDAD)
                );
            }

            const recursos = await pedirReporte('porcentaje-recursos', desde, hasta);
            if (recursos.length === 0) {
                mostrarSinDatos('chartRecursos');
            } else {
                dibujarTorta(
                    'chartRecursos',
                    recursos.map(r => `${r.NOMBRE} (${r.PORCENTAJE}%)`),
                    recursos.map(r => r.VECES_USADO)
                );
            }

            ultimoReporte = { desde, hasta, laboratorios, horarios, solicitantes, cancelaciones, recursos };
            if (btnExportarPdf) btnExportarPdf.disabled = false;

        } catch (error) {
            console.error(error);
            errorMessage.textContent = error.message || 'Error al generar los reportes.';
        }
    }

    const SECCIONES = [
        {
            titulo: 'Laboratorios más utilizados',
            canvasId: 'chartLaboratorios',
            clave: 'laboratorios',
            columnas: ['Laboratorio', 'Edificio', 'Reservas'],
            fila: r => [`Lab ${r.NUMERO_LABORATORIO}`, r.EDIFICIO, r.CANTIDAD_RESERVAS]
        },
        {
            titulo: 'Horarios de mayor ocupación',
            canvasId: 'chartHorarios',
            clave: 'horarios',
            columnas: ['Horario', 'Reservas'],
            fila: r => [String(r.HORA_INICIO).slice(0, 5), r.CANTIDAD_RESERVAS]
        },
        {
            titulo: 'Solicitantes con más reservas',
            canvasId: 'chartSolicitantes',
            clave: 'solicitantes',
            columnas: ['Nombre', 'Apellido', 'Reservas'],
            fila: r => [r.NOMBRE, r.APELLIDO, r.CANTIDAD_RESERVAS]
        },
        {
            titulo: 'Cancelaciones / Ausencias',
            canvasId: 'chartCancelaciones',
            clave: 'cancelaciones',
            columnas: ['Estado', 'Cantidad'],
            fila: r => [NOMBRES_ESTADO[r.ESTADO_RESERVA] || r.ESTADO_RESERVA, r.CANTIDAD]
        },
        {
            titulo: '% de uso de recursos',
            canvasId: 'chartRecursos',
            clave: 'recursos',
            columnas: ['Recurso', 'Veces usado', '% del total'],
            fila: r => [r.NOMBRE, r.VECES_USADO, `${r.PORCENTAJE}%`]
        }
    ];

    function formatearFechaLarga(fechaISO) {
        const [anio, mes, dia] = fechaISO.split('-');
        return `${dia}/${mes}/${anio}`;
    }

    async function exportarPDF() {
        if (!ultimoReporte || !window.jspdf) return;
        exportMessage.textContent = 'Generando PDF...';

        try {
            const { jsPDF } = window.jspdf;
            const doc = new jsPDF({ unit: 'pt', format: 'a4' });
            const anchoPagina = doc.internal.pageSize.getWidth();
            const altoPagina = doc.internal.pageSize.getHeight();
            const margen = 40;

            function encabezado() {
                doc.setFillColor(25, 9, 51);
                doc.rect(0, 0, anchoPagina, 70, 'F');
                doc.setTextColor(255, 255, 255);
                doc.setFont('helvetica', 'bold');
                doc.setFontSize(16);
                doc.text('LabControl · Reporte de uso de laboratorios', margen, 30);
                doc.setFont('helvetica', 'normal');
                doc.setFontSize(10);
                doc.text(
                    `Período: ${formatearFechaLarga(ultimoReporte.desde)} al ${formatearFechaLarga(ultimoReporte.hasta)}`,
                    margen, 48
                );
                doc.text(
                    `Generado el ${new Date().toLocaleString('es-PY')}`,
                    margen, 62
                );
            }

            function piePagina() {
                const totalPaginas = doc.internal.getNumberOfPages();
                for (let i = 1; i <= totalPaginas; i++) {
                    doc.setPage(i);
                    doc.setDrawColor(176, 132, 204);
                    doc.setLineWidth(1);
                    doc.line(margen, altoPagina - 30, anchoPagina - margen, altoPagina - 30);
                    doc.setTextColor(120, 120, 120);
                    doc.setFontSize(8);
                    doc.setFont('helvetica', 'normal');
                    doc.text('LabControl', margen, altoPagina - 18);
                    doc.text(`Página ${i} de ${totalPaginas}`, anchoPagina - margen, altoPagina - 18, { align: 'right' });
                }
            }

            encabezado();
            let cursorY = 95;

            SECCIONES.forEach((seccion, indice) => {
                const datos = ultimoReporte[seccion.clave];

                if (cursorY > altoPagina - 160) {
                    doc.addPage();
                    encabezado();
                    cursorY = 95;
                }

                doc.setFillColor(102, 86, 135);
                doc.rect(margen, cursorY, anchoPagina - margen * 2, 22, 'F');
                doc.setTextColor(255, 255, 255);
                doc.setFont('helvetica', 'bold');
                doc.setFontSize(11);
                doc.text(seccion.titulo, margen + 8, cursorY + 15);
                cursorY += 32;

                if (datos.length === 0) {
                    doc.setTextColor(90, 90, 90);
                    doc.setFont('helvetica', 'italic');
                    doc.setFontSize(10);
                    doc.text('Sin datos para el período seleccionado.', margen + 8, cursorY);
                    cursorY += 24;
                    return;
                }

                const canvas = document.getElementById(seccion.canvasId);
                const imagenValida = canvas && canvas.width > 0 && canvas.height > 0;

                if (imagenValida) {
                    const imagenAncho = 220;
                    const imagenAlto = (canvas.height / canvas.width) * imagenAncho;
                    let imagenIncrustada = false;
                    try {
                        doc.addImage(canvas.toDataURL('image/png', 1.0), 'PNG', margen, cursorY, imagenAncho, imagenAlto);
                        imagenIncrustada = true;
                    } catch (e) {
                        console.error('No se pudo incrustar el gráfico', e);
                    }

                    doc.autoTable({
                        startY: cursorY,
                        margin: { left: margen + imagenAncho + 20, right: margen },
                        head: [seccion.columnas],
                        body: datos.map(seccion.fila),
                        theme: 'grid',
                        styles: { fontSize: 8, cellPadding: 4, textColor: [50, 40, 60] },
                        headStyles: { fillColor: [25, 9, 51], textColor: 255, fontStyle: 'bold' },
                        alternateRowStyles: { fillColor: [244, 240, 249] }
                    });

                    const altoImagenUsado = imagenIncrustada ? imagenAlto : 0;
                    cursorY = Math.max(doc.lastAutoTable.finalY, cursorY + altoImagenUsado) + 20;
                } else {
                    doc.autoTable({
                        startY: cursorY,
                        margin: { left: margen, right: margen },
                        head: [seccion.columnas],
                        body: datos.map(seccion.fila),
                        theme: 'grid',
                        styles: { fontSize: 9, cellPadding: 4, textColor: [50, 40, 60] },
                        headStyles: { fillColor: [25, 9, 51], textColor: 255, fontStyle: 'bold' },
                        alternateRowStyles: { fillColor: [244, 240, 249] }
                    });
                    cursorY = doc.lastAutoTable.finalY + 20;
                }
            });

            piePagina();
            doc.save(`reporte-labcontrol_${ultimoReporte.desde}_${ultimoReporte.hasta}.pdf`);
            exportMessage.textContent = '';

        } catch (error) {
            console.error(error);
            exportMessage.textContent = 'Error al generar el PDF.';
        }
    }

    if (btnExportarPdf) btnExportarPdf.addEventListener('click', exportarPDF);

    document.getElementById('form-rango').addEventListener('submit', function (e) {
        e.preventDefault();
        const desde = document.getElementById('desde').value;
        const hasta = document.getElementById('hasta').value;
        if (!desde || !hasta) return;
        generarReportes(desde, hasta);
    });

    const hoy = new Date();
    const haceUnMes = new Date();
    haceUnMes.setMonth(haceUnMes.getMonth() - 1);
    document.getElementById('hasta').value = hoy.toISOString().split('T')[0];
    document.getElementById('desde').value = haceUnMes.toISOString().split('T')[0];
    generarReportes(document.getElementById('desde').value, document.getElementById('hasta').value);

});
