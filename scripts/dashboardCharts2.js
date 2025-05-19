/**
 * Módulo para la visualización de datos en el dashboard
 */

// Colores para cada línea
const COLORES_LINEAS = {
    'Línea A': {
        color: '#08b3dc',
        rgba: 'rgba(8, 179, 220, 0.8)'
    },
    'Línea B': {
        color: '#ed4137',
        rgba: 'rgba(237, 65, 55, 0.8)'
    },
    'Línea C': {
        color: '#0f70b4',
        rgba: 'rgba(15, 112, 180, 0.8)'
    },
    'Línea D': {
        color: '#008669',
        rgba: 'rgba(0, 134, 105, 0.8)'
    },
    'Línea E': {
        color: '#7f2d8c',
        rgba: 'rgba(127, 45, 140, 0.8)'
    },
    'Línea H': {
        color: '#fdd201',
        rgba: 'rgba(253, 210, 1, 0.8)'
    },
    'Desconocida': {
        color: '#6c757d',
        rgba: 'rgba(108, 117, 125, 0.8)'
    }
};

// Variables globales para los gráficos
let graficoConsolidado = null;

/**
 * Inicializa el dashboard
 */
function inicializarDashboard() {
    console.log('🔄 Inicializando dashboard...');
    
    // Configurar fechas por defecto
    const hoy = new Date();
    const fechaInicio = new Date(hoy);
    const fechaFin = new Date(hoy);
    
    // Inicio del día actual (00:00 Argentina = 03:00 UTC del mismo día)
    fechaInicio.setUTCHours(3, 0, 0, 0);
    
    // Fin del día actual (23:59 Argentina = 02:59 UTC del día siguiente)
    fechaFin.setUTCHours(26, 59, 59, 999); // 27 = 24 + 2 + 0.99

    // Configurar los inputs de fecha con el formato YYYY-MM-DD
    const inputFechaInicio = document.getElementById('fechaInicio');
    const inputFechaFin = document.getElementById('fechaFin');
    
    if (!inputFechaInicio || !inputFechaFin) {
        console.warn('⚠️ No se encontraron los elementos de fecha en el DOM');
        return;
    }
    
    // Formatear fecha para el input (YYYY-MM-DD en horario Argentina)
    const formatearFechaParaInput = (fecha) => {
        const year = fecha.getFullYear();
        const month = String(fecha.getMonth() + 1).padStart(2, '0');
        const day = String(fecha.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    };
    
    inputFechaInicio.value = formatearFechaParaInput(fechaInicio);
    inputFechaFin.value = formatearFechaParaInput(fechaInicio); // Usamos la misma fecha para ambos

    /* console.log('Fecha inputs:', {
        inicio: inputFechaInicio.value,
        fin: inputFechaFin.value,
        inicioUTC: fechaInicio.toISOString(),
        finUTC: fechaFin.toISOString()
    }); */

    // Mostrar estado de espera inicial en los gráficos
    mostrarEstadoEspera();
    
    console.log('✅ Dashboard inicializado');
}

/**
 * Muestra un estado de espera en los gráficos y KPIs
 */
function mostrarEstadoEspera() {
    console.log('🔄 Mostrando estado de espera inicial...');
    
    // Mostrar mensaje de espera en el gráfico principal
    const ctx = document.getElementById('graficoConsolidado').getContext('2d');
    mostrarMensajeEspera(ctx);
    
    // Mostrar estado de espera en los KPIs
    document.getElementById('kpi-mttf').textContent = "Esperando...";
    document.getElementById('kpi-mttr').textContent = "Esperando...";
    document.getElementById('kpi-fallas').textContent = "Esperando...";
    document.getElementById('kpi-disponibilidad').textContent = "Esperando...";
    
    // Mostrar estado de espera en el dashboard
    const dashboard = document.getElementById('dashboard');
    dashboard.innerHTML = '<div class="waiting-message">Esperando datos. Presione "Actualizar" para cargar información.</div>';
    
    // Aplicar estilo para el mensaje de espera
    const style = document.createElement('style');
    style.textContent = `
        .waiting-message {
            display: flex;
            justify-content: center;
            align-items: center;
            width: 100%;
            height: 200px;
            background-color: #f8f9fa;
            border-radius: 8px;
            color: #6c757d;
            font-size: 16px;
            text-align: center;
            margin-bottom: 20px;
        }
    `;
    document.head.appendChild(style);
    
    console.log('✅ Estado de espera mostrado');
}

/**
 * Muestra un mensaje de espera en un canvas
 * @param {CanvasRenderingContext2D} ctx - Contexto del canvas
 */
function mostrarMensajeEspera(ctx) {
    console.log('🔄 Mostrando mensaje de espera en canvas...');
    
    // Limpiar el canvas
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    
    // Configurar estilo de texto
    ctx.fillStyle = '#6c757d';
    ctx.font = '16px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    // Dibujar mensaje
/*     ctx.fillText('Esperando datos. Presione "Actualizar" para cargar información.', 
                ctx.canvas.width / 2, ctx.canvas.height / 2);
    
    console.log('✅ Mensaje de espera mostrado en canvas'); */
}

/**
 * Carga y procesa los datos del historial
 */
async function cargarYProcesarDatos() {
    console.log('🔄 Cargando datos...');
    
    try {
        // Calcular tiempos usando la nueva estructura
        await dataCalculator.calcular(false); // false = no considerar horario de servicio
        
        // Procesar los datos para los gráficos
        const datosCalculados = dataCalculator.procesarDatosGraficos();
        
        console.log('📊 Datos calculados completos:', datosCalculados);
        
        if (!datosCalculados || !datosCalculados.INDICADORES_LINEA) {
            console.warn('⚠️ No hay datos procesados disponibles');
            mostrarEstadoEspera();
            return;
        }

        // Crear estructura simplificada que mantiene compatibilidad
        const datosCompletos = {
            metadatos: {
                fechaInicio: new Date(document.getElementById('fechaInicio').value),
                fechaFin: new Date(document.getElementById('fechaFin').value),
                timestamp: new Date().toISOString()
            },
            procesados: {
                porLinea: {},
                global: {
                    MTTR_red: datosCalculados.INDICADORES_RED.MTTR_red || 0,
                    MTTF_red: datosCalculados.INDICADORES_RED.MTTF_red || 0,
                    mediosConFallas: datosCalculados.INDICADORES_RED.mediosConFallas || 0,
                    Disponibilidad: datosCalculados.INDICADORES_RED.Disponibilidad || 0
                }
            }
        };

        // Procesar datos por línea usando los indicadores correctos
        Object.entries(datosCalculados.INDICADORES_LINEA).forEach(([linea, indicadores]) => {
            datosCompletos.procesados.porLinea[linea] = {
                indicadores: {
                    DisponibilidadEsc: indicadores.DisponibilidadEsc || 0,
                    DisponibilidadAsc: indicadores.DisponibilidadAsc || 0,
                    MTTFEsc: indicadores.MTTFEsc || 0,
                    MTTFAsc: indicadores.MTTFAsc || 0,
                    MTTREsc: indicadores.MTTREsc || 0,
                    MTTRAsc: indicadores.MTTRAsc || 0,
                    FallasEsc: indicadores.FallasEsc || 0,
                    FallasAsc: indicadores.FallasAsc || 0,
                    Disponibilidad: indicadores.Disponibilidad || 0
                }
            };
        });

        console.log('📊 Datos completos finales:', datosCompletos);

        // Actualizar el dashboard con los datos completos
        actualizarDashboard(datosCompletos);
        
        // Renderizar el gráfico de barras principal
        renderizarGraficos(datosCompletos);
        
        // Llamar a animarKPIs para actualizar los KPIs superiores
        animarKPIs(datosCompletos);
        
    } catch (error) {
        console.error('❌ Error al cargar y procesar datos:', error);
        mostrarEstadoEspera();
    }
}

/**
 * Anima los valores de los KPIs
 * @param {Object} datos - KPIs calculados
 */
function animarKPIs(datos) {
    console.log('🟡 [LOG antes de animarKPIs] Objeto recibido:', datos);
    console.log('🔄 Animando KPIs con datos:', datos);
    
    // Obtener elementos KPI
    const kpiMTTF = document.getElementById('kpi-mttf');
    const kpiMTTR = document.getElementById('kpi-mttr');
    const kpiFallas = document.getElementById('kpi-fallas');
    const kpiDisponibilidad = document.getElementById('kpi-disponibilidad');
    
    // Verificar si tenemos datos válidos
    if (!datos || !datos.procesados || !datos.procesados.global) {
        console.warn('⚠️ No hay datos de KPIs disponibles, mostrando "Sin datos"');
        kpiMTTF.textContent = "Sin datos";
        kpiMTTR.textContent = "Sin datos";
        kpiFallas.textContent = "Sin datos";
        kpiDisponibilidad.textContent = "Sin datos";
        return;
    }

    const indicadoresRed = datos.procesados.global;
    
    // Convertir MTTF y MTTR de segundos a minutos para la visualización
    const mttfSegundos = indicadoresRed.MTTF_red || 0;
    const mttrSegundos = indicadoresRed.MTTR_red || 0;
    
    // Convertir de segundos a minutos
    const mttfMinutos = Math.round(mttfSegundos / 60);
    const mttrMinutos = Math.round(mttrSegundos / 60);
    
    // Valores finales
    const mttfFinal = mttfMinutos;
    const mttrFinal = mttrMinutos;
    const fallasFinal = indicadoresRed.mediosConFallas || 0;
    const disponibilidadFinal = indicadoresRed.Disponibilidad || 0;

    // Si todos los valores son cero, mostrar "Sin datos suficientes"
    if (mttfFinal === 0 && mttrFinal === 0 && fallasFinal === 0 && disponibilidadFinal === 0) {
        console.warn('⚠️ Todos los KPIs son cero, mostrando mensaje alternativo');
        kpiMTTF.textContent = "Sin datos suficientes";
        kpiMTTR.textContent = "Sin datos suficientes";
        kpiFallas.textContent = "0";
        kpiDisponibilidad.textContent = "0.0%";
        return;
    }

    // Duración de la animación en ms
    const duracion = 1500;
    
    // Función para animar un valor
    function animarValor(elemento, valorInicial, valorFinal, formato) {
        elemento.classList.add('animating');
        const incremento = (valorFinal - valorInicial) / (duracion / 16);
        let valorActual = valorInicial;
        
        const animar = () => {
            valorActual += incremento;
            
            if ((incremento > 0 && valorActual >= valorFinal) || 
                (incremento < 0 && valorActual <= valorFinal)) {
                valorActual = valorFinal;
                elemento.textContent = formato(valorActual);
                elemento.classList.remove('animating');
                return;
            }
            
            elemento.textContent = formato(valorActual);
            requestAnimationFrame(animar);
        };
        
        animar();
    }

    // Iniciar animaciones
    animarValor(kpiMTTF, 0, mttfFinal, valor => `${Math.floor(valor)} min`);
    animarValor(kpiMTTR, 0, mttrFinal, valor => `${Math.floor(valor)} min`);
    animarValor(kpiFallas, 0, fallasFinal, valor => `${Math.floor(valor)}`);
    animarValor(kpiDisponibilidad, 0, disponibilidadFinal, valor => `${valor.toFixed(1)}%`);
}

/**
 * Renderiza los gráficos con los datos procesados
 * @param {Object} datos - Datos procesados para los gráficos
 */
function renderizarGraficos(datos) {
    console.log('🎨 Renderizando gráficos...');
    
    const ctx = document.getElementById('graficoConsolidado').getContext('2d');
    
    // Verificar si datos es válido
    if (!datos || !datos.procesados || !datos.procesados.porLinea || Object.keys(datos.procesados.porLinea).length === 0) {
        console.warn('⚠️ No hay datos disponibles para renderizar el gráfico');
        mostrarMensajeNoHayDatos(ctx);
        return;
    }
    
    // Preparar datos para el gráfico de barras
    const lineas = Object.keys(datos.procesados.porLinea);
    const disponibilidades = lineas.map(linea => datos.procesados.porLinea[linea].indicadores.Disponibilidad);
    
    console.log('📊 Datos para el gráfico:', {
        lineas,
        disponibilidades
    });
    
    crearGraficoBarras(ctx, lineas, disponibilidades);
    
    console.log('✅ Gráficos renderizados');
}


/**
 * Muestra un mensaje cuando no hay datos disponibles
 * @param {CanvasRenderingContext2D} ctx - Contexto del canvas
 */
function mostrarMensajeNoHayDatos(ctx) {
    // Limpiar el canvas
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    
    // Configurar estilo de texto
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = 'bold 16px Arial';
    ctx.fillStyle = '#666';
    
    // Dibujar mensaje
    ctx.fillText('No hay datos disponibles para el período seleccionado', 
                ctx.canvas.width / 2, 
                ctx.canvas.height / 2);
    
    // Crear un gráfico vacío para mantener la estructura
    const lineas = ['Línea A', 'Línea B', 'Línea C', 'Línea D', 'Línea E', 'Línea H'];
    const disponibilidades = lineas.map(() => 0); // 0% por defecto cuando no hay datos
    
    // Crear un gráfico de barras con datos vacíos
    crearGraficoBarras(ctx, lineas, disponibilidades, true);
}

/**
 * Crea un gráfico de barras con los datos proporcionados
 * @param {CanvasRenderingContext2D} ctx - Contexto del canvas
 * @param {Array} lineas - Array con los nombres de las líneas
 * @param {Array} disponibilidades - Array con los valores de disponibilidad
 * @param {boolean} sinDatos - Indica si no hay datos disponibles
 */
function crearGraficoBarras(ctx, lineas, disponibilidades, sinDatos = false) {
    // Detectar si estamos en modo oscuro
    const isDarkMode = document.documentElement.getAttribute('data-theme') === 'dark';
    
    // Colores para modo oscuro
    const darkModeColors = {
        title: '#ffffff',      // Blanco para el título
        text: '#cccccc',       // Gris claro para textos
        gridLines: '#444444'   // Gris oscuro para las líneas de la grilla
    };

    // Configuración del gráfico
    const config = {
        type: 'bar',
        data: {
            labels: lineas,
            datasets: [{
                label: 'Disponibilidad por Línea (%)',
                data: disponibilidades,
                backgroundColor: lineas.map(linea => COLORES_LINEAS[linea].rgba),
                borderColor: lineas.map(linea => COLORES_LINEAS[linea].color),
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                title: {
                    display: true,
                    text: 'Disponibilidad por Línea',
                    color: isDarkMode ? darkModeColors.title : '#333333',
                    font: {
                        size: 16,
                        weight: 'bold'
                    }
                },
                legend: {
                    display: false
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    max: 100,
                    grid: {
                        color: isDarkMode ? darkModeColors.gridLines : '#e5e5e5'
                    },
                    ticks: {
                        color: isDarkMode ? darkModeColors.text : '#666666'
                    }
                },
                x: {
                    grid: {
                        color: isDarkMode ? darkModeColors.gridLines : '#e5e5e5'
                    },
                    ticks: {
                        color: isDarkMode ? darkModeColors.text : '#666666'
                    }
                }
            }
        }
    };
    
    // Crear o actualizar el gráfico
    if (graficoConsolidado) {
        try {
            graficoConsolidado.destroy();
        } catch (error) {
            console.error('❌ Error al destruir el gráfico anterior:', error);
        }
    }

    // Crear nuevo gráfico
    graficoConsolidado = new Chart(ctx, config);

    // Agregar listener para cambios de tema
    document.addEventListener('themeChanged', () => {
        const isDarkMode = document.documentElement.getAttribute('data-theme') === 'dark';
        graficoConsolidado.options.plugins.title.color = isDarkMode ? darkModeColors.title : '#333333';
        graficoConsolidado.options.scales.x.grid.color = isDarkMode ? darkModeColors.gridLines : '#e5e5e5';
        graficoConsolidado.options.scales.y.grid.color = isDarkMode ? darkModeColors.gridLines : '#e5e5e5';
        graficoConsolidado.options.scales.x.ticks.color = isDarkMode ? darkModeColors.text : '#666666';
        graficoConsolidado.options.scales.y.ticks.color = isDarkMode ? darkModeColors.text : '#666666';
        graficoConsolidado.update();
    });
}

/**
 * Actualiza el dashboard con los datos filtrados
 * @param {Object} datos - Datos procesados
 */
function actualizarDashboard(datos) {
    console.log('🔄 Actualizando dashboard...');
    
    const dashboard = document.getElementById('dashboard');
    dashboard.innerHTML = ''; // Limpiar dashboard
    
    // Verificar si tenemos datos válidos
    if (!datos || !datos.procesados || !datos.procesados.porLinea) {
        console.warn('⚠️ No hay datos válidos para actualizar el dashboard');
        dashboard.innerHTML = '<div class="error-mensaje">No hay datos disponibles para el período seleccionado</div>';
        return;
    }
    
    // Obtener las líneas de los datos procesados
    const lineas = Object.keys(datos.procesados.porLinea);
    
    if (lineas.length === 0) {
        console.warn('⚠️ No hay líneas con datos para mostrar');
        dashboard.innerHTML = '<div class="error-mensaje">No hay datos disponibles para el período seleccionado</div>';
        return;
    }
    
    // Crear tarjetas para cada línea
    lineas.forEach(linea => {
        const tarjeta = crearTarjetaLinea(linea, datos);
        dashboard.appendChild(tarjeta);
    });
    
    console.log('✅ Dashboard actualizado');
}

/**
 * Crea una tarjeta KPI para una línea específica
 * @param {string} linea - Nombre de la línea
 * @param {Object} datos - Datos procesados
 * @returns {HTMLElement} - Elemento HTML de la tarjeta
 */
function crearTarjetaLinea(linea, datos) {
    console.log(`🎨 Creando tarjeta para ${linea}`);
    
    // Extraer solo el nombre de la línea (A, B, C, etc.)
    const nombreCorto = linea.includes('Línea ') ? linea.split(' ')[1] : linea;
    
    // Obtener indicadores de los datos procesados SOLO UNA VEZ
    const indicadoresLinea = datos.procesados.porLinea[linea]?.indicadores || {};
    console.log(`🔍 Indicadores para ${linea}:`, indicadoresLinea);
    
    const card = document.createElement('div');
    card.className = `linea-card linea-${nombreCorto}`;
    
    const title = document.createElement('div');
    title.className = 'linea-title';
    title.textContent = `Línea ${nombreCorto}`;
    
    const graficosContainer = document.createElement('div');
    graficosContainer.className = 'graficos-container';

    // Crear wrappers para los gráficos
    const wrapperEscaleras = document.createElement('div');
    wrapperEscaleras.className = 'grafico-wrapper';
    const wrapperAscensores = document.createElement('div');
    wrapperAscensores.className = 'grafico-wrapper';

    const canvasEscaleras = document.createElement('canvas');
    canvasEscaleras.className = 'grafico-torta';
    canvasEscaleras.width = 200;
    canvasEscaleras.height = 200;
    
    const canvasAscensores = document.createElement('canvas');
    canvasAscensores.className = 'grafico-torta';
    canvasAscensores.width = 200;
    canvasAscensores.height = 200;

    // Crear elementos para el texto de disponibilidad
    const disponibilidadEscaleras = document.createElement('div');
    disponibilidadEscaleras.className = 'disponibilidad-texto';
    
    const disponibilidadAscensores = document.createElement('div');
    disponibilidadAscensores.className = 'disponibilidad-texto';

    // Crear contenedores para título + gráfico
    const contenedorEscaleras = document.createElement('div');
    contenedorEscaleras.className = 'grafico-contenedor';
    const contenedorAscensores = document.createElement('div');
    contenedorAscensores.className = 'grafico-contenedor';

    // Crear títulos
    const tituloEscaleras = document.createElement('div');
    tituloEscaleras.className = 'grafico-titulo';
    tituloEscaleras.textContent = 'Escaleras';

    const tituloAscensores = document.createElement('div');
    tituloAscensores.className = 'grafico-titulo';
    tituloAscensores.textContent = 'Ascensores';

    // Agregar títulos y canvas a sus contenedores
    contenedorEscaleras.appendChild(tituloEscaleras);
    contenedorEscaleras.appendChild(canvasEscaleras);
    contenedorEscaleras.appendChild(disponibilidadEscaleras);

    contenedorAscensores.appendChild(tituloAscensores);
    contenedorAscensores.appendChild(canvasAscensores);
    contenedorAscensores.appendChild(disponibilidadAscensores);

    // Agregar contenedores a los wrappers
    wrapperEscaleras.appendChild(contenedorEscaleras);
    wrapperAscensores.appendChild(contenedorAscensores);

    graficosContainer.appendChild(wrapperEscaleras);
    graficosContainer.appendChild(wrapperAscensores);

    const statsText = document.createElement('div');
    statsText.className = 'stats-text';
    
    // Crear columna para Escaleras
    const columnEscaleras = document.createElement('div');
    columnEscaleras.className = 'stats-column';
    
    // Crear columna para Ascensores
    const columnAscensores = document.createElement('div');
    columnAscensores.className = 'stats-column';
    
    // Crear indicadores para escaleras
    const indicadoresEscaleras = [
        { nombre: 'Disponibilidad', valor: `${(indicadoresLinea.DisponibilidadEsc || 0).toFixed(1)}%` },
        { nombre: 'MTTF', valor: `${Math.round((indicadoresLinea.MTTFEsc || 0) / 60)} min` },
        { nombre: 'MTTR', valor: `${Math.round((indicadoresLinea.MTTREsc || 0) / 60)} min` },
        { nombre: 'Fallas', valor: indicadoresLinea.FallasEsc || 0 }
    ];

    // Crear indicadores para ascensores
    const indicadoresAscensores = [
        { nombre: 'Disponibilidad', valor: `${(indicadoresLinea.DisponibilidadAsc || 0).toFixed(1)}%` },
        { nombre: 'MTTF', valor: `${Math.round((indicadoresLinea.MTTFAsc || 0) / 60)} min` },
        { nombre: 'MTTR', valor: `${Math.round((indicadoresLinea.MTTRAsc || 0) / 60)} min` },
        { nombre: 'Fallas', valor: indicadoresLinea.FallasAsc || 0 }
    ];

    // Agregar indicadores a las columnas
    indicadoresEscaleras.forEach(indicador => {
        const p = document.createElement('p');
        p.textContent = `${indicador.nombre}: ${indicador.valor}`;
        columnEscaleras.appendChild(p);
    });

    indicadoresAscensores.forEach(indicador => {
        const p = document.createElement('p');
        p.textContent = `${indicador.nombre}: ${indicador.valor}`;
        columnAscensores.appendChild(p);
    });

    statsText.appendChild(columnEscaleras);
    statsText.appendChild(columnAscensores);

    card.appendChild(title);
    card.appendChild(graficosContainer);
    card.appendChild(statsText);

    // Crear gráficos de torta
    crearGraficosTorta(canvasEscaleras, canvasAscensores, linea, datos, disponibilidadEscaleras, disponibilidadAscensores);

    return card;
}

/**
 * Crea los gráficos de torta para escaleras y ascensores
 * @param {HTMLCanvasElement} canvasEscaleras - Canvas para el gráfico de escaleras
 * @param {HTMLCanvasElement} canvasAscensores - Canvas para el gráfico de ascensores
 * @param {string} linea - Nombre de la línea
 * @param {Object} datos - Datos procesados
 * @param {HTMLElement} disponibilidadEscaleras - Elemento para mostrar la disponibilidad de escaleras
 * @param {HTMLElement} disponibilidadAscensores - Elemento para mostrar la disponibilidad de ascensores
 */
function crearGraficosTorta(canvasEscaleras, canvasAscensores, linea, datos, disponibilidadEscaleras, disponibilidadAscensores) {
    // Obtener el color correspondiente a la línea
    const colorInfo = COLORES_LINEAS[linea] || COLORES_LINEAS['Desconocida'];
    
    // Obtener los indicadores de la línea
    const indicadoresLinea = datos.procesados.porLinea[linea]?.indicadores || {};
    
    // Calcular disponibilidades usando la disponibilidad general si no hay específica
    const dispEscaleras = indicadoresLinea.DisponibilidadEsc || indicadoresLinea.Disponibilidad || 0;
    const dispAscensores = indicadoresLinea.DisponibilidadAsc || indicadoresLinea.Disponibilidad || 0;

    // Calcular tiempos para gráficos de torta (basados en disponibilidad)
    const tiemposEscaleras = {
        tiempoOperativo: dispEscaleras,
        tiempoNoOperativo: 100 - dispEscaleras
    };

    const tiemposAscensores = {
        tiempoOperativo: dispAscensores,
        tiempoNoOperativo: 100 - dispAscensores
    };
    
    console.log(`📊 Línea ${linea} - Escaleras:`, tiemposEscaleras);
    console.log(`📊 Línea ${linea} - Ascensores:`, tiemposAscensores);

    // Actualizar texto de disponibilidad
    if (disponibilidadEscaleras) {
        disponibilidadEscaleras.textContent = `Disponibilidad: ${dispEscaleras.toFixed(1)}%`;
        requestAnimationFrame(() => {
            disponibilidadEscaleras.style.opacity = '1';
        });
    }

    if (disponibilidadAscensores) {
        disponibilidadAscensores.textContent = `Disponibilidad: ${dispAscensores.toFixed(1)}%`;
        requestAnimationFrame(() => {
            disponibilidadAscensores.style.opacity = '1';
        });
    }

    // Crear gráficos de torta
    crearGraficoTorta(canvasEscaleras, tiemposEscaleras, colorInfo.color, disponibilidadEscaleras, dispEscaleras);
    crearGraficoTorta(canvasAscensores, tiemposAscensores, colorInfo.color, disponibilidadAscensores, dispAscensores);
}

/**
 * Crea un gráfico de torta
 * @param {HTMLCanvasElement} canvas - Elemento canvas para el gráfico
 * @param {Object} datos - Datos para el gráfico
 * @param {string} colorLinea - Color de la línea
 * @param {HTMLElement} elementoDisponibilidad - Elemento para mostrar la disponibilidad
 * @param {number} disponibilidad - Valor de disponibilidad
 */
function crearGraficoTorta(canvas, datos, colorLinea, elementoDisponibilidad, disponibilidad) {
    // Verificar si los datos son válidos
    if (!datos || typeof datos.tiempoOperativo === 'undefined' || typeof datos.tiempoNoOperativo === 'undefined') {
        console.warn('⚠️ Datos inválidos para el gráfico de torta:', datos);
        return;
    }

    // Calcular disponibilidad basada en tiempo operativo vs no operativo
    const tiempoTotal = datos.tiempoOperativo + datos.tiempoNoOperativo;
    const dispCalculada = tiempoTotal > 0 ? (datos.tiempoOperativo / tiempoTotal) * 100 : 0;
    
    // Usar la disponibilidad proporcionada o la calculada
    const dispFinal = !isNaN(disponibilidad) && disponibilidad !== null ? disponibilidad : dispCalculada;
    const dispFormateada = dispFinal.toFixed(1);

    console.log(`📊 Gráfico Torta - Tiempo Operativo: ${datos.tiempoOperativo}, Tiempo No Operativo: ${datos.tiempoNoOperativo}, Disponibilidad: ${dispFormateada}%`);

    // Actualizar texto de disponibilidad
    if (elementoDisponibilidad) {
        elementoDisponibilidad.textContent = `Disponibilidad: ${dispFormateada}%`;
        requestAnimationFrame(() => {
            elementoDisponibilidad.style.opacity = '1';
        });
    }

    // Crear gráfico de torta
    new Chart(canvas, {
        type: 'pie',
        data: {
            labels: ['Tiempo operativo', 'Tiempo no operativo'],
            datasets: [{
                data: [datos.tiempoOperativo, datos.tiempoNoOperativo],
                backgroundColor: [colorLinea, '#FAFAFA'],
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            aspectRatio: 1,
            plugins: {
                legend: {
                    display: false
                },
                title: {
                    display: false
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const label = context.label || '';
                            const value = context.raw || 0;
                            const total = context.dataset.data.reduce((a, b) => a + b, 0);
                            const percentage = total > 0 ? ((value / total) * 100).toFixed(1) + '%' : '0%';
                            return `${label}: ${percentage}`;
                        }
                    }
                }
            }
        }
    });
}

// Exportar funciones
window.dashboardCharts = {
    inicializarDashboard,
    cargarYProcesarDatos,
    actualizarDashboard,
    renderizarGraficos,
    animarKPIs,
    mostrarEstadoEspera,
    COLORES_LINEAS
}; 