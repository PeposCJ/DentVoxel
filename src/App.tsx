import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  Box,
  CalendarDays,
  CheckCircle2,
  Contrast,
  Crosshair,
  Eye,
  EyeOff,
  FolderOpen,
  Hand,
  Info,
  Languages,
  LayoutGrid,
  Layers3,
  Maximize,
  Minimize2,
  RotateCcw,
  Ruler,
  ShieldCheck,
  Trash2,
  X,
  ZoomIn,
} from 'lucide-react';
import {
  activateTool,
  deleteSelectedMeasurements,
  destroyStudy,
  loadDicomStudy,
  resetCameras,
  resizeViewports,
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
import { getDeviceMemoryGiB, planVolumeLoad } from './lib/volumePolicy';
import { chooseViewGrid, clampSplit } from './lib/viewLayout';
import { localize, translate, type Language, type TranslationKey, type TranslationValues } from './i18n';

type Status = 'empty' | 'indexing' | 'selecting' | 'loading' | 'ready' | 'error';
type ViewportId = (typeof VIEWPORT_IDS)[number];

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

function SeriesCard({ deviceMemoryGiB, language, series, t, onOpen }: { deviceMemoryGiB: number; language: Language; series: DicomSeries; t: (key: TranslationKey, values?: TranslationValues) => string; onOpen: (decimation: number) => void }) {
  const compatible = series.kind === 'volume';
  const loadPlan = planVolumeLoad(series.dimensions, deviceMemoryGiB);
  const reduced = compatible && loadPlan.decimation > 1;
  const dimensions = series.dimensions.map((value) => value ?? '—').join(' × ');
  const spacing = series.voxelSpacing.map(formatSpacing).join(' × ');

  return (
    <button className={`series-card series-${series.kind} ${reduced ? 'series-preview' : ''}`} disabled={!compatible} onClick={() => onOpen(loadPlan.decimation)}>
      <span className="series-icon">{reduced ? <Minimize2 /> : compatible ? <Layers3 /> : series.kind === 'localizer' ? <Box /> : <AlertTriangle />}</span>
      <span className="series-main">
        <span className="series-heading"><strong>{series.description || t('untitledSeries')}</strong><i>{series.modality}</i></span>
        <span className="series-metrics">
          <span><b>{t('slices', { count: series.imageCount })}</b></span>
          <span><b>{t('pixels', { value: dimensions })}</b></span>
          <span><b>{t('millimeters', { value: spacing })}</b></span>
        </span>
        {reduced && <span className="preview-reason">{t('reducedPreviewReason', { factor: loadPlan.decimation, voxels: Math.round(loadPlan.previewVoxels / 1_000_000) })}</span>}
        {!compatible && <span className="series-reason">{localize(language, series.reason)}</span>}
      </span>
      <span className={`series-status ${compatible ? 'compatible' : ''} ${reduced ? 'preview' : ''}`}>
        {reduced ? <><Minimize2 /> {t('openReducedPreview')}</> : compatible ? <><CheckCircle2 /> {t('open')}</> : series.kind === 'localizer' ? t('localizer') : t('incompatible')}
      </span>
    </button>
  );
}

export default function App() {
  const inputRef = useRef<HTMLInputElement>(null);
  const viewportRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const viewerGridRef = useRef<HTMLElement | null>(null);
  const operationRef = useRef<AbortController | null>(null);
  const [language, setLanguage] = useState<Language>(() => localStorage.getItem('dentvoxel-language') === 'es' ? 'es' : 'en');
  const [status, setStatus] = useState<Status>('empty');
  const [progress, setProgress] = useState(0);
  const [progressDetail, setProgressDetail] = useState('');
  const [activeTool, setActiveTool] = useState<ToolName>('Crosshairs');
  const [error, setError] = useState('');
  const [noticeKey, setNoticeKey] = useState<TranslationKey | ''>('');
  const [catalog, setCatalog] = useState<DicomCatalog | null>(null);
  const [selectedStudyId, setSelectedStudyId] = useState('');
  const [study, setStudy] = useState({ description: '', series: '', images: 0, previewFactor: 1 });
  const [hiddenViews, setHiddenViews] = useState<Set<ViewportId>>(() => new Set());
  const [gridSize, setGridSize] = useState({ width: 1, height: 1 });
  const [columnSplit, setColumnSplit] = useState(50);
  const [rowSplit, setRowSplit] = useState(50);
  const [autoLayout, setAutoLayout] = useState(true);
  const [viewSelectorOpen, setViewSelectorOpen] = useState(false);
  const deviceMemoryGiB = useMemo(getDeviceMemoryGiB, []);

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

  useEffect(() => {
    const deleteMeasurement = (event: KeyboardEvent) => {
      if (status !== 'ready' || (event.key !== 'Delete' && event.key !== 'Backspace')) return;
      const target = event.target;
      if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement || target instanceof HTMLSelectElement) return;
      if (deleteSelectedMeasurements()) event.preventDefault();
    };
    window.addEventListener('keydown', deleteMeasurement);
    return () => window.removeEventListener('keydown', deleteMeasurement);
  }, [status]);

  useEffect(() => {
    const element = viewerGridRef.current;
    if (!element) return;
    const observer = new ResizeObserver(([entry]) => {
      setGridSize({ width: entry.contentRect.width, height: entry.contentRect.height });
      requestAnimationFrame(resizeViewports);
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const frame = requestAnimationFrame(resizeViewports);
    return () => cancelAnimationFrame(frame);
  }, [hiddenViews, columnSplit, rowSplit]);

  const selectedStudy = useMemo(
    () => catalog?.studies.find((item) => item.id === selectedStudyId) ?? catalog?.studies[0],
    [catalog, selectedStudyId],
  );
  const visibleViews = useMemo(
    () => VIEWPORT_IDS.filter((id) => !hiddenViews.has(id)),
    [hiddenViews],
  );
  const viewGrid = useMemo(
    () => chooseViewGrid(visibleViews.length, gridSize.width, gridSize.height),
    [gridSize, visibleViews.length],
  );

  const minimizeView = (id: ViewportId) => {
    if (visibleViews.length <= 1) return;
    setHiddenViews((current) => new Set(current).add(id));
  };

  const restoreView = (id: ViewportId) => {
    setHiddenViews((current) => {
      const next = new Set(current);
      next.delete(id);
      return next;
    });
  };

  const toggleView = (id: ViewportId) => {
    if (hiddenViews.has(id)) restoreView(id);
    else minimizeView(id);
  };

  const restoreAutomaticLayout = () => {
    setAutoLayout(true);
    setColumnSplit(50);
    setRowSplit(50);
  };

  const resizeGrid = (axis: 'column' | 'row', event: React.PointerEvent<HTMLDivElement>) => {
    if (!event.currentTarget.hasPointerCapture(event.pointerId)) return;
    const bounds = viewerGridRef.current?.getBoundingClientRect();
    if (!bounds) return;
    setAutoLayout(false);
    if (axis === 'column') setColumnSplit(clampSplit(((event.clientX - bounds.left) / bounds.width) * 100));
    else setRowSplit(clampSplit(((event.clientY - bounds.top) / bounds.height) * 100));
  };

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
    setProgressDetail(t('readingFilesProgress', { current: 0, total: files.length }));
    setError('');
    setNoticeKey('');

    try {
      const result = await indexDicomFiles(files, (update) => {
        setProgress(update.percent);
        setProgressDetail(update.stage === 'reading'
          ? t('readingFilesProgress', { current: update.current, total: update.total })
          : t('classifyingSeries'));
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

  const loadSeries = useCallback(async (series: DicomSeries, decimation: number) => {
    if (!selectedStudy || series.kind !== 'volume') return;
    operationRef.current?.abort();
    const controller = new AbortController();
    operationRef.current = controller;
    setStatus('loading');
    setProgress(2);
    setProgressDetail(decimation > 1
      ? t('selectedReducedPreview', { count: series.imageCount, factor: decimation })
      : t('selectedSlices', { count: series.imageCount }));
    setError('');
    setNoticeKey('');

    try {
      await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
      const elements = Object.fromEntries(
        VIEWPORT_IDS.map((id) => [id, viewportRefs.current[id]]),
      ) as Record<(typeof VIEWPORT_IDS)[number], HTMLDivElement>;
      if (Object.values(elements).some((element) => !element)) throw new Error(t('viewerNotReady'));
      await loadDicomStudy(series.files, elements, (update) => {
        setProgress(update.percent);
        const progressKey = {
          initializing: 'initializingViewer',
          registering: 'registeringSlices',
          building: 'buildingVolume',
          decoding: 'decodingPixels',
          rendering: 'renderingViews',
        }[update.stage] as TranslationKey;
        setProgressDetail(update.stage === 'decoding' && update.total
          ? t('decodingPixelsProgress', { current: update.current ?? 0, total: update.total })
          : t(progressKey));
      }, controller.signal, language, decimation);
      if (controller.signal.aborted) return;
      setStudy({ description: selectedStudy.description, series: series.description, images: series.imageCount, previewFactor: decimation });
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
    const cancelledStage = status;
    operationRef.current?.abort();
    operationRef.current = null;
    destroyStudy();
    setError('');
    setNoticeKey(cancelledStage === 'indexing' ? 'indexingCancelled' : 'loadCancelled');
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
          {status === 'ready' ? <><strong>{study.description || t('untitledStudy')} · {study.series || t('untitledSeries')}</strong><span>{study.previewFactor > 1 ? t('reducedPreviewActive', { factor: study.previewFactor }) : t('localProcessing', { count: study.images })}</span></> : <><strong>{t('localViewer')}</strong><span>{t('studiesStayLocal')}</span></>}
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
        <ToolButton label={t('length')} disabled={status !== 'ready'} active={activeTool === 'Length'} onClick={() => selectTool('Length')}><Ruler /></ToolButton>
        <ToolButton label={t('deleteMeasurement')} disabled={status !== 'ready'} onClick={deleteSelectedMeasurements}><Trash2 /></ToolButton>
        <div className="tool-divider" />
        <ToolButton label={t('autoLayout')} disabled={status !== 'ready'} active={autoLayout} onClick={restoreAutomaticLayout}><LayoutGrid /></ToolButton>
        <ToolButton label={t('reset')} disabled={status !== 'ready'} onClick={resetCameras}><RotateCcw /></ToolButton>
        <ToolButton label={t('fullscreen')} onClick={() => document.documentElement.requestFullscreen?.()}><Maximize /></ToolButton>
      </aside>

      <section
        className="viewer-grid"
        ref={viewerGridRef}
        style={{
          gridTemplateColumns: viewGrid.columns === 1 ? '1fr' : viewGrid.columns === 2 ? `minmax(0, ${columnSplit}fr) minmax(0, ${100 - columnSplit}fr)` : `repeat(${viewGrid.columns}, minmax(0, 1fr))`,
          gridTemplateRows: viewGrid.rows === 1 ? '1fr' : `minmax(0, ${rowSplit}fr) minmax(0, ${100 - rowSplit}fr)`,
        }}
      >
        {VIEWPORT_IDS.map((id) => (
          <article
            className={`viewport viewport-${id} ${hiddenViews.has(id) ? 'viewport-hidden' : ''}`}
            key={id}
            style={viewGrid.expandLast && visibleViews.at(-1) === id ? { gridColumn: '1 / -1' } : undefined}
          >
            <div className="viewport-canvas" ref={(node) => { viewportRefs.current[id] = node; }} />
            <div className="viewport-label" style={{ color: viewLabels[id].color }}><i style={{ background: viewLabels[id].color }} />{t(viewLabels[id].labelKey)}</div>
            {status === 'ready' && <button className="viewport-minimize" disabled={visibleViews.length <= 1} onClick={() => minimizeView(id)} aria-label={t('minimizeView', { view: t(viewLabels[id].labelKey) })} title={t('minimizeView', { view: t(viewLabels[id].labelKey) })}><Minimize2 /></button>}
            {status === 'ready' && study.previewFactor > 1 && <div className="preview-badge"><Minimize2 /> {t('reducedPreviewBadge', { factor: study.previewFactor })}</div>}
            {status !== 'ready' && <div className="scan-placeholder"><div className={id === 'volume3d' ? 'skull volume' : `skull ${id}`}><span /></div></div>}
          </article>
        ))}

        {status === 'ready' && viewGrid.columns === 2 && visibleViews.length > 1 && <div className="grid-divider grid-divider-column" style={{ left: `${columnSplit}%`, bottom: viewGrid.expandLast ? `${100 - rowSplit}%` : 0 }} role="separator" aria-label={t('resizeColumns')} aria-orientation="vertical" onPointerDown={(event) => event.currentTarget.setPointerCapture(event.pointerId)} onPointerMove={(event) => resizeGrid('column', event)} />}
        {status === 'ready' && viewGrid.rows === 2 && visibleViews.length > 2 && <div className="grid-divider grid-divider-row" style={{ top: `${rowSplit}%` }} role="separator" aria-label={t('resizeRows')} aria-orientation="horizontal" onPointerDown={(event) => event.currentTarget.setPointerCapture(event.pointerId)} onPointerMove={(event) => resizeGrid('row', event)} />}
        {status === 'ready' && <div className="view-selector">
          <button className="view-selector-trigger" onClick={() => setViewSelectorOpen((open) => !open)} aria-expanded={viewSelectorOpen} aria-haspopup="menu"><LayoutGrid /> {t('views')}</button>
          {viewSelectorOpen && <div className="view-selector-menu" role="menu" aria-label={t('selectViews')}>
            <strong>{t('selectViews')}</strong>
            {VIEWPORT_IDS.map((id) => {
              const visible = !hiddenViews.has(id);
              return <button key={id} role="menuitemcheckbox" aria-checked={visible} disabled={visible && visibleViews.length <= 1} onClick={() => toggleView(id)}>
                {visible ? <Eye /> : <EyeOff />}
                <span>{t(viewLabels[id].labelKey)}</span>
                <small>{t(visible ? 'viewOpen' : 'viewClosed')}</small>
              </button>;
            })}
          </div>}
        </div>}

        {(status === 'empty' || status === 'error') && (
          <div className="welcome-card">
            <span className="welcome-icon"><FolderOpen /></span>
            <p className="eyebrow">{t('alpha')}</p>
            <h1>{t('welcomeTitle')}<br /><em>{t('welcomeAccent')}</em></h1>
            <p className="welcome-copy">{t('welcomeCopy')}</p>
            {status === 'error' && <div className="error-message"><Info size={16} />{error}</div>}
            {noticeKey && <div className="notice-message"><Info size={16} />{t(noticeKey)}</div>}
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
              <button className="close-selector" onClick={() => { setCatalog(null); setNoticeKey(''); setStatus('empty'); }} aria-label={t('closeSelector')}><X /></button>
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
            <div className="catalog-summary" aria-label={t('folderSummary')}>
              <span><strong>{catalog.scannedFiles}</strong><small>{t('filesExamined')}</small></span>
              <span><strong>{catalog.summary.dicomFiles}</strong><small>{t('dicomIndexed')}</small></span>
              <span><strong>{catalog.summary.volumeFiles}</strong><small>{t('usableSlices')}</small></span>
              <span className={catalog.summary.separatedFiles ? 'summary-warning' : ''}><strong>{catalog.summary.separatedFiles}</strong><small>{t('filesSeparated')}</small></span>
            </div>
            <p className="classification-summary">{t('classificationSummary', {
              volumes: catalog.summary.volumeSeries,
              localizers: catalog.summary.localizerSeries,
              incompatible: catalog.summary.incompatibleSeries,
            })}</p>
            {noticeKey && <div className="selector-notice"><Info />{t(noticeKey)}</div>}
            {error && <div className="selector-error"><AlertTriangle />{error}</div>}
            <div className="series-list">
              {selectedStudy.series.map((series) => <SeriesCard key={series.id} deviceMemoryGiB={deviceMemoryGiB} language={language} series={series} t={t} onOpen={(decimation) => void loadSeries(series, decimation)} />)}
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
        <span className={study.previewFactor > 1 && status === 'ready' ? 'preview-status' : ''}><Box size={14} /> {study.previewFactor > 1 && status === 'ready' ? t('reducedPreviewStatus') : t('synchronizedMpr')}</span>
        <span className={`status-help ${activeTool === 'Length' && status === 'ready' ? 'measurement-help' : ''}`}>{activeTool === 'Length' && status === 'ready' ? t('measurementHelp') : t('viewerHelp')}</span>
          <span>v0.1.0-alpha</span>
      </footer>
    </main>
  );
}
