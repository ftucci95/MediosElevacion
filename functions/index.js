const functions = require("firebase-functions");
const admin = require("firebase-admin");
const axios = require("axios");
const { obtenerHorarioServicio, estaEnHorarioServicio, calcularTiempoServicioDiario } = require('./horarios');

admin.initializeApp();

// Funciones auxiliares para manejo de fechas Microsoft JSON Date
function toMicrosoftDate(date) {
  if (typeof date === 'string') {
    date = new Date(date);
  }
  return `/Date(${date.getTime()})/`;
}

function fromMicrosoftDate(microsoftDate) {
  if (!microsoftDate) return null;
  const matches = microsoftDate.match(/\/Date\((-?\d+)([+-]\d{4})?\)\//);
  if (matches) {
    return new Date(parseInt(matches[1]));
  }
  return new Date(microsoftDate);
}

function getMicrosoftTimestamp() {
  return toMicrosoftDate(new Date());
}

function getMicrosoftStartOfDay() {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  return toMicrosoftDate(date);
}

// Nueva ubicación para la función
function normalizarParaComparacion(timestamp) {
    if (!timestamp) return null;
    
    try {
        if (typeof timestamp === 'string' && timestamp.startsWith('/Date(')) {
            const matches = timestamp.match(/\/Date\((-?\d+)([+-]\d{4})?\)\//);
            if (matches) {
                return parseInt(matches[1]);
            }
        }
        return new Date(timestamp).getTime();
    } catch (error) {
        console.error(`[${getMicrosoftTimestamp()}] Error normalizando timestamp:`, error);
        return null;
    }
}

const runtimeOpts = {
  timeoutSeconds: 300,  // Disminuímos el timeout a 30 segundos
  memory: '256MB',
  minInstances: 0,     // Mantenemos al menos una instancia activa
  maxInstances: 3,     // Limitamos a 2 instancias máximo para controlar costos
  region: 'southamerica-east1'
};

// Función para listar buckets
exports.listBuckets = functions
  .runWith({
    timeoutSeconds: 60,
    memory: '256MB',
    minInstances: 0,
    maxInstances: 1,
    region: 'southamerica-east1'
  })
  .region('southamerica-east1')
  .https.onRequest(async (req, res) => {
    try {
      // En Firebase Admin SDK, el bucket por defecto es <project-id>.appspot.com
      const defaultBucket = admin.storage().bucket();
      console.log(`[${getMicrosoftTimestamp()}] Bucket por defecto:`, defaultBucket.name);
      res.json({ defaultBucket: defaultBucket.name });
    } catch (error) {
      console.error(`[${getMicrosoftTimestamp()}] Error obteniendo bucket:`, error);
      res.status(500).send('Error getting bucket: ' + error.message);
    }
  });

// Función auxiliar para comparar estados y encontrar cambios
async function compararEstados(estadoAnterior, estadoNuevo, db) {
  const cambios = [];
  
  // Crear mapa del estado anterior
  const accesoMap = new Map();
  if (Array.isArray(estadoAnterior)) {
    estadoAnterior.forEach(linea => {
      linea.estaciones.forEach(estacion => {
        estacion.accesos.forEach(acceso => {
          const key = `${linea.nombre}|${estacion.nombre}|${acceso.descripcion}`;
          // Normalizar el timestamp del estado anterior
          const fechaActualizacionNormalizada = normalizarParaComparacion(acceso.fechaActualizacion);
          accesoMap.set(key, {
            ...acceso,
            fechaActualizacionNormalizada
          });
        });
      });
    });
  }

  // Comparar con estado nuevo
  for (const linea of estadoNuevo) {
    for (const estacion of linea.estaciones || []) {
      for (const acceso of estacion.accesos || []) {
        const key = `${linea.nombre}|${estacion.nombre}|${acceso.descripcion}`;
        const accesoAnterior = accesoMap.get(key);
        
        // Nuevo logging para medios no encontrados
        if (!accesoAnterior) {
          console.log(`[${getMicrosoftTimestamp()}] Medio no encontrado en estadoActual`, {
            linea: linea.nombre,
            estacion: estacion.nombre,
            medio: acceso.descripcion,
            detallesNuevo: {
              funcionando: acceso.funcionando,
              timestamp: acceso.fechaActualizacion
            }
          });
        }
        
        // Normalizar timestamp del estado nuevo para comparación
        const fechaNuevaNormalizada = normalizarParaComparacion(acceso.fechaActualizacion);

        // Detectar cambios
        const cambioEstado = !accesoAnterior || accesoAnterior.funcionando !== acceso.funcionando;
        const cambioTimestamp = accesoAnterior && 
            accesoAnterior.fechaActualizacionNormalizada !== fechaNuevaNormalizada;

        if (cambioEstado || cambioTimestamp) {
          const timestamp = acceso.fechaActualizacion; // Siempre usar el timestamp de la API
          
          // Log extendido
          console.log(`[${getMicrosoftTimestamp()}] Cambio detectado en:`, { 
              linea: linea.nombre,
              estacion: estacion.nombre,
              medio: acceso.descripcion,
              razon: {
                  cambioEstado: cambioEstado ? 'ESTADO DIFERENTE' : 'MISMO ESTADO',
                  cambioTimestamp: cambioTimestamp ? 'TIMESTAMP DIFERENTE' : 'MISMO TIMESTAMP',
                  valores: {
                      anterior: {
                          funcionando: accesoAnterior?.funcionando ?? 'NO EXISTIA',
                          raw: accesoAnterior?.fechaActualizacion ?? 'N/A',
                          normalized: accesoAnterior?.fechaActualizacionNormalizada ?? 'N/A',
                          timestampAnteriorMs: accesoAnterior?.fechaActualizacionNormalizada ?? 'N/A'
                      },
                      nuevo: {
                          funcionando: acceso.funcionando,
                          raw: acceso.fechaActualizacion,
                          normalized: fechaNuevaNormalizada,
                          timestampNuevoMs: fechaNuevaNormalizada
                      }
                  },
                  diferenciaMs: accesoAnterior ? 
                      fechaNuevaNormalizada - accesoAnterior.fechaActualizacionNormalizada : 
                      'N/A'
              }
          });

          // Solo agregar a cambios si es cambio de ESTADO
          if (cambioEstado) {
            // Si pasó de no operativo a operativo, actualizar el timestampResolucion del último documento
            if (accesoAnterior && !accesoAnterior.funcionando && acceso.funcionando) {
              try {
                const querySnapshot = await db.collection("historialCambios")
                  .where("linea", "==", linea.nombre)
                  .where("estacion", "==", estacion.nombre)
                  .where("medioElevacion", "==", acceso.descripcion)
                  .where("estado", "==", "No operativo")
                  .where("timestampResolucion", "==", null)
                  .orderBy("timestamp", "desc")
                  .limit(1)
                  .get();

                if (!querySnapshot.empty) {
                  await querySnapshot.docs[0].ref.update({
                    timestampResolucion: timestamp // Usar el timestamp de la API
                  });
                  console.log(`[${getMicrosoftTimestamp()}] ✓ Resuelto: Se actualizó timestampResolucion con timestamp de API`);
                } else {
                  console.log(`[${getMicrosoftTimestamp()}] ! No se encontró falla anterior sin resolver`);
                }
              } catch (error) {
                console.error(`[${getMicrosoftTimestamp()}] ! Error actualizando timestampResolucion: ${error.message}`);
              }
            }

            // Registrar el cambio en historialCambios
            cambios.push({
              linea: linea.nombre,
              estacion: estacion.nombre,
              medioElevacion: acceso.descripcion,
              estado: acceso.funcionando ? "Operativo" : "No operativo",
              id: acceso.nombre,
              timestamp: timestamp,
              timestampResolucion: null,
            });

            // Actualizar estadísticas diarias
            try {
              const fecha = timestamp.split('T')[0];
              const estadisticaQuery = await db.collection("estadisticasDiarias")
                .where("fecha", "==", fecha)
                .where("linea", "==", linea.nombre)
                .where("estacion", "==", estacion.nombre)
                .where("medioElevacion", "==", acceso.descripcion)
                .limit(1)
                .get();

              if (!estadisticaQuery.empty) {
                const doc = estadisticaQuery.docs[0];
                const estadisticas = doc.data().estadisticas;
                
                // Agregar nuevo estado
                estadisticas.estados.push({
                  timestamp: timestamp,
                  estado: acceso.funcionando ? "Operativo" : "No operativo"
                });

                // Si estamos en horario de servicio y pasa a no operativo, incrementar contador
                if (!acceso.funcionando && estaEnHorarioServicio(linea.nombre, timestamp)) {
                  estadisticas.cantidadFallas++;
                }

                await doc.ref.update({ estadisticas });
              }
            } catch (error) {
              console.error(`[${timestamp}] Error actualizando estadísticas diarias: ${error.message}`);
            }
          }
        } else {
          const timestamp = getMicrosoftTimestamp();
          console.debug(`[${timestamp}] Sin cambios en:`, {
            linea: linea.nombre,
            estacion: estacion.nombre,
            medio: acceso.descripcion,
            razon: {
              mismoEstado: accesoAnterior?.funcionando === acceso.funcionando,
              mismoTimestamp: accesoAnterior?.fechaActualizacionNormalizada === fechaNuevaNormalizada
            }
          });
        }
      }
    }
  }
  
  if (cambios.length > 0) {
    console.log(`[${getMicrosoftTimestamp()}] Total cambios detectados: ${cambios.length}`);
  }
  return cambios;
}

// Función para inicializar estadísticas diarias si no existen
async function iniciarEstadisticasDiarias(db, estado) {
  const fecha = getMicrosoftStartOfDay();
  
  try {
    // Verificar si ya existen estadísticas para hoy
    const existingStats = await db.collection("estadisticasDiarias")
      .where("fecha", "==", fecha)
      .limit(1)
      .get();
    
    if (!existingStats.empty) {
      return; // Ya existen estadísticas para hoy
    }

    // Crear documentos para cada medio
    const batch = db.batch();
    estado.forEach(linea => {
      linea.estaciones.forEach(estacion => {
        estacion.accesos.forEach(acceso => {
          const docRef = db.collection("estadisticasDiarias").doc();
          const horarioServicio = obtenerHorarioServicio(linea.nombre);
          
          batch.set(docRef, {
            fecha,
            linea: linea.nombre,
            estacion: estacion.nombre,
            medioElevacion: acceso.descripcion,
            horaInicioServicio: toMicrosoftDate(new Date(horarioServicio.inicio)),
            horaFinServicio: toMicrosoftDate(new Date(horarioServicio.fin)),
            estadisticas: {
              tiempoTotalServicio: calcularTiempoServicioDiario(linea.nombre),
              tiempoNoOperativo: 0,
              cantidadFallas: 0,
              estados: [{
                timestamp: getMicrosoftTimestamp(),
                estado: acceso.funcionando ? "Operativo" : "No operativo"
              }]
            }
          });
        });
      });
    });
    
    await batch.commit();
    console.log(`[${getMicrosoftTimestamp()}] Estadísticas diarias iniciadas para ${fecha}`);
  } catch (error) {
    console.error(`[${getMicrosoftTimestamp()}] Error iniciando estadísticas diarias: ${error.message}`);
    throw error;
  }
}

exports.detectarCambios = functions
  .runWith(runtimeOpts)
  .region('southamerica-east1')
  .pubsub.schedule("*/5 * * * *")  // Cada 5 minutos
  .timeZone("America/Argentina/Buenos_Aires")
  .onRun(async (context) => {
    const db = admin.firestore();
    
    try {
      // 1. Recibe los datos a través de la API
      const apiUrl = "https://aplicacioneswp.metrovias.com.ar/APIAccesibilidad/Accesibilidad.svc/GetLineas";
      const response = await axios.get(apiUrl);
      const estadoNuevo = response.data;

      // 2. Obtener el estado actual de Firebase
      const estadoDoc = await db.collection("estadoActual").doc("estado").get();
      const estadoAnterior = estadoDoc.exists ? estadoDoc.data().estado : null;

      // 3. Inicializar estadísticas si no existen.
      await iniciarEstadisticasDiarias(db, estadoNuevo);

      // 4. Si no hay estado anterior, guardar el estado actual completo
      if (!estadoAnterior) {
        // Agregar fechaActualizacion a cada acceso
        const estadoConFechas = estadoNuevo.map(linea => ({
          ...linea,
          estaciones: linea.estaciones.map(estacion => ({
            ...estacion,
            accesos: estacion.accesos.map(acceso => ({
              ...acceso,
              fechaActualizacion: getMicrosoftTimestamp()
            }))
          }))
        }));
        
        await db.collection("estadoActual").doc("estado").set({
          estado: estadoConFechas,
          timestamp: getMicrosoftTimestamp()
        });
        return null;
      }

      // 5. Comparar estados y detectar cambios
      const cambios = await compararEstados(estadoAnterior, estadoNuevo, db);

      // 6. Preparar el nuevo estado con fechas de actualización
      const estadoConFechas = estadoNuevo.map(linea => {
        return {
          ...linea,
          estaciones: linea.estaciones.map(estacion => {
            return {
              ...estacion,
              accesos: estacion.accesos.map(acceso => {
                // Buscar si este acceso tuvo algún cambio
                const cambio = cambios.find(c => 
                  c.linea === linea.nombre && 
                  c.estacion === estacion.nombre && 
                  c.medioElevacion === acceso.descripcion
                );
                
                // Buscar la fecha anterior
                const fechaAnterior = estadoAnterior
                  .find(l => l.nombre === linea.nombre)
                  ?.estaciones?.find(e => e.nombre === estacion.nombre)
                  ?.accesos?.find(a => a.descripcion === acceso.descripcion)
                  ?.fechaActualizacion;

                return {
                  ...acceso,
                  // Si hubo cambio (de estado o timestamp), usar el timestamp de la API
                  // Si no hubo cambios, mantener fecha anterior
                  fechaActualizacion: cambio ? 
                      acceso.fechaActualizacion : // Usar el timestamp de la API
                      fechaAnterior // Mantener el anterior si no hay cambios
                };
              })
            };
          })
        };
      });

      // 7. Actualizar estado en una transacción
      try {
        await db.runTransaction(async (transaction) => {
          // Guardar el nuevo estado
          transaction.set(db.collection("estadoActual").doc("estado"), {
            estado: estadoConFechas,
            timestamp: getMicrosoftTimestamp()
          });

          // Si hay cambios, registrarlos en historialCambios
          if (cambios.length > 0) {
            for (const cambio of cambios) {
              const docRef = db.collection("historialCambios").doc();
              transaction.set(docRef, cambio);
            }
          }
        });
      } catch (error) {
        console.error("Error en la transacción de Firestore:", error);
        throw error;
      }

      return null;
    } catch (error) {
      console.error("Error en la función detectarCambios:", error);
      if (error.response) {
        console.error("Error de respuesta API:", {
          status: error.response.status,
          data: error.response.data
        });
      }
      throw error;
    }
  });

// Función para cerrar estadísticas del día
exports.cerrarEstadisticasDiarias = functions
  .runWith(runtimeOpts)
  .region('southamerica-east1')
  .pubsub.schedule("59 23 * * *")
  .timeZone("America/Argentina/Buenos_Aires")
  .onRun(async (context) => {
    const db = admin.firestore();
    const fecha = getMicrosoftStartOfDay();
    
    try {
      const snapshot = await db.collection("estadisticasDiarias")
        .where("fecha", "==", fecha)
        .get();

      const batch = db.batch();
      snapshot.forEach(doc => {
        const data = doc.data();
        const estados = data.estadisticas.estados;
        let tiempoNoOperativo = 0;
        
        // Calcular tiempo no operativo durante horario de servicio
        for (let i = 0; i < estados.length - 1; i++) {
          if (estados[i].estado === "No operativo") {
            const inicio = parseInt(estados[i].timestamp.match(/\/Date\((\d+)\)\//)[1]);
            const fin = parseInt(estados[i + 1].timestamp.match(/\/Date\((\d+)\)\//)[1]);
            
            // Solo contar tiempo si estaba en horario de servicio
            if (estaEnHorarioServicio(data.linea, fromMicrosoftDate(estados[i].timestamp).toISOString())) {
              tiempoNoOperativo += fin - inicio;
            }
          }
        }
        
        // Si el último estado es no operativo, contar hasta fin de servicio
        const ultimoEstado = estados[estados.length - 1];
        if (ultimoEstado.estado === "No operativo") {
          const inicioUltimo = parseInt(ultimoEstado.timestamp.match(/\/Date\((\d+)\)\//)[1]);
          if (estaEnHorarioServicio(data.linea, fromMicrosoftDate(ultimoEstado.timestamp).toISOString())) {
            const finServicio = new Date();
            finServicio.setHours(23, 59, 59, 999);
            tiempoNoOperativo += finServicio.getTime() - inicioUltimo;
          }
        }
        
        batch.update(doc.ref, {
          'estadisticas.tiempoNoOperativo': tiempoNoOperativo
        });
      });
      
      await batch.commit();
      console.log(`[${getMicrosoftTimestamp()}] Estadísticas diarias cerradas para ${fecha}`);
    } catch (error) {
      console.error(`[${getMicrosoftTimestamp()}] Error cerrando estadísticas diarias: ${error.message}`);
      throw error;
    }
  });

// Función para borrar estadísticas de un día específico
exports.borrarEstadisticasDia = functions
  .runWith(runtimeOpts)
  .region('southamerica-east1')
  .https.onRequest(async (req, res) => {
    const db = admin.firestore();
    const fechaQuery = req.query.fecha;
    const fecha = fechaQuery ? 
      toMicrosoftDate(new Date(fechaQuery).setHours(0,0,0,0)) : 
      getMicrosoftStartOfDay();

    try {
      // Obtener todos los documentos de la fecha especificada
      const snapshot = await db.collection("estadisticasDiarias")
        .where("fecha", "==", fecha)
        .get();

      if (snapshot.empty) {
        res.status(404).json({ 
          message: `No hay estadísticas para la fecha ${fromMicrosoftDate(fecha).toISOString().split('T')[0]}` 
        });
        return;
      }

      // Borrar documentos en batches de 500 (límite de Firebase)
      const batchArray = [];
      let batch = db.batch();
      let operationCount = 0;

      snapshot.forEach(doc => {
        batch.delete(doc.ref);
        operationCount++;

        if (operationCount === 500) {
          batchArray.push(batch);
          batch = db.batch();
          operationCount = 0;
        }
      });

      // Agregar el último batch si tiene operaciones pendientes
      if (operationCount > 0) {
        batchArray.push(batch);
      }

      // Ejecutar todos los batches
      await Promise.all(batchArray.map(batch => batch.commit()));
      
      const fechaFormateada = fromMicrosoftDate(fecha).toISOString().split('T')[0];
      console.log(`[${getMicrosoftTimestamp()}] Borradas ${snapshot.size} estadísticas del día ${fechaFormateada}`);
      res.json({ 
        message: `Borradas ${snapshot.size} estadísticas del día ${fechaFormateada}`,
        documentosBorrados: snapshot.size 
      });
    } catch (error) {
      console.error(`[${getMicrosoftTimestamp()}] Error borrando estadísticas: ${error.message}`);
      res.status(500).json({ error: error.message });
    }
  });
