# DentVoxel

**Open-source dental CBCT and DICOM viewer. Fast, private and local-first.**

Visor CBCT dental ligero, local-first y de código abierto. Abre una carpeta DICOM
directamente en el navegador, construye el volumen en memoria y muestra cortes axial,
coronal y sagital sincronizados junto con una reconstrucción 3D.

> **Alfa técnica. No es todavía un dispositivo médico validado y no debe ser la única
> base para diagnóstico o planificación clínica.**

## Funciones actuales

- Apertura local de series DICOM Part 10, sin subir datos.
- Selector local de estudios y series por metadatos DICOM, con separación de scouts y series incompatibles.
- MPR de tres planos con crucetas sincronizadas.
- Traslación y rotación de planos para cortes oblicuos.
- Ventana/nivel, desplazamiento, zoom, scroll y recentrado.
- Render volumétrico 3D con preset óseo.
- Decodificación en Web Workers y códecs WebAssembly.
- Aplicación web instalable y disponible sin conexión tras la primera carga.

## Ejecutar

Requisitos: Node.js 22 y pnpm 11.

```bash
pnpm install --frozen-lockfile
pnpm dev
```

Abre `http://localhost:5173`, pulsa **Abrir estudio** y elige la carpeta que contiene
los cortes. También puedes arrastrar archivos DICOM al visor.

Para generar y comprobar la versión distribuible:

```bash
pnpm test
pnpm build
pnpm preview
```

## Privacidad

El MVP no tiene backend, cuentas ni telemetría. Los objetos `File`, metadatos y píxeles
permanecen en memoria dentro del dispositivo. Los recursos de la interfaz también son
locales; el visor no solicita tipografías externas.

No subas datos de pacientes al repositorio o a incidencias. Consulta [SECURITY.md](SECURITY.md).

## Dirección del producto

- [Arquitectura](docs/ARCHITECTURE.md)
- [Selección de estudios y series](docs/SERIES_SELECTION.md)
- [Hoja de ruta clínica y técnica](docs/ROADMAP.md)
- [Modelo abierto y comercial](docs/PRODUCT.md)
- [Cómo contribuir](CONTRIBUTING.md)

La siguiente prioridad no es IA: es probar compatibilidad con estudios anonimizados de
varios fabricantes, elegir series correctamente y añadir panorámica dental curva.

## Licencia

MPL-2.0. Las mejoras al núcleo continúan abiertas; archivos y módulos separados pueden
tener otra licencia. Esto permite una edición comunitaria sólida y funciones comerciales
opcionales sin cerrar el visor básico.
