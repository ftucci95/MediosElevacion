// Este archivo analiza inconsistencias entre el campo 'nombre' y el número de la descripción de cada medio
// y renderiza una tabla con los resultados en inconsistencias.html

// Espera que dbInterface ya esté cargado y LISTA_MEDIOS disponible

document.addEventListener('DOMContentLoaded', async () => {
    // Esperar a que dbInterface esté disponible
    if (typeof dbInterface === 'undefined') {
        mostrarError('No se pudo cargar la interfaz de base de datos (dbInterface).');
        return;
    }
    try {
        await dbInterface.inicializarFirebase();
        console.log('LISTA_MEDIOS (global):', LISTA_MEDIOS);
        console.log('Cantidad de líneas:', Object.keys(LISTA_MEDIOS || {}).length);
        if (!LISTA_MEDIOS || Object.keys(LISTA_MEDIOS).length === 0) {
            mostrarError('No se pudo cargar la lista de medios desde la base de datos.');
            return;
        }
        const inconsistencias = encontrarInconsistenciasNombreDescripcion(LISTA_MEDIOS);
        renderizarTablaInconsistencias(inconsistencias);
    } catch (e) {
        mostrarError('Ocurrió un error al cargar los datos: ' + (e.message || e));
    }
});

function mostrarError(msg) {
    const main = document.querySelector('main');
    if (main) {
        main.innerHTML = `<div class="cargando-inconsistencias" style="color: var(--error-color);">${msg}</div>`;
    }
}

/**
 * Busca inconsistencias entre el nombre y la descripción de los medios
 * @param {Object} listaMedios - Estructura LISTA_MEDIOS
 * @returns {Array} - Array de objetos {linea, estacion, nombre, descripcion}
 */
function encontrarInconsistenciasNombreDescripcion(listaMedios) {
    const resultado = [];
    for (const [linea, estaciones] of Object.entries(listaMedios)) {
        for (const [estacion, medios] of Object.entries(estaciones)) {
            for (const medio of medios) {
                if ((medio.tipo === 'Escalera' || medio.tipo === 'Ascensor') && medio.id && medio.descripcion) {
                    const nombre = medio.id || '';
                    const descripcion = medio.descripcion || '';
                    const matchNumero = descripcion.match(/N°\s*(\d+)/);
                    const nombreLower = nombre.toLowerCase();
                    const descripcionLower = descripcion.toLowerCase();

                    let inconsistente = false;

                    // Caso número: E2/A2 debe tener N°2 en la descripción
                    if (/^[EA]\d+$/.test(nombre)) {
                        const num = nombre.substring(1);
                        if (!descripcionLower.includes(`n°${num}`) && !descripcionLower.includes(`nº${num}`)) {
                            inconsistente = true;
                        }
                    }
                    // Caso orientación: EN/ES/AN/AS
                    else if (nombre === 'EN' || nombre === 'AN') {
                        if (!descripcionLower.includes('norte')) {
                            inconsistente = true;
                        }
                    } else if (nombre === 'ES' || nombre === 'AS') {
                        if (!descripcionLower.includes('sur')) {
                            inconsistente = true;
                        }
                    }
                    // Caso exterior/interior/hall para ambos tipos
                    else if (nombre === 'EExt' || nombre === 'AExt') {
                        if (!descripcionLower.includes('ext')) {
                            inconsistente = true;
                        }
                    } else if (nombre === 'EInt' || nombre === 'AInt') {
                        if (!descripcionLower.includes('int')) {
                            inconsistente = true;
                        }
                    } else if (nombre === 'EHall' || nombre === 'AHall') {
                        if (!descripcionLower.includes('hall')) {
                            inconsistente = true;
                        }
                    }
                    // Si es inconsistente, lo agrego
                    if (inconsistente) {
                        resultado.push({
                            linea,
                            estacion,
                            nombre,
                            descripcion
                        });
                    }
                } else if ((medio.tipo === 'Escalera' || medio.tipo === 'Ascensor') && (!medio.id || !medio.descripcion)) {
                    resultado.push({
                        linea,
                        estacion,
                        nombre: medio.id || '(sin nombre)',
                        descripcion: medio.descripcion || '(sin descripción)'
                    });
                }
            }
        }
    }
    return resultado;
}

/**
 * Renderiza la tabla de inconsistencias en el main
 * @param {Array} inconsistencias
 */
function renderizarTablaInconsistencias(inconsistencias) {
    const main = document.querySelector('main');
    if (!main) return;
    if (inconsistencias.length === 0) {
        main.innerHTML = '<div class="sin-inconsistencias">No se encontraron inconsistencias entre nombre y descripción.</div>';
        return;
    }
    let html = `<h2>Inconsistencias entre nombre y descripción encontradas</h2>
    <div class="cantidad-inconsistencias">Cantidad: <strong>${inconsistencias.length} (${((inconsistencias.length * 100 / totalMedios).toFixed(2))}%)</strong></div>
    <div class="tabla-inconsistencias-container">
    <table class="tabla-inconsistencias">
        <thead>
            <tr>
                <th>Línea</th>
                <th>Estación</th>
                <th>Nombre</th>
                <th>Descripción</th>
            </tr>
        </thead>
        <tbody>
    `;
    for (const inc of inconsistencias) {
        html += `<tr>
            <td>${inc.linea}</td>
            <td>${inc.estacion}</td>
            <td>${inc.nombre}</td>
            <td>${inc.descripcion}</td>
        </tr>`;
    }
    html += '</tbody></table></div>';
    main.innerHTML = html;
} 