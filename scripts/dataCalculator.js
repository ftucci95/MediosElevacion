/**
 * Módulo para el cálculo de indicadores a partir de los datos del historial
 */

/**
 * Procesa los datos del historial para calcular todos los indicadores
 * @param {Array} registrosHistorial - Registros del historial de cambios
 * @param {Array} registrosPrevios - Registros previos al período de análisis
 * @param {Object} metadatos - Metadatos del período de análisis
 * @returns {Object} - Datos procesados
 */
async function procesarDatosHistorial(registrosHistorial, registrosPrevios, metadatos) {
    console.log('🔄 Procesando datos del historial...');
    
    // Verificar parámetros
    if (!registrosHistorial || !Array.isArray(registrosHistorial)) {
        console.error('❌ registrosHistorial no es un array válido');
        return null;
    }
    
    if (!registrosPrevios || !Array.isArray(registrosPrevios)) {
        console.error('❌ registrosPrevios no es un array válido');
        return null;
    }
    
    if (!metadatos || !metadatos.fechaInicio || !metadatos.fechaFin) {
        console.error('❌ metadatos no contiene fechaInicio o fechaFin');
        return null;
    }
    
    console.log(`📊 Registros del historial: ${registrosHistorial.length}`);
    console.log(`📊 Registros previos: ${registrosPrevios.length}`);
    
    // Combinar registros del historial con registros previos
    const registrosCombinados = [...registrosHistorial, ...registrosPrevios];
    console.log(`📊 Registros combinados: ${registrosCombinados.length}`);
    
    // Procesar datos por medio
    const datosPorMedio = procesarDatosPorMedio(registrosCombinados, metadatos, registrosPrevios);
    
    // Procesar datos por línea
    const datosPorLinea = procesarDatosPorLinea(datosPorMedio, metadatos);
    
    // Generar resumen específico para Línea H
    const resumenLineaH = generarResumenLineaH(datosPorMedio, datosPorLinea);
    
    // Crear estructura de datos procesados
    const datos = {
        metadatos: metadatos,
        porMedio: datosPorMedio,
        porLinea: datosPorLinea,
        resumenLineaH: resumenLineaH
    };
    
    console.log('✅ Datos procesados correctamente');
    return datos;
}

/**
 * Procesa los datos por medio de elevación
 * @param {Array} registros - Registros combinados del historial
 * @param {Object} metadatos - Metadatos del período de análisis
 * @param {Array} registrosPrevios - Registros previos originales (para verificación)
 * @returns {Object} - Datos procesados por medio
 */
function procesarDatosPorMedio(registros, metadatos, registrosPrevios = []) {
    console.log('🔄 Procesando datos por medio...');
    
    const datosPorMedio = {};
    const fechaInicio = metadatos.fechaInicio;
    const fechaFin = metadatos.fechaFin;
    
    // Contadores para análisis
    const contadoresPorLinea = {
        'Línea A': 0,
        'Línea B': 0,
        'Línea C': 0,
        'Línea D': 0,
        'Línea E': 0,
        'Línea H': 0,
        'Desconocida': 0
    };
    
    // Contadores para medios únicos por línea
    const mediosUnicosPorLinea = {
        'Línea A': new Set(),
        'Línea B': new Set(),
        'Línea C': new Set(),
        'Línea D': new Set(),
        'Línea E': new Set(),
        'Línea H': new Set(),
        'Desconocida': new Set()
    };
    
    // Función para generar un ID compuesto único para cada medio
    const generarIdCompuesto = (registro) => {
        if (!registro.id) return null;
        
        const linea = registro.linea || 'Desconocida';
        const estacion = registro.estacion || 'Desconocida';
        return `${linea}-${estacion}-${registro.id}`;
    };
    
    // Verificar la cantidad de medios únicos en los registros combinados usando ID compuesto
    const mediosUnicosEnRegistros = new Set(
        registros
            .map(r => generarIdCompuesto(r))
            .filter(id => id)
    );
    
    console.log(`🔍 Medios únicos en registros combinados (usando ID compuesto): ${mediosUnicosEnRegistros.size}`);
    
    // Verificar la cantidad de medios únicos en los registros previos usando ID compuesto
    const mediosUnicosEnPrevios = new Set(
        registrosPrevios
            .map(r => generarIdCompuesto(r))
            .filter(id => id)
    );
    
    console.log(`🔍 Medios únicos en registros previos (usando ID compuesto): ${mediosUnicosEnPrevios.size}`);
    
    // Crear un mapa para agrupar registros por medio usando ID compuesto
    const registrosPorMedio = new Map();
    
    // Agrupar todos los registros por medio usando ID compuesto
    registros.forEach(registro => {
        const idCompuesto = generarIdCompuesto(registro);
        if (!idCompuesto) {
            console.warn('⚠️ Registro sin ID compuesto válido:', registro);
            return;
        }
        
        if (!registrosPorMedio.has(idCompuesto)) {
            registrosPorMedio.set(idCompuesto, []);
        }
        
        // Verificar si el registro ya existe para evitar duplicados
        const registrosExistentes = registrosPorMedio.get(idCompuesto);
        const timestampActual = registro.timestamp;
        const yaExiste = registrosExistentes.some(r => r.timestamp === timestampActual);
        
        if (!yaExiste) {
            registrosPorMedio.get(idCompuesto).push(registro);
        }
    });
    
    console.log(`🔍 Se encontraron ${registrosPorMedio.size} medios únicos con registros (usando ID compuesto)`);
    
    // Verificar si hay medios en registros previos que no están en el mapa
    let mediosFaltantes = 0;
    for (const registro of registrosPrevios) {
        const idCompuesto = generarIdCompuesto(registro);
        if (!idCompuesto) continue;
        
        if (!registrosPorMedio.has(idCompuesto)) {
            mediosFaltantes++;
            // Agregar el medio faltante al mapa
            registrosPorMedio.set(idCompuesto, [registro]);
            console.log(`⚠️ Medio con registro previo no estaba en el mapa: ${idCompuesto}`);
        }
    }
    
    if (mediosFaltantes > 0) {
        console.warn(`⚠️ Se encontraron ${mediosFaltantes} medios con registros previos que no estaban en el mapa y fueron agregados`);
        console.log(`🔍 Después de agregar medios faltantes: ${registrosPorMedio.size} medios únicos con registros`);
    }
    
    // Procesar cada medio
    for (const [idCompuesto, registrosMedio] of registrosPorMedio.entries()) {
        // Tomar el primer registro para obtener información del medio
        const primerRegistro = registrosMedio[0];
        const linea = primerRegistro.linea || 'Desconocida';
        const estacion = primerRegistro.estacion || 'Desconocida';
        const medioId = primerRegistro.id;
        
        // Incrementar contador de registros por línea
        if (contadoresPorLinea.hasOwnProperty(linea)) {
            contadoresPorLinea[linea] += registrosMedio.length;
        } else {
            contadoresPorLinea['Desconocida'] += registrosMedio.length;
        }
        
        // Agregar medio a conjunto de medios únicos por línea
        if (mediosUnicosPorLinea.hasOwnProperty(linea)) {
            mediosUnicosPorLinea[linea].add(idCompuesto);
        } else {
            mediosUnicosPorLinea['Desconocida'].add(idCompuesto);
        }
        
        // Crear estructura de datos para el medio
        datosPorMedio[idCompuesto] = {
            id: medioId,
            idCompuesto: idCompuesto,
            linea: linea,
            tipo: identificarTipoMedio(medioId),
            estacion: estacion,
            registros: registrosMedio,
            periodos: {
                operativos: [],
                fallas: []
            },
            indicadores: {
                tiempoOperativo: 0,
                tiempoNoOperativo: 0,
                disponibilidad: 0,
                cantidadFallas: 0,
                mttf: 0,
                mttr: 0
            }
        };
    }
    
    // Análisis detallado de registros por línea
    console.log('📊 ANÁLISIS DE REGISTROS PROCESADOS POR LÍNEA:');
    console.log('=======================================================');
    
    let totalRegistrosContados = 0;
    for (const [linea, cantidad] of Object.entries(contadoresPorLinea)) {
        const porcentaje = (cantidad / registros.length * 100).toFixed(2);
        const mediosTotales = dbInterface.MEDIOS_POR_LINEA[linea] || 0;
        const mediosUnicos = mediosUnicosPorLinea[linea].size;
        const cobertura = mediosTotales > 0 ? (mediosUnicos / mediosTotales * 100).toFixed(2) : 'N/A';
        
        console.log(`   - ${linea}: ${cantidad} registros (${porcentaje}% del total)`);
        console.log(`     * Medios únicos: ${mediosUnicos} de ${mediosTotales} configurados`);
        console.log(`     * Cobertura: ${cobertura}% de los medios tienen registros`);
        
        totalRegistrosContados += cantidad;
    }
    
    // Verificar si hay discrepancia en el conteo
    if (totalRegistrosContados !== registros.length) {
        console.warn(`⚠️ Discrepancia en el conteo: ${totalRegistrosContados} vs ${registros.length}`);
    }
    
    // Análisis específico para Línea H
    console.log(`📊 ANÁLISIS ESPECÍFICO PARA LÍNEA H EN PROCESAMIENTO:`);
    const mediosLineaH = Object.values(datosPorMedio).filter(medio => medio.linea === 'Línea H');
    console.log(`   - Medios de Línea H con datos: ${mediosLineaH.length}`);
    
    if (mediosLineaH.length > 0) {
        // Agrupar por estación
        const estacionesLineaH = {};
        mediosLineaH.forEach(medio => {
            if (!medio.estacion) return;
            if (!estacionesLineaH[medio.estacion]) estacionesLineaH[medio.estacion] = 0;
            estacionesLineaH[medio.estacion]++;
        });
        
        console.log(`   - Distribución por estaciones:`);
        Object.entries(estacionesLineaH).forEach(([estacion, cantidad]) => {
            console.log(`     * ${estacion}: ${cantidad} medios`);
        });
        
        // Verificar cantidad de registros por medio
        const registrosPorMedio = mediosLineaH.map(medio => ({
            id: medio.id,
            estacion: medio.estacion,
            registros: medio.registros.length
        }));
        
        console.log(`   - Registros por medio (primeros 5):`);
        registrosPorMedio.slice(0, 5).forEach(item => {
            console.log(`     * ${item.id} (${item.estacion}): ${item.registros} registros`);
        });
        
        // Verificar si hay medios con pocos registros
        const mediosPocoRegistros = registrosPorMedio.filter(item => item.registros < 2);
        console.log(`   - Medios con menos de 2 registros: ${mediosPocoRegistros.length}`);
        if (mediosPocoRegistros.length > 0) {
            console.log(`     * Ejemplos: ${mediosPocoRegistros.slice(0, 3).map(item => item.id).join(', ')}${mediosPocoRegistros.length > 3 ? '...' : ''}`);
        }
    }
    
    // Para cada medio, procesar sus registros y calcular períodos e indicadores
    Object.values(datosPorMedio).forEach(medio => {
        // Ordenar registros por timestamp
        medio.registros.sort((a, b) => {
            const tsA = dbInterface.normalizarTimestamp(a.timestamp).getTime();
            const tsB = dbInterface.normalizarTimestamp(b.timestamp).getTime();
            return tsA - tsB;
        });
        
        // Calcular períodos operativos y de falla
        calcularPeriodos(medio, fechaInicio, fechaFin);
        
        // Calcular indicadores
        calcularIndicadoresPorMedio(medio, metadatos);
    });
    
    // Análisis final después de calcular períodos e indicadores
    console.log(`📊 ANÁLISIS FINAL DE MEDIOS DE LÍNEA H DESPUÉS DE CALCULAR PERÍODOS:`);
    const mediosLineaHFinal = Object.values(datosPorMedio).filter(medio => medio.linea === 'Línea H');
    console.log(`   - Medios de Línea H con períodos calculados: ${mediosLineaHFinal.length}`);
    
    if (mediosLineaHFinal.length > 0) {
        // Verificar períodos operativos y de falla
        const periodosPorMedio = mediosLineaHFinal.map(medio => ({
            id: medio.id,
            estacion: medio.estacion,
            periodosOperativos: medio.periodos.operativos.length,
            periodosFallas: medio.periodos.fallas.length,
            disponibilidad: medio.indicadores.disponibilidad.toFixed(1) + '%'
        }));
        
        console.log(`   - Períodos por medio (primeros 5):`);
        periodosPorMedio.slice(0, 5).forEach(item => {
            console.log(`     * ${item.id} (${item.estacion}): ${item.periodosOperativos} períodos operativos, ${item.periodosFallas} períodos de falla, ${item.disponibilidad} disponibilidad`);
        });
        
        // Verificar si hay medios sin períodos
        const mediosSinPeriodos = periodosPorMedio.filter(item => item.periodosOperativos === 0 && item.periodosFallas === 0);
        console.log(`   - Medios sin períodos calculados: ${mediosSinPeriodos.length}`);
        if (mediosSinPeriodos.length > 0) {
            console.log(`     * Ejemplos: ${mediosSinPeriodos.slice(0, 3).map(item => item.id).join(', ')}${mediosSinPeriodos.length > 3 ? '...' : ''}`);
        }
    }
    
    console.log(`✅ Procesados ${Object.keys(datosPorMedio).length} medios`);
    return datosPorMedio;
}

/**
 * Calcula los períodos operativos y de falla para un medio
 * @param {Object} medio - Datos del medio
 * @param {Date} fechaInicio - Fecha de inicio del período de análisis
 * @param {Date} fechaFin - Fecha de fin del período de análisis
 */
function calcularPeriodos(medio, fechaInicio, fechaFin) {
    // Verificar si hay registros para procesar
    if (!medio.registros || medio.registros.length === 0) {
        console.warn(`⚠️ No hay registros para el medio ${medio.idCompuesto}`);
        return;
    }
    
    console.log(`🔄 Calculando períodos para medio ${medio.idCompuesto} (${medio.registros.length} registros)`);
    
    // Verificar que las fechas de inicio y fin sean válidas
    if (!(fechaInicio instanceof Date) || !(fechaFin instanceof Date) || isNaN(fechaInicio.getTime()) || isNaN(fechaFin.getTime())) {
        console.error(`❌ Fechas inválidas para el medio ${medio.idCompuesto}: inicio=${fechaInicio}, fin=${fechaFin}`);
        return;
    }
    
    // Verificar que la fecha de inicio sea anterior a la fecha de fin
    if (fechaInicio >= fechaFin) {
        console.error(`❌ La fecha de inicio (${fechaInicio.toISOString()}) debe ser anterior a la fecha de fin (${fechaFin.toISOString()})`);
        return;
    }
    
    // Calcular la duración total del período en segundos
    const duracionTotalSegundos = (fechaFin.getTime() - fechaInicio.getTime()) / 1000;
    console.log(`📊 Duración total del período: ${duracionTotalSegundos} segundos (${(duracionTotalSegundos/3600).toFixed(2)} horas)`);
    
    // Ordenar registros por timestamp
    const registrosOrdenados = [...medio.registros].sort((a, b) => {
        const tsA = dbInterface.normalizarTimestamp(a.timestamp).getTime();
        const tsB = dbInterface.normalizarTimestamp(b.timestamp).getTime();
        return tsA - tsB;
    });
    
    // Filtrar registros dentro del período de análisis
    const registrosDentroDelPeriodo = registrosOrdenados.filter(registro => {
        const timestamp = dbInterface.normalizarTimestamp(registro.timestamp);
        return timestamp >= fechaInicio && timestamp <= fechaFin;
    });
    
    // Filtrar registros previos al período de análisis
    const registrosPrevios = registrosOrdenados.filter(registro => {
        const timestamp = dbInterface.normalizarTimestamp(registro.timestamp);
        return timestamp < fechaInicio;
    });
    
    console.log(`   - Registros dentro del período: ${registrosDentroDelPeriodo.length}`);
    console.log(`   - Registros previos: ${registrosPrevios.length}`);
    
    // Determinar el estado inicial basado en registros previos
    let estadoInicial = null;
    if (registrosPrevios.length > 0) {
        // Tomar el último registro previo
        const ultimoRegistroPrevio = registrosPrevios[registrosPrevios.length - 1];
        estadoInicial = ultimoRegistroPrevio.estado;
        console.log(`   - Estado inicial basado en registro previo: ${estadoInicial}`);
    } else if (registrosDentroDelPeriodo.length > 0) {
        // Si no hay registros previos, usar el primer registro dentro del período
        estadoInicial = registrosDentroDelPeriodo[0].estado;
        console.log(`   - Estado inicial basado en primer registro del período: ${estadoInicial}`);
    } else {
        console.warn(`⚠️ No se puede determinar el estado inicial para el medio ${medio.idCompuesto}`);
        return;
    }
    
    // Crear períodos
    let periodos = [];
    let estadoActual = estadoInicial;
    let inicioEstadoActual = fechaInicio;
    
    // Agregar el período inicial desde el inicio del análisis
    periodos.push({
        inicio: fechaInicio,
        estado: estadoActual
    });
    
    // Procesar cambios de estado dentro del período
    for (const registro of registrosDentroDelPeriodo) {
        const timestamp = dbInterface.normalizarTimestamp(registro.timestamp);
        const nuevoEstado = registro.estado;
        
        // Si hay un cambio de estado, cerrar el período actual y abrir uno nuevo
        if (nuevoEstado !== estadoActual) {
            // Cerrar período actual
            periodos[periodos.length - 1].fin = timestamp;
            const duracionSegundos = (timestamp.getTime() - periodos[periodos.length - 1].inicio.getTime()) / 1000;
            periodos[periodos.length - 1].duracion = duracionSegundos;
            
            console.log(`   - Cambio de estado: ${estadoActual} -> ${nuevoEstado} en ${timestamp.toISOString()}`);
            console.log(`   - Duración del período: ${duracionSegundos} segundos (${(duracionSegundos/3600).toFixed(2)} horas)`);
            
            // Abrir nuevo período
            periodos.push({
                inicio: timestamp,
                estado: nuevoEstado
            });
            
            estadoActual = nuevoEstado;
        }
    }
    
    // Cerrar el último período
    if (periodos.length > 0 && !periodos[periodos.length - 1].fin) {
        periodos[periodos.length - 1].fin = fechaFin;
        const duracionSegundos = (fechaFin.getTime() - periodos[periodos.length - 1].inicio.getTime()) / 1000;
        periodos[periodos.length - 1].duracion = duracionSegundos;
        
        console.log(`   - Último período (${estadoActual}): ${periodos[periodos.length - 1].inicio.toISOString()} - ${fechaFin.toISOString()}`);
        console.log(`   - Duración del último período: ${duracionSegundos} segundos (${(duracionSegundos/3600).toFixed(2)} horas)`);
    }
    
    // Filtrar períodos con duración cero o negativa
    const periodosInvalidos = periodos.filter(periodo => periodo.duracion <= 0);
    if (periodosInvalidos.length > 0) {
        console.warn(`⚠️ Se encontraron ${periodosInvalidos.length} períodos con duración cero o negativa para el medio ${medio.idCompuesto}`);
    }
    
    periodos = periodos.filter(periodo => periodo.duracion > 0);
    
    console.log(`   - Períodos generados: ${periodos.length}`);
    
    // Verificar que la suma de las duraciones sea igual a la duración total del período
    const duracionTotalPeriodos = periodos.reduce((total, periodo) => total + periodo.duracion, 0);
    const diferencia = Math.abs(duracionTotalSegundos - duracionTotalPeriodos);
    
    if (diferencia > 1) { // Permitir una diferencia de hasta 1 segundo por redondeo
        console.warn(`⚠️ Discrepancia en la duración total: ${duracionTotalPeriodos} vs ${duracionTotalSegundos} (diferencia: ${diferencia} segundos)`);
    }
    
    // Clasificar períodos en operativos y fallas
    const periodosOperativos = periodos.filter(periodo => periodo.estado === 'Operativo');
    const periodosFallas = periodos.filter(periodo => periodo.estado !== 'Operativo');
    
    // Calcular tiempo total operativo y no operativo
    const tiempoOperativoTotal = periodosOperativos.reduce((total, periodo) => total + periodo.duracion, 0);
    const tiempoNoOperativoTotal = periodosFallas.reduce((total, periodo) => total + periodo.duracion, 0);
    
    console.log(`   - Períodos operativos: ${periodosOperativos.length} (${tiempoOperativoTotal} segundos, ${(tiempoOperativoTotal/3600).toFixed(2)} horas)`);
    console.log(`   - Períodos de falla: ${periodosFallas.length} (${tiempoNoOperativoTotal} segundos, ${(tiempoNoOperativoTotal/3600).toFixed(2)} horas)`);
    
    // Guardar períodos en el objeto medio
    medio.periodos.operativos = periodosOperativos;
    medio.periodos.fallas = periodosFallas;
}

/**
 * Calcula los indicadores para un medio
 * @param {Object} medio - Datos del medio
 * @param {Object} metadatos - Metadatos del período de análisis
 */
function calcularIndicadoresPorMedio(medio, metadatos) {
    console.log(`🔄 Calculando indicadores para medio ${medio.idCompuesto}`);
    
    // Calcular tiempo total del período en segundos
    const tiempoTotalSegundos = (metadatos.fechaFin.getTime() - metadatos.fechaInicio.getTime()) / 1000;
    console.log(`   - Tiempo total del período: ${segundosAHorasMinutosSegundos(tiempoTotalSegundos)}`);
    
    // Calcular tiempo operativo sumando la duración de los períodos operativos
    let tiempoOperativoSegundos = 0;
    for (const periodo of medio.periodos.operativos) {
        tiempoOperativoSegundos += periodo.duracion;
    }
    console.log(`   - Tiempo operativo: ${segundosAHorasMinutosSegundos(tiempoOperativoSegundos)}`);
    
    // Calcular tiempo no operativo sumando la duración de los períodos de falla
    let tiempoNoOperativoSegundos = 0;
    for (const periodo of medio.periodos.fallas) {
        tiempoNoOperativoSegundos += periodo.duracion;
    }
    console.log(`   - Tiempo no operativo: ${segundosAHorasMinutosSegundos(tiempoNoOperativoSegundos)}`);
    
    // Verificar que la suma de tiempos sea aproximadamente igual al tiempo total
    const sumaTiempos = tiempoOperativoSegundos + tiempoNoOperativoSegundos;
    const diferencia = Math.abs(tiempoTotalSegundos - sumaTiempos);
    
    if (diferencia > 60) { // Permitir una diferencia de hasta 60 segundos
        console.warn(`⚠️ Discrepancia en tiempos para medio ${medio.idCompuesto}: Total=${tiempoTotalSegundos}s, Suma=${sumaTiempos}s, Diferencia=${diferencia}s`);
    }
    
    // Calcular disponibilidad
    const disponibilidad = tiempoTotalSegundos > 0 
        ? (tiempoOperativoSegundos / tiempoTotalSegundos) * 100 
        : 0;
    console.log(`   - Disponibilidad: ${disponibilidad.toFixed(2)}%`);
    
    // Calcular cantidad de fallas (transiciones de operativo a falla)
    const cantidadFallas = medio.periodos.fallas.length;
    console.log(`   - Cantidad de fallas: ${cantidadFallas}`);
    
    // Calcular MTTF (Mean Time To Failure) - Tiempo medio entre fallas
    let mttf = 0;
    if (cantidadFallas > 0 && medio.periodos.operativos.length > 0) {
        mttf = tiempoOperativoSegundos / cantidadFallas;
        console.log(`   - MTTF: ${segundosAHorasMinutosSegundos(mttf)}`);
    } else {
        console.log(`   - MTTF: No calculable (sin fallas o sin períodos operativos)`);
    }
    
    // Calcular MTTR (Mean Time To Repair) - Tiempo medio de reparación
    let mttr = 0;
    if (cantidadFallas > 0) {
        mttr = tiempoNoOperativoSegundos / cantidadFallas;
        console.log(`   - MTTR: ${segundosAHorasMinutosSegundos(mttr)}`);
    } else {
        console.log(`   - MTTR: No calculable (sin fallas)`);
    }
    
    // Guardar indicadores en el objeto medio
    medio.indicadores = {
        tiempoOperativo: tiempoOperativoSegundos,
        tiempoNoOperativo: tiempoNoOperativoSegundos,
        disponibilidad: disponibilidad,
        cantidadFallas: cantidadFallas,
        mttf: mttf,
        mttr: mttr
    };
}

/**
 * Procesa los datos por línea
 * @param {Object} datosPorMedio - Datos procesados por medio
 * @param {Object} metadatos - Metadatos del período de análisis
 * @returns {Object} - Datos procesados por línea
 */
function procesarDatosPorLinea(datosPorMedio, metadatos) {
    console.log('🔄 Procesando datos por línea...');
    
    const datosPorLinea = {};
    
    // Inicializar estructura para cada línea
    Object.keys(dbInterface.MEDIOS_POR_LINEA).forEach(linea => {
        datosPorLinea[linea] = {
            id: linea,
            mediosTotales: dbInterface.MEDIOS_POR_LINEA[linea],
            medios: {
                escaleras: [],
                ascensores: []
            },
            indicadores: {
                tiempoOperativo: 0,
                tiempoNoOperativo: 0,
                disponibilidad: 0,
                cantidadFallas: 0,
                mttf: 0,
                mttr: 0,
                disponibilidadEscaleras: 0,
                disponibilidadAscensores: 0
            }
        };
    });
    
    // Contar medios por línea para verificar
    const contadorMediosPorLinea = {};
    Object.keys(dbInterface.MEDIOS_POR_LINEA).forEach(linea => {
        contadorMediosPorLinea[linea] = 0;
    });
    
    // Agregar medios a sus respectivas líneas
    Object.values(datosPorMedio).forEach(medio => {
        const linea = medio.linea;
        if (!datosPorLinea[linea]) {
            console.warn(`⚠️ Línea no reconocida: ${linea}`);
            return;
        }
        
        // Incrementar contador para verificación
        contadorMediosPorLinea[linea]++;
        
        // Clasificar por tipo
        if (medio.tipo.includes('Escalera')) {
            datosPorLinea[linea].medios.escaleras.push(medio);
        } else {
            datosPorLinea[linea].medios.ascensores.push(medio);
        }
    });
    
    // Verificar conteo de medios por línea
    console.log('📊 VERIFICACIÓN DE MEDIOS POR LÍNEA:');
    for (const [linea, cantidad] of Object.entries(contadorMediosPorLinea)) {
        const totalConfigurados = dbInterface.MEDIOS_POR_LINEA[linea] || 0;
        const porcentaje = totalConfigurados > 0 ? (cantidad / totalConfigurados * 100).toFixed(1) : 'N/A';
        console.log(`   - ${linea}: ${cantidad} medios procesados de ${totalConfigurados} configurados (${porcentaje}%)`);
        
        // Verificar distribución por tipo
        if (datosPorLinea[linea]) {
            const escaleras = datosPorLinea[linea].medios.escaleras.length;
            const ascensores = datosPorLinea[linea].medios.ascensores.length;
            console.log(`     * Escaleras: ${escaleras}, Ascensores: ${ascensores}`);
        }
    }
    
    // Calcular indicadores por línea
    Object.values(datosPorLinea).forEach(linea => {
        calcularIndicadoresPorLinea(linea);
    });
    
    // Análisis específico para Línea H
    if (datosPorLinea['Línea H']) {
        const lineaH = datosPorLinea['Línea H'];
        console.log(`📊 ANÁLISIS DE LÍNEA H DESPUÉS DE PROCESAR POR LÍNEA:`);
        console.log(`   - Total medios procesados: ${lineaH.medios.escaleras.length + lineaH.medios.ascensores.length}`);
        console.log(`   - Disponibilidad calculada: ${lineaH.indicadores.disponibilidad.toFixed(1)}%`);
        
        // Verificar estaciones
        const estacionesUnicas = new Set();
        [...lineaH.medios.escaleras, ...lineaH.medios.ascensores].forEach(medio => {
            estacionesUnicas.add(medio.estacion);
        });
        console.log(`   - Estaciones con datos: ${estacionesUnicas.size}`);
        console.log(`   - Estaciones: ${Array.from(estacionesUnicas).join(', ')}`);
    }
    
    console.log(`✅ Procesadas ${Object.keys(datosPorLinea).length} líneas`);
    return datosPorLinea;
}

/**
 * Calcula los indicadores para una línea específica
 * @param {Object} linea - Datos de la línea
 */
function calcularIndicadoresPorLinea(linea) {
    // Combinar todos los medios
    const todosMedios = [...linea.medios.escaleras, ...linea.medios.ascensores];
    
    // Calcular indicadores generales
    linea.indicadores.tiempoOperativo = todosMedios.reduce(
        (total, medio) => total + medio.indicadores.tiempoOperativo, 0
    );
    
    linea.indicadores.tiempoNoOperativo = todosMedios.reduce(
        (total, medio) => total + medio.indicadores.tiempoNoOperativo, 0
    );
    
    linea.indicadores.cantidadFallas = todosMedios.reduce(
        (total, medio) => total + medio.indicadores.cantidadFallas, 0
    );
    
    // Calcular disponibilidad
    const tiempoTotal = linea.indicadores.tiempoOperativo + linea.indicadores.tiempoNoOperativo;
    linea.indicadores.disponibilidad = tiempoTotal > 0 
        ? (linea.indicadores.tiempoOperativo / tiempoTotal) * 100 
        : 100;
    
    // Calcular MTTF y MTTR promedio
    const mttfTotal = todosMedios.reduce(
        (total, medio) => total + medio.indicadores.mttf, 0
    );
    
    const mttrTotal = todosMedios.reduce(
        (total, medio) => total + medio.indicadores.mttr, 0
    );
    
    linea.indicadores.mttf = todosMedios.length > 0 
        ? mttfTotal / todosMedios.length 
        : 0;
    
    linea.indicadores.mttr = todosMedios.length > 0 
        ? mttrTotal / todosMedios.length 
        : 0;
    
    // Calcular disponibilidad específica para escaleras y ascensores
    if (linea.medios.escaleras.length > 0) {
        const tiempoOperativoEscaleras = linea.medios.escaleras.reduce(
            (total, medio) => total + medio.indicadores.tiempoOperativo, 0
        );
        
        const tiempoTotalEscaleras = linea.medios.escaleras.reduce(
            (total, medio) => total + medio.indicadores.tiempoOperativo + medio.indicadores.tiempoNoOperativo, 0
        );
        
        linea.indicadores.disponibilidadEscaleras = tiempoTotalEscaleras > 0 
            ? (tiempoOperativoEscaleras / tiempoTotalEscaleras) * 100 
            : 100;
    }
    
    if (linea.medios.ascensores.length > 0) {
        const tiempoOperativoAscensores = linea.medios.ascensores.reduce(
            (total, medio) => total + medio.indicadores.tiempoOperativo, 0
        );
        
        const tiempoTotalAscensores = linea.medios.ascensores.reduce(
            (total, medio) => total + medio.indicadores.tiempoOperativo + medio.indicadores.tiempoNoOperativo, 0
        );
        
        linea.indicadores.disponibilidadAscensores = tiempoTotalAscensores > 0 
            ? (tiempoOperativoAscensores / tiempoTotalAscensores) * 100 
            : 100;
    }
}

/**
 * Calcula los indicadores globales para toda la red
 * @param {Object} datosPorLinea - Datos procesados por línea
 * @param {Object} datosPorMedio - Datos procesados por medio
 * @returns {Object} - Indicadores globales
 */
function calcularIndicadoresGlobales(datosPorLinea, datosPorMedio) {
    console.log('🔄 Calculando indicadores globales...');
    
    // Calcular disponibilidad ponderada
    const totalMediosRed = Object.values(dbInterface.MEDIOS_POR_LINEA).reduce((acc, val) => acc + val, 0);
    let disponibilidadPonderada = 0;
    
    Object.entries(datosPorLinea).forEach(([linea, datos]) => {
        const pesoPonderacion = datos.mediosTotales / totalMediosRed;
        disponibilidadPonderada += datos.indicadores.disponibilidad * pesoPonderacion;
    });
    
    // Calcular MTTF y MTTR promedio de toda la red
    const todosMedios = Object.values(datosPorMedio);
    
    const mttfTotal = todosMedios.reduce(
        (total, medio) => total + medio.indicadores.mttf, 0
    );
    
    const mttrTotal = todosMedios.reduce(
        (total, medio) => total + medio.indicadores.mttr, 0
    );
    
    const mttfPromedio = todosMedios.length > 0 
        ? mttfTotal / todosMedios.length 
        : 0;
    
    const mttrPromedio = todosMedios.length > 0 
        ? mttrTotal / todosMedios.length 
        : 0;
    
    // Contar medios con fallas
    const mediosConFallas = todosMedios.filter(
        medio => medio.indicadores.cantidadFallas > 0
    ).length;
    
    const indicadoresGlobales = {
        mttf: mttfPromedio,
        mttr: mttrPromedio,
        disponibilidadPonderada: disponibilidadPonderada,
        cantidadFallas: mediosConFallas,
        totalMedios: totalMediosRed
    };
    
    console.log('✅ Indicadores globales calculados:', indicadoresGlobales);
    return indicadoresGlobales;
}

/**
 * Procesa los datos para generar la estructura necesaria para los gráficos
 * @param {Object} datos - Datos procesados del historial
 * @returns {Object} - Objeto con datos procesados para los gráficos
 */
function procesarDatosGraficos(datos) {
    console.log('🔄 Procesando datos para gráficos...');
    
    if (!datos || !datos.procesados || !datos.procesados.porLinea) {
        console.warn('⚠️ No hay datos disponibles para procesar gráficos');
        return null;
    }
    
    const datosPorLinea = {};
    
    // Preparar estructura para cada línea
    Object.entries(datos.procesados.porLinea).forEach(([lineaId, linea]) => {
        datosPorLinea[lineaId] = {
            disponibilidad: linea.indicadores.disponibilidad.toFixed(1),
            disponibilidadEscaleras: linea.indicadores.disponibilidadEscaleras.toFixed(1),
            disponibilidadAscensores: linea.indicadores.disponibilidadAscensores.toFixed(1),
            operativos: {
                escaleras: linea.medios.escaleras.filter(m => 
                    m.indicadores.disponibilidad >= 50
                ).length,
                ascensores: linea.medios.ascensores.filter(m => 
                    m.indicadores.disponibilidad >= 50
                ).length
            },
            noOperativos: {
                escaleras: linea.medios.escaleras.filter(m => 
                    m.indicadores.disponibilidad < 50
                ).length,
                ascensores: linea.medios.ascensores.filter(m => 
                    m.indicadores.disponibilidad < 50
                ).length
            }
        };
    });
    
    console.log('✅ Datos procesados para gráficos');
    return {
        datosPorLinea,
        global: datos.procesados.global
    };
}

/**
 * Formatea el tiempo en segundos a un formato legible
 * @param {number} segundos - Tiempo en segundos
 * @returns {string} - Tiempo formateado
 */
function formatearTiempo(segundos) {
    console.log(`🕒 Formateando tiempo: ${segundos} segundos`);
    
    // Convertir segundos a minutos
    const minutos = segundos / 60;
    
    if (minutos < 60) {
        console.log(`🕒 Resultado: ${Math.floor(minutos)} min`);
        return `${Math.floor(minutos)} min`;
    } else {
        const horas = Math.floor(minutos / 60);
        const minutosRestantes = Math.floor(minutos % 60);
        console.log(`🕒 Resultado: ${horas}h ${minutosRestantes}min (${(horas + minutosRestantes/60).toFixed(2)} horas)`);
        return `${horas}h ${minutosRestantes}min`;
    }
}

/**
 * Obtiene los indicadores KPI para un tipo de medio específico
 * @param {string} linea - Nombre de la línea
 * @param {string} tipo - Tipo de medio (Escalera o Ascensor)
 * @param {Object} datos - Datos procesados
 * @returns {Array} - Array de indicadores KPI
 */
function obtenerIndicadoresPorTipo(linea, tipo, datos) {
    console.log(`🔍 Obteniendo indicadores para ${linea} - ${tipo}`);
    
    if (!datos || !datos.procesados || !datos.procesados.porLinea || !datos.procesados.porLinea[linea]) {
        console.warn(`⚠️ No hay datos disponibles para ${linea} - ${tipo}`);
        return [
            { nombre: "Detenido total", valor: "0 min", tooltip: "0.00 horas" },
            { nombre: "Detenciones", valor: "0" },
            { nombre: "Det. (>15 min)", valor: "0" },
            { nombre: "MTTF", valor: "0 min" },
            { nombre: "Disponibilidad", valor: "100.0%" }
        ];
    }
    
    const lineaData = datos.procesados.porLinea[linea];
    const medios = tipo === 'Escalera' ? lineaData.medios.escaleras : lineaData.medios.ascensores;
    
    // Calcular tiempo detenido total (en segundos)
    const tiempoDetenidoSegundos = medios.reduce(
        (total, medio) => total + medio.indicadores.tiempoNoOperativo, 0
    );
    
    console.log(`📊 ${linea} - ${tipo}: Tiempo detenido total: ${tiempoDetenidoSegundos} segundos (${(tiempoDetenidoSegundos/3600).toFixed(2)} horas)`);
    
    // Contar detenciones
    const detenciones = medios.reduce(
        (total, medio) => total + medio.indicadores.cantidadFallas, 0
    );
    
    // Contar detenciones largas (más de 15 minutos = 900 segundos)
    const detencionesLargas = medios.reduce(
        (total, medio) => total + medio.periodos.fallas.filter(f => f.duracion > 900).length, 0
    );
    
    // Calcular MTTF promedio (en segundos)
    const mttfPromedioSegundos = medios.length > 0 
        ? medios.reduce((total, medio) => total + medio.indicadores.mttf, 0) / medios.length 
        : 0;
    
    // Calcular disponibilidad
    const disponibilidad = tipo === 'Escalera' 
        ? lineaData.indicadores.disponibilidadEscaleras 
        : lineaData.indicadores.disponibilidadAscensores;
    
    console.log(`📊 ${linea} - ${tipo}: MTTF promedio: ${mttfPromedioSegundos} segundos (${(mttfPromedioSegundos/3600).toFixed(2)} horas)`);
    console.log(`📊 ${linea} - ${tipo}: Disponibilidad: ${disponibilidad.toFixed(1)}%`);
    
    return [
        { 
            nombre: "Detenido total", 
            valor: formatearTiempo(tiempoDetenidoSegundos),
            tooltip: `${(tiempoDetenidoSegundos/3600).toFixed(2)} horas`
        },
        { nombre: "Detenciones", valor: detenciones.toString() },
        { nombre: "Det. (>15 min)", valor: detencionesLargas.toString() },
        { nombre: "MTTF", valor: formatearTiempo(mttfPromedioSegundos) },
        { nombre: "Disponibilidad", valor: `${disponibilidad.toFixed(1)}%` }
    ];
}

/**
 * Genera un resumen específico para la Línea H
 * @param {Object} datosPorMedio - Datos procesados por medio
 * @param {Object} datosPorLinea - Datos procesados por línea
 * @returns {Object} - Resumen de la Línea H
 */
function generarResumenLineaH(datosPorMedio, datosPorLinea) {
    console.log('🔄 Generando resumen para Línea H...');
    
    // Verificar que LISTA_MEDIOS esté inicializada
    if (!dbInterface.LISTA_MEDIOS || Object.keys(dbInterface.LISTA_MEDIOS).length === 0) {
        console.warn('⚠️ LISTA_MEDIOS no está inicializada o está vacía');
        return {
            error: 'No se pudo generar el resumen para Línea H debido a que LISTA_MEDIOS no está inicializada'
        };
    }
    
    // Obtener todos los medios configurados para Línea H
    const mediosConfiguradosLineaH = Object.values(dbInterface.LISTA_MEDIOS)
        .filter(medio => medio.linea === 'Línea H');
    
    console.log(`📊 Total de medios configurados para Línea H: ${mediosConfiguradosLineaH.length}`);
    
    // Obtener medios con datos para Línea H (usando el ID compuesto)
    const mediosConDatosLineaH = Object.values(datosPorMedio)
        .filter(medio => medio.linea === 'Línea H');
    
    console.log(`📊 Medios con datos para Línea H: ${mediosConDatosLineaH.length}`);
    
    // Calcular porcentaje de cobertura
    const porcentajeCobertura = mediosConfiguradosLineaH.length > 0 
        ? (mediosConDatosLineaH.length / mediosConfiguradosLineaH.length * 100).toFixed(1) 
        : 0;
    
    console.log(`📊 Cobertura de datos para Línea H: ${porcentajeCobertura}%`);
    
    // Analizar distribución por estaciones
    const estacionesConfiguradasLineaH = new Set(mediosConfiguradosLineaH.map(medio => medio.estacion));
    const estacionesConDatosLineaH = new Set(mediosConDatosLineaH.map(medio => medio.estacion));
    
    console.log(`📊 Estaciones configuradas para Línea H: ${estacionesConfiguradasLineaH.size}`);
    console.log(`📊 Estaciones con datos para Línea H: ${estacionesConDatosLineaH.size}`);
    
    // Crear mapa de medios por estación
    const mediosPorEstacion = {};
    estacionesConfiguradasLineaH.forEach(estacion => {
        const mediosConfigurados = mediosConfiguradosLineaH.filter(medio => medio.estacion === estacion);
        const mediosConDatos = mediosConDatosLineaH.filter(medio => medio.estacion === estacion);
        
        mediosPorEstacion[estacion] = {
            configurados: mediosConfigurados.length,
            conDatos: mediosConDatos.length,
            cobertura: mediosConfigurados.length > 0 
                ? (mediosConDatos.length / mediosConfigurados.length * 100).toFixed(1) 
                : 0
        };
    });
    
    // Analizar distribución por tipo de medio
    const tiposMediosConfigurados = {
        escaleras: mediosConfiguradosLineaH.filter(medio => medio.tipo.includes('Escalera')).length,
        ascensores: mediosConfiguradosLineaH.filter(medio => !medio.tipo.includes('Escalera')).length
    };
    
    const tiposMediosConDatos = {
        escaleras: mediosConDatosLineaH.filter(medio => medio.tipo.includes('Escalera')).length,
        ascensores: mediosConDatosLineaH.filter(medio => !medio.tipo.includes('Escalera')).length
    };
    
    // Verificar si hay alertas por baja cobertura
    const alertas = [];
    if (porcentajeCobertura < 50) {
        alertas.push({
            tipo: 'error',
            mensaje: `Baja cobertura de datos para Línea H: solo ${porcentajeCobertura}% de los medios tienen datos`
        });
    }
    
    // Verificar estaciones sin datos
    const estacionesSinDatos = [...estacionesConfiguradasLineaH].filter(estacion => 
        !estacionesConDatosLineaH.has(estacion));
    
    if (estacionesSinDatos.length > 0) {
        alertas.push({
            tipo: 'advertencia',
            mensaje: `Hay ${estacionesSinDatos.length} estaciones sin datos: ${estacionesSinDatos.join(', ')}`
        });
    }
    
    // Sugerencias para mejorar la cobertura
    const sugerencias = [];
    if (porcentajeCobertura < 90) {
        sugerencias.push('Verificar la configuración de los medios en LISTA_MEDIOS');
        sugerencias.push('Revisar la recolección de datos para asegurar que todos los medios estén siendo monitoreados');
        sugerencias.push('Comprobar que los IDs de los medios sean consistentes entre la configuración y los registros');
    }
    
    // Obtener datos de disponibilidad si existen
    let disponibilidad = 0;
    let disponibilidadEscaleras = 0;
    let disponibilidadAscensores = 0;
    
    if (datosPorLinea['Línea H']) {
        disponibilidad = datosPorLinea['Línea H'].indicadores.disponibilidad;
        disponibilidadEscaleras = datosPorLinea['Línea H'].indicadores.disponibilidadEscaleras;
        disponibilidadAscensores = datosPorLinea['Línea H'].indicadores.disponibilidadAscensores;
    }
    
    // Crear resumen
    const resumen = {
        mediosConfigurados: mediosConfiguradosLineaH.length,
        mediosConDatos: mediosConDatosLineaH.length,
        porcentajeCobertura: parseFloat(porcentajeCobertura),
        estacionesConfiguradas: estacionesConfiguradasLineaH.size,
        estacionesConDatos: estacionesConDatosLineaH.size,
        mediosPorEstacion: mediosPorEstacion,
        tiposMediosConfigurados: tiposMediosConfigurados,
        tiposMediosConDatos: tiposMediosConDatos,
        disponibilidad: disponibilidad,
        disponibilidadEscaleras: disponibilidadEscaleras,
        disponibilidadAscensores: disponibilidadAscensores,
        alertas: alertas,
        sugerencias: sugerencias
    };
    
    console.log('✅ Resumen para Línea H generado');
    return resumen;
}

/**
 * Lista todos los medios configurados para la Línea H
 * Ayuda a identificar qué medios están configurados pero no tienen datos
 */
function listarMediosLineaH() {
    console.log('📋 MEDIOS CONFIGURADOS PARA LÍNEA H:');
    
    if (!dbInterface || !dbInterface.MEDIOS_POR_LINEA || !dbInterface.MEDIOS_POR_LINEA['Línea H']) {
        console.warn('⚠️ No se puede acceder a la configuración de medios para la Línea H');
        return;
    }
    
    // Obtener la cantidad total de medios configurados para la Línea H
    const totalMedios = dbInterface.MEDIOS_POR_LINEA['Línea H'];
    console.log(`- Total de medios configurados: ${totalMedios}`);
    
    // Verificar si podemos acceder a la lista completa de medios
    if (dbInterface.LISTA_MEDIOS) {
        // Filtrar los medios de la Línea H
        const mediosLineaH = Object.keys(dbInterface.LISTA_MEDIOS)
            .filter(id => dbInterface.LISTA_MEDIOS[id].linea === 'Línea H');
        
        console.log(`- Medios encontrados en LISTA_MEDIOS: ${mediosLineaH.length}`);
        
        if (mediosLineaH.length > 0) {
            console.log('📋 LISTA DE MEDIOS CONFIGURADOS PARA LÍNEA H:');
            mediosLineaH.forEach((id, index) => {
                const medio = dbInterface.LISTA_MEDIOS[id];
                console.log(`  ${index + 1}. ${id}: ${medio.tipo}`);
            });
        } else {
            console.warn('⚠️ No se encontraron medios para la Línea H en LISTA_MEDIOS');
            console.log('💡 SOLUCIÓN: Verificar que los medios de la Línea H estén correctamente configurados en LISTA_MEDIOS');
        }
    } else {
        console.warn('⚠️ No se puede acceder a LISTA_MEDIOS');
        console.log('💡 SOLUCIÓN: Verificar que dbInterface.LISTA_MEDIOS esté correctamente inicializado');
    }
}

/**
 * Identifica el tipo de medio según su ID
 * @param {string} idMedio - ID del medio de elevación
 * @returns {string} - Tipo de medio ('Escalera', 'Ascensor', u 'Otro')
 */
function identificarTipoMedio(idMedio) {
    if (!idMedio) return 'Otro';
    
    // Normalizar el ID a string y extraer el primer carácter
    const id = String(idMedio);
    
    // Clasificación correcta según el prefijo
    if (id.startsWith('E')) {
        return 'Escalera';
    } else if (id.startsWith('A')) {
        return 'Ascensor'; 
    } else if (id.startsWith('S')) {
        return 'Salvaescalera';
    } else {
        return 'Otro';
    }
}

/**
 * Verifica los registros para todos los medios configurados
 * @returns {Promise<Object>} - Resultados de la verificación
 */
async function verificarRegistrosTodosMedios() {
    console.log('🔄 Verificando registros para todos los medios configurados...');
    
    // Verificar que LISTA_MEDIOS esté inicializada
    if (!dbInterface.LISTA_MEDIOS || Object.keys(dbInterface.LISTA_MEDIOS).length === 0) {
        console.warn('⚠️ LISTA_MEDIOS no está inicializada o está vacía');
        await dbInterface.cargarListaMedios();
        
        if (!dbInterface.LISTA_MEDIOS || Object.keys(dbInterface.LISTA_MEDIOS).length === 0) {
            return {
                error: 'No se pudo inicializar LISTA_MEDIOS'
            };
        }
    }
    
    // Obtener todos los medios configurados
    const mediosConfigurados = Object.values(dbInterface.LISTA_MEDIOS);
    console.log(`📊 Total de medios configurados: ${mediosConfigurados.length}`);
    
    // Agrupar medios por línea
    const mediosPorLinea = {};
    for (const medio of mediosConfigurados) {
        const linea = medio.linea || 'Desconocida';
        if (!mediosPorLinea[linea]) {
            mediosPorLinea[linea] = [];
        }
        mediosPorLinea[linea].push(medio);
    }
    
    // Obtener registros previos para todos los medios
    console.log('🔄 Obteniendo registros previos para todos los medios...');
    const fechaActual = new Date();
    const fechaInicio = new Date(fechaActual);
    fechaInicio.setDate(fechaInicio.getDate() - 7); // Última semana
    
    const registrosPrevios = await dbInterface.obtenerRegistrosPrevios(fechaInicio);
    console.log(`📊 Total de registros previos obtenidos: ${registrosPrevios.length}`);
    
    // Función para generar un ID compuesto único para cada medio
    const generarIdCompuesto = (registro) => {
        if (!registro.id) return null;
        
        const linea = registro.linea || 'Desconocida';
        const estacion = registro.estacion || 'Desconocida';
        return `${linea}-${estacion}-${registro.id}`;
    };
    
    // Crear un conjunto de IDs compuestos únicos de los registros
    const idsCompuestosConRegistros = new Set(
        registrosPrevios
            .map(r => generarIdCompuesto(r))
            .filter(id => id)
    );
    
    console.log(`📊 Medios únicos con registros (usando ID compuesto): ${idsCompuestosConRegistros.size}`);
    
    // Verificar cobertura por línea
    const resultadosPorLinea = {};
    let totalMediosConRegistros = 0;
    
    for (const [linea, medios] of Object.entries(mediosPorLinea)) {
        // Crear IDs compuestos para los medios configurados
        const idsCompuestosConfigurados = medios.map(medio => {
            const estacion = medio.estacion || 'Desconocida';
            return `${linea}-${estacion}-${medio.id}`;
        });
        
        // Verificar cuántos medios tienen registros
        const mediosConRegistros = idsCompuestosConfigurados.filter(id => idsCompuestosConRegistros.has(id));
        
        // Calcular porcentaje de cobertura
        const porcentajeCobertura = medios.length > 0 
            ? (mediosConRegistros.length / medios.length * 100).toFixed(1) 
            : 0;
        
        // Guardar resultados
        resultadosPorLinea[linea] = {
            mediosConfigurados: medios.length,
            mediosConRegistros: mediosConRegistros.length,
            porcentajeCobertura: parseFloat(porcentajeCobertura),
            ejemplosMediosSinRegistros: []
        };
        
        // Identificar ejemplos de medios sin registros
        if (mediosConRegistros.length < medios.length) {
            const mediosSinRegistros = idsCompuestosConfigurados
                .filter(id => !idsCompuestosConRegistros.has(id))
                .slice(0, 5); // Limitar a 5 ejemplos
            
            resultadosPorLinea[linea].ejemplosMediosSinRegistros = mediosSinRegistros;
        }
        
        totalMediosConRegistros += mediosConRegistros.length;
        
        console.log(`📊 ${linea}: ${mediosConRegistros.length} de ${medios.length} medios tienen registros (${porcentajeCobertura}%)`);
    }
    
    // Calcular porcentaje global de cobertura
    const porcentajeCoberturaGlobal = mediosConfigurados.length > 0 
        ? (totalMediosConRegistros / mediosConfigurados.length * 100).toFixed(1) 
        : 0;
    
    // Crear resumen
    const resumen = {
        totalMediosConfigurados: mediosConfigurados.length,
        totalMediosConRegistros: totalMediosConRegistros,
        porcentajeCoberturaGlobal: parseFloat(porcentajeCoberturaGlobal),
        totalRegistrosPrevios: registrosPrevios.length,
        resultadosPorLinea: resultadosPorLinea
    };
    
    console.log(`✅ Verificación completada: ${totalMediosConRegistros} de ${mediosConfigurados.length} medios tienen registros (${porcentajeCoberturaGlobal}%)`);
    return resumen;
}

/**
 * Procesa los datos del historial para calcular todos los indicadores
 * @param {Object} datos - Datos del historial filtrados
 * @returns {Object} - Datos procesados con todos los indicadores calculados
 */
function procesarDatos(datos) {
    console.log('🔄 Procesando datos...');
    
    if (!datos || !datos.documentos || !datos.documentos.historial) {
        console.error('❌ Datos inválidos para procesar');
        return null;
    }
    
    // Combinar registros del historial y previos
    const registrosCombinados = [
        ...datos.documentos.historial,
        ...datos.documentos.previos
    ];
    
    // Ordenar por timestamp
    registrosCombinados.sort((a, b) => {
        const tsA = dbInterface.normalizarTimestamp(a.timestamp).getTime();
        const tsB = dbInterface.normalizarTimestamp(b.timestamp).getTime();
        return tsA - tsB;
    });
    
    // Procesar datos por medio
    const datosPorMedio = procesarDatosPorMedio(registrosCombinados, datos.metadatos, datos.documentos.previos);
    
    // Procesar datos por línea
    const datosPorLinea = procesarDatosPorLinea(datosPorMedio, datos.metadatos);
    
    // Calcular indicadores globales
    const datosGlobales = calcularIndicadoresGlobales(datosPorLinea, datosPorMedio);
    
    // Actualizar la estructura de datos
    datos.procesados = {
        porMedio: datosPorMedio,
        porLinea: datosPorLinea,
        global: datosGlobales
    };
    
    // Generar resumen específico para Línea H
    const resumenLineaH = generarResumenLineaH(datosPorMedio, datosPorLinea);
    datos.procesados.resumenLineaH = resumenLineaH;
    
    console.log('✅ Datos procesados correctamente');
    return datos;
}

/**
 * Convierte segundos a un formato legible para depuración (hh:mm:ss)
 * @param {number} segundos - Tiempo en segundos
 * @returns {string} - Tiempo formateado en hh:mm:ss
 */
function segundosAHorasMinutosSegundos(segundos) {
    const horas = Math.floor(segundos / 3600);
    const minutos = Math.floor((segundos % 3600) / 60);
    const segundosRestantes = Math.floor(segundos % 60);
    
    return `${horas.toString().padStart(2, '0')}:${minutos.toString().padStart(2, '0')}:${segundosRestantes.toString().padStart(2, '0')} (${(segundos / 3600).toFixed(2)} horas)`;
}

// Exportar funciones
if (typeof window !== 'undefined') {
    // Exportar para el navegador
    window.dataCalculator = {
        procesarDatosHistorial,
        procesarDatosPorMedio,
        procesarDatosPorLinea,
        calcularPeriodos,
        calcularIndicadoresPorMedio,
        calcularIndicadoresPorLinea,
        calcularIndicadoresGlobales,
        procesarDatos,
        procesarDatosGraficos,
        obtenerIndicadoresPorTipo,
        formatearTiempo,
        generarResumenLineaH,
        listarMediosLineaH,
        verificarRegistrosTodosMedios,
        identificarTipoMedio,
        segundosAHorasMinutosSegundos
    };
} else if (typeof module !== 'undefined' && module.exports) {
    // Exportar para Node.js
    module.exports = {
        procesarDatosHistorial,
        procesarDatosPorMedio,
        procesarDatosPorLinea,
        calcularPeriodos,
        calcularIndicadoresPorMedio,
        calcularIndicadoresPorLinea,
        calcularIndicadoresGlobales,
        procesarDatos,
        procesarDatosGraficos,
        obtenerIndicadoresPorTipo,
        formatearTiempo,
        generarResumenLineaH,
        listarMediosLineaH,
        verificarRegistrosTodosMedios,
        identificarTipoMedio,
        segundosAHorasMinutosSegundos
    };
} 