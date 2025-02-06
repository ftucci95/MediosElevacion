import json
from datetime import datetime
import logging

# Configurar logging
logging.basicConfig(level=logging.DEBUG)  # Cambiar a DEBUG para más detalle
logger = logging.getLogger(__name__)

def get_non_working_accesos():
    try:
        # Leer el archivo JSON
        with open('GetLineas.json', 'r', encoding='utf-8') as file:
            data = json.load(file)
            
        # Lista para almacenar todos los accesos no operativos
        non_working = []
        
        # Iterar línea por línea
        for linea in data:
            linea_nombre = linea['nombre']
            
            # Debug para Línea A
            if linea_nombre == "Línea A":
                logger.debug(f"Procesando {linea_nombre}")
            
            for estacion in linea['estaciones']:
                estacion_nombre = estacion['nombre']
                
                if estacion['nombre'] == "Plaza Miserere":
                    logger.debug(f"Accesos en Plaza Miserere: {json.dumps(estacion['accesos'], indent=2)}")
                
                for acceso in estacion['accesos']:
                    # Solo verificar funcionando: false
                    if str(acceso.get('funcionando')).lower() == "false":
                        # Debug para Línea A
                        if linea_nombre == "Línea A":
                            logger.debug(f"Encontrado en {estacion_nombre}: {acceso['nombre']}")
                        
                        non_working.append({
                            'linea': linea_nombre,
                            'estacion': estacion_nombre,
                            'acceso': acceso['nombre']
                        })

        # Ordenar resultados
        non_working.sort(key=lambda x: (x['linea'], x['estacion'], x['acceso']))
        
        # Escribir resultados
        with open('accesos_no_operativos.txt', 'w', encoding='utf-8') as output:
            output.write(f"Reporte generado el {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n\n")
            
            for item in non_working:
                output.write(f"{item['acceso']} - {item['estacion']} - Línea {item['linea']}\n")
        
        return non_working
        
    except Exception as e:
        logger.error(f"Error procesando archivo: {str(e)}")
        raise

if __name__ == "__main__":
    try:
        non_working = get_non_working_accesos()
        print(f"Se encontraron {len(non_working)} accesos no operativos.")
    except Exception as e:
        print(f"Error: {str(e)}")