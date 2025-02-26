// Configuración de Firebase
const firebaseConfig = {
    apiKey: "AIzaSyDvXfQcRKFwc9XFVwVKSnCjl9im3zU2fvY",
    authDomain: "medioselevacion-sbase.firebaseapp.com",
    projectId: "medioselevacion-sbase",
    storageBucket: "medioselevacion-sbase.appspot.com",
    messagingSenderId: "1082577847683",
    appId: "1:1082577847683:web:d15b05a15983d674d962b6",
    measurementId: "G-4XK7D02G0Y"
};

// Variables globales para la aplicación
let app;
let db;
let datosHistorial = [];
let datosHistorialFiltrados = {
    metadatos: {
        fechaInicio: null,
        fechaFin: null,
        duracionHoras: 0
    },
    documentos: {
        historial: [],
        previos: []
    },
    procesados: {
        porMedio: {},
        porLinea: {},
        global: {}
    }
};

// Definición de la cantidad de medios por línea
const MEDIOS_POR_LINEA = {
    'Línea A': 56,
    'Línea B': 78,
    'Línea C': 34,
    'Línea D': 72,
    'Línea E': 64,
    'Línea H': 118,
};

// Definición de la lista de medios (se llenará durante la inicialización)
let LISTA_MEDIOS = {};

/**
 * Inicializa la conexión con Firebase
 * @returns {Promise<boolean>} - Promesa que se resuelve cuando Firebase está inicializado
 */
async function inicializarFirebase() {
    try {
        if (!firebase.apps.length) {
            app = firebase.initializeApp(firebaseConfig);
        } else {
            app = firebase.app();
        }
        console.log('✅ Firebase inicializado correctamente');
        
        db = firebase.firestore();
        console.log('✅ Conexión a Firestore establecida');
        
        // Cargar la lista de medios
        await cargarListaMedios();
        console.log('✅ Lista de medios cargada');
        
        return true;
    } catch (error) {
        console.error('❌ Error al inicializar Firebase:', error);
        return false;
    }
}

/**
 * Normaliza un timestamp en formato Microsoft JSON Date a un objeto Date
 * @param {string|Date} fechaMicrosoft - Timestamp en formato Microsoft JSON Date o un objeto Date
 * @returns {Date|null} - Objeto Date normalizado o null si el formato es inválido
 */
function normalizarTimestamp(fechaMicrosoft) {
    // Si es null o undefined, devolver null
    if (fechaMicrosoft == null) {
        console.error('Timestamp nulo o indefinido');
        return null;
    }
    
    // Si ya es un objeto Date, devolverlo directamente
    if (fechaMicrosoft instanceof Date) {
        return new Date(fechaMicrosoft); // Crear una copia para evitar modificaciones accidentales
    }
    
    // Si es un número (timestamp en milisegundos), convertirlo a Date
    if (typeof fechaMicrosoft === 'number') {
        return new Date(fechaMicrosoft);
    }
    
    // Si es un string ISO, convertirlo a Date
    if (typeof fechaMicrosoft === 'string') {
        // Formato ISO (2023-01-01T00:00:00.000Z)
        if (fechaMicrosoft.includes('T')) {
            try {
                const fecha = new Date(fechaMicrosoft);
                if (!isNaN(fecha.getTime())) {
                    return fecha;
                }
            } catch (error) {
                console.error('Error al parsear fecha ISO:', fechaMicrosoft, error);
            }
        }
        
        // Formato Microsoft JSON Date (/Date(1234567890)/)
        const regex = /\/Date\((\d+)([+-]\d{4})?\)\//;
        const matches = fechaMicrosoft.match(regex);

        if (matches) {
            try {
                const timestamp = parseInt(matches[1], 10);
                // Si hay un offset de zona horaria, aplicarlo
                if (matches[2]) {
                    // Convertir el offset a minutos
                    const offsetSign = matches[2].charAt(0) === '+' ? 1 : -1;
                    const offsetHours = parseInt(matches[2].substring(1, 3), 10);
                    const offsetMinutes = parseInt(matches[2].substring(3, 5), 10);
                    const offsetMillis = offsetSign * (offsetHours * 60 + offsetMinutes) * 60 * 1000;
                    
                    // Aplicar el offset
                    return new Date(timestamp - offsetMillis);
                }
                return new Date(timestamp);
            } catch (error) {
                console.error('Error al parsear Microsoft JSON Date:', fechaMicrosoft, error);
            }
        }
    }

    // Si llegamos aquí, el formato es inválido
    console.error('Formato de fecha inválido:', fechaMicrosoft);
    return null;
}

/**
 * Formatea una fecha en formato Microsoft JSON Date
 * @param {Date} fecha - Fecha a formatear
 * @returns {string} - Fecha formateada en Microsoft JSON Date
 */
function formatearFechaMicrosoftJSON(fecha) {
    return `\/Date(${fecha.getTime()})\/`;
}

/**
 * Obtiene los datos del historial de cambios
 * @param {Date} inicio - Fecha de inicio del período
 * @param {Date} fin - Fecha de fin del período
 * @returns {Promise<Array>} - Promesa que se resuelve con los registros del historial
 */
async function obtenerHistorialCambios(inicio, fin) {
    console.log('🔍 Consultando historial de cambios:', {
        inicio: inicio ? inicio.toISOString() : 'sin límite',
        fin: fin ? fin.toISOString() : 'sin límite'
    });
    
    try {
        let query = db.collection('historialCambios')
                      .orderBy('timestamp', 'asc');
        
        // Convertir fechas a formato Microsoft JSON Date si están presentes
        if (inicio && fin) {
            const inicioMicrosoftJSON = formatearFechaMicrosoftJSON(inicio);
            const finMicrosoftJSON = formatearFechaMicrosoftJSON(fin);
            
            console.log('🔄 Consultando con timestamps:', {
                inicioMicrosoftJSON,
                finMicrosoftJSON
            });
            
            query = query.where('timestamp', '>=', inicioMicrosoftJSON)
                        .where('timestamp', '<=', finMicrosoftJSON);
        }
        
        const snapshot = await query.get();
        const resultados = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        
        console.log(`✅ Consulta completada: ${resultados.length} documentos encontrados`);
        return resultados;
    } catch (error) {
        console.error('❌ Error al consultar historial de cambios:', error);
        throw error;
    }
}

/**
 * Obtiene el último registro anterior a la fecha de inicio para cada medio de elevación
 * @param {Date} inicio - Fecha de inicio del período de análisis
 * @returns {Promise<Array>} - Promesa que se resuelve con los últimos registros previos
 */
async function obtenerRegistrosPrevios(inicio) {
    console.log('🔍 Buscando registros previos para todos los medios antes de', inicio.toISOString());
    
    const inicioMicrosoftJSON = formatearFechaMicrosoftJSON(inicio);
    const registrosPrevios = [];
    const mediosUnicos = new Set(); // Para contabilizar medios únicos
    const mediosSinRegistroPrevio = []; // Para registrar medios sin registro previo
    
    // Contadores para análisis por línea
    const contadoresPorLinea = {
        'Línea A': 0,
        'Línea B': 0,
        'Línea C': 0,
        'Línea D': 0,
        'Línea E': 0,
        'Línea H': 0,
        'Desconocida': 0
    };
    
    // Arrays para guardar ejemplos de registros por línea
    const ejemplosRegistrosPorLinea = {
        'Línea A': [],
        'Línea B': [],
        'Línea C': [],
        'Línea D': [],
        'Línea E': [],
        'Línea H': [],
        'Desconocida': []
    };
    
    try {
        // Obtener el único documento en estadoActual
        const snapshot = await db.collection('estadoActual').limit(1).get();
        
        if (snapshot.empty) {
            console.error('❌ No se encontró el documento estadoActual');
            return [];
        }
        
        // El documento tiene una propiedad 'estado' que es el array que necesitamos
        const documento = snapshot.docs[0].data();
        
        // Verificar la estructura del documento
        console.log('🔍 Estructura del documento estadoActual:', JSON.stringify(documento).substring(0, 300) + '...');
        
        // Corregir acceso a la estructura
        const estadoActual = documento.estado || [];
        
        if (!Array.isArray(estadoActual)) {
            console.error('❌ La propiedad "estado" no es un array o no existe:', estadoActual);
            return [];
        }
        
        let totalMedios = 0;
        let consultasExitosas = 0;
        let consultasFallidas = 0;
        
        // Crear un mapa para agrupar las consultas por línea y estación
        const consultasPorLineaEstacion = new Map();
        
        // Recorrer la estructura jerárquica de todos los medios
        for (const linea of estadoActual) {
            const nombreLinea = linea.nombre || 'Desconocida';
            console.log(`👉 Procesando medios de ${nombreLinea}...`);
            
            if (linea.estaciones && Array.isArray(linea.estaciones)) {
                for (const estacion of linea.estaciones) {
                    const nombreEstacion = estacion.nombre || 'Desconocida';
                    
                    if (estacion.accesos && Array.isArray(estacion.accesos)) {
                        // Agrupar los medios por línea y estación
                        const clave = `${nombreLinea}-${nombreEstacion}`;
                        if (!consultasPorLineaEstacion.has(clave)) {
                            consultasPorLineaEstacion.set(clave, {
                                linea: nombreLinea,
                                estacion: nombreEstacion,
                                medios: []
                            });
                        }
                        
                        // Agregar los medios a la consulta agrupada
                        for (const acceso of estacion.accesos) {
                            totalMedios++;
                            
                            // Usar el nombre como ID del medio (A1, E2, etc.)
                            const idMedio = acceso.nombre;
                            const idCompleto = `${nombreLinea}-${nombreEstacion}-${idMedio}`;
                            mediosUnicos.add(idCompleto); // Para conteo
                            
                            consultasPorLineaEstacion.get(clave).medios.push({
                                id: idMedio,
                                idCompleto: idCompleto
                            });
                        }
                    }
                }
            }
        }
        
        // Realizar consultas agrupadas por línea y estación
        const consultas = [];
        for (const [clave, grupo] of consultasPorLineaEstacion.entries()) {
            consultas.push(async () => {
                try {
                    // Consulta para todos los medios de esta línea y estación
                    const query = await db.collection('historialCambios')
                        .where('linea', '==', grupo.linea)
                        .where('estacion', '==', grupo.estacion)
                        .where('timestamp', '<', inicioMicrosoftJSON)
                        .orderBy('timestamp', 'desc')
                        .get();
                    
                    // Procesar los resultados
                    const documentos = query.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                    
                    // Para cada medio, encontrar su último registro
                    for (const medio of grupo.medios) {
                        const ultimoRegistro = documentos.find(doc => doc.id === medio.id);
                        
                        if (ultimoRegistro) {
                            console.log(`✅ Registro previo encontrado para ${medio.idCompleto}:`, {
                                timestamp: ultimoRegistro.timestamp,
                                estado: ultimoRegistro.estado
                            });
                            
                            // Incrementar contador por línea
                            if (ultimoRegistro.linea && contadoresPorLinea.hasOwnProperty(ultimoRegistro.linea)) {
                                contadoresPorLinea[ultimoRegistro.linea]++;
                                
                                // Guardar ejemplos de registros (máximo 3 por línea)
                                if (ejemplosRegistrosPorLinea[ultimoRegistro.linea].length < 3) {
                                    ejemplosRegistrosPorLinea[ultimoRegistro.linea].push({
                                        ...ultimoRegistro,
                                        idCompleto: medio.idCompleto
                                    });
                                }
                                
                                // Guardar más ejemplos para la Línea H (hasta 10)
                                if (ultimoRegistro.linea === 'Línea H' && ejemplosRegistrosPorLinea['Línea H'].length < 10) {
                                    ejemplosRegistrosPorLinea['Línea H'].push({
                                        ...ultimoRegistro,
                                        idCompleto: medio.idCompleto
                                    });
                                }
                            } else {
                                contadoresPorLinea['Desconocida']++;
                            }
                            
                            registrosPrevios.push(ultimoRegistro);
                            consultasExitosas++;
                        } else {
                            console.log(`⚠️ No se encontró registro previo para ${medio.idCompleto}`);
                            mediosSinRegistroPrevio.push(medio.idCompleto);
                            consultasFallidas++;
                        }
                    }
                } catch (error) {
                    console.error(`❌ Error al buscar registros previos para ${clave}:`, error);
                    consultasFallidas += grupo.medios.length;
                    grupo.medios.forEach(medio => {
                        mediosSinRegistroPrevio.push(medio.idCompleto);
                    });
                }
            });
        }
        
        // Ejecutar todas las consultas en paralelo, pero con un límite de concurrencia
        const CONCURRENCIA_MAXIMA = 5;
        for (let i = 0; i < consultas.length; i += CONCURRENCIA_MAXIMA) {
            const lote = consultas.slice(i, i + CONCURRENCIA_MAXIMA);
            await Promise.all(lote.map(consulta => consulta()));
        }
        
        // Análisis detallado de registros por línea
        console.log('📊 ANÁLISIS DETALLADO DE REGISTROS PREVIOS POR LÍNEA:');
        console.log('=======================================================');
        
        let totalRegistrosContados = 0;
        for (const [linea, cantidad] of Object.entries(contadoresPorLinea)) {
            const porcentaje = (cantidad / registrosPrevios.length * 100).toFixed(2);
            const mediosTotales = MEDIOS_POR_LINEA[linea] || 0;
            const cobertura = mediosTotales > 0 ? (cantidad / mediosTotales * 100).toFixed(2) : 'N/A';
            
            console.log(`   - ${linea}: ${cantidad} registros (${porcentaje}% del total)`);
            console.log(`     * Medios configurados: ${mediosTotales}`);
            console.log(`     * Cobertura: ${cobertura}% de los medios tienen registro previo`);
            
            totalRegistrosContados += cantidad;
        }
        
        // Verificar si hay discrepancia en el conteo
        if (totalRegistrosContados !== registrosPrevios.length) {
            console.warn(`⚠️ Discrepancia en el conteo: ${totalRegistrosContados} vs ${registrosPrevios.length}`);
        }
        
        // Mostrar ejemplos completos de registros previos por línea
        console.log('📋 EJEMPLOS DE REGISTROS PREVIOS POR LÍNEA:');
        for (const [linea, ejemplos] of Object.entries(ejemplosRegistrosPorLinea)) {
            if (ejemplos.length > 0) {
                console.log(`   - ${linea}: ${ejemplos.length} ejemplos`);
                ejemplos.forEach((ejemplo, index) => {
                    console.log(`     * Ejemplo ${index + 1}: ${ejemplo.idCompleto}`);
                    console.log('       Estructura completa:', JSON.stringify(ejemplo));
                });
            }
        }
        
        // Análisis específico para Línea H
        const registrosLineaH = registrosPrevios.filter(r => r.linea === 'Línea H');
        console.log(`📊 ANÁLISIS ESPECÍFICO PARA LÍNEA H:`);
        console.log(`   - Registros totales para Línea H: ${registrosLineaH.length}`);
        
        // Agrupar por estación
        const estacionesLineaH = {};
        registrosLineaH.forEach(r => {
            if (!r.estacion) return;
            if (!estacionesLineaH[r.estacion]) estacionesLineaH[r.estacion] = 0;
            estacionesLineaH[r.estacion]++;
        });
        
        console.log(`   - Distribución por estaciones:`);
        Object.entries(estacionesLineaH).forEach(([estacion, cantidad]) => {
            console.log(`     * ${estacion}: ${cantidad} registros`);
        });
        
        // Verificar IDs de medios
        const idsLineaH = new Set(registrosLineaH.map(r => r.id));
        console.log(`   - IDs únicos de medios: ${idsLineaH.size}`);
        console.log(`   - Ejemplos de IDs: ${Array.from(idsLineaH).slice(0, 5).join(', ')}${idsLineaH.size > 5 ? '...' : ''}`);
        
        console.log('📊 Estadísticas de medios:');
        console.log(`   - Total de medios procesados: ${totalMedios}`);
        console.log(`   - Medios únicos identificados: ${mediosUnicos.size} (esperados: 422)`);
        console.log(`   - Registros previos encontrados: ${registrosPrevios.length}`);
        console.log(`   - Medios sin registro previo: ${mediosSinRegistroPrevio.length}`);
        console.log(`   - Tasa de éxito: ${(consultasExitosas/totalMedios*100).toFixed(2)}%`);
        
        // Registrar los medios sin registro previo para análisis posterior
        if (mediosSinRegistroPrevio.length > 0) {
            console.warn('⚠️ Medios sin registro previo:', mediosSinRegistroPrevio.slice(0, 10).join(', ') + 
                         (mediosSinRegistroPrevio.length > 10 ? ` y ${mediosSinRegistroPrevio.length - 10} más` : ''));
        }
        
        return registrosPrevios;
    } catch (error) {
        console.error('❌ Error al obtener registros previos:', error);
        console.error(error);
        return [];
    }
}

/**
 * Obtiene la lista de medios únicos de un conjunto de registros
 * @param {Array} registros - Registros del historial
 * @returns {Array} - Lista de nombres de medios únicos
 */
function obtenerMediosUnicos(registros) {
    const mediosUnicos = new Set();
    registros.forEach(registro => {
        if (registro.id) {
            mediosUnicos.add(registro.id);
        }
    });
    return Array.from(mediosUnicos);
}

/**
 * Obtiene los medios que no presentaron cambios en el período desde la colección estadoActual
 * @param {Array} mediosConCambios - Lista de medios que ya tienen registros en el período
 * @param {Date} fechaInicio - Fecha de inicio del período de análisis
 * @returns {Promise<Array>} - Promesa que se resuelve con registros simulados para los medios sin cambios
 */
async function obtenerMediosSinCambios(mediosConCambios, fechaInicio) {
    console.log('🔍 Buscando medios sin cambios en el período...');
    
    try {
        // 1. Obtener todos los medios de la colección estadoActual
        const snapshot = await db.collection('estadoActual').get();
        const mediosSinCambios = [];
        
        // 2. Filtrar los que no están en la lista de medios con cambios
        for (const doc of snapshot.docs) {
            const data = doc.data();
            const nombreMedio = data.nombre || doc.id;
            
            if (!mediosConCambios.includes(nombreMedio)) {
                console.log(`✅ Medio sin cambios encontrado: ${nombreMedio}`);
                
                // 3. Crear un registro simulado con el estado actual desde el inicio del período
                const registro = {
                    id: nombreMedio,
                    medioElevacion: nombreMedio,
                    linea: data.linea || 'Desconocida',
                    estacion: data.estacion || 'Desconocida',
                    tipo: data.tipo || 'Desconocido',
                    estado: data.funcionando ? 'Operativo' : 'No operativo',
                    timestamp: formatearFechaMicrosoftJSON(fechaInicio),
                    observaciones: 'Estado constante durante el período',
                    esSimulado: true // Marcamos que es un registro simulado
                };
                
                mediosSinCambios.push(registro);
            }
        }
        
        console.log(`🔄 Total de medios sin cambios: ${mediosSinCambios.length}`);
        return mediosSinCambios;
        
    } catch (error) {
        console.error('❌ Error al obtener medios sin cambios:', error);
        return [];
    }
}

/**
 * Carga y filtra los datos del historial de cambios
 * @param {Object} fechas - Objeto con fechas de inicio y fin
 * @returns {Promise<Object>} - Promesa que se resuelve con los datos filtrados
 */
async function cargarDatosHistorial(fechas) {
    try {
        console.log('🔍 Cargando datos del historial para el período:', fechas);
        
        // Validar fechas
        if (!fechas || !fechas.inicioUTC || !fechas.finUTC) {
            throw new Error('Fechas de inicio y fin son requeridas en formato UTC');
        }
        
        // Convertir fechas string a objetos Date
        const inicio = new Date(fechas.inicioUTC);
        const fin = new Date(fechas.finUTC);
        
        // Validar que las fechas sean válidas
        if (isNaN(inicio.getTime()) || isNaN(fin.getTime())) {
            throw new Error('Fechas inválidas: ' + fechas.inicioUTC + ' - ' + fechas.finUTC);
        }
        
        // Validar que la fecha de inicio sea anterior a la fecha de fin
        if (inicio >= fin) {
            throw new Error('La fecha de inicio debe ser anterior a la fecha de fin');
        }
        
        console.log(`📅 Período de análisis: ${inicio.toISOString()} - ${fin.toISOString()}`);
        console.log(`⏱️ Duración: ${((fin - inicio) / (1000 * 60 * 60)).toFixed(2)} horas`);
        
        // Obtener datos del historial
        console.time('Consulta historial');
        const historial = await obtenerHistorialCambios(inicio, fin);
        console.timeEnd('Consulta historial');
        console.log(`✅ Se cargaron ${historial.length} registros del historial`);
        
        // Obtener medios únicos del historial
        const mediosUnicos = obtenerMediosUnicos(historial);
        console.log(`✅ Se encontraron ${mediosUnicos.length} medios únicos en el historial`);
        
        // Obtener registros previos para cada medio
        console.time('Consulta registros previos');
        const registrosPrevios = await obtenerRegistrosPrevios(inicio);
        console.timeEnd('Consulta registros previos');
        console.log(`✅ Se encontraron ${registrosPrevios.length} registros previos`);
        
        // Verificar si hay medios sin registros previos
        const mediosConRegistrosPrevios = new Set(registrosPrevios.map(r => r.id));
        const mediosSinRegistrosPrevios = mediosUnicos.filter(id => !mediosConRegistrosPrevios.has(id));
        
        if (mediosSinRegistrosPrevios.length > 0) {
            console.warn(`⚠️ Hay ${mediosSinRegistrosPrevios.length} medios sin registros previos`);
            console.warn('⚠️ Ejemplos:', mediosSinRegistrosPrevios.slice(0, 5).join(', '));
        }
        
        // Verificar si hay registros duplicados
        const contadorRegistros = {};
        historial.forEach(registro => {
            const id = registro.id;
            const timestamp = registro.timestamp;
            const clave = `${id}-${timestamp}`;
            
            if (!contadorRegistros[clave]) {
                contadorRegistros[clave] = 1;
            } else {
                contadorRegistros[clave]++;
                console.warn(`⚠️ Registro duplicado encontrado para ${id} en ${timestamp}`);
            }
        });
        
        const registrosDuplicados = Object.entries(contadorRegistros)
            .filter(([_, count]) => count > 1)
            .map(([key, _]) => key);
        
        if (registrosDuplicados.length > 0) {
            console.warn(`⚠️ Se encontraron ${registrosDuplicados.length} registros duplicados`);
        }
        
        // Actualizar la estructura global
        datosHistorialFiltrados = {
            metadatos: {
                fechaInicio: inicio,
                fechaFin: fin,
                duracionHoras: (fin - inicio) / (1000 * 60 * 60),
                cantidadRegistros: historial.length,
                cantidadMediosUnicos: mediosUnicos.length,
                cantidadRegistrosPrevios: registrosPrevios.length,
                timestamp: new Date().toISOString()
            },
            documentos: {
                historial: historial,
                previos: registrosPrevios
            },
            procesados: {
                porMedio: {},
                porLinea: {},
                global: {}
            },
            estadisticas: {
                mediosSinRegistrosPrevios: mediosSinRegistrosPrevios.length,
                registrosDuplicados: registrosDuplicados.length
            }
        };
        
        console.log('✅ Datos del historial cargados y filtrados correctamente');
        return datosHistorialFiltrados;
    } catch (error) {
        console.error('❌ Error al cargar datos del historial:', error);
        
        // Crear una estructura de error detallada
        const errorData = {
            error: true,
            mensaje: error.message,
            stack: error.stack,
            fechas: fechas,
            timestamp: new Date().toISOString()
        };
        
        // Actualizar la estructura global con el error
        datosHistorialFiltrados = {
            error: errorData,
            metadatos: {
                fechaInicio: fechas ? new Date(fechas.inicioUTC) : null,
                fechaFin: fechas ? new Date(fechas.finUTC) : null,
                duracionHoras: 0,
                timestamp: new Date().toISOString()
            },
            documentos: {
                historial: [],
                previos: []
            },
            procesados: {
                porMedio: {},
                porLinea: {},
                global: {}
            }
        };
        
        throw errorData;
    }
}

/**
 * Verifica los registros disponibles para la Línea H
 * @param {Object} fechas - Objeto con fechas de inicio y fin
 * @returns {Promise<Object>} - Resultados de la verificación
 */
async function verificarRegistrosLineaH(fechas = null) {
    console.log('🔍 Verificando registros para la Línea H...');
    
    if (!fechas) {
        // Si no se proporcionan fechas, usar el último mes
        const hoy = new Date();
        const inicioMes = new Date(hoy.getFullYear(), hoy.getMonth() - 1, 1);
        const finMes = new Date(hoy.getFullYear(), hoy.getMonth(), 0, 23, 59, 59, 999);
        
        fechas = {
            inicio: inicioMes.toISOString().split('T')[0],
            fin: finMes.toISOString().split('T')[0],
            inicioUTC: inicioMes.toISOString(),
            finUTC: finMes.toISOString()
        };
    }
    
    console.log(`🔍 Verificando registros para la Línea H en el período: ${fechas.inicio} - ${fechas.fin}`);
    
    try {
        // Obtener todos los medios configurados para la Línea H
        const mediosLineaH = [];
        
        // Verificar si LISTA_MEDIOS está correctamente inicializado
        if (!LISTA_MEDIOS || typeof LISTA_MEDIOS !== 'object' || Object.keys(LISTA_MEDIOS).length === 0) {
            console.warn('⚠️ LISTA_MEDIOS no está inicializada correctamente, intentando cargarla...');
            await cargarListaMedios();
        }
        
        // Extraer los medios de la Línea H
        if (LISTA_MEDIOS && LISTA_MEDIOS['Línea H']) {
            // Si LISTA_MEDIOS tiene la estructura correcta con 'Línea H' como clave
            for (const estacion in LISTA_MEDIOS['Línea H']) {
                const mediosEstacion = LISTA_MEDIOS['Línea H'][estacion];
                if (Array.isArray(mediosEstacion)) {
                    mediosEstacion.forEach(medio => {
                        mediosLineaH.push({
                            id: medio.id,
                            nombre: medio.nombre || medio.id,
                            tipo: medio.tipo || 'Desconocido',
                            estacion: estacion
                        });
                    });
                }
            }
        } else {
            // Buscar medios de la Línea H en la estructura plana
            for (const id in LISTA_MEDIOS) {
                const medio = LISTA_MEDIOS[id];
                if (medio && medio.linea === 'Línea H') {
                    mediosLineaH.push({
                        id: id,
                        nombre: medio.nombre || id,
                        tipo: medio.tipo || 'Desconocido',
                        estacion: medio.estacion || 'Desconocida'
                    });
                }
            }
        }
        
        console.log(`📊 Total de medios configurados para la Línea H: ${mediosLineaH.length}`);
        
        if (mediosLineaH.length === 0) {
            console.warn('⚠️ No hay medios configurados para la Línea H en LISTA_MEDIOS');
            return { 
                error: 'No hay medios configurados para la Línea H',
                sugerencia: 'Verificar que la estructura de LISTA_MEDIOS sea correcta y que contenga medios para la Línea H'
            };
        }
        
        // Convertir fechas a timestamps para la consulta
        const inicioTimestamp = new Date(fechas.inicioUTC).getTime();
        const finTimestamp = new Date(fechas.finUTC).getTime();
        
        const inicioMicrosoftJSON = `/Date(${inicioTimestamp})/`;
        const finMicrosoftJSON = `/Date(${finTimestamp})/`;
        
        console.log(`🔄 Consultando con timestamps: ${inicioMicrosoftJSON} - ${finMicrosoftJSON}`);
        
        // Consultar registros para cada medio de la Línea H
        const resultados = {
            mediosConRegistros: 0,
            mediosSinRegistros: 0,
            totalRegistros: 0,
            registrosPorTipo: {
                Escalera: 0,
                Ascensor: 0,
                Otro: 0
            },
            registrosPorEstacion: {},
            detalles: []
        };
        
        // Consultar la colección historialCambios
        const historialRef = db.collection('historialCambios');
        
        // Agrupar medios por estación para consultas más eficientes
        const mediosPorEstacion = {};
        mediosLineaH.forEach(medio => {
            if (!mediosPorEstacion[medio.estacion]) {
                mediosPorEstacion[medio.estacion] = [];
            }
            mediosPorEstacion[medio.estacion].push(medio);
        });
        
        // Inicializar contador de registros por estación
        for (const estacion in mediosPorEstacion) {
            resultados.registrosPorEstacion[estacion] = 0;
        }
        
        // Realizar consultas por estación
        for (const estacion in mediosPorEstacion) {
            const mediosEstacion = mediosPorEstacion[estacion];
            console.log(`🔍 Consultando registros para ${mediosEstacion.length} medios en estación ${estacion}...`);
            
            // Consultar todos los registros de la estación en el período
            const consulta = await historialRef
                .where('linea', '==', 'Línea H')
                .where('estacion', '==', estacion)
                .where('timestamp', '>=', inicioMicrosoftJSON)
                .where('timestamp', '<=', finMicrosoftJSON)
                .get();
            
            const registrosEstacion = consulta.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            
            console.log(`✅ Se encontraron ${registrosEstacion.length} registros para la estación ${estacion}`);
            resultados.registrosPorEstacion[estacion] = registrosEstacion.length;
            resultados.totalRegistros += registrosEstacion.length;
            
            // Procesar cada medio de la estación
            for (const medio of mediosEstacion) {
                // Filtrar registros para este medio
                const registrosMedio = registrosEstacion.filter(r => r.id === medio.id);
                const cantidadRegistros = registrosMedio.length;
                
                // Actualizar contadores por tipo
                if (medio.tipo.includes('Escalera')) {
                    resultados.registrosPorTipo.Escalera += cantidadRegistros;
                } else if (medio.tipo.includes('Ascensor')) {
                    resultados.registrosPorTipo.Ascensor += cantidadRegistros;
                } else {
                    resultados.registrosPorTipo.Otro += cantidadRegistros;
                }
                
                // Agregar detalles del medio
                resultados.detalles.push({
                    id: medio.id,
                    nombre: medio.nombre,
                    tipo: medio.tipo,
                    estacion: estacion,
                    registros: cantidadRegistros,
                    ultimoRegistro: cantidadRegistros > 0 ? {
                        timestamp: registrosMedio[registrosMedio.length - 1].timestamp,
                        estado: registrosMedio[registrosMedio.length - 1].estado
                    } : null
                });
                
                if (cantidadRegistros > 0) {
                    resultados.mediosConRegistros++;
                } else {
                    resultados.mediosSinRegistros++;
                }
            }
        }
        
        // Ordenar los resultados por cantidad de registros (descendente)
        resultados.detalles.sort((a, b) => b.registros - a.registros);
        
        // Calcular porcentajes
        resultados.porcentajeConRegistros = ((resultados.mediosConRegistros / mediosLineaH.length) * 100).toFixed(1);
        resultados.porcentajeSinRegistros = ((resultados.mediosSinRegistros / mediosLineaH.length) * 100).toFixed(1);
        
        // Mostrar resumen
        console.log(`✅ Verificación completada para ${mediosLineaH.length} medios de la Línea H`);
        console.log(`📊 Medios con registros: ${resultados.mediosConRegistros} (${resultados.porcentajeConRegistros}%)`);
        console.log(`📊 Medios sin registros: ${resultados.mediosSinRegistros} (${resultados.porcentajeSinRegistros}%)`);
        console.log(`📊 Total de registros: ${resultados.totalRegistros}`);
        
        // Mostrar distribución por tipo
        console.log('📊 Registros por tipo:');
        for (const tipo in resultados.registrosPorTipo) {
            console.log(`  - ${tipo}: ${resultados.registrosPorTipo[tipo]} registros`);
        }
        
        // Mostrar distribución por estación
        console.log('📊 Registros por estación:');
        for (const estacion in resultados.registrosPorEstacion) {
            console.log(`  - ${estacion}: ${resultados.registrosPorEstacion[estacion]} registros`);
        }
        
        // Mostrar los 5 medios con más registros
        console.log('📊 Top 5 medios con más registros:');
        resultados.detalles.slice(0, 5).forEach((medio, index) => {
            console.log(`  ${index + 1}. ${medio.nombre} (${medio.tipo}) en ${medio.estacion}: ${medio.registros} registros`);
        });
        
        // Mostrar los 5 medios sin registros
        const mediosSinRegistros = resultados.detalles.filter(medio => medio.registros === 0);
        console.log(`📊 Ejemplos de medios sin registros (${mediosSinRegistros.length} en total):`);
        mediosSinRegistros.slice(0, 5).forEach((medio, index) => {
            console.log(`  ${index + 1}. ${medio.nombre} (${medio.tipo}) en ${medio.estacion}: 0 registros`);
        });
        
        // Agregar recomendaciones
        resultados.recomendaciones = [];
        
        if (resultados.mediosSinRegistros > resultados.mediosConRegistros) {
            resultados.recomendaciones.push(
                'La mayoría de los medios no tienen registros en el período analizado. ' +
                'Considere ampliar el rango de fechas o verificar la configuración de los medios.'
            );
        }
        
        if (resultados.totalRegistros === 0) {
            resultados.recomendaciones.push(
                'No se encontraron registros para ningún medio en el período analizado. ' +
                'Verifique que las fechas sean correctas y que existan datos en la colección historialCambios.'
            );
        }
        
        return resultados;
    } catch (error) {
        console.error('❌ Error al verificar registros para la Línea H:', error);
        return { 
            error: error.message,
            stack: error.stack
        };
    }
}

/**
 * Carga la lista de medios desde la colección estadoActual
 * @returns {Promise<boolean>} - Promesa que se resuelve cuando la lista está cargada
 */
async function cargarListaMedios() {
    console.log('🔍 Cargando lista de medios desde estadoActual...');
    
    try {
        // Obtener el único documento en estadoActual
        const snapshot = await db.collection('estadoActual').limit(1).get();
        
        if (snapshot.empty) {
            console.error('❌ No se encontró el documento estadoActual');
            return false;
        }
        
        // El documento tiene una propiedad 'estado' que es el array que necesitamos
        const documento = snapshot.docs[0].data();
        
        // Verificar la estructura del documento
        console.log('🔍 Estructura del documento estadoActual:', JSON.stringify(documento).substring(0, 300) + '...');
        
        // Corregir acceso a la estructura - PARTE CRÍTICA
        const estadoActual = documento.estado || [];
        
        if (!Array.isArray(estadoActual)) {
            console.error('❌ La propiedad "estado" no es un array o no existe:', estadoActual);
            return false;
        }
        
        // Inicializar la estructura de líneas y medios
        LISTA_MEDIOS = {};
        let totalMedios = 0;
        
        // Recorrer la estructura jerárquica
        for (const linea of estadoActual) {
            const nombreLinea = linea.nombre || 'Desconocida';
            LISTA_MEDIOS[nombreLinea] = {};
            
            if (linea.estaciones && Array.isArray(linea.estaciones)) {
                for (const estacion of linea.estaciones) {
                    const nombreEstacion = estacion.nombre || 'Desconocida';
                    LISTA_MEDIOS[nombreLinea][nombreEstacion] = [];
                    
                    if (estacion.accesos && Array.isArray(estacion.accesos)) {
                        for (const acceso of estacion.accesos) {
                            totalMedios++;
                            
                            // Determinar el tipo de medio según su ID
                            let tipoMedio = 'Otro';
                            const idMedio = acceso.nombre;
                            
                            // Clasificación correcta según el prefijo del ID
                            if (idMedio && typeof idMedio === 'string') {
                                if (idMedio.startsWith('E')) {
                                    tipoMedio = 'Escalera';
                                } else if (idMedio.startsWith('A')) {
                                    tipoMedio = 'Ascensor';
                                }
                            }
                            
                            // Añadir el medio a la lista
                            LISTA_MEDIOS[nombreLinea][nombreEstacion].push({
                                id: idMedio,
                                tipo: tipoMedio,
                                nombre: acceso.nombre || idMedio,
                                descripcion: acceso.descripcion || '',
                                estado: acceso.funcionando ? 'Operativo' : 'No operativo'
                            });
                        }
                    }
                }
            }
        }
        
        // Estadísticas para verificar la clasificación
        let totalEscaleras = 0;
        let totalAscensores = 0;
        let totalOtros = 0;
        
        // Contabilizar medios por tipo
        Object.keys(LISTA_MEDIOS).forEach(linea => {
            Object.keys(LISTA_MEDIOS[linea]).forEach(estacion => {
                LISTA_MEDIOS[linea][estacion].forEach(medio => {
                    if (medio.tipo === 'Escalera') totalEscaleras++;
                    else if (medio.tipo === 'Ascensor') totalAscensores++;
                    else totalOtros++;
                });
            });
        });
        
        console.log(`✅ Lista de medios cargada: ${totalMedios} medios en total`);
        console.log(`   - Escaleras: ${totalEscaleras}`);
        console.log(`   - Ascensores: ${totalAscensores}`);
        console.log(`   - Otros: ${totalOtros}`);
        
        return true;
    } catch (error) {
        console.error('❌ Error al cargar lista de medios:', error);
        console.error(error);
        return false;
    }
}

/**
 * Verifica si hay registros en historialCambios para todos los medios configurados
 * @param {Object} fechas - Objeto con fechas de inicio y fin (opcional)
 * @returns {Promise<Object>} - Resultados de la verificación
 */
async function verificarRegistrosTodosMedios(fechas = null) {
    console.log('🔍 Verificando registros para todos los medios configurados...');
    
    if (!fechas) {
        // Si no se proporcionan fechas, usar el último mes
        const hoy = new Date();
        const inicioMes = new Date(hoy.getFullYear(), hoy.getMonth() - 1, 1);
        const finMes = new Date(hoy.getFullYear(), hoy.getMonth(), 0, 23, 59, 59, 999);
        
        fechas = {
            inicio: inicioMes.toISOString().split('T')[0],
            fin: finMes.toISOString().split('T')[0],
            inicioUTC: inicioMes.toISOString(),
            finUTC: finMes.toISOString()
        };
    }
    
    console.log(`🔍 Verificando registros en el período: ${fechas.inicio} - ${fechas.fin}`);
    
    try {
        // Verificar si LISTA_MEDIOS está correctamente inicializado
        if (!LISTA_MEDIOS || typeof LISTA_MEDIOS !== 'object' || Object.keys(LISTA_MEDIOS).length === 0) {
            console.warn('⚠️ LISTA_MEDIOS no está inicializada correctamente, intentando cargarla...');
            await cargarListaMedios();
        }
        
        // Convertir fechas a timestamps para la consulta
        const inicioTimestamp = new Date(fechas.inicioUTC).getTime();
        const finTimestamp = new Date(fechas.finUTC).getTime();
        
        const inicioMicrosoftJSON = `/Date(${inicioTimestamp})/`;
        const finMicrosoftJSON = `/Date(${finTimestamp})/`;
        
        console.log(`🔄 Consultando con timestamps: ${inicioMicrosoftJSON} - ${finMicrosoftJSON}`);
        
        // Estructura para almacenar resultados
        const resultados = {
            totalMediosConfigurados: 0,
            mediosConRegistros: 0,
            mediosSinRegistros: 0,
            porLinea: {},
            detalles: []
        };
        
        // Inicializar contadores por línea
        for (const linea in MEDIOS_POR_LINEA) {
            resultados.porLinea[linea] = {
                configurados: MEDIOS_POR_LINEA[linea],
                conRegistros: 0,
                sinRegistros: 0,
                porcentajeCobertura: 0
            };
        }
        
        // Consultar la colección historialCambios para obtener todos los registros en el período
        console.log('🔍 Consultando todos los registros en historialCambios para el período...');
        const historialRef = db.collection('historialCambios');
        const consulta = await historialRef
            .where('timestamp', '>=', inicioMicrosoftJSON)
            .where('timestamp', '<=', finMicrosoftJSON)
            .get();
        
        const registrosHistorial = consulta.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));
        
        console.log(`✅ Se encontraron ${registrosHistorial.length} registros en total para el período`);
        
        // Crear un conjunto de IDs únicos de medios con registros
        const mediosConRegistros = new Set();
        const registrosPorMedio = {};
        
        registrosHistorial.forEach(registro => {
            const id = registro.id;
            if (!id) return;
            
            mediosConRegistros.add(id);
            
            if (!registrosPorMedio[id]) {
                registrosPorMedio[id] = [];
            }
            registrosPorMedio[id].push(registro);
        });
        
        console.log(`✅ Se encontraron ${mediosConRegistros.size} medios únicos con registros`);
        
        // Procesar cada línea
        for (const nombreLinea in MEDIOS_POR_LINEA) {
            console.log(`🔍 Procesando ${nombreLinea}...`);
            
            // Obtener todos los medios configurados para esta línea
            const mediosLineaConfigurados = [];
            
            // Verificar si LISTA_MEDIOS tiene la estructura esperada
            if (LISTA_MEDIOS[nombreLinea]) {
                // Estructura por línea y estación
                for (const estacion in LISTA_MEDIOS[nombreLinea]) {
                    const mediosEstacion = LISTA_MEDIOS[nombreLinea][estacion];
                    if (Array.isArray(mediosEstacion)) {
                        mediosEstacion.forEach(medio => {
                            mediosLineaConfigurados.push({
                                id: medio.id,
                                estacion: estacion,
                                tipo: medio.tipo || 'Desconocido'
                            });
                        });
                    }
                }
            } else {
                // Estructura plana
                for (const id in LISTA_MEDIOS) {
                    const medio = LISTA_MEDIOS[id];
                    if (medio && medio.linea === nombreLinea) {
                        mediosLineaConfigurados.push({
                            id: id,
                            estacion: medio.estacion || 'Desconocida',
                            tipo: medio.tipo || 'Desconocido'
                        });
                    }
                }
            }
            
            console.log(`✅ Se encontraron ${mediosLineaConfigurados.length} medios configurados para ${nombreLinea}`);
            
            // Verificar cuántos de estos medios tienen registros
            const mediosLineaConRegistros = [];
            const mediosLineaSinRegistros = [];
            
            mediosLineaConfigurados.forEach(medio => {
                if (mediosConRegistros.has(medio.id)) {
                    mediosLineaConRegistros.push({
                        ...medio,
                        registros: registrosPorMedio[medio.id] ? registrosPorMedio[medio.id].length : 0
                    });
                } else {
                    mediosLineaSinRegistros.push(medio);
                }
            });
            
            // Actualizar contadores
            resultados.totalMediosConfigurados += mediosLineaConfigurados.length;
            resultados.mediosConRegistros += mediosLineaConRegistros.length;
            resultados.mediosSinRegistros += mediosLineaSinRegistros.length;
            
            resultados.porLinea[nombreLinea].conRegistros = mediosLineaConRegistros.length;
            resultados.porLinea[nombreLinea].sinRegistros = mediosLineaSinRegistros.length;
            resultados.porLinea[nombreLinea].porcentajeCobertura = 
                mediosLineaConfigurados.length > 0 
                    ? (mediosLineaConRegistros.length / mediosLineaConfigurados.length * 100).toFixed(1)
                    : 0;
            
            // Agregar detalles para esta línea
            resultados.detalles.push({
                linea: nombreLinea,
                configurados: mediosLineaConfigurados.length,
                conRegistros: mediosLineaConRegistros.length,
                sinRegistros: mediosLineaSinRegistros.length,
                porcentajeCobertura: resultados.porLinea[nombreLinea].porcentajeCobertura,
                mediosConRegistros: mediosLineaConRegistros.slice(0, 10), // Limitar a 10 ejemplos
                mediosSinRegistros: mediosLineaSinRegistros.slice(0, 10)  // Limitar a 10 ejemplos
            });
        }
        
        // Calcular porcentajes globales
        resultados.porcentajeCoberturaGlobal = 
            resultados.totalMediosConfigurados > 0 
                ? (resultados.mediosConRegistros / resultados.totalMediosConfigurados * 100).toFixed(1)
                : 0;
        
        // Mostrar resumen
        console.log('📊 RESUMEN DE VERIFICACIÓN:');
        console.log(`- Total de medios configurados: ${resultados.totalMediosConfigurados}`);
        console.log(`- Medios con registros: ${resultados.mediosConRegistros} (${resultados.porcentajeCoberturaGlobal}%)`);
        console.log(`- Medios sin registros: ${resultados.mediosSinRegistros}`);
        
        // Mostrar resumen por línea
        console.log('📊 RESUMEN POR LÍNEA:');
        for (const linea in resultados.porLinea) {
            const datos = resultados.porLinea[linea];
            console.log(`- ${linea}: ${datos.conRegistros} de ${datos.configurados} medios tienen registros (${datos.porcentajeCobertura}%)`);
        }
        
        // Análisis específico para Línea H
        const detalleLineaH = resultados.detalles.find(d => d.linea === 'Línea H');
        if (detalleLineaH) {
            console.log('📊 ANÁLISIS DETALLADO PARA LÍNEA H:');
            console.log(`- Medios configurados: ${detalleLineaH.configurados}`);
            console.log(`- Medios con registros: ${detalleLineaH.conRegistros} (${detalleLineaH.porcentajeCobertura}%)`);
            console.log(`- Medios sin registros: ${detalleLineaH.sinRegistros}`);
            
            if (detalleLineaH.mediosConRegistros.length > 0) {
                console.log('- Ejemplos de medios con registros:');
                detalleLineaH.mediosConRegistros.forEach((medio, index) => {
                    console.log(`  ${index + 1}. ${medio.id} (${medio.estacion}): ${medio.registros} registros`);
                });
            }
            
            if (detalleLineaH.mediosSinRegistros.length > 0) {
                console.log('- Ejemplos de medios sin registros:');
                detalleLineaH.mediosSinRegistros.forEach((medio, index) => {
                    console.log(`  ${index + 1}. ${medio.id} (${medio.estacion})`);
                });
            }
            
            // Verificar si hay un problema de cobertura
            if (detalleLineaH.porcentajeCobertura < 20) {
                console.warn('⚠️ ALERTA: La cobertura de datos para la Línea H es muy baja');
                console.log('💡 SOLUCIÓN: Verificar la configuración de los medios de la Línea H');
                console.log('💡 SOLUCIÓN: Verificar si hay problemas en la recolección de datos para la Línea H');
                console.log('💡 SOLUCIÓN: Ampliar el rango de fechas para incluir más registros históricos');
            }
        }
        
        return resultados;
    } catch (error) {
        console.error('❌ Error al verificar registros para todos los medios:', error);
        return { 
            error: error.message,
            stack: error.stack
        };
    }
}

// Exportar funciones y variables
window.dbInterface = {
    inicializarFirebase,
    cargarDatosHistorial,
    obtenerHistorialCambios,
    obtenerRegistrosPrevios,
    obtenerMediosSinCambios,
    normalizarTimestamp,
    formatearFechaMicrosoftJSON,
    MEDIOS_POR_LINEA,
    LISTA_MEDIOS,
    datosHistorialFiltrados,
    verificarRegistrosLineaH,
    cargarListaMedios,
    verificarRegistrosTodosMedios
}; 