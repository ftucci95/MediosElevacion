document.addEventListener('DOMContentLoaded', async () => {
    try {
        await dbInterface.inicializarFirebase();
        const lista = LISTA_MEDIOS;
        console.log(lista);
        const tablasLineas = document.getElementById('tablas-lineas');
        tablasLineas.innerHTML = '';
        let hayAlMenosUno = false;
        Object.keys(lista).forEach(linea => {
            const mediosNoOperativos = [];
            Object.keys(lista[linea]).forEach(estacion => {
                lista[linea][estacion].forEach(medio => {
                    if (medio.estado === "No operativo") {
                        mediosNoOperativos.push({
                            estacion,
                            ...medio
                        });
                    }
                });
            });
            if (mediosNoOperativos.length > 0) {
                console.log(linea, mediosNoOperativos);
                hayAlMenosUno = true;
                const tabla = crearTablaLinea(linea, mediosNoOperativos);
                tablasLineas.appendChild(tabla);
            }
        });
        if (!hayAlMenosUno) {
            tablasLineas.innerHTML = '<div style="text-align:center; color:var(--text-secondary); font-size:1.2rem;">No hay medios fuera de servicio en este momento.</div>';
        }
    } catch (e) {
        document.getElementById('tablas-lineas').innerHTML = '<div style="color:red;">Error al cargar los datos.</div>';
        console.error(e);
    }
});

function normalizarTimestamp(timestamp) {
    if (!timestamp) return null;
    try {
        // Caso 1: Microsoft JSON Date format /Date(1234567890123)/
        if (typeof timestamp === 'string' && timestamp.startsWith('/Date(') && timestamp.endsWith(')/')) {
            const milliseconds = parseInt(timestamp.substring(6, timestamp.length - 2), 10);
            return new Date(milliseconds);
        }
        // ...otros casos...
    } catch (error) {
        console.error('❌ Error al normalizar timestamp:', error, timestamp);
        return null;
    }
}

function formatearFechaCompleta(date) {
    if (!(date instanceof Date) || isNaN(date)) return '';
    return date.toLocaleString('es-AR', {
        weekday: 'long',
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    });
}

function crearTablaLinea(linea, medios) {
    const wrapper = document.createElement('div');
    wrapper.className = 'tabla-linea-wrapper';
    wrapper.style.marginBottom = '2rem';
    const header = document.createElement('div');
    header.className = 'tabla-linea-header';
    header.style.cursor = 'pointer';
    header.style.background = 'var(--primary-gradient)';
    header.style.color = 'var(--header-text)';
    header.style.padding = '1rem';
    header.style.borderRadius = '10px 10px 0 0';
    header.style.fontWeight = 'bold';
    header.style.display = 'flex';
    header.style.justifyContent = 'space-between';
    header.style.alignItems = 'center';
    header.innerHTML = `<span>${linea}</span><span>${medios.length} fuera de servicio</span><span class="material-icons">expand_less</span>`;
    const tabla = document.createElement('table');
    tabla.className = 'tabla-medios-fuera-servicio';
    tabla.style.width = '100%';
    tabla.style.background = 'var(--background-card)';
    tabla.style.borderRadius = '0 0 10px 10px';
    tabla.innerHTML = `<thead><tr><th>Tipo</th><th>Nombre</th><th>Estación</th><th>Descripción</th><th>Desde</th></tr></thead><tbody></tbody>`;
    const tbody = tabla.querySelector('tbody');
    medios.forEach(medio => {
        const tr = document.createElement('tr');
        tr.innerHTML = `<td>${medio.tipo}</td><td>${medio.id}</td><td>${medio.estacion}</td><td>${medio.descripcion || ''}</td><td>${formatearFechaCompleta(normalizarTimestamp(medio.fechaActualizacion))}</td>`;
        tbody.appendChild(tr);
    });
    tabla.style.display = 'table';
    header.querySelector('.material-icons').textContent = 'expand_less';
    header.addEventListener('click', () => {
        if (tabla.style.display === 'none') {
            tabla.style.display = 'table';
            header.querySelector('.material-icons').textContent = 'expand_less';
        } else {
            tabla.style.display = 'none';
            header.querySelector('.material-icons').textContent = 'expand_more';
        }
    });
    wrapper.appendChild(header);
    wrapper.appendChild(tabla);
    return wrapper;
} 