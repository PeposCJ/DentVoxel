import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  Box,
  CalendarDays,
  CheckCircle2,
  Contrast,
  Crosshair,
  FolderOpen,
  Hand,
  Info,
  Layers3,
  Maximize,
  RotateCcw,
  ShieldCheck,
  X,
  ZoomIn,
} from 'lucide-react';
import {
  activateTool,
  destroyStudy,
  loadDicomStudy,
  resetCameras,
  type ToolName,
  VIEWPORT_IDS,
} from './lib/cornerstone';
import {
  formatDicomDate,
  formatSpacing,
  indexDicomFiles,
  type DicomCatalog,
  type DicomSeries,
} from './lib/dicomCatalog';

type Status = 'empty' | 'indexing' | 'selecting' | 'loading' | 'ready' | 'error';

const viewLabels = {
  axial: { label: 'AXIAL', color: '#53d4ff' },
  coronal: { label: 'CORONAL', color: '#a8ef80' },
  sagittal: { label: 'SAGITAL', color: '#ffb36b' },
  volume3d: { label: 'VOLUMEN 3D', color: '#d9a7ff' },
} as const;

function ToolButton({ active, disabled, label, onClick, children }: { active?: boolean; disabled?: boolean; label: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <button className={`tool-button ${active ? 'active' : ''}`} disabled={disabled} onClick={onClick} title={label} aria-label={label}>
      {children}<span>{label}</span>
    </button>
  );
}

function SeriesCard({ series, onOpen }: { series: DicomSeries; onOpen: () => void }) {
  const compatible = series.kind === 'volume';
  const dimensions = series.dimensions.map((value) => value ?? '—').join(' × ');
  const spacing = series.voxelSpacing.map(formatSpacing).join(' × ');

  return (
    <button className={`series-card series-${series.kind}`} disabled={!compatible} onClick={onOpen}>
      <span className="series-icon">{compatible ? <Layers3 /> : series.kind === 'localizer' ? <Box /> : <AlertTriangle />}</span>
      <span className="series-main">
        <span className="series-heading"><strong>{series.description}</strong><i>{series.modality}</i></span>
        <span className="series-metrics">
          <span><b>{series.imageCount}</b> cortes</span>
          <span><b>{dimensions}</b> px</span>
          <span><b>{spacing}</b> mm</span>
        </span>
        {!compatible && <span className="series-reason">{series.reason}</span>}
      </span>
      <span className={`series-status ${compatible ? 'compatible' : ''}`}>
        {compatible ? <><CheckCircle2 /> Abrir</> : series.kind === 'localizer' ? 'Localizador' : 'No compatible'}
      </span>
    </button>
  );
}

export default function App() {
  const inputRef = useRef<HTMLInputElement>(null);
  const viewportRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const operationRef = useRef<AbortController | null>(null);
  const [status, setStatus] = useState<Status>('empty');
  const [progress, setProgress] = useState(0);
  const [progressDetail, setProgressDetail] = useState('');
  const [activeTool, setActiveTool] = useState<ToolName>('Crosshairs');
  const [error, setError] = useState('');
  const [catalog, setCatalog] = useState<DicomCatalog | null>(null);
  const [selectedStudyId, setSelectedStudyId] = useState('');
  const [study, setStudy] = useState({ description: '', series: '', images: 0 });

  useEffect(() => () => {
    operationRef.current?.abort();
    destroyStudy();
  }, []);

  const selectedStudy = useMemo(
    () => catalog?.studies.find((item) => item.id === selectedStudyId) ?? catalog?.studies[0],
    [catalog, selectedStudyId],
  );

  const openFiles = useCallback(async (list: FileList | File[]) => {
    const files = Array.from(list);
    if (!files.length) return;

    operationRef.current?.abort();
    destroyStudy();
    const controller = new AbortController();
    operationRef.current = controller;
    setCatalog(null);
    setStatus('indexing');
    setProgress(0);
    setProgressDetail(`0 de ${files.length} archivos`);
    setError('');

    try {
      const result = await indexDicomFiles(files, (current, total) => {
        setProgress(Math.round((current / total) * 100));
        setProgressDetail(`${current} de ${total} archivos`);
      }, controller.signal);
      if (controller.signal.aborted) return;
      if (!result.studies.length) {
        const detail = result.issues[0]?.reason;
        throw new Error(detail ? `No se encontraron series DICOM utilizables. ${detail}.` : 'No se encontraron series DICOM utilizables.');
      }
      setCatalog(result);
      setSelectedStudyId(result.studies.find((item) => item.series.some((series) => series.kind === 'volume'))?.id ?? result.studies[0].id);
      setStatus('selecting');
    } catch (reason) {
      if (reason instanceof DOMException && reason.name === 'AbortError') return;
      console.error(reason);
      setError(reason instanceof Error ? reason.message : 'No fue posible examinar esta carpeta.');
      setStatus('error');
    }
  }, []);

  const loadSeries = useCallback(async (series: DicomSeries) => {
    if (!selectedStudy || series.kind !== 'volume') return;
    operationRef.current?.abort();
    const controller = new AbortController();
    operationRef.current = controller;
    setStatus('loading');
    setProgress(2);
    setProgressDetail(`${series.imageCount} cortes seleccionados`);
    setError('');

    try {
      await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
      const elements = Object.fromEntries(
        VIEWPORT_IDS.map((id) => [id, viewportRefs.current[id]]),
      ) as Record<(typeof VIEWPORT_IDS)[number], HTMLDivElement>;
      if (Object.values(elements).some((element) => !element)) throw new Error('El visor todavía no está listo.');
      await loadDicomStudy(series.files, elements, setProgress, controller.signal);
      if (controller.signal.aborted) return;
      setStudy({ description: selectedStudy.description, series: series.description, images: series.imageCount });
      setStatus('ready');
      setActiveTool('Crosshairs');
    } catch (reason) {
      destroyStudy();
      if (reason instanceof DOMException && reason.name === 'AbortError') return;
      console.error(reason);
      setError(reason instanceof Error ? reason.message : 'No fue posible abrir esta serie.');
      setStatus('selecting');
    }
  }, [selectedStudy]);

  const cancelOperation = () => {
    operationRef.current?.abort();
    operationRef.current = null;
    destroyStudy();
    setError('');
    setStatus(catalog ? 'selecting' : 'empty');
  };

  const selectTool = (tool: ToolName) => {
    setActiveTool(tool);
    activateTool(tool);
  };

  const statusText = status === 'ready' ? 'Estudio cargado' : status === 'selecting' ? 'Series indexadas localmente' : status === 'indexing' || status === 'loading' ? 'Procesando en este dispositivo' : 'Listo para abrir un estudio';

  return (
    <main className="app-shell" onDragOver={(event) => event.preventDefault()} onDrop={(event) => { event.preventDefault(); void openFiles(event.dataTransfer.files); }}>
      <header className="topbar">
        <div className="brand"><span className="brand-mark"><Crosshair size={18} /></span><strong>Dent<span>Voxel</span></strong><small>CBCT</small></div>
        <div className="study-title">
          {status === 'ready' ? <><strong>{study.description} · {study.series}</strong><span>{study.images} cortes · procesamiento local</span></> : <><strong>Visor dental local</strong><span>Los estudios nunca salen de este equipo</span></>}
        </div>
        <div className="privacy-pill"><ShieldCheck size={15} /> Privado y sin nube</div>
        <button className="open-button" onClick={() => inputRef.current?.click()}><FolderOpen size={17} /> Abrir estudio</button>
        <input
          ref={inputRef}
          type="file"
          multiple
          // @ts-expect-error webkitdirectory is supported by Chromium-based browsers.
          webkitdirectory=""
          onChange={(event) => {
            if (event.target.files) void openFiles(event.target.files);
            event.target.value = '';
          }}
          hidden
        />
      </header>

      <aside className="toolbar" aria-label="Herramientas del visor">
        <ToolButton label="Cruceta" disabled={status !== 'ready'} active={activeTool === 'Crosshairs'} onClick={() => selectTool('Crosshairs')}><Crosshair /></ToolButton>
        <ToolButton label="Contraste" disabled={status !== 'ready'} active={activeTool === 'WindowLevel'} onClick={() => selectTool('WindowLevel')}><Contrast /></ToolButton>
        <ToolButton label="Mover" disabled={status !== 'ready'} active={activeTool === 'Pan'} onClick={() => selectTool('Pan')}><Hand /></ToolButton>
        <ToolButton label="Zoom" disabled={status !== 'ready'} active={activeTool === 'Zoom'} onClick={() => selectTool('Zoom')}><ZoomIn /></ToolButton>
        <div className="tool-divider" />
        <ToolButton label="Recentrar" disabled={status !== 'ready'} onClick={resetCameras}><RotateCcw /></ToolButton>
        <ToolButton label="Pantalla" onClick={() => document.documentElement.requestFullscreen?.()}><Maximize /></ToolButton>
      </aside>

      <section className="viewer-grid">
        {VIEWPORT_IDS.map((id) => (
          <article className={`viewport viewport-${id}`} key={id}>
            <div className="viewport-canvas" ref={(node) => { viewportRefs.current[id] = node; }} />
            <div className="viewport-label" style={{ color: viewLabels[id].color }}><i style={{ background: viewLabels[id].color }} />{viewLabels[id].label}</div>
            {status !== 'ready' && <div className="scan-placeholder"><div className={id === 'volume3d' ? 'skull volume' : `skull ${id}`}><span /></div></div>}
          </article>
        ))}

        {(status === 'empty' || status === 'error') && (
          <div className="welcome-card">
            <span className="welcome-icon"><FolderOpen /></span>
            <p className="eyebrow">DENTVOXEL · ALFA</p>
            <h1>Abre una tomografía.<br /><em>Sin instalar nada.</em></h1>
            <p className="welcome-copy">Selecciona la carpeta del estudio CBCT. Las imágenes se procesan exclusivamente en este dispositivo.</p>
            {status === 'error' && <div className="error-message"><Info size={16} />{error}</div>}
            <button className="primary-action" onClick={() => inputRef.current?.click()}><FolderOpen size={19} /> Seleccionar carpeta DICOM</button>
            <span className="drop-hint">También puedes arrastrar la carpeta o sus archivos aquí</span>
          </div>
        )}

        {(status === 'indexing' || status === 'loading') && (
          <div className="loading-card">
            <span className="loader-ring" />
            <strong>{status === 'indexing' ? 'Identificando estudios y series…' : 'Preparando el volumen…'}</strong>
            <p>{progressDetail} · {progress}%</p>
            <div className="progress"><i style={{ width: `${progress}%` }} /></div>
            <button className="cancel-button" onClick={cancelOperation}><X /> Cancelar</button>
          </div>
        )}

        {status === 'selecting' && catalog && selectedStudy && (
          <div className="study-selector" role="dialog" aria-modal="true" aria-labelledby="selector-title">
            <div className="selector-header">
              <div><p className="eyebrow">CONTENIDO DICOM LOCAL</p><h2 id="selector-title">Elige la serie que deseas abrir</h2></div>
              <button className="close-selector" onClick={() => { setCatalog(null); setStatus('empty'); }} aria-label="Cerrar selector"><X /></button>
            </div>
            {catalog.studies.length > 1 && (
              <label className="study-select">Estudio
                <select value={selectedStudy.id} onChange={(event) => setSelectedStudyId(event.target.value)}>
                  {catalog.studies.map((item) => <option value={item.id} key={item.id}>{item.description} · {formatDicomDate(item.date)}</option>)}
                </select>
              </label>
            )}
            <div className="study-metadata">
              <span><strong>{selectedStudy.description}</strong><small>Descripción del estudio</small></span>
              <span><CalendarDays /><strong>{formatDicomDate(selectedStudy.date)}</strong><small>Fecha</small></span>
              <span><Box /><strong>{selectedStudy.manufacturer}</strong><small>Fabricante</small></span>
              <span><Layers3 /><strong>{selectedStudy.series.length}</strong><small>Series</small></span>
            </div>
            <div className="privacy-note"><ShieldCheck /> Se omiten nombre, identificador y demás datos personales del paciente.</div>
            {error && <div className="selector-error"><AlertTriangle />{error}</div>}
            <div className="series-list">
              {selectedStudy.series.map((series) => <SeriesCard key={series.id} series={series} onOpen={() => void loadSeries(series)} />)}
            </div>
            {catalog.issues.length > 0 && (
              <details className="scan-issues"><summary>{catalog.issues.reduce((sum, issue) => sum + issue.count, 0)} archivos separados o ignorados</summary>
                <ul>{catalog.issues.map((issue) => <li key={issue.reason}>{issue.count} · {issue.reason}</li>)}</ul>
              </details>
            )}
          </div>
        )}
      </section>

      <footer className="statusbar">
        <span className="status-ready"><i /> {statusText}</span>
        <span><Box size={14} /> MPR sincronizado + 3D</span>
        <span className="status-help">Rueda: navegar cortes · Arrastrar: herramienta activa</span>
          <span>v0.1.0-alpha</span>
      </footer>
    </main>
  );
}
