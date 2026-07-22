/**
 * reporte_auditoria.js
 * Lógica de la página de reporte de auditoría.
 *
 * Endpoint esperado:
 *   GET /api/reportes/auditoria?fecha_desde=&fecha_hasta=&grupo=&usuario=&id_referencia=&pagina=&limite=
 *   Respuesta: { datos: [...], total: N }
 */

const LIMITE = 20;

// Estado global
let currentPage = 1;
let totalPages = 1;

const state = {
    filtros: {
        fecha_desde: null,
        fecha_hasta: null,
        grupo: null,
        usuario: null,
        id_referencia: null
    }
};


// ============================================================
// Inicialización
// ============================================================
document.addEventListener('DOMContentLoaded', () => {
    wireEvents();
    actualizarLabelIdRef();
    actualizarChipsFiltros();
    cargarPagina(1);
});

function wireEvents() {
    document.getElementById('btnAbrirFiltros').addEventListener('click', abrirModalFiltros);
    document.getElementById('btnAplicarFiltros').addEventListener('click', aplicarFiltros);
    document.getElementById('btnCancelarFiltros').addEventListener('click', cerrarModalFiltros);
    document.getElementById('btnLimpiarFiltros').addEventListener('click', limpiarYAplicar);
    document.getElementById('fGrupo').addEventListener('change', actualizarLabelIdRef);

    // Enter en cualquier input del modal aplica el filtro
    document.querySelectorAll('#modalFiltros input')
        .forEach(el => el.addEventListener('keydown', e => {
            if (e.key === 'Enter') {
                e.preventDefault();
                aplicarFiltros();
            }
        }));
}


// ============================================================
// Modal de filtros
// ============================================================
function abrirModalFiltros() {
    // Sincronizar inputs con el estado actual antes de mostrar
    const f = state.filtros;
    document.getElementById('fFechaDesde').value = f.fecha_desde || '';
    document.getElementById('fFechaHasta').value = f.fecha_hasta || '';
    document.getElementById('fGrupo').value      = f.grupo || '';
    document.getElementById('fUsuario').value    = f.usuario || '';
    document.getElementById('fIdRef').value      = f.id_referencia || '';
    actualizarLabelIdRef();

    document.getElementById('modalFiltros').showModal();
}

function cerrarModalFiltros() {
    document.getElementById('modalFiltros').close();
}

function aplicarFiltros() {
    state.filtros = leerFiltrosDelFormulario();
    cerrarModalFiltros();
    actualizarChipsFiltros();
    cargarPagina(1);
}

function limpiarYAplicar() {
    limpiarFormulario();
    state.filtros = leerFiltrosDelFormulario();
    cerrarModalFiltros();
    actualizarChipsFiltros();
    cargarPagina(1);
}

function leerFiltrosDelFormulario() {
    const val = id => document.getElementById(id).value.trim() || null;
    const num = id => {
        const v = document.getElementById(id).value.trim();
        return v === '' ? null : parseInt(v, 10);
    };
    return {
        fecha_desde:   val('fFechaDesde'),
        fecha_hasta:   val('fFechaHasta'),
        grupo:         val('fGrupo'),
        usuario:       val('fUsuario'),
        id_referencia: num('fIdRef')
    };
}

function limpiarFormulario() {
    ['fFechaDesde', 'fFechaHasta', 'fUsuario', 'fIdRef'].forEach(id => {
        document.getElementById(id).value = '';
    });
    document.getElementById('fGrupo').value = '';
    actualizarLabelIdRef();
}

/**
 * El input "ID" cambia rótulo según el grupo seleccionado.
 */
function actualizarLabelIdRef() {
    const grupo = document.getElementById('fGrupo').value;
    const label = document.getElementById('lblIdRef');
    const input = document.getElementById('fIdRef');

    const mapa = {
        'Reservas':       { label: 'N° de reserva',       ph: 'ID de la reserva' },
        'Laboratorios':   { label: 'N° de laboratorio',   ph: 'N° del laboratorio' },
        'Mantenimientos': { label: 'N° de mantenimiento', ph: 'ID del mantenimiento' },
        '':               { label: 'N° de referencia',    ph: 'ID' }
    };
    const cfg = mapa[grupo] || mapa[''];
    label.textContent = cfg.label;
    input.placeholder = cfg.ph;
}


// ============================================================
// Chips de filtros activos (debajo del botón Filtrar)
// ============================================================
function actualizarChipsFiltros() {
    const f = state.filtros;
    const chips = [];

    if (f.fecha_desde)   chips.push(`Desde: ${f.fecha_desde}`);
    if (f.fecha_hasta)   chips.push(`Hasta: ${f.fecha_hasta}`);
    if (f.grupo)         chips.push(`Grupo: ${f.grupo}`);
    if (f.usuario)       chips.push(`Usuario: ${f.usuario}`);
    if (f.id_referencia) chips.push(`N°: ${f.id_referencia}`);

    const wrap = document.getElementById('chipsFiltrosActivos');
    if (chips.length === 0) {
        wrap.innerHTML = '';
    } else {
        wrap.innerHTML = chips.map(c =>
            `<span class="chip-filtro">${escapeHtml(c)}</span>`
        ).join('');
    }
}


// ============================================================
// Fetch al backend
// ============================================================
async function cargarPagina(pagina) {
    currentPage = pagina;
    mostrarLoading();

    // Credenciales del admin. Ajustar los nombres de las keys si en tu
    // login guardas con otras (por ejemplo 'usuario_admin' / 'clave_admin').
    const cred_usuario = sessionStorage.getItem('usuario') || '';
    const cred_clave   = sessionStorage.getItem('clave')   || '';

    const params = new URLSearchParams();
    params.set('usuario', cred_usuario);
    params.set('clave',   cred_clave);
    const f = state.filtros;
    if (f.fecha_desde)   params.set('fecha_desde',    f.fecha_desde);
    if (f.fecha_hasta)   params.set('fecha_hasta',    f.fecha_hasta);
    if (f.grupo)         params.set('grupo',          f.grupo);
    if (f.usuario)       params.set('usuario_filtro', f.usuario);
    if (f.id_referencia) params.set('id_referencia',  f.id_referencia);
    params.set('pagina', pagina);
    params.set('limite', LIMITE);

    try {
        const resp = await fetch('/api/reportes/auditoria?' + params.toString());
        if (!resp.ok) {
            const errData = await resp.json().catch(() => ({}));
            throw new Error(errData.error || 'Error al consultar la auditoría');
        }
        const data = await resp.json();
        renderResultados(data);
    } catch (err) {
        mostrarError(err.message || String(err));
    }
}


// ============================================================
// Estados visuales
// ============================================================
function mostrarLoading() {
    document.getElementById('loading').style.display = '';
    document.getElementById('vacio').style.display = 'none';
    document.getElementById('error-message').textContent = '';
    document.getElementById('tablaWrap').style.display = 'none';
    document.getElementById('paginacionWrap').style.display = 'none';
    document.getElementById('resumenResultados').textContent = '';
}

function mostrarError(mensaje) {
    document.getElementById('loading').style.display = 'none';
    document.getElementById('vacio').style.display = 'none';
    document.getElementById('tablaWrap').style.display = 'none';
    document.getElementById('paginacionWrap').style.display = 'none';
    document.getElementById('error-message').textContent = mensaje;
}

function mostrarVacio() {
    document.getElementById('loading').style.display = 'none';
    document.getElementById('vacio').style.display = '';
    document.getElementById('error-message').textContent = '';
    document.getElementById('tablaWrap').style.display = 'none';
    document.getElementById('paginacionWrap').style.display = 'none';
    document.getElementById('resumenResultados').textContent = '0 resultados';
}


// ============================================================
// Render de resultados
// ============================================================
function renderResultados(data) {
    const { datos, total } = data;
    if (!datos || datos.length === 0) {
        mostrarVacio();
        return;
    }

    document.getElementById('loading').style.display = 'none';
    document.getElementById('vacio').style.display = 'none';
    document.getElementById('error-message').textContent = '';
    document.getElementById('tablaWrap').style.display = '';

    renderTabla(datos);
    totalPages = Math.max(1, Math.ceil(total / LIMITE));
    renderPaginacion();
    renderResumen(total, datos.length);
}

function renderTabla(datos) {
    const tbody = document.getElementById('auditoria-list');
    tbody.innerHTML = datos.map(ev => {
        const grupo = grupoDeTipo(ev.TIPO_EVENTO);
        const subtipo = subtipoDeEvento(ev.TIPO_EVENTO);
        const badgeClass = 'badge-' + grupo.toLowerCase();
        return `
            <tr>
                <td class="small">${escapeHtml(formatearFechaHora(ev.FECHA_HORA))}</td>
                <td><code>${escapeHtml(ev.USUARIO)}</code></td>
                <td><span class="badge ${badgeClass}">${escapeHtml(grupo)}</span></td>
                <td class="small">${escapeHtml(subtipo)}</td>
                <td>${ev.ID_REFERENCIA ?? '—'}</td>
                <td class="desc-cell">${escapeHtml(ev.DESCRIPCION)}</td>
            </tr>
        `;
    }).join('');
}

function renderResumen(total, mostrando) {
    const desde = (currentPage - 1) * LIMITE + 1;
    const hasta = desde + mostrando - 1;
    document.getElementById('resumenResultados').textContent =
        `Mostrando ${desde}-${hasta} de ${total}`;
}


// ============================================================
// Paginación (patrón previusPage/nextPage + span#items)
// ============================================================
function renderPaginacion() {
    const items = document.getElementById('items');
    const wrap  = document.getElementById('paginacionWrap');

    if (totalPages <= 1) {
        wrap.style.display = 'none';
        return;
    }
    wrap.style.display = '';

    // Rango de números a mostrar: hasta 5 páginas alrededor de la actual
    const rango = calcularRangoPaginas(currentPage, totalPages);

    let html = '';
    let last = 0;
    for (const p of rango) {
        if (last && p - last > 1) {
            html += `<li class="page-item disabled"><span class="page-link">…</span></li>`;
        }
        const activo = p === currentPage ? ' active' : '';
        html += `<li class="page-item${activo}">
                    <button class="page-link" onclick="goToPage(${p})">${p}</button>
                 </li>`;
        last = p;
    }
    items.innerHTML = html;
}

function calcularRangoPaginas(pagina, totalPag) {
    const set = new Set();
    set.add(1);
    set.add(totalPag);
    for (let d = -2; d <= 2; d++) {
        const p = pagina + d;
        if (p > 1 && p < totalPag) set.add(p);
    }
    return [...set].sort((a, b) => a - b);
}

// Funciones globales para los onclick del HTML
function previusPage() {
    if (currentPage > 1) cargarPagina(currentPage - 1);
}

function nextPage() {
    if (currentPage < totalPages) cargarPagina(currentPage + 1);
}

function goToPage(p) {
    if (p >= 1 && p <= totalPages && p !== currentPage) cargarPagina(p);
}


// ============================================================
// Helpers
// ============================================================
function grupoDeTipo(tipoEvento) {
    if (!tipoEvento) return 'Otro';
    if (tipoEvento.startsWith('RESERVA'))       return 'Reservas';
    if (tipoEvento.startsWith('LABORATORIO'))   return 'Laboratorios';
    if (tipoEvento.startsWith('MANTENIMIENTO')) return 'Mantenimientos';
    return 'Otro';
}

function subtipoDeEvento(tipoEvento) {
    const mapa = {
        'RESERVA_CREADA':             'Creada',
        'RESERVA_ESTADO':             'Cambio de estado',
        'RESERVA_REPROGRAMADA':       'Reprogramada',
        'LABORATORIO_ESTADO':         'Cambio de estado',
        'MANTENIMIENTO_CREADO':       'Programado',
        'MANTENIMIENTO_ESTADO':       'Cambio de estado',
        'MANTENIMIENTO_REPROGRAMADO': 'Reprogramado'
    };
    return mapa[tipoEvento] || tipoEvento;
}

function formatearFechaHora(ts) {
    if (!ts) return '—';
    const iso = ts.includes('T') ? ts : ts.replace(' ', 'T');
    const d = new Date(iso);
    if (isNaN(d.getTime())) return ts;
    const pad = n => String(n).padStart(2, '0');
    return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} `
         + `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function escapeHtml(str) {
    if (str == null) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}