const functions = require("firebase-functions");
const admin = require("firebase-admin");
const axios = require("axios");

admin.initializeApp();

const runtimeOpts = {
  timeoutSeconds: 60,
  memory: '256MB',
  minInstances: 0,
  maxInstances: 1,
  region: 'southamerica-east1'
};

// Función auxiliar para comparar estados y encontrar cambios
function compararEstados(estadoAnterior, estadoNuevo, db) {
  console.log("Iniciando comparación de estados...");
  const cambios = [];
  
  // Verificar que tenemos la estructura correcta
  if (!Array.isArray(estadoNuevo)) {
    console.error("Estructura de datos inválida, se esperaba un array:", estadoNuevo);
    return cambios;
  }

  // Iterar sobre cada línea
  for (const linea of estadoNuevo) {
    if (!linea.estaciones || !Array.isArray(linea.estaciones)) {
      console.log(`Línea sin estaciones o formato inválido:`, linea);
      continue;
    }

    // Iterar sobre cada estación
    for (const estacion of linea.estaciones) {
      if (!estacion.accesos || !Array.isArray(estacion.accesos)) {
        console.log(`Estación sin accesos o formato inválido:`, estacion);
        continue;
      }

      // Iterar sobre cada acceso (medio de elevación)
      for (const acceso of estacion.accesos) {
        // Buscar el acceso correspondiente en el estado anterior
        const accesoAnterior = estadoAnterior
          ?.find(l => l.nombre === linea.nombre)
          ?.estaciones?.find(e => e.nombre === estacion.nombre)
          ?.accesos?.find(a => a.descripcion === acceso.descripcion);

        // Si el acceso no existía antes o cambió su estado de funcionamiento
        if (!accesoAnterior || accesoAnterior.funcionando !== acceso.funcionando) {
          console.log(`Cambio detectado en ${linea.nombre} - ${estacion.nombre} - ${acceso.descripcion}`);
          console.log(`Estado anterior: ${accesoAnterior?.funcionando ? 'Operativo' : 'No operativo'}`);
          console.log(`Estado nuevo: ${acceso.funcionando ? 'Operativo' : 'No operativo'}`);
          
          // Si el acceso anterior existía y estaba no operativo, y ahora está operativo
          // buscamos la última falla para actualizarla con el timestamp de resolución
          if (accesoAnterior && !accesoAnterior.funcionando && acceso.funcionando) {
            console.log(`Buscando última falla sin resolver para ${acceso.descripcion}...`);
            // Buscar la última falla sin resolver
            db.collection("historialCambios")
              .where("linea", "==", linea.nombre)
              .where("estacion", "==", estacion.nombre)
              .where("medioElevacion", "==", acceso.descripcion)
              .where("estado", "==", "No operativo")
              .where("timestampResolucion", "==", null)
              .orderBy("timestamp", "desc")
              .limit(1)
              .get()
              .then(querySnapshot => {
                if (!querySnapshot.empty) {
                  console.log(`Actualizando timestampResolucion para falla de ${acceso.descripcion}`);
                  const doc = querySnapshot.docs[0];
                  doc.ref.update({
                    timestampResolucion: admin.firestore.FieldValue.serverTimestamp()
                  });
                } else {
                  console.log(`No se encontró falla sin resolver para ${acceso.descripcion}`);
                }
              })
              .catch(error => {
                console.error(`Error al actualizar timestampResolucion para ${acceso.descripcion}:`, error);
              });
          }

          cambios.push({
            linea: linea.nombre,
            estacion: estacion.nombre,
            medioElevacion: acceso.descripcion,
            estado: acceso.funcionando ? "Operativo" : "No operativo",
            timestamp: admin.firestore.FieldValue.serverTimestamp(),
            timestampResolucion: null // Inicialmente null, se actualizará cuando se resuelva
          });
        }
      }
    }
  }
  
  console.log(`Comparación finalizada. Se encontraron ${cambios.length} cambios`);
  return cambios;
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
      console.log("Iniciando petición a la API...");
      const apiUrl = "https://aplicacioneswp.metrovias.com.ar/APIAccesibilidad/Accesibilidad.svc/GetLineas";
      const response = await axios.get(apiUrl);
      const estadoNuevo = response.data;
      console.log("Datos recibidos de la API");

      // 2. Obtener el estado actual de Firebase
      console.log("Obteniendo estado guardado de Firebase...");
      const estadoDoc = await db.collection("estadoActual").doc("estado").get();
      const estadoAnterior = estadoDoc.exists ? estadoDoc.data().estado : null;
      console.log("Estado anterior:", estadoAnterior ? "Existe" : "No existe");

      // 3. Si no hay estado anterior, guardar el estado actual completo
      if (!estadoAnterior) {
        console.log("No existe estado guardado, creando primer registro...");
        // Agregar fechaActualizacion a cada acceso
        const estadoConFechas = estadoNuevo.map(linea => ({
          ...linea,
          estaciones: linea.estaciones.map(estacion => ({
            ...estacion,
            accesos: estacion.accesos.map(acceso => ({
              ...acceso,
              fechaActualizacion: admin.firestore.FieldValue.serverTimestamp()
            }))
          }))
        }));
        
        await db.collection("estadoActual").doc("estado").set({
          estado: estadoConFechas,
          timestamp: admin.firestore.FieldValue.serverTimestamp()
        });
        console.log("Primer estado guardado exitosamente");
        return null;
      }

      // 4. Comparar estados y detectar cambios
      console.log("Comparando estados...");
      const cambios = compararEstados(estadoAnterior, estadoNuevo, db);

      // 5. Preparar el nuevo estado con fechas de actualización
      console.log("Preparando nuevo estado...");
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
                    admin.firestore.FieldValue.serverTimestamp() : 
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
            timestamp: admin.firestore.FieldValue.serverTimestamp()
          });

          // Si hay cambios, registrarlos en historialCambios
          if (cambios.length > 0) {
            console.log(`Registrando ${cambios.length} cambios...`);
            for (const cambio of cambios) {
              const docRef = db.collection("historialCambios").doc();
              transaction.set(docRef, cambio);
            }
          }
        });

        console.log("Transacción completada exitosamente");
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
