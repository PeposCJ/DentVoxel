# Hoja de ruta

## Fase 0 — alfa técnica (actual)

- Abrir una carpeta local de cortes DICOM.
- MPR axial, coronal y sagital sincronizado.
- Cortes oblicuos mediante rotación de crucetas.
- Ventana/nivel, pan, zoom, scroll y recentrado.
- Render volumétrico 3D con preset óseo.
- PWA local-first y compilación reproducible.

## Fase 1 — visor clínico confiable

- Agrupar y elegir estudio/serie en lugar de asumir una sola serie. Primera versión funcional completada; falta validación con estudios reales anonimizados y DICOMDIR.
- Leer DICOMDIR, multiframe y reportar sintaxis no soportadas con claridad.
- Presets dentales, mediciones lineales/angulares y exportación de capturas.
- Curved planar reformation (panorámica dental) y cortes transversales del arco.
- Pruebas con CBCT de múltiples fabricantes y una declaración de conformidad DICOM.
- Límites de memoria, cancelación de carga y métricas locales de rendimiento.

## Fase 2 — distribución

- Ejecutable Tauri firmado para Windows/macOS/Linux y asociación de archivos.
- Actualizaciones firmadas, modo totalmente offline y soporte DICOMweb opcional.
- Accesibilidad, internacionalización y manual de usuario.

## Fase 3 — módulos avanzados

- Segmentación asistida del canal mandibular con edición y confirmación humana.
- Segmentación dental y planificación de implantes.
- Inferencia local acelerada cuando el hardware lo permita.
- Registro de modelo, dataset, versión y trazabilidad de cada resultado.

La detección nerviosa se presentará como **asistencia**, nunca como verdad automática.
Requiere dataset representativo, anotación experta, evaluación externa por fabricante,
calibración de incertidumbre y una ruta regulatoria específica.
