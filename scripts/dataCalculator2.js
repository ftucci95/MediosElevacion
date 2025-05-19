// Variables globales para almacenar los resultados de los cálculos
let TIEMPOS_MEDIOS = {};
let INDICADORES_MEDIOS = {};
let INDICADORES_RED = {
    MTTR_red: 0,
    MTTF_red: 0,
    mediosConFallas: 0,
    Disponibilidad: 0
};
let INDICADORES_LINEA = {
    DisponibilidadTotal: 0,
    DisponibilidadAsc: 0,
    DisponibilidadEsc: 0,
    tDetenidoAsc: 0,
    tDetenidoEsc: 0,
}
let INDICADORES_TIPO_MEDIO = {
    DisponibilidadTotal: 0,
    DisponibilidadAsc: 0,
    DisponibilidadEsc: 0,
    tDetenidoAsc: 0,
    tDetenidoEsc: 0,
}

/* // Variables globales para indicadores por línea
let INDICADORES_LineaA = {
    DisponibilidadTotal: 0,
    DisponibilidadAsc: 0,
    DisponibilidadEsc: 0,
    tDetenidoAsc: 0,
    tDetenidoEsc: 0,
    DetencionesAsc: 0,
    DetencionesEsc: 0,
    DetencionesLargasAsc: 0,
    DetencionesLargasEsc: 0,
    MTTFAsc: 0,
    MTTFEsc: 0,
    MTTRAsc: 0,
    MTTREsc: 0
};

let INDICADORES_LineaB = {
    DisponibilidadTotal: 0,
    DisponibilidadAsc: 0,
    DisponibilidadEsc: 0,
    tDetenidoAsc: 0,
    tDetenidoEsc: 0,
    DetencionesAsc: 0,
    DetencionesEsc: 0,
    DetencionesLargasAsc: 0,
    DetencionesLargasEsc: 0,
    MTTFAsc: 0,
    MTTFEsc: 0,
    MTTRAsc: 0,
    MTTREsc: 0
};

let INDICADORES_LineaC = {
    DisponibilidadTotal: 0,
    DisponibilidadAsc: 0,
    DisponibilidadEsc: 0,
    tDetenidoAsc: 0,
    tDetenidoEsc: 0,
    DetencionesAsc: 0,
    DetencionesEsc: 0,
    DetencionesLargasAsc: 0,
    DetencionesLargasEsc: 0,
    MTTFAsc: 0,
    MTTFEsc: 0,
    MTTRAsc: 0,
    MTTREsc: 0
};

let INDICADORES_LineaD = {
    DisponibilidadTotal: 0,
    DisponibilidadAsc: 0,
    DisponibilidadEsc: 0,
    tDetenidoAsc: 0,
    tDetenidoEsc: 0,
    DetencionesAsc: 0,
    DetencionesEsc: 0,
    DetencionesLargasAsc: 0,
    DetencionesLargasEsc: 0,
    MTTFAsc: 0,
    MTTFEsc: 0,
    MTTRAsc: 0,
    MTTREsc: 0
};

let INDICADORES_LineaE = {
    DisponibilidadTotal: 0,
    DisponibilidadAsc: 0,
    DisponibilidadEsc: 0,
    tDetenidoAsc: 0,
    tDetenidoEsc: 0,
    DetencionesAsc: 0,
    DetencionesEsc: 0,
    DetencionesLargasAsc: 0,
    DetencionesLargasEsc: 0,
    MTTFAsc: 0,
    MTTFEsc: 0,
    MTTRAsc: 0,
    MTTREsc: 0
};

let INDICADORES_LineaH = {
    DisponibilidadTotal: 0,
    DisponibilidadAsc: 0,
    DisponibilidadEsc: 0,
    tDetenidoAsc: 0,
    tDetenidoEsc: 0,
    DetencionesAsc: 0,
    DetencionesEsc: 0,
    DetencionesLargasAsc: 0,
    DetencionesLargasEsc: 0,
    MTTFAsc: 0,
    MTTFEsc: 0,
    MTTRAsc: 0,
    MTTREsc: 0
}; */

/**
 * Convierte timestamp de Microsoft JSON Date a Date
 * @param {string} timestamp - Timestamp en formato '/Date(milisegundos)/'
 * @returns {Date|null} - Objeto Date o null si el timestamp es inválido
 */
function convertirTimestamp(timestamp) {
    try {
        const ms = parseInt(timestamp.replace('/Date(', '').replace(')/', ''));
        const fecha = new Date(ms);
        if (isNaN(fecha.getTime())) {
            throw new Error('Fecha inválida');
        }
        return fecha;
    } catch (error) {
        console.error(`Error al convertir timestamp: ${timestamp}`, error);
        return null;
    }
}

function convertirTimestamp2(timestamp) {
    try {
        // Si ya es un objeto Date, retornarlo directamente
        if (timestamp instanceof Date) {
            console.log('🔍 ConvertirTimestamp2 - Ya es un objeto Date, retornando directamente');
            return timestamp;
        }
        
        // Extraer el timestamp y el offset
        const match = timestamp.match(/\/Date\((\d+)([+-]\d{4})?\)\//);
        if (!match) {
            throw new Error('Formato de timestamp inválido');
        }

        const ms = parseInt(match[1]);
        const offset = match[2] ? parseInt(match[2]) : 0;

        // Crear la fecha considerando el offset
        const fecha = new Date(ms);
        
        // No necesitamos ajustar el offset porque JavaScript ya lo aplica automáticamente
        // al crear el objeto Date con el timestamp en milisegundos
        
        if (isNaN(fecha.getTime())) {
            throw new Error('Fecha inválida');
        }
        return fecha;
    } catch (error) {
        console.error(`Error al convertir timestamp: ${timestamp}`, error);
        return null;
    }
}

/**
 * Ordena una lista de registros por timestamp de manera eficiente
 * @param {Array} registros - Lista de registros a ordenar
 * @returns {Array} - Lista de registros ordenados por timestamp
 */
function ordenarRegistrosPorTimestamp(registros) {
    // Crear un mapa para almacenar los timestamps convertidos
    const timestampsMap = new Map();
    
    // Convertir timestamps una sola vez y almacenarlos en el mapa
    registros.forEach(registro => {
        if (!timestampsMap.has(registro.timestamp)) {
            const match = registro.timestamp.match(/\/Date\((\d+)([+-]\d{4})?\)\//);
            if (match) {
                const ms = parseInt(match[1]);
                const offset = match[2] ? parseInt(match[2]) : 0;
                timestampsMap.set(registro.timestamp, { ms, offset });
            }
        }
    });
    
    // Ordenar los registros usando los timestamps del mapa
    return [...registros].sort((a, b) => {
        const tsA = timestampsMap.get(a.timestamp);
        const tsB = timestampsMap.get(b.timestamp);
        
        if (!tsA || !tsB) return 0;
        
        // Comparar los timestamps en milisegundos
        return tsA.ms - tsB.ms;
    });
}

/**
 * Calcula el tiempo total del análisis en segundos
 * @returns {number} - Cantidad de segundos entre fechaInicio y fechaFin
 */
function tiempoTotalAnalisisSegundos() {
    // ojo con esta función; para la disponibilidad total puede dar valores equivocados porque no todos los medios tienen el mismo tiempo de servicio
    const fechaInicio = new Date(document.getElementById('fechaInicio').value);
    const fechaFin = new Date(document.getElementById('fechaFin').value);
    
    // Validar fechas
    if (isNaN(fechaInicio.getTime()) || isNaN(fechaFin.getTime())) {
        throw new Error('Las fechas de inicio y fin son inválidas');
    }
    
    // Calcular diferencia en milisegundos y convertir a segundos
    return (fechaFin - fechaInicio) / 1000;
}

// Constante con los horarios de servicio por día
const HORARIOS_SERVICIO = {
    'Línea A': {
        Lunes: {
            inicio: '05:30',
            fin: '24:00'
        },
        Martes: {
            inicio: '05:30',
            fin: '24:00'
        },
        Miercoles: {
            inicio: '05:30',
            fin: '24:00'
        },
        Jueves: {
            inicio: '05:30',
            fin: '24:00'
        },
        Viernes: {
            inicio: '05:30',
            fin: '24:00'
        },
        Sabado: {
            inicio: '06:00',
            fin: '24:30'
        },
        Domingo: {
            inicio: '08:00',
            fin: '23:00'
        },
        Feriado: {
            inicio: '08:00',
            fin: '23:00'
        }
    },
    'Línea B': {
        Lunes: {
            inicio: '05:30',
            fin: '24:00'
        },
        Martes: {
            inicio: '05:30',
            fin: '24:00'
        },
        Miercoles: {
            inicio: '05:30',
            fin: '24:00'
        },
        Jueves: {
            inicio: '05:30',
            fin: '24:00'
        },
        Viernes: {
            inicio: '05:30',
            fin: '26:00'
        },
        Sabado: {
            inicio: '06:00',
            fin: '26:00'
        },
        Domingo: {
            inicio: '08:00',
            fin: '23:00'
        },
        Feriado: {
            inicio: '08:00',
            fin: '23:00'
        }
    },
    'Línea C': {
        Lunes: {
            inicio: '05:30',
            fin: '24:00'
        },
        Martes: {
            inicio: '05:30',
            fin: '24:00'
        },
        Miercoles: {
            inicio: '05:30',
            fin: '24:00'
        },
        Jueves: {
            inicio: '05:30',
            fin: '24:00'
        },
        Viernes: {
            inicio: '05:30',
            fin: '24:00'
        },
        Sabado: {
            inicio: '06:00',
            fin: '24:30'
        },
        Domingo: {
            inicio: '08:00',
            fin: '23:00'
        },
        Feriado: {
            inicio: '08:00',
            fin: '23:00'
        }     
    },
    'Línea D': {
        Lunes: {
            inicio: '05:30',
            fin: '24:00'
        },
        Martes: {
            inicio: '05:30',
            fin: '24:00'
        },
        Miercoles: {
            inicio: '05:30',
            fin: '24:00'
        },
        Jueves: {
            inicio: '05:30',
            fin: '24:00'
        },
        Viernes: {
            inicio: '05:30',
            fin: '24:00'
        },
        Sabado: {
            inicio: '06:00',
            fin: '24:30'
        },
        Domingo: {
            inicio: '08:00',
            fin: '23:00'
        },
        Feriado: {
            inicio: '08:00',
            fin: '23:00'
        }
    },
    'Línea E': {
        Lunes: {
            inicio: '05:30',
            fin: '24:00'
        },
        Martes: {
            inicio: '05:30',
            fin: '24:00'
        },
        Miercoles: {
            inicio: '05:30',
            fin: '24:00'
        },
        Jueves: {
            inicio: '05:30',
            fin: '24:00'
        },
        Viernes: {
            inicio: '05:30',
            fin: '24:00'
        },
        Sabado: {
            inicio: '06:00',
            fin: '24:30'
        },
        Domingo: {
            inicio: '08:00',
            fin: '23:00'
        },
        Feriado: {
            inicio: '08:00',
            fin: '23:00'
        }
    },
    'Línea H': {
        Lunes: {
            inicio: '05:30',
            fin: '24:00'
        },
        Martes: {
            inicio: '05:30',
            fin: '24:00'
        },
        Miercoles: {
            inicio: '05:30',
            fin: '24:00'
        },
        Jueves: {
            inicio: '05:30',
            fin: '24:00'
        },
        Viernes: {
            inicio: '05:30',
            fin: '24:00'
        },
        Sabado: {
            inicio: '06:00',
            fin: '24:30'
        },
        Domingo: {
            inicio: '08:00',
            fin: '23:00'
        },
        Feriado: {
            inicio: '08:00',
            fin: '23:00'
        }
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

/**
 * Función principal que coordina todos los cálculos
 * @param {boolean} considerarHorarioServicio - Si se deben hacer cálculos considerando horario de servicio
 * @returns {Promise<void>}
 */
async function calcular(considerarHorarioServicio = false) {
    /* console.log(`🔄 Iniciando cálculos ${considerarHorarioServicio ? 'considerando' : 'sin considerar'} horario de servicio...`); */
    
    // Verificar el estado de DATOS_MEDIOS antes de calcular
    /* console.log('🔍 Estado de DATOS_MEDIOS antes de calcular:');
    console.log(`   - Existe: ${!!dbInterface.DATOS_MEDIOS}`);
    console.log(`   - Cantidad de medios: ${Object.keys(dbInterface.DATOS_MEDIOS).length}`); */
    /* if (Object.keys(dbInterface.DATOS_MEDIOS).length > 0) {
        const primerMedio = Object.entries(dbInterface.DATOS_MEDIOS)[0];
            console.log(`   - Ejemplo de medio: ${primerMedio[0]}`);
            console.log(`   - Cantidad de registros: ${primerMedio[1].registros.length}`);
    } */
    
    // Fase 1: Cálculo de tiempos
    await calcularTiempos(considerarHorarioServicio);
    
    // Fase 2: Cálculo de indicadores
    calcularIndicadores(considerarHorarioServicio);
    
    /* console.log('✅ Cálculos completados'); */
}

/**
 * Acomoda los registros de un medio según el horario de servicio
 * @param {Array} registros - Array de registros de un medio
 * @param {string} linea - Nombre de la línea (ej: 'Línea A', 'Línea B', etc.)  
 * @param {Date} inicio - Fecha de inicio del período de análisis
 * @returns {Array} - Array de registros acomodados según el horario de servicio
 */
function acomodarRegistrosAServicio(registros, linea, inicio) {
    let registrosAcomodados = [];
    let registrosServicio = [];
    let registrosFueraServicio = [];
    let registrosFSCorregidos = [];
    // Esta función analiza cada registro y determina si se encuentra en horario de servicio
    // NOTA: los registros ya vienen ordenados por timestamp.
    // Si lo está, lo agrega al array de registrosServicio sin modificarlo
    // Si no lo está, los agrega a registrosFueraServicio
    // NOTA: los registros tienen timestamp en formato Microsoft JSON Date, y así deben quedar. Para la comprobación del horario de servicio, se pueden convertir.

    // Separar registros en servicio y fuera de servicio
    for (const registro of registros) {
        if (fallaEnServicio(linea, registro.timestamp)) {
            registrosServicio.push(registro);
        } else {
            registrosFueraServicio.push(registro);
        }
    }

    // Luego de hacer lo anterior se prosigue con un filtro que elimina registros en horario de no-servicio con la siguiente lógica:
    // Para registrosFueraServicio, se toma el primero (en teoría siguen estando ordenados por timestamp, se debería tomar el más antiguo)
    // se consulta por el timestamp del registro siguiente (que debería ser mayor= más reciente)
    // si pasaron más de 10 horas entre los timestamps:
    // entonces ese primer timestamp se corrige al siguiente horario de servicio más cercano -1 segundo.
    // y se agrega al array de registrosFSCorregidos
    // si el primer y segundo timestamp tienen menos de 10 horas de diferencia, entonces el primer registro se ignora. se prosigue el análisis con el segundo y el tercero, etc.

    // Procesar registros fuera de servicio
    for (let i = 0; i < registrosFueraServicio.length; i++) {
        const registroActual = registrosFueraServicio[i];
        const registroSiguiente = registrosFueraServicio[i + 1];
        
        // Si es el último registro o no hay siguiente
        if (!registroSiguiente) {
            // Verificar si el registro está antes del inicio
            const fechaRegistro = convertirTimestamp(registroActual.timestamp);
            if (fechaRegistro < inicio) {
                // Obtener el primer horario de servicio del día de inicio
                const diaInicio = inicio.getDay();
                const diasSemana = ['Domingo', 'Lunes', 'Martes', 'Miercoles', 'Jueves', 'Viernes', 'Sabado'];
                const horarioInicio = HORARIOS_SERVICIO[linea][diasSemana[diaInicio]].inicio;
                
                // Crear nuevo timestamp para el inicio del servicio
                const [horas, minutos] = horarioInicio.split(':').map(Number);
                const nuevoTimestamp = new Date(inicio);
                nuevoTimestamp.setHours(horas, minutos, 0, 0);
                
                // Crear registro corregido
                const registroCorregido = {
                    ...registroActual,
                    timestamp: `/Date(${nuevoTimestamp.getTime() - 1000})/` // -1 segundo
                };
                registrosFSCorregidos.push(registroCorregido);
            }
            continue;
        }

        const fechaActual = convertirTimestamp(registroActual.timestamp);
        const fechaSiguiente = convertirTimestamp(registroSiguiente.timestamp);
        
        // Calcular diferencia en horas
        const diferenciaHoras = (fechaSiguiente - fechaActual) / (1000 * 60 * 60);
        
        // Si la diferencia es menor a 10 horas, ignorar el registro actual
        if (diferenciaHoras < 10) {
            continue;
        }

        // Buscar el siguiente horario de servicio
        let fechaCorregida = new Date(fechaActual);
        let encontrado = false;
        
        // Buscar hasta encontrar un horario de servicio o llegar al siguiente registro
        while (fechaCorregida < fechaSiguiente && !encontrado) {
            const diaSemana = fechaCorregida.getDay();
            const diasSemana = ['Domingo', 'Lunes', 'Martes', 'Miercoles', 'Jueves', 'Viernes', 'Sabado'];
            const horarioDia = HORARIOS_SERVICIO[linea][diasSemana[diaSemana]];
            
            const [horasInicio, minutosInicio] = horarioDia.inicio.split(':').map(Number);
            const horaInicio = new Date(fechaCorregida);
            horaInicio.setHours(horasInicio, minutosInicio, 0, 0);
            
            if (fechaCorregida < horaInicio && horaInicio < fechaSiguiente) {
                encontrado = true;
                const registroCorregido = {
                    ...registroActual,
                    timestamp: `/Date(${horaInicio.getTime() - 1000})/` // -1 segundo
                };
                registrosFSCorregidos.push(registroCorregido);
            }
            
            fechaCorregida.setDate(fechaCorregida.getDate() + 1);
        }
    }

    // NOTA: un único registro debería tener una fecha menor a la de inicio, para este caso especial el timestamp debe cambiar al primer instante (-1 segundo) de inicio de servicio de la fecha de inicio.
    // al finalizar este proceso, se juntan los arrays de registrosServicio y registrosFSCorregidos en registrosAcomodados
    registrosAcomodados = [...registrosServicio, ...registrosFSCorregidos];

    // Luego se ordenan por timestamp con esta función y se devuelven:
    const registrosReturn = ordenarRegistrosPorTimestamp(registrosAcomodados);
    return registrosReturn;
}

/**
 * Primera fase: Calcula los tiempos para cada medio
 * @param {boolean} considerarHorarioServicio - Si se deben calcular tiempos en horario de servicio
 * @returns {Promise<void>}
 */
async function calcularTiempos(considerarHorarioServicio) {
    /* console.log('📊 Fase 1: Calculando tiempos...'); */
    
    // Reiniciar la estructura de tiempos
    TIEMPOS_MEDIOS = {};
    
    // Obtener fechas de inicio y fin del período de análisis
    const fechaInicioUTC = new Date(document.getElementById('fechaInicio').value);
    const fechaFinUTC = new Date(document.getElementById('fechaFin').value);
    
    // Ajustar a la zona horaria de Argentina (UTC-3)
    const fechaInicio = new Date(fechaInicioUTC.getTime() + (3 * 60 * 60 * 1000));
    const fechaFin = new Date(fechaFinUTC.getTime() + (3 * 60 * 60 * 1000));
    
    /* console.log('🔄 Fechas ajustadas a zona horaria Argentina:');
    console.log('  - Fecha inicio ARG:', fechaInicio);
    console.log('  - Fecha fin ARG:', fechaFin); */
    
    // Validar fechas
    if (isNaN(fechaInicio.getTime()) || isNaN(fechaFin.getTime())) {
        throw new Error('Las fechas de inicio y fin son inválidas');
    }
    
    // Procesar cada medio en DATOS_MEDIOS
    for (const [clave, medio] of Object.entries(dbInterface.DATOS_MEDIOS)) {
        console.log(`\n📊 Analizando medio ${clave}:`);
        console.log('   - Registros del medio:');
        
        // Mostrar los registros ordenados
        const registrosOrdenados = [...medio.registros].sort((a, b) => {
            const tsA = convertirTimestamp(a.timestamp);
            const tsB = convertirTimestamp(b.timestamp);
            if (!tsA || !tsB) return 0;
            return tsA.getTime() - tsB.getTime();
        });
        
        /* registrosOrdenados.forEach((registro, index) => {
            const fecha = convertirTimestamp(registro.timestamp);
            console.log(`     ${index + 1}. ${fecha.toLocaleString()} - ${registro.estado}`);
        }); */

        // Esta línea no está funcionando. ignoramos por ahora.
        /* const totalPeriodo = calcularSegundosServicioPeriodo(fechaInicio, fechaFin, medio.linea); */
        const totalPeriodo = 0;
        let FLAG_EXCLUIDO = false;

        // Si el medio tiene menos de 2 registros, lo marcamos para excluírlo del cálculo, pero igualmente lo procesamos para calcular los tiempos
        if (medio.registros.length < 2) {
            console.warn(`⚠️ Medio ${clave} tiene menos de 2 registros, lo marcamos para excluírlo del cálculo`);
            FLAG_EXCLUIDO = true;
        }
        
        // Si no hay registros, el ordenamiento salió mal
        if (registrosOrdenados.length === 0) {
            console.warn(`⚠️ Medio ${clave} se embarulló los registros.`);
            FLAG_EXCLUIDO = true;
            continue;
        }
        console.log(`Registros ordenados: ${registrosOrdenados.length}`);

        // Acomoda los registros según el horario de servicio
        /* const registrosAcomodados = acomodarRegistrosAServicio(registrosOrdenados, medio.linea, fechaInicio);
        console.log(`Registros acomodados: ${registrosAcomodados.length}`); */

        const registrosYServicio = insertarRegistrosHorarioServicio(registrosOrdenados, medio.linea, fechaInicio);
        console.log(`\n   - Registros con horario de servicio:`);
        registrosYServicio.forEach((registro, index) => {
            const fecha = new Date(registro.timestamp);
            console.log(`     ${index + 1}. ${fecha.toLocaleString()} - ${registro.estado}`);
        });

        // Variables para calcular los tiempos
        let tiempoOperativo = 0;
        let tiempoNoOperativo = 0;
        let tiempoTotal = 0;

        // Obtener el primer horario de servicio para el período de análisis
        const diasSemana = ['Domingo', 'Lunes', 'Martes', 'Miercoles', 'Jueves', 'Viernes', 'Sabado'];
        const diaInicio = diasSemana[fechaInicio.getDay()];
        const horarioInicioServicio = HORARIOS_SERVICIO[medio.linea][diaInicio].inicio;
        const [horasInicio, minutosInicio] = horarioInicioServicio.split(':').map(Number);
        const primerHorarioServicio = new Date(fechaInicio);
        primerHorarioServicio.setHours(horasInicio, minutosInicio, 0, 0);

        // Obtener el último horario de servicio para el período de análisis
        const diaFin = diasSemana[fechaFin.getDay()];
        const horarioFinServicio = HORARIOS_SERVICIO[medio.linea][diaFin].fin;
        const [horasFin, minutosFin] = horarioFinServicio.split(':').map(Number);
        const ultimoHorarioServicio = new Date(fechaFin);
        ultimoHorarioServicio.setHours(horasFin, minutosFin, 0, 0);

        /* console.log(`\n   - Horarios de servicio:`);
        console.log(`     * Inicio: ${primerHorarioServicio.toLocaleString()}`);
        console.log(`Fecha fin: ${fechaFin}`); */
        console.log(`Día de la semana: ${diaFin}`);/* 
        console.log(`Horario de servicio: ${horarioFinServicio}`);
        console.log(`Último horario de servicio: ${ultimoHorarioServicio}`); */

        let FLAG_EN_HORARIO_SERVICIO = false;
        let FLAG_OPERATIVO = false;
        // tiempo inicial se cuenta desde el inicio de servicio del día de inicio, se copia la variable primerHorarioServicio
        let t0 = new Date(primerHorarioServicio);
        let t1 = null;
        /* console.log(`\n📊 Calculando tiempos para medio ${clave}:`);
        console.log(`   - Horario de servicio: ${primerHorarioServicio.toLocaleTimeString()} - ${ultimoHorarioServicio.toLocaleTimeString()}`); */
        
        // Procesar cada registro
        for (let i = 0; i < registrosYServicio.length; i++) {
            const registro = registrosYServicio[i];
            const estadoActual = registro.estado;
            const timestamp = new Date(registro.timestamp);
            
            // Calcular tiempo del período anterior si estamos en horario de servicio
            if (FLAG_EN_HORARIO_SERVICIO) {
                t1 = timestamp;
                const duracion = (t1 - t0) / 1000;
                tiempoTotal += duracion;
                if (FLAG_OPERATIVO) {
                    tiempoOperativo += duracion;
                } else {
                    tiempoNoOperativo += duracion;
                }
                t0 = timestamp;
            }
            
            // Actualizar estados
            if (estadoActual === 'INICIO_SERVICIO') {
                FLAG_EN_HORARIO_SERVICIO = true;
                t0 = timestamp;
                /* console.log(`   - Inicio de servicio: ${timestamp.toLocaleTimeString()}`); */
            }
            if (estadoActual === 'FIN_SERVICIO') {
                // Calcular tiempo hasta el fin de servicio del día actual
                if (FLAG_EN_HORARIO_SERVICIO) {
                    const duracion = (timestamp - t0) / 1000;
                    tiempoTotal += duracion;
                    if (FLAG_OPERATIVO) {
                        tiempoOperativo += duracion;
                    } else {
                        tiempoNoOperativo += duracion;
                    }
                }
                FLAG_EN_HORARIO_SERVICIO = false;
                /* console.log(`   - Fin de servicio: ${timestamp.toLocaleTimeString()}`); */
            }
            if (estadoActual === 'Operativo') {
                FLAG_OPERATIVO = true;
            }
            if (estadoActual === 'No operativo') {
                FLAG_OPERATIVO = false;
            }
        }
        
        // Si aún estamos en horario de servicio al final, sumar el tiempo hasta el fin de servicio
        if (FLAG_EN_HORARIO_SERVICIO) {
            const duracion = (ultimoHorarioServicio - t0) / 1000;
            tiempoTotal += duracion;
            if (FLAG_OPERATIVO) {
                tiempoOperativo += duracion;
            } else {
                tiempoNoOperativo += duracion;
            }
        }
        
        console.log(`   - Tiempos finales:`);
        console.log(`     * Total: ${segundosAHorasMinutosSegundos(tiempoTotal)}`);
        console.log(`     * Operativo: ${segundosAHorasMinutosSegundos(tiempoOperativo)}`);
        console.log(`     * No Operativo: ${segundosAHorasMinutosSegundos(tiempoNoOperativo)}`);

        // Guardar resultados en TIEMPOS_MEDIOS
        TIEMPOS_MEDIOS[clave] = {
            clave,
            linea: medio.linea,
            estacion: medio.estacion,
            idMedio: medio.id,
            tipo: medio.tipo,
            tiempoOperativo: tiempoOperativo,
            tiempoNoOperativo: tiempoNoOperativo,
            tiempoTotal: tiempoTotal,
            duracionPeriodo: totalPeriodo,
            excluido: FLAG_EXCLUIDO
        };
    }
    /* console.log(`\n✅ Tiempos calculados para ${Object.keys(TIEMPOS_MEDIOS).length} medios`); */ 

    /* // Mostrar los primeros 10 elementos de TIEMPOS_MEDIOS
    const claves = Object.keys(TIEMPOS_MEDIOS);
    const elementosAleatorios = [];
    
    // Seleccionar los primeros 10 elementos
    for (let i = 0; i < 10 && i < claves.length; i++) {
        const clave = claves[i];
        elementosAleatorios.push(TIEMPOS_MEDIOS[clave]);
    }
    
    // Mostrar los elementos seleccionados
    console.log('\n📊 Ejemplos aleatorios de TIEMPOS_MEDIOS:');
    elementosAleatorios.forEach((medio, index) => {
        console.log(`\nMedio ${index + 1}:`);
        Object.entries(medio).forEach(([propiedad, valor]) => {
            console.log(`  ${propiedad}: ${valor}`);
        });
    }); */
}

/**
 * Segunda fase: Calcula los indicadores basados en los tiempos
 * @param {boolean} considerarHorarioServicio - Si se deben calcular indicadores en horario de servicio
 */
function calcularIndicadores(considerarHorarioServicio) {
    console.log('📊 Fase 2: Calculando indicadores...');
    
    // Reiniciar la estructura de indicadores
    INDICADORES_MEDIOS = {};
    
    // Contador para medios con fallas en servicio
    let mediosConFallasEnServicio = 0;
    
    // Contador de medios a considerar
    let mediosConsiderados = 0;

    // Variable que suma tiempos para calcular disponibilidad
    let tiempoFuncionando = 0;

    // Estructuras para acumular datos por línea y tipo
    let acumuladoresPorLinea = {};

    // Calcular indicadores para cada medio
    for (const [clave, tiempos] of Object.entries(TIEMPOS_MEDIOS)) {
        mediosConsiderados++;
        tiempoFuncionando += tiempos.tiempoOperativo;

        const linea = tiempos.linea;
        const tipo = tiempos.tipo;

        // Inicializar acumuladores para la línea si no existen
        if (!acumuladoresPorLinea[linea]) {
            acumuladoresPorLinea[linea] = {
                escaleras: {
                    tiempoOperativo: 0,
                    tiempoNoOperativo: 0,
                    cantidadFallas: 0,
                    tiempoEntreFallas: 0,
                    tiempoReparacion: 0,
                    cantidad: 0
                },
                ascensores: {
                    tiempoOperativo: 0,
                    tiempoNoOperativo: 0,
                    cantidadFallas: 0,
                    tiempoEntreFallas: 0,
                    tiempoReparacion: 0,
                    cantidad: 0
                }
            };
        }

        // Determinar qué tiempos usar según el modo
        const tiempoOperativoCalculo = tiempos.tiempoOperativo;
        const tiempoNoOperativoCalculo = tiempos.tiempoNoOperativo;
        
        // Calcular disponibilidad
        const tiempoTotal = tiempoOperativoCalculo + tiempoNoOperativoCalculo;
        const disponibilidad = tiempoTotal > 0 
            ? (tiempoOperativoCalculo / tiempoTotal) * 100 
            : 100;
        
        // Variables para fallas
        let cantidadFallas = 0;
        let cantidadFallasLargas = 0;
        let falloServicio = false;
        
        // Obtener los registros del medio desde DATOS_MEDIOS
        const medio = dbInterface.DATOS_MEDIOS[clave];
        if (medio && medio.registros) {
            // Ordenar registros por timestamp
            const registrosOrdenados = [...medio.registros].sort((a, b) => {
                const tsA = convertirTimestamp(a.timestamp);
                const tsB = convertirTimestamp(b.timestamp);
                if (!tsA || !tsB) return 0;
                return tsA.getTime() - tsB.getTime();
            });
            
            // Calcular fallas basadas en los registros
            for (let i = 1; i < registrosOrdenados.length; i++) {
                const registroAnterior = registrosOrdenados[i-1];
                const registroActual = registrosOrdenados[i];
                
                // Verificar si es una transición de operativo a no operativo
                if (registroAnterior.estado === 'Operativo' && registroActual.estado === 'No operativo') {
                    falloServicio = fallaEnServicio(medio.linea, registroActual.timestamp);
                    
                    // Si hay una falla en servicio, incrementar el contador
                    if (falloServicio) {
                        mediosConFallasEnServicio++;
                        cantidadFallas++;
                        
                        // Calcular duración de la falla
                        const duracionFalla = (convertirTimestamp(registroActual.timestamp) - 
                                             convertirTimestamp(registroAnterior.timestamp)) / 1000;
                        
                        // Verificar si es una falla larga (>15 minutos)
                        if (duracionFalla > 900) {
                            cantidadFallasLargas++;
                        }
                    }
                }
            }
        }
        
        // Calcular MTTF y MTTR
        let mttf = cantidadFallas > 0 ? tiempoOperativoCalculo / cantidadFallas : tiempoOperativoCalculo;
        let mttr = cantidadFallas > 0 ? tiempoNoOperativoCalculo / cantidadFallas : 0;
        
        // Acumular datos según el tipo de medio
        if (tipo === 'Escalera') {
            acumuladoresPorLinea[linea].escaleras.tiempoOperativo += tiempoOperativoCalculo;
            acumuladoresPorLinea[linea].escaleras.tiempoNoOperativo += tiempoNoOperativoCalculo;
            acumuladoresPorLinea[linea].escaleras.cantidadFallas += cantidadFallas;
            acumuladoresPorLinea[linea].escaleras.tiempoEntreFallas += mttf;
            acumuladoresPorLinea[linea].escaleras.tiempoReparacion += mttr;
            acumuladoresPorLinea[linea].escaleras.cantidad++;
        } else if (tipo === 'Ascensor') {
            acumuladoresPorLinea[linea].ascensores.tiempoOperativo += tiempoOperativoCalculo;
            acumuladoresPorLinea[linea].ascensores.tiempoNoOperativo += tiempoNoOperativoCalculo;
            acumuladoresPorLinea[linea].ascensores.cantidadFallas += cantidadFallas;
            acumuladoresPorLinea[linea].ascensores.tiempoEntreFallas += mttf;
            acumuladoresPorLinea[linea].ascensores.tiempoReparacion += mttr;
            acumuladoresPorLinea[linea].ascensores.cantidad++;
        }
        
        // Guardar indicadores individuales
        INDICADORES_MEDIOS[clave] = {
            clave: clave,
            disponibilidad: disponibilidad,
            fallaServicio: falloServicio,
            cantidadFallas: cantidadFallas,
            cantidadFallasLargas: cantidadFallasLargas,
            mttf: mttf,
            mttr: mttr,
            tiempoOperativo: tiempoOperativoCalculo,
            tiempoNoOperativo: tiempoNoOperativoCalculo
        };
    }

    // Calcular indicadores por línea
    INDICADORES_LINEA = {};
    for (const [linea, acumulador] of Object.entries(acumuladoresPorLinea)) {
        const dispEsc = acumulador.escaleras.cantidad > 0 ? 
            (acumulador.escaleras.tiempoOperativo / (acumulador.escaleras.tiempoOperativo + acumulador.escaleras.tiempoNoOperativo)) * 100 : 0;
        
        const dispAsc = acumulador.ascensores.cantidad > 0 ? 
            (acumulador.ascensores.tiempoOperativo / (acumulador.ascensores.tiempoOperativo + acumulador.ascensores.tiempoNoOperativo)) * 100 : 0;
        
        const mttfEsc = acumulador.escaleras.cantidadFallas > 0 ? 
            acumulador.escaleras.tiempoEntreFallas / acumulador.escaleras.cantidad : 0;
        
        const mttfAsc = acumulador.ascensores.cantidadFallas > 0 ? 
            acumulador.ascensores.tiempoEntreFallas / acumulador.ascensores.cantidad : 0;
        
        const mttrEsc = acumulador.escaleras.cantidadFallas > 0 ? 
            acumulador.escaleras.tiempoReparacion / acumulador.escaleras.cantidad : 0;
        
        const mttrAsc = acumulador.ascensores.cantidadFallas > 0 ? 
            acumulador.ascensores.tiempoReparacion / acumulador.ascensores.cantidad : 0;

        INDICADORES_LINEA[linea] = {
            DisponibilidadEsc: dispEsc,
            DisponibilidadAsc: dispAsc,
            MTTFEsc: mttfEsc,
            MTTFAsc: mttfAsc,
            MTTREsc: mttrEsc,
            MTTRAsc: mttrAsc,
            FallasEsc: acumulador.escaleras.cantidadFallas,
            FallasAsc: acumulador.ascensores.cantidadFallas,
            Disponibilidad: (dispEsc + dispAsc) / 2 // Promedio de disponibilidad
        };
    }

    // Calcular disponibilidad total
    const disponibilidadTotal = (tiempoFuncionando / (mediosConsiderados * tiempoTotalAnalisisSegundos())) * 100;
    
    // Guardar los valores en la estructura global
    INDICADORES_RED.mediosConFallas = mediosConFallasEnServicio;
    INDICADORES_RED.Disponibilidad = disponibilidadTotal;

    console.log(`\n✅ Indicadores calculados para ${Object.keys(INDICADORES_MEDIOS).length} medios`);
    console.log(`📊 Medios con fallas en servicio: ${mediosConFallasEnServicio}`);

    // Agregar logs para INDICADORES_LINEA
    console.log('📊 INDICADORES_LINEA:', INDICADORES_LINEA);
}

/**
 * Determina si un timestamp está dentro del horario de servicio para una línea específica
 * @param {string} linea - Nombre de la línea (ej: 'Línea A', 'Línea B', etc.)
 * @param {string} timestamp - Timestamp en formato '/Date(milisegundos)/'
 * @returns {boolean} - true si está en horario de servicio, false en caso contrario
 */
function fallaEnServicio(linea, timestamp) {
    // Verificar que la línea existe en HORARIOS_SERVICIO
    if (!HORARIOS_SERVICIO[linea]) {
        console.warn(`⚠️ Línea no encontrada en HORARIOS_SERVICIO: ${linea}`);
        return false;
    }

    try {
        // Convertir timestamp a Date
        const ms = parseInt(timestamp.replace('/Date(', '').replace(')/', ''));
        const fecha = new Date(ms);
        if (isNaN(fecha.getTime())) {
            console.warn(`⚠️ Timestamp inválido: ${timestamp}`);
            return false;
        }

        // Obtener día de la semana
        const diasSemana = ['Domingo', 'Lunes', 'Martes', 'Miercoles', 'Jueves', 'Viernes', 'Sabado'];
        const diaSemana = diasSemana[fecha.getDay()];

        // Obtener horario para el día
        const horarioDia = HORARIOS_SERVICIO[linea][diaSemana];
        if (!horarioDia) {
            console.warn(`⚠️ No hay horario definido para ${diaSemana} en ${linea}`);
            return false;
        }

        // Obtener hora actual en formato HH:mm
        const hora = fecha.getHours().toString().padStart(2, '0');
        const minutos = fecha.getMinutes().toString().padStart(2, '0');
        const horaActual = `${hora}:${minutos}`;

        // Verificar si está dentro del horario de servicio
        const estaEnServicio = horaActual >= horarioDia.inicio && horaActual <= horarioDia.fin;
        return estaEnServicio;

    } catch (error) {
        console.error(`❌ Error al procesar timestamp: ${timestamp}`, error);
        return false;
    }
}

/**
 * Inserta registros de horario de servicio en los registros de un medio
 * @param {Array} registros - Array de registros de un medio
 * @param {string} linea - Nombre de la línea (ej: 'Línea A', 'Línea B', etc.)
 * @param {Date} fechaInicio - Fecha de inicio del período
 * @returns {Array} - Array de registros con horario de servicio insertado
 */
function insertarRegistrosHorarioServicio(registros,linea,fechaInicio){
    /* console.log('🔄 InsertarRegistrosHorarioServicio - Inicio');
    console.log('🔄 Fecha inicio:', fechaInicio); */
    
    // Obtener el inicio del horario de servicio para el día de fechaInicio
    const diasSemana = ['Domingo', 'Lunes', 'Martes', 'Miercoles', 'Jueves', 'Viernes', 'Sabado'];
    const diaInicio = diasSemana[fechaInicio.getDay()];
    const horarioInicio = HORARIOS_SERVICIO[linea][diaInicio].inicio;
    /* console.log(`📅 Dia de la semana: ${diaInicio}`);
    console.log(`📅 Horario de inicio: ${horarioInicio}`); */
    
    // Crear el timestamp de inicio de servicio
    const [horas, minutos] = horarioInicio.split(':').map(Number);
    const timestampInicioServicio = new Date(fechaInicio);
    timestampInicioServicio.setHours(horas, minutos, 0, 0);
    console.log('🔄 Timestamp inicio servicio:', timestampInicioServicio);
    
    // Encontrar el registro más reciente antes del inicio de servicio
    let registroMasRecienteAntesInicio = null;
    
    for (const registro of registros) {
        const fechaRegistro = convertirTimestamp2(registro.timestamp);
        if (!fechaRegistro) continue;
        
        if (fechaRegistro < timestampInicioServicio) {
            if (!registroMasRecienteAntesInicio || fechaRegistro > convertirTimestamp2(registroMasRecienteAntesInicio.timestamp)) {
                registroMasRecienteAntesInicio = registro;
            }
        }
    }
    
    /* console.log('🔄 Registro más reciente antes de inicio:', registroMasRecienteAntesInicio); */
    
    // Si encontramos un registro antes del inicio, modificamos su timestamp
    if (registroMasRecienteAntesInicio) {
        // Crear un nuevo timestamp 1 segundo antes del inicio de servicio
        const nuevoTimestamp = new Date(timestampInicioServicio);
        nuevoTimestamp.setSeconds(nuevoTimestamp.getSeconds() - 1);
        
        // Modificar el registro
        registroMasRecienteAntesInicio.timestamp = `/Date(${nuevoTimestamp.getTime()}-0300)/`;
        /* console.log('🔄 Registro modificado:', registroMasRecienteAntesInicio); */
    }
    
    // Luego ejecuta las siguientes acciones para los días siguientes a fechaInicio hasta fechaFin:
    const fechaFin = new Date(document.getElementById('fechaFin').value);
    let fechaActual = new Date(fechaInicio);
    
    const registrosNuevos = [];
    
    // Inserta un registro nuevo, con el timestamp de inicio de horario de servicio y el estado 'INICIO_SERVICIO'
    // Inserta un registro nuevo, con el timestamp de fin de horario de servicio y el estado 'FIN_SERVICIO'
    while (fechaActual <= fechaFin) {
        const diaActual = diasSemana[fechaActual.getDay()];
        const horarioDia = HORARIOS_SERVICIO[linea][diaActual];
        
        // Crear registro de inicio de servicio
        const timestampInicio = new Date(fechaActual);
        const [horasInicio, minutosInicio] = horarioDia.inicio.split(':').map(Number);
        timestampInicio.setHours(horasInicio, minutosInicio, 0, 0);
        
        // Solo insertar si el timestamp es posterior a fechaInicio
        if (timestampInicio >= fechaInicio) {
            /* console.log('🔄 Creando registro INICIO_SERVICIO:');
            console.log('  - Fecha base:', fechaActual);
            console.log('  - Horario inicio:', horarioDia.inicio);
            console.log('  - Timestamp generado:', timestampInicio); */
            
            registrosNuevos.push({
                timestamp: `/Date(${timestampInicio.getTime()}-0300)/`,
                estado: 'INICIO_SERVICIO'
            });
        }
        
        // Crear registro de fin de servicio
        const timestampFin = new Date(fechaActual);
        const [horasFin, minutosFin] = horarioDia.fin.split(':').map(Number);
        timestampFin.setHours(horasFin, minutosFin, 0, 0);
        
        // Solo insertar si el timestamp es posterior a fechaInicio
        if (timestampFin >= fechaInicio) {
            /* console.log('🔄 Creando registro FIN_SERVICIO:');
            console.log('  - Fecha base:', fechaActual);
            console.log('  - Horario fin:', horarioDia.fin);
            console.log('  - Timestamp generado:', timestampFin); */
            
            registrosNuevos.push({
                timestamp: `/Date(${timestampFin.getTime()}-0300)/`,
                estado: 'FIN_SERVICIO'
            });
        }
        
        // Avanzar al siguiente día
        fechaActual.setDate(fechaActual.getDate() + 1);
    }

    // Devuelve el array de registros con los registros modificados y los nuevos insertados.
    const registrosCompletos = [...registros, ...registrosNuevos];

    // NOTA: todos los timestamps de los registros que se devuelven deben haber sido pasados por la función convertirTimestamp2.
    // Primero ordenamos los registros con timestamps en formato Microsoft JSON Date
    const registrosOrdenados = ordenarRegistrosPorTimestamp(registrosCompletos);
    /* console.log('🔄 Registros ordenados:', registrosOrdenados.length); */
    
    // Luego convertimos los timestamps a objetos Date
    const registrosConvertidos = registrosOrdenados.map(registro => {
        /* console.log('🔄 Convirtiendo registro:', registro); */
        const registroConvertido = {
            ...registro,
            timestamp: convertirTimestamp2(registro.timestamp)
        };
        /* console.log('🔄 Registro convertido:', registroConvertido); */
        return registroConvertido;
    });
    
    return registrosConvertidos;
}

/**
 * Calcula las horas totales de servicio para un período específico
 * @param {Date} fechaInicio - Fecha de inicio del período
 * @param {Date} fechaFin - Fecha de fin del período
 * @param {string} linea - Nombre de la línea (ej: 'Línea A', 'Línea B', etc.)
 * @returns {Object} - Objeto con información del cálculo
 */
function calcularSegundosServicioPeriodo(fechaInicio, fechaFin, linea) {
    console.log(`🔄 Calculando período de servicio para ${linea}:`, {
        fechaInicio: fechaInicio.toISOString(),
        fechaFin: fechaFin.toISOString()
    });

    // Verificar que la línea existe en HORARIOS_SERVICIO
    if (!HORARIOS_SERVICIO[linea]) {
        throw new Error(`Línea no encontrada en HORARIOS_SERVICIO: ${linea}`);
    }

    // Array con los días de la semana en español
    const diasSemana = ['Domingo', 'Lunes', 'Martes', 'Miercoles', 'Jueves', 'Viernes', 'Sabado'];
    
    // Función auxiliar para convertir hora en formato HH:mm a minutos
    const horaAMinutos = (hora) => {
        const [horas, minutos] = hora.split(':').map(Number);
        return horas * 60 + minutos;
    };

    // Función auxiliar para convertir minutos a formato HH:mm
    const minutosAHora = (minutos) => {
        const horas = Math.floor(minutos / 60);
        const mins = minutos % 60;
        return `${horas.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
    };

    // Calcular horas de servicio para un día específico
    const calcularHorasDia = (dia) => {
        const horario = HORARIOS_SERVICIO[linea][dia];
        if (!horario) {
            console.warn(`⚠️ No hay horario definido para ${dia} en ${linea}`);
            return 0;
        }

        const inicioMinutos = horaAMinutos(horario.inicio);
        const finMinutos = horaAMinutos(horario.fin);
        
        // Si el horario termina al día siguiente (ej: 26:00)
        const duracion = finMinutos > inicioMinutos ? 
            finMinutos - inicioMinutos : 
            (24 * 60 - inicioMinutos) + finMinutos;
        
        console.log(`📊 Horario para ${dia} en ${linea}:`, {
            inicio: horario.inicio,
            fin: horario.fin,
            duracionHoras: duracion / 60
        });

        return duracion / 60; // Convertir minutos a horas
    };

    // Calcular horas de servicio para un período específico dentro de un día
    const calcularHorasPeriodo = (dia, horaInicio, horaFin) => {
        const horario = HORARIOS_SERVICIO[linea][dia];
        if (!horario) {
            console.warn(`⚠️ No hay horario definido para ${dia} en ${linea}`);
            return 0;
        }

        const inicioHorario = horaAMinutos(horario.inicio);
        const finHorario = horaAMinutos(horario.fin);
        const inicioPeriodo = horaAMinutos(horaInicio);
        const finPeriodo = horaAMinutos(horaFin);

        // Ajustar finHorario si termina al día siguiente
        const finHorarioAjustado = finHorario < inicioHorario ? finHorario + 24 * 60 : finHorario;
        const finPeriodoAjustado = finPeriodo < inicioPeriodo ? finPeriodo + 24 * 60 : finPeriodo;

        // Calcular intersección
        const inicioInterseccion = Math.max(inicioHorario, inicioPeriodo);
        const finInterseccion = Math.min(finHorarioAjustado, finPeriodoAjustado);

        if (finInterseccion <= inicioInterseccion) {
            console.log(`⚠️ No hay intersección para ${dia} en ${linea}:`, {
                horario: { inicio: horario.inicio, fin: horario.fin },
                periodo: { inicio: horaInicio, fin: horaFin }
            });
            return 0;
        }

        const horasServicio = (finInterseccion - inicioInterseccion) / 60;
        console.log(`📊 Período calculado para ${dia} en ${linea}:`, {
            horario: { inicio: horario.inicio, fin: horario.fin },
            periodo: { inicio: horaInicio, fin: horaFin },
            interseccion: {
                inicio: minutosAHora(inicioInterseccion),
                fin: minutosAHora(finInterseccion)
            },
            horasServicio
        });

        return horasServicio;
    };

    // Convertir fechas UTC a hora local
    const fechaInicioLocal = new Date(fechaInicio.getTime() - (fechaInicio.getTimezoneOffset() * 60000));
    const fechaFinLocal = new Date(fechaFin.getTime() - (fechaFin.getTimezoneOffset() * 60000));

    console.log(`📊 Fechas convertidas a hora local:`, {
        fechaInicioLocal: fechaInicioLocal.toISOString(),
        fechaFinLocal: fechaFinLocal.toISOString()
    });

    // Si el período es de 24 horas o menos
    if (fechaFinLocal - fechaInicioLocal <= 24 * 60 * 60 * 1000) {
        const diaInicio = diasSemana[fechaInicioLocal.getDay()];
        const horaInicio = `${fechaInicioLocal.getHours().toString().padStart(2, '0')}:${fechaInicioLocal.getMinutes().toString().padStart(2, '0')}`;
        const horaFin = `${fechaFinLocal.getHours().toString().padStart(2, '0')}:${fechaFinLocal.getMinutes().toString().padStart(2, '0')}`;
        
        const horasServicio = calcularHorasPeriodo(diaInicio, horaInicio, horaFin);
        console.log(`📊 Período de 24h o menos para ${linea}:`, {
            dia: diaInicio,
            horaInicio,
            horaFin,
            horasServicio
        });
        return horasServicio * 3600; // Convertir horas a segundos
    }

    // Para períodos mayores a 24 horas
    let fechaActual = new Date(fechaInicioLocal);
    let horasTotales = 0;

    // Procesar el primer día
    const diaInicio = diasSemana[fechaActual.getDay()];
    const horaInicio = `${fechaActual.getHours().toString().padStart(2, '0')}:${fechaActual.getMinutes().toString().padStart(2, '0')}`;
    const horasPrimerDia = calcularHorasPeriodo(diaInicio, horaInicio, '23:59');
    horasTotales += horasPrimerDia;

    // Avanzar al siguiente día
    fechaActual.setDate(fechaActual.getDate() + 1);
    fechaActual.setHours(0, 0, 0, 0);

    // Procesar días intermedios
    while (fechaActual < fechaFinLocal) {
        const diaActual = diasSemana[fechaActual.getDay()];
        const horasDia = calcularHorasDia(diaActual);
        horasTotales += horasDia;
        fechaActual.setDate(fechaActual.getDate() + 1);
    }

    // Procesar el último día
    if (fechaActual <= fechaFinLocal) {
        const diaFin = diasSemana[fechaActual.getDay()];
        const horaFin = `${fechaActual.getHours().toString().padStart(2, '0')}:${fechaActual.getMinutes().toString().padStart(2, '0')}`;
        const horasUltimoDia = calcularHorasPeriodo(diaFin, '00:00', horaFin);
        horasTotales += horasUltimoDia;
    }

    console.log(`📊 Período total para ${linea}:`, {
        horasTotales,
        segundos: horasTotales * 3600
    });

    return horasTotales * 3600; // Convertir horas a segundos
}

/**
 * Valida que los datos de un medio sean válidos
 * @param {Object} indicadores - Indicadores del medio
 * @returns {boolean} - true si los datos son válidos
 */
function validarDatosMedio(indicadores) {
    // Validar que existan los campos requeridos
    if (!indicadores || typeof indicadores !== 'object') return false;
    
    // Validar disponibilidad (0-100)
    if (typeof indicadores.disponibilidad !== 'number' || 
        indicadores.disponibilidad < 0 || 
        indicadores.disponibilidad > 100) {
        return false;
    }
    
    // Validar tiempos (deben ser números positivos)
    if (typeof indicadores.mttf !== 'number' || indicadores.mttf < 0) return false;
    if (typeof indicadores.mttr !== 'number' || indicadores.mttr < 0) return false;
    
    return true;
}

/**
 * Procesa los indicadores a nivel de red
 * @param {Object} acumuladorRed - Acumulador de indicadores de red
 * @param {Object} indicadores - Indicadores del medio
 * @param {Object} medio - Información del medio
 */
function procesarIndicadoresRed(acumuladorRed, indicadores, medio) {
    // Sumar disponibilidad
    acumuladorRed.disponibilidad += indicadores.disponibilidad;
    
    // Contar medios con fallas en servicio
    if (indicadores.fallaServicio) {
        acumuladorRed.mediosConFallas++;
    }
    
    // Sumar MTTF y MTTR solo si el medio no está excluido
    if (!medio.excluido) {
        acumuladorRed.mttf += indicadores.mttf;
        acumuladorRed.mttr += indicadores.mttr;
        acumuladorRed.mediosNoExcluidos++;
    }
}

/**
 * Procesa los indicadores por línea
 * @param {Object} acumuladoresLinea - Acumuladores por línea
 * @param {Object} indicadores - Indicadores del medio
 * @param {Object} medio - Información del medio
 */
function procesarIndicadoresLinea(acumuladoresLinea, indicadores, medio) {
    const linea = medio.linea;
    
    // Inicializar acumulador de línea si no existe
    if (!acumuladoresLinea[linea]) {
        acumuladoresLinea[linea] = {
            disponibilidad: 0,
            fallasServicio: 0,
            mttf: 0,
            mttr: 0,
            cantidadMedios: 0,
            mediosNoExcluidos: 0
        };
    }
    
    // Acumular indicadores
    acumuladoresLinea[linea].disponibilidad += indicadores.disponibilidad;
    acumuladoresLinea[linea].cantidadMedios++;
    
    if (indicadores.fallaServicio) {
        acumuladoresLinea[linea].fallasServicio++;
    }
    
    // Sumar MTTF y MTTR solo si el medio no está excluido
    if (!medio.excluido) {
        acumuladoresLinea[linea].mttf += indicadores.mttf;
        acumuladoresLinea[linea].mttr += indicadores.mttr;
        acumuladoresLinea[linea].mediosNoExcluidos++;
    }
}

/**
 * Procesa los indicadores por tipo de medio
 * @param {Object} acumuladoresTipo - Acumuladores por tipo
 * @param {Object} indicadores - Indicadores del medio
 * @param {Object} medio - Información del medio
 */
function procesarIndicadoresTipo(acumuladoresTipo, indicadores, medio) {
    const tipo = medio.tipo;
    
    // Inicializar acumulador de tipo si no existe
    if (!acumuladoresTipo[tipo]) {
        acumuladoresTipo[tipo] = {
            disponibilidad: 0,
            fallasServicio: 0,
            fallasLargas: 0,
            mttf: 0,
            mttr: 0,
            cantidadMedios: 0,
            mediosNoExcluidos: 0
        };
    }
    
    // Acumular indicadores
    acumuladoresTipo[tipo].disponibilidad += indicadores.disponibilidad;
    acumuladoresTipo[tipo].cantidadMedios++;
    
    if (indicadores.fallaServicio) {
        acumuladoresTipo[tipo].fallasServicio++;
    }
    
    acumuladoresTipo[tipo].fallasLargas += indicadores.cantidadFallasLargas;
    
    // Sumar MTTF y MTTR solo si el medio no está excluido
    if (!medio.excluido) {
        acumuladoresTipo[tipo].mttf += indicadores.mttf;
        acumuladoresTipo[tipo].mttr += indicadores.mttr;
        acumuladoresTipo[tipo].mediosNoExcluidos++;
    }
}

/**
 * Calcula los indicadores finales
 * @param {Object} acumuladorRed - Acumulador de indicadores de red
 * @param {Object} acumuladoresLinea - Acumuladores por línea
 * @param {Object} acumuladoresTipo - Acumuladores por tipo
 */
function calcularIndicadoresFinales(acumuladorRed, acumuladoresLinea, acumuladoresTipo) {
    // Calcular indicadores de red
    INDICADORES_RED = {
        MTTR_red: acumuladorRed.mediosNoExcluidos > 0 ? 
            acumuladorRed.mttr / acumuladorRed.mediosNoExcluidos : 0,
        MTTF_red: acumuladorRed.mediosNoExcluidos > 0 ? 
            acumuladorRed.mttf / acumuladorRed.mediosNoExcluidos : 0,
        mediosConFallas: acumuladorRed.mediosConFallas,
        Disponibilidad: acumuladorRed.disponibilidad / Object.keys(INDICADORES_MEDIOS).length
    };
    
    // Calcular indicadores por línea - MANTENER LA ESTRUCTURA ORIGINAL
    INDICADORES_LINEA = {};
    for (const [linea, acumulador] of Object.entries(acumuladoresLinea)) {
        // Inicializar por defecto si no existen
        const escaleras = acumulador.escaleras || {
            tiempoOperativo: 0,
            tiempoNoOperativo: 0,
            cantidadFallas: 0,
            tiempoEntreFallas: 0,
            tiempoReparacion: 0,
            cantidad: 0
        };
        const ascensores = acumulador.ascensores || {
            tiempoOperativo: 0,
            tiempoNoOperativo: 0,
            cantidadFallas: 0,
            tiempoEntreFallas: 0,
            tiempoReparacion: 0,
            cantidad: 0
        };
        INDICADORES_LINEA[linea] = {
            DisponibilidadEsc: escaleras.tiempoOperativo + escaleras.tiempoNoOperativo > 0 ? (escaleras.tiempoOperativo / (escaleras.tiempoOperativo + escaleras.tiempoNoOperativo)) * 100 : 0,
            DisponibilidadAsc: ascensores.tiempoOperativo + ascensores.tiempoNoOperativo > 0 ? (ascensores.tiempoOperativo / (ascensores.tiempoOperativo + ascensores.tiempoNoOperativo)) * 100 : 0,
            MTTFEsc: escaleras.cantidadFallas > 0 ? escaleras.tiempoEntreFallas / escaleras.cantidadFallas : 0,
            MTTFAsc: ascensores.cantidadFallas > 0 ? ascensores.tiempoEntreFallas / ascensores.cantidadFallas : 0,
            MTTREsc: escaleras.cantidadFallas > 0 ? escaleras.tiempoReparacion / escaleras.cantidadFallas : 0,
            MTTRAsc: ascensores.cantidadFallas > 0 ? ascensores.tiempoReparacion / ascensores.cantidadFallas : 0,
            FallasEsc: escaleras.cantidadFallas,
            FallasAsc: ascensores.cantidadFallas,
            Disponibilidad: (escaleras.tiempoOperativo + ascensores.tiempoOperativo + escaleras.tiempoNoOperativo + ascensores.tiempoNoOperativo) > 0 ?
                (escaleras.tiempoOperativo + ascensores.tiempoOperativo) /
                (escaleras.tiempoOperativo + escaleras.tiempoNoOperativo + ascensores.tiempoOperativo + ascensores.tiempoNoOperativo) * 100 : 0
        };
    }
    
    // Calcular indicadores por tipo
    INDICADORES_TIPO_MEDIO = {};
    for (const [tipo, acumulador] of Object.entries(acumuladoresTipo)) {
        INDICADORES_TIPO_MEDIO[tipo] = {
            Disponibilidad: acumulador.disponibilidad / acumulador.cantidadMedios,
            FallasServicio: acumulador.fallasServicio,
            FallasLargas: acumulador.fallasLargas,
            Mttf: acumulador.mediosNoExcluidos > 0 ? 
                acumulador.mttf / acumulador.mediosNoExcluidos : 0,
            Mttr: acumulador.mediosNoExcluidos > 0 ? 
                acumulador.mttr / acumulador.mediosNoExcluidos : 0
        };
    }
}

/**
 * Procesa los datos para generar la estructura necesaria para los gráficos
 */
function procesarDatosParaGraficos() {
    // Inicializar estructuras si no existen
    if (!INDICADORES_MEDIOS) {
        INDICADORES_MEDIOS = {};
    }
    if (!TIEMPOS_MEDIOS) {
        TIEMPOS_MEDIOS = {};
    }

    // Contadores para estadísticas
    let mediosProcesados = 0;
    let mediosExcluidos = 0;
    let mediosSinDatos = 0;
    
    // Estructuras para acumular datos
    let acumuladorRed = {
        mttf: 0,
        mttr: 0,
        mediosConFallas: 0,
        disponibilidad: 0,
        mediosNoExcluidos: 0
    };
    
    // ACUMULADORES POR LÍNEA CON ESCALERAS Y ASCENSORES
    let acumuladoresLinea = {};
    let acumuladoresTipo = {};
    
    // Verificar si hay datos para procesar
    if (Object.keys(INDICADORES_MEDIOS).length === 0) {
        console.warn('⚠️ No hay datos para procesar en INDICADORES_MEDIOS');
        return {
            INDICADORES_RED: {
                MTTR_red: 0,
                MTTF_red: 0,
                mediosConFallas: 0,
                Disponibilidad: 0
            },
            INDICADORES_LINEA: {},
            INDICADORES_TIPO_MEDIO: {}
        };
    }
    
    // Procesar cada medio
    for (const [clave, indicadores] of Object.entries(INDICADORES_MEDIOS)) {
        mediosProcesados++;
        
        // Validar datos
        if (!validarDatosMedio(indicadores)) {
            console.warn(`⚠️ Medio ${clave} tiene datos inválidos, saltando...`);
            mediosSinDatos++;
            continue;
        }
        
        // Obtener información del medio desde TIEMPOS_MEDIOS
        const medio = TIEMPOS_MEDIOS[clave];
        if (!medio) {
            console.warn(`⚠️ No se encontró información del medio ${clave} en TIEMPOS_MEDIOS`);
            mediosSinDatos++;
            continue;
        }
        
        // Procesar indicadores de la red
        procesarIndicadoresRed(acumuladorRed, indicadores, medio);
        
        // ACUMULADOR POR LÍNEA CON ESCALERAS Y ASCENSORES
        const linea = medio.linea;
        const tipo = medio.tipo;
        if (!acumuladoresLinea[linea]) {
            acumuladoresLinea[linea] = {
                escaleras: {
                    tiempoOperativo: 0,
                    tiempoNoOperativo: 0,
                    cantidadFallas: 0,
                    tiempoEntreFallas: 0,
                    tiempoReparacion: 0,
                    cantidad: 0
                },
                ascensores: {
                    tiempoOperativo: 0,
                    tiempoNoOperativo: 0,
                    cantidadFallas: 0,
                    tiempoEntreFallas: 0,
                    tiempoReparacion: 0,
                    cantidad: 0
                }
            };
        }
        // Determinar qué tiempos usar según el tipo
        const tiempoOperativoCalculo = medio.tiempoOperativo;
        const tiempoNoOperativoCalculo = medio.tiempoNoOperativo;
        // Calcular MTTF y MTTR
        let mttf = indicadores.cantidadFallas > 0 ? tiempoOperativoCalculo / indicadores.cantidadFallas : tiempoOperativoCalculo;
        let mttr = indicadores.cantidadFallas > 0 ? tiempoNoOperativoCalculo / indicadores.cantidadFallas : 0;
        if (tipo === 'Escalera') {
            acumuladoresLinea[linea].escaleras.tiempoOperativo += tiempoOperativoCalculo;
            acumuladoresLinea[linea].escaleras.tiempoNoOperativo += tiempoNoOperativoCalculo;
            acumuladoresLinea[linea].escaleras.cantidadFallas += indicadores.cantidadFallas;
            acumuladoresLinea[linea].escaleras.tiempoEntreFallas += mttf;
            acumuladoresLinea[linea].escaleras.tiempoReparacion += mttr;
            acumuladoresLinea[linea].escaleras.cantidad++;
        } else if (tipo === 'Ascensor') {
            acumuladoresLinea[linea].ascensores.tiempoOperativo += tiempoOperativoCalculo;
            acumuladoresLinea[linea].ascensores.tiempoNoOperativo += tiempoNoOperativoCalculo;
            acumuladoresLinea[linea].ascensores.cantidadFallas += indicadores.cantidadFallas;
            acumuladoresLinea[linea].ascensores.tiempoEntreFallas += mttf;
            acumuladoresLinea[linea].ascensores.tiempoReparacion += mttr;
            acumuladoresLinea[linea].ascensores.cantidad++;
        }
        // Procesar indicadores por tipo
        procesarIndicadoresTipo(acumuladoresTipo, indicadores, medio);
    }
    
    // Calcular promedios finales
    console.log('🔎 acumuladoresLinea antes de calcularIndicadoresFinales:', acumuladoresLinea);
    calcularIndicadoresFinales(acumuladorRed, acumuladoresLinea, acumuladoresTipo);
    
    // Mostrar resumen
    console.log('\n📊 Resumen de procesamiento:');
    console.log(`   - Medios procesados: ${mediosProcesados}`);
    console.log(`   - Medios excluidos: ${mediosExcluidos}`);
    console.log(`   - Medios sin datos: ${mediosSinDatos}`);

    // Agregar logs al final de procesarDatosParaGraficos
    console.log('📊 Datos procesados para gráficos:', {
        INDICADORES_LINEA,
        INDICADORES_RED
    });

    // Retornar los indicadores procesados
    return {
        INDICADORES_RED,
        INDICADORES_LINEA,
        INDICADORES_TIPO_MEDIO
    };
}

// Exportar funciones
if (typeof window !== 'undefined') {
    // Exportar para el navegador
    window.dataCalculator = {
        identificarTipoMedio,
        segundosAHorasMinutosSegundos,
        calcular,
        procesarDatosGraficos: procesarDatosParaGraficos,
        TIEMPOS_MEDIOS,
        INDICADORES_MEDIOS,
        INDICADORES_RED,
        INDICADORES_LINEA,
        INDICADORES_TIPO_MEDIO
    };
} else if (typeof module !== 'undefined' && module.exports) {
    // Exportar para Node.js
    module.exports = {
        segundosAHorasMinutosSegundos,
        calcular,
        procesarDatosGraficos: procesarDatosParaGraficos,
        TIEMPOS_MEDIOS,
        INDICADORES_MEDIOS,
        INDICADORES_RED,
        INDICADORES_LINEA,
        INDICADORES_TIPO_MEDIO
    };
} 