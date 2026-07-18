# Selección de estudios y series

## Alcance de la primera versión

Al abrir una carpeta, DentVoxel examina localmente las cabeceras DICOM antes de crear
un volumen. Agrupa cada instancia por `StudyInstanceUID` y `SeriesInstanceUID`, ordena
los cortes por su posición física y presenta sólo las series compatibles como acciones
de apertura. Cornerstone recibe exclusivamente los objetos `File` de la serie elegida.

El índice se procesa de forma secuencial para limitar picos de memoria. Primero intenta
leer hasta 4 MiB de cada archivo y se detiene al encontrar `PixelData`; sólo reintenta
con el archivo completo cuando una cabecera excepcionalmente grande lo requiere. El
usuario puede cancelar entre archivos y también cancelar la preparación del volumen.

## Clasificación

- **Volumen:** al menos dos instancias monoframe con píxeles, geometría espacial,
  dimensiones y espaciado coherentes, y una sintaxis decodificable por los códecs
  incluidos en la versión instalada de Cornerstone.
- **Localizador:** `ImageType` o la descripción contiene indicadores habituales como
  `LOCALIZER`, `SCOUT`, `TOPOGRAM`, `SURVIEW` o `PROJECTION`. Se muestra por separado y
  no se mezcla con el volumen.
- **Incompatible:** multiframe, modalidad distinta de CT, geometría incompleta,
  dimensiones/espaciado inconsistentes, una sola imagen o sintaxis no soportada. La
  interfaz muestra una razón concreta sin intentar decodificar la serie.
- **Ignorado:** DICOMDIR, auxiliares pequeños/ocultos, objetos sin píxeles, archivos no
  DICOM y objetos sin los UID necesarios. Sólo se muestran conteos y motivos, no nombres
  de archivo.

La lista de sintaxis aceptadas refleja los decodificadores incluidos actualmente:
uncompressed little/big endian, JPEG baseline/lossless seleccionado, JPEG-LS, JPEG 2000,
HTJ2K y RLE. Una sintaxis fuera de esta lista permanece visible como incompatibilidad,
con su UID, en vez de fallar durante la carga.

## Metadatos y privacidad

La interfaz utiliza únicamente descripción y fecha del estudio, fabricante, descripción
y modalidad de la serie, número de cortes, dimensiones y espaciado de vóxel. No accede
ni muestra `PatientName`, `PatientID`, fecha de nacimiento u otros campos de identidad.
Los metadatos, archivos y píxeles permanecen en memoria en el dispositivo; no se añade
persistencia, telemetría ni comunicación de red.

## Decisiones y límites conocidos

- Los UID son las únicas claves de agrupación; nombres de carpeta y archivo no deciden
  a qué serie pertenece una instancia.
- El espaciado entre cortes se calcula como la mediana de las distancias proyectadas
  sobre la normal de imagen. Si no puede calcularse, se usa `SpacingBetweenSlices` y
  después `SliceThickness` como respaldo.
- DICOMDIR y Enhanced CT/multiframe se identifican con claridad, pero su lectura queda
  para la siguiente iteración.
- La compatibilidad debe validarse con CBCT anonimizados de varios fabricantes. No se
  incorporan estudios clínicos al repositorio; los fixtures futuros deberán ser
  sintéticos o estar explícitamente anonimizados y autorizados.
- Esta clasificación es de interoperabilidad técnica. No convierte DentVoxel en un
  dispositivo médico validado ni sustituye la verificación clínica profesional.

## Siguiente validación

Preparar una matriz local, no versionada, con estudios anonimizados que cubra al menos
volúmenes monoframe sin compresión, JPEG lossless, JPEG 2000, estudios con scout, varias
series en un estudio, varios estudios en una carpeta y una sintaxis deliberadamente no
soportada. Registrar fabricante, sintaxis, dimensiones, resultado esperado, consumo de
memoria y tiempo de apertura sin conservar datos identificables.
