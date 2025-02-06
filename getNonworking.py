import json
from datetime import datetime

# Leer el archivo JSON
with open('GetLineas.json', 'r', encoding='utf-8') as file:
    data = json.load(file)

# Abrir archivo para escribir resultados
with open('accesos_no_operativos.txt', 'w', encoding='utf-8') as output:
    # Obtener la fecha y hora actual
    now = datetime.now()
    output.write(f"Reporte generado el {now.strftime('%Y-%m-%d %H:%M:%S')}\n\n")
    
    # Iterar sobre cada línea
    for linea in data:
        # Iterar sobre cada estación de la línea
        for estacion in linea['estaciones']:
            # Iterar sobre cada acceso de la estación
            for acceso in estacion['accesos']:
                # Si el acceso no está funcionando
                if not acceso['funcionando']:
                    # Escribir la información en el archivo
                    output.write(f"{acceso['nombre']} - {estacion['nombre']} - Línea {linea['nombre']}\n")

print("Archivo 'accesos_no_operativos.txt' generado exitosamente.")