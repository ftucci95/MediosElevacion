const functions = require("firebase-functions");
const admin = require("firebase-admin");
const axios = require("axios");

admin.initializeApp();

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

const runtimeOpts = {
  timeoutSeconds: 60,
  memory: '256MB',
  minInstances: 0,
  maxInstances: 1,
  region: 'southamerica-east1'
};

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
  
  if (!Array.isArray(estadoNuevo)) {
    return cambios;
  }

  for (const linea of estadoNuevo) {
    for (const estacion of linea.estaciones || []) {
      for (const acceso of estacion.accesos || []) {
        const accesoAnterior = estadoAnterior
          ?.find(l => l.nombre === linea.nombre)
          ?.estaciones?.find(e => e.nombre === estacion.nombre)
          ?.accesos?.find(a => a.descripcion === acceso.descripcion);

        // Solo logueamos si hay un cambio de estado
        if (!accesoAnterior || accesoAnterior.funcionando !== acceso.funcionando) {
          const mensaje = `${linea.nombre} - ${estacion.nombre} - ${acceso.descripcion}: ${accesoAnterior?.funcionando ? 'Operativo' : 'No existe/No operativo'} -> ${acceso.funcionando ? 'Operativo' : 'No operativo'}`;
          await writeToLog(mensaje);
          
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
                  timestampResolucion: new Date().toISOString()
                });
                await writeToLog(`  ✓ Resuelto: Se actualizó timestampResolucion`);
              } else {
                await writeToLog(`  ! No se encontró falla anterior sin resolver`);
              }
            } catch (error) {
              await writeToLog(`  ! Error actualizando timestampResolucion: ${error.message}`);
            }
          }

          cambios.push({
            linea: linea.nombre,
            estacion: estacion.nombre,
            medioElevacion: acceso.descripcion,
            estado: acceso.funcionando ? "Operativo" : "No operativo",
            timestamp: new Date().toISOString(),
            timestampResolucion: null
          });
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

      // 3. Si no hay estado anterior, guardar el estado actual completo
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

      // 4. Comparar estados y detectar cambios
      const cambios = await compararEstados(estadoAnterior, estadoNuevo, db);

      // 5. Preparar el nuevo estado con fechas de actualización
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

      // 6. Actualizar estado en una transacción
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
