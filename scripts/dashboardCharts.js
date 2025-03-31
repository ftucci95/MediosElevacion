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
    fechaFin.setUTCHours(26, 59, 59, 999); // 27 = 24 + 3 + 0.99

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

    console.log('Fecha inputs:', {
        inicio: inputFechaInicio.value,
        fin: inputFechaFin.value,
        inicioUTC: fechaInicio.toISOString(),
        finUTC: fechaFin.toISOString()
    });

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
    
    // Obtener fechas seleccionadas
    const fechaInicio = document.getElementById('fechaInicio').value;
    const fechaFin = document.getElementById('fechaFin').value;
    
    // Verificar si se seleccionaron fechas
    if (!fechaInicio || !fechaFin) {
        console.warn('⚠️ No se seleccionaron fechas, se usará la fecha actual');
        
        // Usar la fecha actual por defecto
        const hoy = new Date();
        const fechaFormateada = hoy.toISOString().split('T')[0];
        
        // Actualizar los inputs de fecha
        document.getElementById('fechaInicio').value = fechaFormateada;
        document.getElementById('fechaFin').value = fechaFormateada;
    }
    
    // Preparar objeto de fechas
    let fechaInicioObj = new Date(document.getElementById('fechaInicio').value + 'T00:00:00');
    let fechaFinObj = new Date(document.getElementById('fechaFin').value + 'T23:59:59.999');
    
    // Verificar si la fecha fin es futura
    const ahora = new Date();
    if (fechaFinObj > ahora) {
        console.warn(`⚠️ Fecha fin (${fechaFinObj.toISOString()}) es futura, limitando a la fecha actual (${ahora.toISOString()})`);
        fechaFinObj = ahora;
        
        // Actualizar el input de fecha fin con la fecha actual
        document.getElementById('fechaFin').value = ahora.toISOString().split('T')[0];
    }
    
    // Verificar si la fecha inicio es futura
    if (fechaInicioObj > ahora) {
        console.warn(`⚠️ Fecha inicio (${fechaInicioObj.toISOString()}) es futura, limitando a la fecha actual (${ahora.toISOString()})`);
        fechaInicioObj = new Date(ahora);
        fechaInicioObj.setHours(0, 0, 0, 0); // Inicio del día actual
        
        // Actualizar el input de fecha inicio con la fecha actual
        document.getElementById('fechaInicio').value = fechaInicioObj.toISOString().split('T')[0];
    }
    
    const fechas = {
        inicio: document.getElementById('fechaInicio').value,
        fin: document.getElementById('fechaFin').value,
        inicioUTC: fechaInicioObj.toISOString(),
        finUTC: fechaFinObj.toISOString()
    };
    
    console.log('📅 Fechas ajustadas para análisis:', fechas);
    console.log(`⏱️ Duración del período: ${((fechaFinObj - fechaInicioObj) / (1000 * 60 * 60)).toFixed(2)} horas`);
    
    try {
        // Cargar datos del historial
        const datos = await dbInterface.cargarDatosHistorial(fechas);
        
        // Procesar datos
        const datosProcesados = dataCalculator.procesarDatos(datos);
        
        // Verificar si hay suficientes datos para la Línea H
        if (datosProcesados && datosProcesados.procesados && 
            datosProcesados.procesados.porLinea && 
            datosProcesados.procesados.porLinea['Línea H']) {
            
            const lineaH = datosProcesados.procesados.porLinea['Línea H'];
            const mediosConDatos = lineaH.medios.escaleras.length + lineaH.medios.ascensores.length;
            
            if (mediosConDatos < 10 && lineaH.mediosTotales > 20) {
                console.warn(`⚠️ ALERTA: Solo hay datos para ${mediosConDatos} de ${lineaH.mediosTotales} medios de la Línea H`);
                
                // Mostrar alerta en la interfaz
                const alertaDiv = document.createElement('div');
                alertaDiv.className = 'alerta-datos';
                alertaDiv.innerHTML = `
                    <strong>⚠️ Alerta:</strong> Solo hay datos para ${mediosConDatos} de ${lineaH.mediosTotales} 
                    medios de la Línea H (${((mediosConDatos / lineaH.mediosTotales) * 100).toFixed(1)}%).
                `;
                
                // Insertar la alerta al principio del contenedor
                const container = document.querySelector('.container');
                container.insertBefore(alertaDiv, container.firstChild);
                
                // Estilo para la alerta
                const style = document.createElement('style');
                style.textContent = `
                    .alerta-datos {
                        background-color: #fff3cd;
                        color: #856404;
                        padding: 15px;
                        margin-bottom: 20px;
                        border: 1px solid #ffeeba;
                        border-radius: 8px;
                        text-align: center;
                    }
                `;
                document.head.appendChild(style);
            }
        }
        
        // Actualizar el dashboard
        actualizarDashboard(datosProcesados);
        
        // Procesar datos para gráficos
        const datosGraficos = dataCalculator.procesarDatosGraficos(datosProcesados);
        
        // Renderizar gráficos
        renderizarGraficos(datosGraficos);
        
        // Animar los KPIs con los indicadores globales
        if (datosProcesados && datosProcesados.procesados && datosProcesados.procesados.global) {
            console.log('📊 Actualizando KPIs globales con:', datosProcesados.procesados.global);
            animarKPIs(datosProcesados.procesados.global);
        } else {
            console.warn('⚠️ No hay indicadores globales disponibles para los KPIs');
            animarKPIs(null); // Usar valores por defecto
        }
        
        console.log('✅ Datos procesados y dashboard actualizado');
        
        return datosProcesados;
    } catch (error) {
        console.error('❌ Error al cargar y procesar datos:', error);
        
        // Mostrar mensaje de error en la interfaz
        const errorDiv = document.createElement('div');
        errorDiv.className = 'error-mensaje';
        errorDiv.innerHTML = `
            <strong>❌ Error:</strong> No se pudieron cargar los datos.
            <br>
            ${error.message}
        `;
        
        // Insertar el mensaje de error al principio del contenedor
        const container = document.querySelector('.container');
        container.insertBefore(errorDiv, container.firstChild);
        
        // Estilo para el mensaje de error
        const style = document.createElement('style');
        style.textContent = `
            .error-mensaje {
                background-color: #f8d7da;
                color: #721c24;
                padding: 15px;
                margin-bottom: 20px;
                border: 1px solid #f5c6cb;
                border-radius: 8px;
                text-align: center;
            }
        `;
        document.head.appendChild(style);
        
        return null;
    }
}

/**
 * Anima los valores de los KPIs
 * @param {Object} kpis - KPIs calculados
 */
function animarKPIs(kpis) {
    console.log('🔄 Animando KPIs con datos:', kpis);
    
    // Obtener elementos KPI
    const kpiMTTF = document.getElementById('kpi-mttf');
    const kpiMTTR = document.getElementById('kpi-mttr');
    const kpiFallas = document.getElementById('kpi-fallas');
    const kpiDisponibilidad = document.getElementById('kpi-disponibilidad');
    
    // Valores iniciales
    const mttfInicial = 0;
    const mttrInicial = 0;
    const fallasInicial = 0;
    const disponibilidadInicial = 0;
    
    // Verificar si tenemos datos válidos
    if (!kpis) {
        console.warn('⚠️ No hay datos de KPIs disponibles, mostrando "Sin datos"');
        kpiMTTF.textContent = "Sin datos";
        kpiMTTR.textContent = "Sin datos";
        kpiFallas.textContent = "Sin datos";
        kpiDisponibilidad.textContent = "Sin datos";
        return;
    }
    
    // Convertir MTTF y MTTR de segundos a minutos para la visualización
    const mttfSegundos = kpis.mttf || 0;
    const mttrSegundos = kpis.mttr || 0;
    
    // Convertir de segundos a minutos
    const mttfMinutos = Math.round(mttfSegundos / 60);
    const mttrMinutos = Math.round(mttrSegundos / 60);
    
    console.log(`📊 MTTF: ${mttfSegundos} segundos = ${mttfMinutos} minutos`);
    console.log(`📊 MTTR: ${mttrSegundos} segundos = ${mttrMinutos} minutos`);
    
    // Valores finales (obtenidos de los KPIs calculados)
    const mttfFinal = mttfMinutos;
    const mttrFinal = mttrMinutos;
    const fallasFinal = kpis.cantidadFallas !== undefined ? kpis.cantidadFallas : 0;
    const disponibilidadFinal = kpis.disponibilidadPonderada !== undefined ? 
        parseFloat(kpis.disponibilidadPonderada.toFixed(1)) : 0;
    
    console.log(`📊 KPIs finales para animación: MTTF=${mttfFinal}min, MTTR=${mttrFinal}min, Fallas=${fallasFinal}, Disponibilidad=${disponibilidadFinal}%`);
    
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
    animarValor(kpiMTTF, mttfInicial, mttfFinal, valor => `${Math.floor(valor)} min`);
    animarValor(kpiMTTR, mttrInicial, mttrFinal, valor => `${Math.floor(valor)} min`);
    animarValor(kpiFallas, fallasInicial, fallasFinal, valor => `${Math.floor(valor)}`);
    animarValor(kpiDisponibilidad, disponibilidadInicial, disponibilidadFinal, valor => `${valor.toFixed(1)}%`);
}

/**
 * Renderiza los gráficos con los datos procesados
 * @param {Object} datos - Datos procesados para los gráficos
 */
function renderizarGraficos(datos) {
    console.log('🎨 Renderizando gráficos...');
    
    const ctx = document.getElementById('graficoConsolidado').getContext('2d');
    
    // Verificar si datos es válido
    if (!datos || !datos.datosPorLinea) {
        console.warn('⚠️ No hay datos disponibles para renderizar el gráfico');
        
        // Crear un gráfico vacío con mensaje
        mostrarMensajeNoHayDatos(ctx);
        return;
    }
    
    // Preparar datos para el gráfico de barras
    const lineas = Object.keys(datos.datosPorLinea);
    const disponibilidades = [];
    
    // Calcular la disponibilidad para cada línea
    lineas.forEach(linea => {
        const datosLinea = datos.datosPorLinea[linea];
        disponibilidades.push(parseFloat(datosLinea.disponibilidad));
    });
    
    // Analizar específicamente la disponibilidad de la Línea H
    analizarDisponibilidadLineaH(datos);
    
    crearGraficoBarras(ctx, lineas, disponibilidades);
    
    console.log('✅ Gráficos renderizados');
}

/**
 * Analiza específicamente la disponibilidad de la Línea H
 * @param {Object} datos - Datos procesados para los gráficos
 */
function analizarDisponibilidadLineaH(datos) {
    if (!datos || !datos.datosPorLinea || !datos.datosPorLinea['Línea H']) {
        console.warn('⚠️ No hay datos disponibles para analizar la Línea H');
        return;
    }
    
    const lineaH = datos.datosPorLinea['Línea H'];
    const disponibilidad = parseFloat(lineaH.disponibilidad);
    
    console.log('🔍 ANÁLISIS DE DISPONIBILIDAD DE LÍNEA H:');
    console.log(`- Disponibilidad en gráfico: ${disponibilidad.toFixed(1)}%`);
    
    // Verificar si la disponibilidad es baja
    if (disponibilidad < 50) {
        console.warn('⚠️ La disponibilidad de la Línea H es muy baja');
        
        // Verificar si hay pocos datos
        if (lineaH.operativos.escaleras + lineaH.operativos.ascensores + 
            lineaH.noOperativos.escaleras + lineaH.noOperativos.ascensores < 10) {
            console.warn('⚠️ Hay muy pocos medios con datos para la Línea H');
        }
        
        // Verificar si hay muchos medios no operativos
        const totalMedios = lineaH.operativos.escaleras + lineaH.operativos.ascensores + 
                           lineaH.noOperativos.escaleras + lineaH.noOperativos.ascensores;
        
        const noOperativos = lineaH.noOperativos.escaleras + lineaH.noOperativos.ascensores;
        
        if (totalMedios > 0 && (noOperativos / totalMedios) > 0.7) {
            console.warn(`⚠️ La mayoría de los medios de la Línea H están no operativos (${noOperativos} de ${totalMedios})`);
        }
    }
    
    // Comparar con la disponibilidad calculada directamente
    if (datos.global && datos.global.disponibilidadPonderada) {
        const disponibilidadGlobal = datos.global.disponibilidadPonderada;
        console.log(`- Disponibilidad global ponderada: ${disponibilidadGlobal.toFixed(1)}%`);
        
        if (Math.abs(disponibilidad - disponibilidadGlobal) > 20) {
            console.warn(`⚠️ La disponibilidad de la Línea H (${disponibilidad.toFixed(1)}%) difiere significativamente de la disponibilidad global (${disponibilidadGlobal.toFixed(1)}%)`);
        }
    }
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
    const lineas = Object.keys(dbInterface.MEDIOS_POR_LINEA);
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
    
    // Crear tarjetas para cada línea
    Object.keys(dbInterface.MEDIOS_POR_LINEA).forEach(linea => {
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
    
    // Obtener indicadores para escaleras y ascensores
    const indicadoresEscaleras = dataCalculator.obtenerIndicadoresPorTipo(linea, 'Escalera', datos);
    const indicadoresAscensores = dataCalculator.obtenerIndicadoresPorTipo(linea, 'Ascensor', datos);
    
    // Agregar indicadores a las columnas
    indicadoresEscaleras.forEach(indicador => {
        const p = document.createElement('p');
        p.textContent = `${indicador.nombre}: ${indicador.valor}`;
        if (indicador.tooltip) {
            p.title = indicador.tooltip;
        }
        columnEscaleras.appendChild(p);
    });

    indicadoresAscensores.forEach(indicador => {
        const p = document.createElement('p');
        p.textContent = `${indicador.nombre}: ${indicador.valor}`;
        if (indicador.tooltip) {
            p.title = indicador.tooltip;
        }
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
    const nombreCorto = linea.includes('Línea ') ? linea.split(' ')[1] : linea;
    const colorInfo = COLORES_LINEAS[linea] || COLORES_LINEAS['Desconocida'];
    
    // Valores por defecto
    let tiempoOperativoEscaleras = 0;
    let tiempoNoOperativoEscaleras = 0;
    let tiempoOperativoAscensores = 0;
    let tiempoNoOperativoAscensores = 0;
    let dispEscaleras = 100;
    let dispAscensores = 100;
    
    // Si hay datos, obtenerlos
    if (datos && datos.procesados && datos.procesados.porLinea && datos.procesados.porLinea[linea]) {
        const lineaData = datos.procesados.porLinea[linea];
        
        // Calcular tiempo operativo y no operativo para escaleras
        if (lineaData.medios.escaleras.length > 0) {
            tiempoOperativoEscaleras = lineaData.medios.escaleras.reduce(
                (total, medio) => total + medio.indicadores.tiempoOperativo, 0
            );
            
            tiempoNoOperativoEscaleras = lineaData.medios.escaleras.reduce(
                (total, medio) => total + medio.indicadores.tiempoNoOperativo, 0
            );
        }
        
        // Calcular tiempo operativo y no operativo para ascensores
        if (lineaData.medios.ascensores.length > 0) {
            tiempoOperativoAscensores = lineaData.medios.ascensores.reduce(
                (total, medio) => total + medio.indicadores.tiempoOperativo, 0
            );
            
            tiempoNoOperativoAscensores = lineaData.medios.ascensores.reduce(
                (total, medio) => total + medio.indicadores.tiempoNoOperativo, 0
            );
        }
        
        // Disponibilidad
        dispEscaleras = lineaData.indicadores.disponibilidadEscaleras;
        dispAscensores = lineaData.indicadores.disponibilidadAscensores;
    }
    
    // Si no hay datos de tiempo, usar valores por defecto
    if (tiempoOperativoEscaleras === 0 && tiempoNoOperativoEscaleras === 0) {
        // Valores por defecto para visualización
        tiempoOperativoEscaleras = dbInterface.MEDIOS_POR_LINEA[linea] * 0.6 * 1000; // 1000 minutos por defecto
        tiempoNoOperativoEscaleras = dbInterface.MEDIOS_POR_LINEA[linea] * 0.4 * 1000;
    }
    
    if (tiempoOperativoAscensores === 0 && tiempoNoOperativoAscensores === 0) {
        // Valores por defecto para visualización
        tiempoOperativoAscensores = dbInterface.MEDIOS_POR_LINEA[linea] * 0.6 * 1000;
        tiempoNoOperativoAscensores = dbInterface.MEDIOS_POR_LINEA[linea] * 0.4 * 1000;
    }
    
    // Crear gráficos de torta basados en tiempo operativo vs no operativo
    crearGraficoTorta(canvasEscaleras, {
        tiempoOperativo: tiempoOperativoEscaleras,
        tiempoNoOperativo: tiempoNoOperativoEscaleras
    }, colorInfo.color, disponibilidadEscaleras, dispEscaleras);
    
    crearGraficoTorta(canvasAscensores, {
        tiempoOperativo: tiempoOperativoAscensores,
        tiempoNoOperativo: tiempoNoOperativoAscensores
    }, colorInfo.color, disponibilidadAscensores, dispAscensores);
    
    // Agregar logging específico para Línea H
    if (linea === 'Línea H') {
        console.log(`📊 Gráficos Línea H - Escaleras: Tiempo operativo ${tiempoOperativoEscaleras.toFixed(1)} min, Tiempo no operativo ${tiempoNoOperativoEscaleras.toFixed(1)} min, Disponibilidad ${dispEscaleras.toFixed(1)}%`);
        console.log(`📊 Gráficos Línea H - Ascensores: Tiempo operativo ${tiempoOperativoAscensores.toFixed(1)} min, Tiempo no operativo ${tiempoNoOperativoAscensores.toFixed(1)} min, Disponibilidad ${dispAscensores.toFixed(1)}%`);
    }
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
    // Calcular disponibilidad basada en tiempo operativo vs no operativo
    const tiempoTotal = datos.tiempoOperativo + datos.tiempoNoOperativo;
    const dispCalculada = tiempoTotal > 0 ? (datos.tiempoOperativo / tiempoTotal) * 100 : 100;
    
    // Usar la disponibilidad calculada o la proporcionada
    const dispFinal = isNaN(disponibilidad) ? dispCalculada : disponibilidad;
    const dispFormateada = dispFinal.toFixed(1);

    // Actualizar texto de disponibilidad
    elementoDisponibilidad.textContent = `Disponibilidad: ${dispFormateada}%`;
    requestAnimationFrame(() => {
        elementoDisponibilidad.style.opacity = '1';
    });

    // Crear gráfico de torta basado en tiempo operativo vs no operativo
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
                            const tiempo = dataCalculator.formatearTiempo(value);
                            return `${label}: ${tiempo} (${percentage})`;
                        }
                    }
                }
            },
            layout: {
                padding: {
                    top: 5,
                    bottom: 5,
                    left: 5,
                    right: 5
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
    analizarDisponibilidadLineaH,
    mostrarEstadoEspera,
    COLORES_LINEAS
}; 