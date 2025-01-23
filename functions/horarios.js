// Horarios de servicio por línea
const horariosServicio = {
    'Línea A': { inicio: '00:00', fin: '23:59' },
    'Línea B': { inicio: '00:00', fin: '23:59' },
    'Línea C': { inicio: '00:00', fin: '23:59' },
    'Línea D': { inicio: '00:00', fin: '23:59' },
    'Línea E': { inicio: '00:00', fin: '23:59' },
    'Línea H': { inicio: '00:00', fin: '23:59' },
    'Premetro': { inicio: '05:00', fin: '23:30' }
};

/**
 * Obtiene los horarios de servicio para una línea específica
 */
function obtenerHorarioServicio(linea) {
    return horariosServicio[linea] || { inicio: '05:00', fin: '23:30' }; // horario por defecto
}

/**
 * Verifica si un timestamp está dentro del horario de servicio
 */
function estaEnHorarioServicio(linea, timestamp) {
    const fecha = new Date(timestamp);
    const horario = obtenerHorarioServicio(linea);
    
    // Convertir horarios a minutos desde medianoche
    const [horaInicio, minInicio] = horario.inicio.split(':').map(Number);
    const [horaFin, minFin] = horario.fin.split(':').map(Number);
    const minutosInicio = horaInicio * 60 + minInicio;
    const minutosFin = horaFin * 60 + minFin;
    
    // Convertir hora actual a minutos
    const minutosActuales = fecha.getHours() * 60 + fecha.getMinutes();
    
    return minutosActuales >= minutosInicio && minutosActuales <= minutosFin;
}

/**
 * Calcula el tiempo total de servicio en un día para una línea
 */
function calcularTiempoServicioDiario(linea) {
    const horario = obtenerHorarioServicio(linea);
    const [horaInicio, minInicio] = horario.inicio.split(':').map(Number);
    const [horaFin, minFin] = horario.fin.split(':').map(Number);
    
    const minutosInicio = horaInicio * 60 + minInicio;
    const minutosFin = horaFin * 60 + minFin;
    
    return (minutosFin - minutosInicio) * 60 * 1000; // convertir a milisegundos
}

module.exports = {
    obtenerHorarioServicio,
    estaEnHorarioServicio,
    calcularTiempoServicioDiario
};
