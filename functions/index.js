const functions = require("firebase-functions");
const admin = require("firebase-admin");
const axios = require("axios");
const { obtenerHorarioServicio, estaEnHorarioServicio, calcularTiempoServicioDiario } = require('./horarios');

admin.initializeApp();

const runtimeOpts = {
  timeoutSeconds: 300,
  memory: '256MB',
  minInstances: 0,
  maxInstances: 1,
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
      console.log('Bucket por defecto:', defaultBucket.name);
      res.json({ defaultBucket: defaultBucket.name });
    } catch (error) {
      console.error('Error obteniendo bucket:', error);
      res.status(500).send('Error getting bucket: ' + error.message);
    }
  });

// Función para escribir logs
async function writeToLog(message) {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] ${message}\n`;
  
  try {
    const bucket = admin.storage().bucket();
    const today = new Date().toISOString().split('T')[0];
    const fileName = `logs/cambios_estado_${today}.txt`;
    const file = bucket.file(fileName);
    
    console.log('Intentando escribir en bucket:', bucket.name);
    console.log('Archivo:', fileName);
    
    const [exists] = await file.exists();
    
    if (!exists) {
      await file.save(logMessage);
      console.log('Archivo creado');
    } else {
      await file.append(logMessage);
      console.log('Contenido agregado');
    }
  } catch (error) {
    console.error('Error escribiendo al log:', error);
    if (error.code) console.error('Código de error:', error.code);
    if (error.details) console.error('Detalles:', error.details);
  }
}

// Función auxiliar para comparar estados y encontrar cambios
async function compararEstados(estadoAnterior, estadoNuevo, db) {
  const cambios = [];
  
  // Función helper para normalizar timestamp al momento de comparar
  function normalizarParaComparacion(timestamp) {
    if (!timestamp) return null;
    
    try {
      // Si es formato Microsoft JSON Date
      if (typeof timestamp === 'string' && timestamp.startsWith('/Date(')) {
        const matches = timestamp.match(/\/Date\((-?\d+)([+-]\d{4})\)\//);
        if (matches) {
          const milliseconds = parseInt(matches[1]);
          return new Date(milliseconds).getTime();
        }
      }
      
      // Si es formato ISO o timestamp válido
      return new Date(timestamp).getTime();
    } catch (error) {
      console.error('Error normalizando timestamp para comparación:', error);
      return null;
    }
  }

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
        
        // Normalizar timestamp del estado nuevo para comparación
        const fechaNuevaNormalizada = normalizarParaComparacion(acceso.fechaActualizacion);

        // Detectar cambio de estado o timestamp
        const cambioEstado = !accesoAnterior || accesoAnterior.funcionando !== acceso.funcionando;
        const cambioTimestamp = accesoAnterior && 
                              fechaNuevaNormalizada !== accesoAnterior.fechaActualizacionNormalizada;

        if (cambioEstado || cambioTimestamp) {
          const timestamp = new Date().toISOString();
          const mensaje = `${linea.nombre} - ${estacion.nombre} - ${acceso.descripcion}: ${
            accesoAnterior?.funcionando ? 'Operativo' : 'No existe/No operativo'
          } -> ${
            acceso.funcionando ? 'Operativo' : 'No operativo'
          }`;
          await writeToLog(mensaje);
          
          // Si pasó de no operativo a operativo, actualizar el timestampResolucion
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
                  timestampResolucion: timestamp
                });
                await writeToLog(`  ✓ Resuelto: Se actualizó timestampResolucion`);
              } else {
                await writeToLog(`  ! No se encontró falla anterior sin resolver`);
              }
            } catch (error) {
              await writeToLog(`  ! Error actualizando timestampResolucion: ${error.message}`);
            }
          }

          // Registrar el cambio en historialCambios
          cambios.push({
            linea: linea.nombre,
            estacion: estacion.nombre,
            medioElevacion: acceso.descripcion,
            estado: acceso.funcionando ? "Operativo" : "No operativo",
            timestamp: timestamp,
            timestampResolucion: null
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
            await writeToLog(`Error actualizando estadísticas diarias: ${error.message}`);
          }
        }
      }
    }
  }
  
  if (cambios.length > 0) {
    await writeToLog(`Total cambios detectados: ${cambios.length}`);
  }
  return cambios;
}

// Función para descargar logs
exports.downloadLogs = functions
  .runWith(runtimeOpts)
  .region('southamerica-east1')
  .https.onRequest(async (req, res) => {
    try {
      // Obtener fecha del query param o usar la fecha actual
      const date = req.query.date || new Date().toISOString().split('T')[0];
      const fileName = `logs/cambios_estado_${date}.txt`;
      const bucket = admin.storage().bucket();
      const file = bucket.file(fileName);
      
      // Verificar si existe el archivo
      const [exists] = await file.exists();
      if (!exists) {
        res.status(404).send(`No hay logs para la fecha ${date}`);
        return;
      }
      
      // Descargar y enviar el contenido
      const [content] = await file.download();
      res.set('Content-Type', 'text/plain');
      res.send(content);
      
    } catch (error) {
      res.status(500).send('Error reading logs: ' + error.message);
    }
  });

// Función para inicializar estadísticas diarias si no existen
async function iniciarEstadisticasDiarias(db, estado) {
  const fecha = new Date().toISOString().split('T')[0];
  
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
          batch.set(docRef, {
            fecha,
            linea: linea.nombre,
            estacion: estacion.nombre,
            medioElevacion: acceso.descripcion,
            horaInicioServicio: obtenerHorarioServicio(linea.nombre).inicio,
            horaFinServicio: obtenerHorarioServicio(linea.nombre).fin,
            estadisticas: {
              tiempoTotalServicio: calcularTiempoServicioDiario(linea.nombre),
              tiempoNoOperativo: 0,
              cantidadFallas: 0,
              estados: [{
                timestamp: new Date().toISOString(),
                estado: acceso.funcionando ? "Operativo" : "No operativo"
              }]
            }
          });
        });
      });
    });
    
    await batch.commit();
    await writeToLog(`Estadísticas diarias iniciadas para ${fecha}`);
  } catch (error) {
    await writeToLog(`Error iniciando estadísticas diarias: ${error.message}`);
    throw error;
  }
}

exports.detectarCambios = functions
  .runWith(runtimeOpts)
  .region('southamerica-east1')
  .pubsub.schedule("*/1 * * * *")  // Cada 1 minuto
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

      // 3. Inicializar estadísticas si no existen
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
              fechaActualizacion: new Date().toISOString()
            }))
          }))
        }));
        
        await db.collection("estadoActual").doc("estado").set({
          estado: estadoConFechas,
          timestamp: new Date().toISOString()
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
                // Buscar si este acceso tuvo un cambio
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
                  // Si hubo cambio o no hay fecha anterior, usar timestamp actual
                  fechaActualizacion: cambio || !fechaAnterior ? 
                    new Date().toISOString() : 
                    fechaAnterior
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
            timestamp: new Date().toISOString()
          });

          // Si hay cambios, registrarlos en historialCambios
          if (cambios.length > 0) {
            for (const cambio of cambios) {
              const docRef = db.collection("historialCambios").doc();
              transaction.set(docRef, {
                ...cambio,
                timestamp: new Date().toISOString(),
                timestampResolucion: null
              });
            }
          }
        });
      } catch (error) {
        await writeToLog("Error en la transacción de Firestore: " + error.message);
        console.error("Error en la transacción de Firestore:", error);
        throw error;
      }

      return null;
    } catch (error) {
      await writeToLog("Error en la función detectarCambios: " + error.message);
      console.error("Error en la función detectarCambios:", error);
      if (error.response) {
        await writeToLog("Error de respuesta API: " + error.response.status + " " + JSON.stringify(error.response.data));
        console.error("Error de respuesta API:", {
          status: error.response.status,
          data: error.response.data
        });
      }
      throw error;
    }
  });

// Nueva función para cerrar estadísticas del día
exports.cerrarEstadisticasDiarias = functions
  .runWith(runtimeOpts)
  .region('southamerica-east1')
  .pubsub.schedule("59 23 * * *")
  .timeZone("America/Argentina/Buenos_Aires")
  .onRun(async (context) => {
    const db = admin.firestore();
    const fecha = new Date().toISOString().split('T')[0];
    
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
            const inicio = new Date(estados[i].timestamp);
            const fin = new Date(estados[i + 1].timestamp);
            
            // Solo contar tiempo si estaba en horario de servicio
            if (estaEnHorarioServicio(data.linea, estados[i].timestamp)) {
              tiempoNoOperativo += fin - inicio;
            }
          }
        }
        
        // Si el último estado es no operativo, contar hasta fin de servicio
        const ultimoEstado = estados[estados.length - 1];
        if (ultimoEstado.estado === "No operativo" && 
            estaEnHorarioServicio(data.linea, ultimoEstado.timestamp)) {
          const finServicio = new Date();
          finServicio.setHours(23, 59, 59, 999);
          tiempoNoOperativo += finServicio - new Date(ultimoEstado.timestamp);
        }
        
        batch.update(doc.ref, {
          'estadisticas.tiempoNoOperativo': tiempoNoOperativo
        });
      });
      
      await batch.commit();
      await writeToLog(`Estadísticas diarias cerradas para ${fecha}`);
    } catch (error) {
      await writeToLog(`Error cerrando estadísticas diarias: ${error.message}`);
      throw error;
    }
  });

// Función para borrar estadísticas de un día específico
exports.borrarEstadisticasDia = functions
  .runWith(runtimeOpts)
  .region('southamerica-east1')
  .https.onRequest(async (req, res) => {
    const db = admin.firestore();
    const fecha = req.query.fecha || new Date().toISOString().split('T')[0];

    try {
      // Obtener todos los documentos de la fecha especificada
      const snapshot = await db.collection("estadisticasDiarias")
        .where("fecha", "==", fecha)
        .get();

      if (snapshot.empty) {
        res.status(404).json({ message: `No hay estadísticas para la fecha ${fecha}` });
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
      
      await writeToLog(`Borradas ${snapshot.size} estadísticas del día ${fecha}`);
      res.json({ 
        message: `Borradas ${snapshot.size} estadísticas del día ${fecha}`,
        documentosBorrados: snapshot.size 
      });
    } catch (error) {
      await writeToLog(`Error borrando estadísticas: ${error.message}`);
      res.status(500).json({ error: error.message });
    }
  });
