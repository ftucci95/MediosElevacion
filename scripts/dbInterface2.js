/* Pide datos a la base de datos de firebase. 
Habla con la tabla "historialCambios", pidiendole los datos recortados por fechas. 
Además infiere el estado inicial para el período de análisis.
Responde con un objeto que es un array de objetos. Cada objeto tiene los siguientes atributos:
- datetime: fecha y hora en formato JSON de Microsoft
- estado: 'activo' o 'inactivo'
- linea: 'Línea A' o 'Línea B',... etc
- Estación: nombre de la estación
- Medio de elevación: identificador del medio.
*/

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
let datosHistorial = []; //esta variable no se está usando
let LISTA_MEDIOS = {};
let DATOS_MEDIOS = {};
let ESTADO_ACTUAL_CACHE = new Map(); // Nuevo mapa para caché del estado actual
let totalMedios = 0;

/**
 * Carga el estado actual en la caché
 * @returns {Promise<boolean>} - Promesa que se resuelve cuando la caché está cargada
 */
async function cargarEstadoActualCache() {
    try {
        const snapshot = await db.collection('estadoActual').limit(1).get();
        
        if (snapshot.empty) {
            console.error('❌ No se encontró el documento estadoActual');
            return false;
        }
        
        const estadoActual = snapshot.docs[0].data().estado || [];
        
        // Limpiar la caché anterior
        ESTADO_ACTUAL_CACHE.clear();
        
        // Cargar el estado actual en el mapa
        estadoActual.forEach(linea => {
            if (linea.estaciones) {
                linea.estaciones.forEach(estacion => {
                    if (estacion.accesos) {
                        estacion.accesos.forEach(acceso => {
                            const clave = `${linea.nombre}-${estacion.nombre}-${acceso.nombre}`;
                            ESTADO_ACTUAL_CACHE.set(clave, acceso.funcionando ? 'Operativo' : 'No operativo');
                        });
                    }
                });
            }
        });
        
        console.log(`✅ Caché de estado actual cargada: ${ESTADO_ACTUAL_CACHE.size} medios`);
        return true;
    } catch (error) {
        console.error('❌ Error al cargar caché de estado actual:', error);
        return false;
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
        //console.log('🔍 Estructura del documento estadoActual:', JSON.stringify(documento).substring(0, 300) + '...');
        
        // Acceso a la estructura - PARTE CRÍTICA
        const estadoActual = documento.estado || [];
        
        if (!Array.isArray(estadoActual)) {
            console.error('❌ La propiedad "estado" no es un array o no existe:', estadoActual);
            return false;
        }
        
        // Inicializar la estructura de líneas y medios
        LISTA_MEDIOS = {};
        totalMedios = 0;
        
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
                                descripcion: acceso.descripcion.trimStart() || '',
                                estado: acceso.funcionando ? 'Operativo' : 'No operativo',
                                fechaActualizacion: acceso.fechaActualizacion
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
        await Promise.all([
            cargarListaMedios(),
            cargarEstadoActualCache()
        ]);
        
        return true;
    } catch (error) {
        console.error('❌ Error al inicializar Firebase:', error);
        return false;
    }
}

function formatearFechaMicrosoftJSON(fecha) {
    // Obtener el timestamp en UTC
    const timestampUTC = fecha.getTime();
    
    // Ajustar para Argentina (UTC-3)
    const timestampArgentina = timestampUTC; // + (3 * 60 * 60 * 1000)
    
    return `\/Date(${timestampArgentina}-0300)\/`;
}

/**
 * Obtiene los datos del historial de cambios
 * @param {Date} inicio - Fecha de inicio del período
 * @param {Date} fin - Fecha de fin del período
 * @returns {Promise<Array>} - Promesa que se resuelve con los registros del historial
 */
async function obtenerHistorialCambios(inicio, fin) {
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
 * Obtiene los últimos registros previos a una fecha para todos los medios
 * @param {Date} inicio - Fecha de inicio en formato Date
 * @returns {Promise<Array>} - Array con los últimos registros previos de cada medio
 */
async function obtenerRegistrosPrevios(inicio) {
    console.log('🔍 Buscando registros previos a:', inicio.toISOString());
    
    try {
        const registrosPrevios = [];
        const inicioMicrosoftJSON = formatearFechaMicrosoftJSON(inicio);
        
        // Agrupar medios por línea y estación para consultas más eficientes
        const mediosPorLineaEstacion = new Map();
        
        // Primero agrupamos todos los medios por línea y estación
        for (const [nombreLinea, estaciones] of Object.entries(LISTA_MEDIOS)) {
            for (const [nombreEstacion, medios] of Object.entries(estaciones)) {
                const clave = `${nombreLinea}-${nombreEstacion}`;
                if (!mediosPorLineaEstacion.has(clave)) {
                    mediosPorLineaEstacion.set(clave, {
                        linea: nombreLinea,
                        estacion: nombreEstacion,
                        medios: []
                    });
                }
                mediosPorLineaEstacion.get(clave).medios.push(...medios);
            }
        }
        
        // Crear un array de promesas para las consultas
        const consultas = Array.from(mediosPorLineaEstacion.entries()).map(async ([clave, grupo]) => {
            try {
                // Consulta para todos los medios de esta línea y estación
                const query = await db.collection('historialCambios')
                    .where('linea', '==', grupo.linea)
                    .where('estacion', '==', grupo.estacion)
                    .where('timestamp', '<', inicioMicrosoftJSON)
                    .orderBy('timestamp', 'desc')
                    .get();
                
                const documentos = query.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                
                // Para cada medio, encontrar su último registro
                const registrosGrupo = [];
                for (const medio of grupo.medios) {
                    const ultimoRegistro = documentos.find(doc => doc.id === medio.id);
                    
                    if (ultimoRegistro) {
                        registrosGrupo.push({
                            id: medio.id,
                            estado: ultimoRegistro.estado,
                            timestamp: ultimoRegistro.timestamp,
                            medioElevacion: ultimoRegistro.medioElevacion,
                            timestampResolucion: ultimoRegistro.timestampResolucion,
                            linea: grupo.linea,
                            estacion: grupo.estacion,
                            tipo: medio.tipo //este es el único que me trae dudas.
                        });
                    } else {
                        // Usar la caché para obtener el estado actual
                        const estadoActual = consultarEstadoActual(grupo.linea, grupo.estacion, medio.id);
                        console.warn(`⚠️ No se encontró registro previo para: ${grupo.linea}/${grupo.estacion}/${medio.id}`);
                        registrosGrupo.push({
                            id: medio.id,
                            estado: estadoActual,
                            timestamp: formatearFechaMicrosoftJSON(new Date(0)),
                            medioElevacion: medio.nombre,
                            timestampResolucion: null,
                            linea: grupo.linea,
                            estacion: grupo.estacion,
                            tipo: medio.tipo
                        });
                    }
                }
                return registrosGrupo;
            } catch (error) {
                console.error(`❌ Error al buscar registros previos para ${clave}:`, error);
                return []; // Retornar array vacío en caso de error
            }
        });
        
        // Ejecutar todas las consultas en paralelo
        const resultados = await Promise.all(consultas);
        
        // Aplanar los resultados y agregarlos a registrosPrevios
        for (const registrosGrupo of resultados) {
            registrosPrevios.push(...registrosGrupo);
        }
        
        // Ordenar registros por timestamp
        registrosPrevios.sort((a, b) => {
            const timestampA = new Date(a.timestamp.replace('/Date(', '').replace(')/', '')).getTime();
            const timestampB = new Date(b.timestamp.replace('/Date(', '').replace(')/', '')).getTime();
            return timestampB - timestampA;
        });
        
        console.log(`✅ Se encontraron ${registrosPrevios.length} registros previos en total`);
        return registrosPrevios;
        
    } catch (error) {
        console.error('❌ Error al obtener registros previos:', error);
        throw error;
    }
}

/**
 * Exporta la variable DATOS_MEDIOS a un archivo de texto legible y realiza análisis
 */
function exportarDatosMediosATexto() {
    console.log('📝 Exportando DATOS_MEDIOS a archivo de texto...');
    
    let contenido = '=== DATOS_MEDIOS ===\n\n';
    
    // Variables para análisis
    let totalMedios = 0;
    let mediosSinRegistros = 0;
    let medioConMasRegistros = {
        clave: '',
        cantidad: 0
    };
    let inconsistenciasFormato = {
        estados: new Set(),
        timestamps: new Set(),
        tipos: new Set()
    };
    
    // Procesar cada medio
    Object.entries(DATOS_MEDIOS).forEach(([claveMedio, medio]) => {
        totalMedios++;
        
        // Contar registros no previos
        const registrosDelPeriodo = medio.registros.filter(r => !r.esPrevio);
        if (registrosDelPeriodo.length === 0) {
            mediosSinRegistros++;
        }
        
        // Verificar si es el medio con más registros
        if (registrosDelPeriodo.length > medioConMasRegistros.cantidad) {
            medioConMasRegistros = {
                clave: claveMedio,
                cantidad: registrosDelPeriodo.length,
                tipo: medio.tipo,
                linea: medio.linea,
                estacion: medio.estacion
            };
        }
        
        // Recolectar formatos para análisis de inconsistencias
        medio.registros.forEach(reg => {
            inconsistenciasFormato.estados.add(reg.estado);
            inconsistenciasFormato.timestamps.add(reg.timestamp.slice(0, 6)); // Formato inicial
            inconsistenciasFormato.tipos.add(medio.tipo);
        });

        // Generar contenido del archivo
        contenido += `📍 ${claveMedio}\n`;
        contenido += `ID: ${medio.id}\n`;
        contenido += `Línea: ${medio.linea}\n`;
        contenido += `Estación: ${medio.estacion}\n`;
        contenido += `Tipo: ${medio.tipo}\n`;
        contenido += 'Registros:\n';
        
        medio.registros.forEach((reg, index) => {
            contenido += `\n  ${index + 1}. Timestamp: ${reg.timestamp}\n`;
            contenido += `     Estado: ${reg.estado}\n`;
            contenido += `     Es previo: ${reg.esPrevio}\n`;
            if (reg.medioElevacion) contenido += `     Descripción: ${reg.medioElevacion}\n`;
            if (reg.timestampResolucion) contenido += `     Resolución: ${reg.timestampResolucion}\n`;
        });
        
        contenido += '\n' + '='.repeat(50) + '\n\n';
    });

    // Imprimir análisis en consola
    console.log('\n📊 ANÁLISIS DE DATOS_MEDIOS:');
    console.log(`Total de medios: ${totalMedios}`);
    console.log(`Medios sin registros en el período: ${mediosSinRegistros}`);
    console.log('\nMedio con más registros:');
    console.log(`- Clave: ${medioConMasRegistros.clave}`);
    console.log(`- Cantidad: ${medioConMasRegistros.cantidad} registros`);
    console.log(`- Tipo: ${medioConMasRegistros.tipo}`);
    console.log(`- Línea: ${medioConMasRegistros.linea}`);
    console.log(`- Estación: ${medioConMasRegistros.estacion}`);
    
    console.log('\nAnálisis de formatos:');
    console.log('Estados encontrados:', Array.from(inconsistenciasFormato.estados));
    console.log('Formatos de timestamp:', Array.from(inconsistenciasFormato.timestamps));
    console.log('Tipos de medios:', Array.from(inconsistenciasFormato.tipos));

    // Crear el archivo usando la fecha actual en el nombre
    const fecha = new Date().toISOString().replace(/[:.]/g, '-');
    const nombreArchivo = `datos_medios_${fecha}.txt`;

    // Crear un blob con el contenido
    const blob = new Blob([contenido], { type: 'text/plain' });
    
    // Crear un link para descargar el archivo
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = nombreArchivo;
    
    // Agregar el link al documento, hacer click y removerlo
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    // Liberar el objeto URL
    URL.revokeObjectURL(link.href);
    
    console.log(`\n✅ Archivo ${nombreArchivo} creado y descargado`);
}

async function cargarDatos() {
    try {
        // Obtener fechas desde los elementos DOM
        const fechaInicioInput = document.getElementById('fechaInicio').value;
        const fechaFinInput = document.getElementById('fechaFin').value;

        if (!fechaInicioInput || !fechaFinInput) {
            throw new Error('Las fechas de inicio y fin son requeridas');
        }   

        // Convertir fechas a objetos Date en horario de Argentina (UTC-3)
        // Primero creamos las fechas en UTC
        const inicioUTC = new Date(fechaInicioInput + 'T00:00:00.000Z');
        const finUTC = new Date(fechaFinInput + 'T00:00:00.000Z');

        // Luego ajustamos para Argentina (UTC-3)
        const inicio = new Date(inicioUTC.getTime() + (3 * 60 * 60 * 1000)); //si quedara alguna duda tengo que borrar estas 2 sumas.
        const fin = new Date(finUTC.getTime() + (3 * 60 * 60 * 1000));

        // Validar que las fechas sean válidas
        if (isNaN(inicio.getTime()) || isNaN(fin.getTime())) {
            throw new Error('Fechas inválidas');
        }

        // Validar que la fecha de inicio sea anterior a la fecha de fin
        if (inicio >= fin) {
            throw new Error('La fecha de inicio debe ser anterior a la fecha de fin');
        }

        // Obtener fechas y mostrarlas
        console.log(`📅 Período de análisis: ${inicio} - ${fin}`);
        console.log(`⏱️ Duración: ${((fin - inicio) / (1000 * 60 * 60)).toFixed(2)} horas`);
        
        // Obtener datos del historial
        console.time('Consulta historial');
        datosHistorial = await obtenerHistorialCambios(inicio, fin);
        console.timeEnd('Consulta historial');
        console.log(`✅ Se cargaron ${datosHistorial.length} registros del historial`);

        // Obtener registros previos
        console.time('Consulta registros previos');
        const registrosPrevios = await obtenerRegistrosPrevios(inicio);
        console.timeEnd('Consulta registros previos');
        console.log(`✅ Se encontraron ${registrosPrevios.length} registros previos`);

        // Agrupar los datos
        console.time('Registros agrupados.');
        DATOS_MEDIOS = agruparDatosMedios(datosHistorial, registrosPrevios);
        console.timeEnd('Registros agrupados.');
        console.log(`✅ Se agruparon ${Object.keys(DATOS_MEDIOS).length} medios en DATOS_MEDIOS`);
        
        // Verificar el estado de DATOS_MEDIOS después de cargarlo
        console.log('🔍 Estado de DATOS_MEDIOS después de cargar:');
        console.log(`   - Existe: ${!!DATOS_MEDIOS}`);
        console.log(`   - Cantidad de medios: ${Object.keys(DATOS_MEDIOS).length}`);
        if (Object.keys(DATOS_MEDIOS).length > 0) {
            const primerMedio = Object.entries(DATOS_MEDIOS)[0];
            console.log(`   - Ejemplo de medio: ${primerMedio[0]}`);
            console.log(`   - Cantidad de registros: ${primerMedio[1].registros.length}`);
        }

        return DATOS_MEDIOS;
    } catch (error) {
        console.error('❌ Error al cargar datos:', error);
        throw error;
    }
}

/**
 * Identifica el tipo de medio basado en su ID
 * @param {string} id - ID del medio de elevación
 * @returns {string} - Tipo de medio (Escalera, Ascensor, Salvaescalera u Otro)
 */
function identificarTipoMedio(id) {
    if (!id) {
        return 'Otro';
    }
    // Clasificar según el prefijo del ID
    let tipo = 'Otro';
    if (id.startsWith('E')) {
        tipo = 'Escalera';
    } else if (id.startsWith('A')) {
        tipo = 'Ascensor';
    } else if (id.startsWith('S')) {
        tipo = 'Salvaescalera';
    } else {
        // Loguear IDs no reconocidos para análisis
        console.warn(`⚠️ Tipo no reconocido para ID: ${id}`);
    }
    return tipo;
}

/**
 * Agrupa los datos del historial y registros previos por medio
 * @param {Array} historial - Registros del historial
 * @param {Array} registrosPrevios - Registros previos
 * @returns {Object} - Datos agrupados por medio
 */
function agruparDatosMedios(historial, registrosPrevios) {
    const datosMedios = {};

    // Primero procesamos los registros previos
    registrosPrevios.forEach(registro => {
        // Usar una clave compuesta para identificar medios únicos
        const claveMedio = `${registro.linea}-${registro.estacion}-${registro.id}`;
        
        if (!datosMedios[claveMedio]) {
            datosMedios[claveMedio] = {
                id: registro.id,
                linea: registro.linea || 'Desconocida',
                estacion: registro.estacion || 'Desconocida',
                tipo: identificarTipoMedio(registro.id),
                registros: []
            };
        }
        datosMedios[claveMedio].registros.push({
            timestamp: registro.timestamp,
            estado: registro.estado,
            esPrevio: true,
            medioElevacion: registro.medioElevacion,
            timestampResolucion: registro.timestampResolucion
        });
    });

    // Luego procesamos el historial
    historial.forEach(registro => {
        const claveMedio = `${registro.linea}-${registro.estacion}-${registro.id}`;
        
        if (!datosMedios[claveMedio]) {
            datosMedios[claveMedio] = {
                id: registro.id,
                linea: registro.linea || 'Desconocida',
                estacion: registro.estacion || 'Desconocida',
                tipo: identificarTipoMedio(registro.id),
                registros: []
            };
        }
        datosMedios[claveMedio].registros.push({
            timestamp: registro.timestamp,
            estado: registro.estado,
            esPrevio: false,
            medioElevacion: registro.medioElevacion,
            timestampResolucion: registro.timestampResolucion
        });
    });

    // Ordenar registros por timestamp para cada medio
    Object.values(datosMedios).forEach(medio => {
        medio.registros.sort((a, b) => {
            const timestampA = new Date(a.timestamp.replace('/Date(', '').replace(')/', '')).getTime();
            const timestampB = new Date(b.timestamp.replace('/Date(', '').replace(')/', '')).getTime();
            return timestampA - timestampB;
        });
    });

    return datosMedios;
}

/**
 * Consulta el estado actual de un medio específico usando la caché
 * @param {string} nombreLinea - Nombre de la línea
 * @param {string} nombreEstacion - Nombre de la estación
 * @param {string} idMedio - ID del medio de elevación
 * @returns {string} - Estado del medio ('Operativo' o 'No operativo')
 */
function consultarEstadoActual(nombreLinea, nombreEstacion, idMedio) {
    const clave = `${nombreLinea}-${nombreEstacion}-${idMedio}`;
    return ESTADO_ACTUAL_CACHE.get(clave) || 'No operativo';
}

// Exportar funciones y variables
window.dbInterface = {
    inicializarFirebase,
    cargarListaMedios,
    obtenerHistorialCambios,
    obtenerRegistrosPrevios,
    formatearFechaMicrosoftJSON,
    LISTA_MEDIOS,
    get DATOS_MEDIOS() { return DATOS_MEDIOS; },
    cargarDatos,
    agruparDatosMedios,
    consultarEstadoActual,
    exportarDatosMediosATexto,
}; 