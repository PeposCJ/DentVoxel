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
  Languages,
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
import { localize, translate, type Language, type TranslationKey, type TranslationValues } from './i18n';

type Status = 'empty' | 'indexing' | 'selecting' | 'loading' | 'ready' | 'error';

const viewLabels = {
  axial: { labelKey: 'axial', color: '#53d4ff' },
  coronal: { labelKey: 'coronal', color: '#a8ef80' },
  sagittal: { labelKey: 'sagittal', color: '#ffb36b' },
  volume3d: { labelKey: 'volume3d', color: '#d9a7ff' },
} as const;

function ToolButton({ active, disabled, label, onClick, children }: { active?: boolean; disabled?: boolean; label: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <button className={`tool-button ${active ? 'active' : ''}`} disabled={disabled} onClick={onClick} title={label} aria-label={label}>
      {children}<span>{label}</span>
    </button>
  );
}

function SeriesCard({ language, series, t, onOpen }: { language: Language; series: DicomSeries; t: (key: TranslationKey, values?: TranslationValues) => string; onOpen: () => void }) {
  const compatible = series.kind === 'volume';
  const dimensions = series.dimensions.map((value) => value ?? '—').join(' × ');
  const spacing = series.voxelSpacing.map(formatSpacing).join(' × ');

  return (
    <button className={`series-card series-${series.kind}`} disabled={!compatible} onClick={onOpen}>
      <span className="series-icon">{compatible ? <Layers3 /> : series.kind === 'localizer' ? <Box /> : <AlertTriangle />}</span>
      <span className="series-main">
        <span className="series-heading"><strong>{series.description || t('untitledSeries')}</strong><i>{series.modality}</i></span>
        <span className="series-metrics">
          <span><b>{t('slices', { count: series.imageCount })}</b></span>
          <span><b>{t('pixels', { value: dimensions })}</b></span>
          <span><b>{t('millimeters', { value: spacing })}</b></span>
        </span>
        {!compatible && <span className="series-reason">{localize(language, series.reason)}</span>}
      </span>
      <span className={`series-status ${compatible ? 'compatible' : ''}`}>
        {compatible ? <><CheckCircle2 /> {t('open')}</> : series.kind === 'localizer' ? t('localizer') : t('incompatible')}
      </span>
    </button>
  );
}

export default function App() {
  const inputRef = useRef<HTMLInputElement>(null);
  const viewportRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const operationRef = useRef<AbortController | null>(null);
  const [language, setLanguage] = useState<Language>(() => localStorage.getItem('dentvoxel-language') === 'es' ? 'es' : 'en');
  const [status, setStatus] = useState<Status>('empty');
  const [progress, setProgress] = useState(0);
  const [progressDetail, setProgressDetail] = useState('');
  const [activeTool, setActiveTool] = useState<ToolName>('Crosshairs');
  const [error, setError] = useState('');
  const [catalog, setCatalog] = useState<DicomCatalog | null>(null);
  const [selectedStudyId, setSelectedStudyId] = useState('');
  const [study, setStudy] = useState({ description: '', series: '', images: 0 });

  const t = useCallback(
    (key: TranslationKey, values?: TranslationValues) => translate(language, key, values),
    [language],
  );

  useEffect(() => {
    document.documentElement.lang = language;
    localStorage.setItem('dentvoxel-language', language);
  }, [language]);

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
    setProgressDetail(t('filesProgress', { current: 0, total: files.length }));
    setError('');

    try {
      const result = await indexDicomFiles(files, (current, total) => {
        setProgress(Math.round((current / total) * 100));
        setProgressDetail(t('filesProgress', { current, total }));
      }, controller.signal);
      if (controller.signal.aborted) return;
      if (!result.studies.length) {
        const detail = localize(language, result.issues[0]?.reason);
        throw new Error(detail ? `${t('noUsableSeries')} ${detail}.` : t('noUsableSeries'));
      }
      setCatalog(result);
      setSelectedStudyId(result.studies.find((item) => item.series.some((series) => series.kind === 'volume'))?.id ?? result.studies[0].id);
      setStatus('selecting');
    } catch (reason) {
      if (reason instanceof DOMException && reason.name === 'AbortError') return;
      console.error(reason);
      setError(reason instanceof Error ? reason.message : t('inspectFolderFailed'));
      setStatus('error');
    }
  }, [language, t]);

  const loadSeries = useCallback(async (series: DicomSeries) => {
    if (!selectedStudy || series.kind !== 'volume') return;
    operationRef.current?.abort();
    const controller = new AbortController();
    operationRef.current = controller;
    setStatus('loading');
    setProgress(2);
    setProgressDetail(t('selectedSlices', { count: series.imageCount }));
    setError('');

    try {
      await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
      const elements = Object.fromEntries(
        VIEWPORT_IDS.map((id) => [id, viewportRefs.current[id]]),
      ) as Record<(typeof VIEWPORT_IDS)[number], HTMLDivElement>;
      if (Object.values(elements).some((element) => !element)) throw new Error(t('viewerNotReady'));
      await loadDicomStudy(series.files, elements, setProgress, controller.signal, language);
      if (controller.signal.aborted) return;
      setStudy({ description: selectedStudy.description, series: series.description, images: series.imageCount });
      setStatus('ready');
      setActiveTool('Crosshairs');
    } catch (reason) {
      destroyStudy();
      if (reason instanceof DOMException && reason.name === 'AbortError') return;
      console.error(reason);
      setError(reason instanceof Error ? reason.message : t('openSeriesFailed'));
      setStatus('selecting');
    }
  }, [language, selectedStudy, t]);

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

  const statusText = status === 'ready' ? t('studyLoaded') : status === 'selecting' ? t('seriesIndexed') : status === 'indexing' || status === 'loading' ? t('processingLocal') : t('readyToOpen');

  return (
    <main className="app-shell" onDragOver={(event) => event.preventDefault()} onDrop={(event) => { event.preventDefault(); void openFiles(event.dataTransfer.files); }}>
      <header className="topbar">
        <div className="brand"><span className="brand-mark"><Crosshair size={18} /></span><strong>Dent<span>Voxel</span></strong><small>CBCT</small></div>
        <div className="study-title">
          {status === 'ready' ? <><strong>{study.description || t('untitledStudy')} · {study.series || t('untitledSeries')}</strong><span>{t('localProcessing', { count: study.images })}</span></> : <><strong>{t('localViewer')}</strong><span>{t('studiesStayLocal')}</span></>}
        </div>
        <div className="privacy-pill"><ShieldCheck size={15} /> {t('privateNoCloud')}</div>
        <div className="language-switch" role="group" aria-label={t('language')}><Languages /><button className={language === 'en' ? 'active' : ''} onClick={() => setLanguage('en')} aria-label={t('english')}>EN</button><button className={language === 'es' ? 'active' : ''} onClick={() => setLanguage('es')} aria-label={t('spanish')}>ES</button></div>
        <button className="open-button" onClick={() => inputRef.current?.click()}><FolderOpen size={17} /> {t('openStudy')}</button>
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

      <aside className="toolbar" aria-label={t('viewerTools')}>
        <ToolButton label={t('crosshairs')} disabled={status !== 'ready'} active={activeTool === 'Crosshairs'} onClick={() => selectTool('Crosshairs')}><Crosshair /></ToolButton>
        <ToolButton label={t('windowLevel')} disabled={status !== 'ready'} active={activeTool === 'WindowLevel'} onClick={() => selectTool('WindowLevel')}><Contrast /></ToolButton>
        <ToolButton label={t('pan')} disabled={status !== 'ready'} active={activeTool === 'Pan'} onClick={() => selectTool('Pan')}><Hand /></ToolButton>
        <ToolButton label={t('zoom')} disabled={status !== 'ready'} active={activeTool === 'Zoom'} onClick={() => selectTool('Zoom')}><ZoomIn /></ToolButton>
        <div className="tool-divider" />
        <ToolButton label={t('reset')} disabled={status !== 'ready'} onClick={resetCameras}><RotateCcw /></ToolButton>
        <ToolButton label={t('fullscreen')} onClick={() => document.documentElement.requestFullscreen?.()}><Maximize /></ToolButton>
      </aside>

      <section className="viewer-grid">
        {VIEWPORT_IDS.map((id) => (
          <article className={`viewport viewport-${id}`} key={id}>
            <div className="viewport-canvas" ref={(node) => { viewportRefs.current[id] = node; }} />
            <div className="viewport-label" style={{ color: viewLabels[id].color }}><i style={{ background: viewLabels[id].color }} />{t(viewLabels[id].labelKey)}</div>
            {status !== 'ready' && <div className="scan-placeholder"><div className={id === 'volume3d' ? 'skull volume' : `skull ${id}`}><span /></div></div>}
          </article>
        ))}

        {(status === 'empty' || status === 'error') && (
          <div className="welcome-card">
            <span className="welcome-icon"><FolderOpen /></span>
            <p className="eyebrow">{t('alpha')}</p>
            <h1>{t('welcomeTitle')}<br /><em>{t('welcomeAccent')}</em></h1>
            <p className="welcome-copy">{t('welcomeCopy')}</p>
            {status === 'error' && <div className="error-message"><Info size={16} />{error}</div>}
            <button className="primary-action" onClick={() => inputRef.current?.click()}><FolderOpen size={19} /> {t('selectDicomFolder')}</button>
            <span className="drop-hint">{t('dropHint')}</span>
          </div>
        )}

        {(status === 'indexing' || status === 'loading') && (
          <div className="loading-card">
            <span className="loader-ring" />
            <strong>{status === 'indexing' ? t('indexing') : t('loadingVolume')}</strong>
            <p>{progressDetail} · {progress}%</p>
            <div className="progress"><i style={{ width: `${progress}%` }} /></div>
            <button className="cancel-button" onClick={cancelOperation}><X /> {t('cancel')}</button>
          </div>
        )}

        {status === 'selecting' && catalog && selectedStudy && (
          <div className="study-selector" role="dialog" aria-modal="true" aria-labelledby="selector-title">
            <div className="selector-header">
              <div><p className="eyebrow">{t('localDicomContent')}</p><h2 id="selector-title">{t('chooseSeries')}</h2></div>
              <button className="close-selector" onClick={() => { setCatalog(null); setStatus('empty'); }} aria-label={t('closeSelector')}><X /></button>
            </div>
            {catalog.studies.length > 1 && (
              <label className="study-select">{t('study')}
                <select value={selectedStudy.id} onChange={(event) => setSelectedStudyId(event.target.value)}>
                  {catalog.studies.map((item) => <option value={item.id} key={item.id}>{item.description || t('untitledStudy')} · {formatDicomDate(item.date, language)}</option>)}
                </select>
              </label>
            )}
            <div className="study-metadata">
              <span><strong>{selectedStudy.description || t('untitledStudy')}</strong><small>{t('studyDescription')}</small></span>
              <span><CalendarDays /><strong>{formatDicomDate(selectedStudy.date, language)}</strong><small>{t('date')}</small></span>
              <span><Box /><strong>{selectedStudy.manufacturer || t('unspecified')}</strong><small>{t('manufacturer')}</small></span>
              <span><Layers3 /><strong>{selectedStudy.series.length}</strong><small>{t('series')}</small></span>
            </div>
            <div className="privacy-note"><ShieldCheck /> {t('privacyNote')}</div>
            {error && <div className="selector-error"><AlertTriangle />{error}</div>}
            <div className="series-list">
              {selectedStudy.series.map((series) => <SeriesCard key={series.id} language={language} series={series} t={t} onOpen={() => void loadSeries(series)} />)}
            </div>
            {catalog.issues.length > 0 && (
              <details className="scan-issues"><summary>{t('separatedFiles', { count: catalog.issues.reduce((sum, issue) => sum + issue.count, 0) })}</summary>
                <ul>{catalog.issues.map((issue) => <li key={issue.reason.key}>{issue.count} · {localize(language, issue.reason)}</li>)}</ul>
              </details>
            )}
          </div>
        )}
      </section>

      <footer className="statusbar">
        <span className="status-ready"><i /> {statusText}</span>
        <span><Box size={14} /> {t('synchronizedMpr')}</span>
        <span className="status-help">{t('viewerHelp')}</span>
          <span>v0.1.0-alpha</span>
      </footer>
    </main>
  );
}
