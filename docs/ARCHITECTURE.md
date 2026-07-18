# Arquitectura

## Decisión principal: local-first

El navegador recibe objetos `File` elegidos por el usuario. El cargador DICOM crea
identificadores locales, extrae metadatos y decodifica píxeles en Web Workers. El motor
construye un volumen en memoria y lo comparte entre cuatro viewports WebGL. Ningún
archivo cruza la red.

```text
Carpeta DICOM -> índice local de metadatos -> estudio/serie elegida
                                            |
                                            `-> cargador + códecs WASM -> volumen en memoria
                                                                          |-> axial
                                                                          |-> coronal
                                                                          |-> sagital
                                                                          `-> render 3D
```

La herramienta Crosshairs mantiene un único punto físico 3D. Trasladar su centro
alinea los tres planos; sus asas de rotación crean cortes oblicuos para seguir la
angulación dental. La rueda recorre cortes y las herramientas de ventana/nivel,
desplazamiento y zoom operan sobre el viewport activo.

## Capas

- `src/App.tsx`: experiencia, estados de carga y controles.
- `src/lib/dicomCatalog.ts`: lectura local de cabeceras, agrupación, clasificación y metadatos seguros.
- `src/lib/cornerstone.ts`: inicialización, volumen, viewports y herramientas.
- Cornerstone3D + VTK.js: coordenadas físicas, WebGL, MPR y render volumétrico.
- DICOM Image Loader: DICOM Part 10, códecs WASM y trabajo en segundo plano.
- PWA: recursos del visor disponibles sin conexión después de la primera visita.

El índice conserva referencias `File` únicamente en memoria y sólo entrega al motor los
archivos de la serie elegida. No persiste el catálogo ni lee campos de identidad para la
interfaz. Las reglas y limitaciones se documentan en [SERIES_SELECTION.md](SERIES_SELECTION.md).

## Futuro

Una envoltura Tauri puede reutilizar exactamente la misma interfaz para distribuir un
ejecutable firmado y asociar la extensión `.dcm`, sin incorporar Chromium. El núcleo
debe seguir independiente de cuentas y licencias; módulos premium se conectarán a una
API estable y separada.
