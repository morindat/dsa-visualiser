import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from 'react'
import {
  getOperationMeta,
  getPseudocode,
  getStructure,
  listStructures,
} from './app/catalogue'
import {
  createPlaybackController,
  type PlaybackController,
} from './app/controller'
import { buildPrediction } from './app/practice'
import type { StructureId } from './app/reducers'
import { runOperation } from './app/runOperation'
import {
  buildRunUrl,
  readRunFromSearch,
  toShareableRun,
  type RunRequestState,
  type ShareableRun,
} from './app/shareLink'
import type { ValidationReport } from './app/validate'
import {
  getPreset,
  presetEdgesToText,
  presetsForStructure,
  presetValuesToText,
  type PresetDataset,
} from './data/presets'
import { StepAnnouncer } from './ui/a11y/StepAnnouncer'
import { PlaybackControls } from './ui/controls/PlaybackControls'
import { useKeyboardShortcuts } from './ui/controls/useKeyboardShortcuts'
import { OperationGuide } from './ui/guide/OperationGuide'
import { usePersistentState } from './ui/hooks/usePersistentState'
import {
  CompassIcon,
  KeyboardIcon,
  MoonIcon,
  PanelLeftIcon,
  ShareIcon,
  SunIcon,
  TargetIcon,
} from './ui/icons'
import { ShortcutsDialog } from './ui/overlays/ShortcutsDialog'
import { AuxStatePane } from './ui/panes/AuxStatePane'
import { ComplexityPanel } from './ui/panes/ComplexityPanel'
import { humanizeGraphText } from './ui/panes/graphText'
import { NarrationPanel } from './ui/panes/NarrationPanel'
import { PseudocodePane } from './ui/panes/PseudocodePane'
import { StructurePane } from './ui/panes/StructurePane'
import { VisualizationStage } from './ui/panes/VisualizationStage'
import { PracticePanel, type PracticeScore } from './ui/practice/PracticePanel'
import { CatalogueSidebar } from './ui/sidebar/CatalogueSidebar'
import { ToolButton } from './ui/shell/ToolButton'
import { WorkspaceShell } from './ui/shell/WorkspaceShell'
import { TourOverlay } from './ui/tour/TourOverlay'
import { useTheme } from './ui/theme/useTheme'

/**
 * Composition root. It wires the pieces and nothing else:
 *
 *   text ─► app/runOperation (validate → build → execute) ─► controller.load
 *
 * From there every pane is a pure function of `(trace, index)`; nothing here holds
 * the index or a timer (`ADR-1`, `ADR-4`). The pipeline lives in `app/`, so this
 * file never imports the algorithm layer directly.
 *
 * The selection (structure, operation, text) is UI state. `controller.getState()`
 * is only used when the loaded operation matches the selection, so switching
 * structure never shows a stale picture under a new heading.
 */

const DEFAULT_STRUCTURE = 'list'
const DEFAULT_OPERATION = 'insertAtHead'
const DEFAULT_VALUES = '50, 30, 70'
const DEFAULT_VALUE = '45'
const DEFAULT_POSITION = '1'
const DEFAULT_EDGES = 'A-B\nB-C\nA-C'

const TOUR_STORAGE_KEY = 'dsviz.tour.v1'
const DEFAULT_STEP_MS = 700

/** Which operation a preset is most interesting with, for one-click loading. */
const PRESET_OPERATION: Record<string, string> = {
  'list-basic': 'insertAtHead',
  'stack-basic': 'stackPush',
  'bst-balanced': 'bstInsertAll',
  'bst-degenerate': 'bstInsertAll',
  'heap-unsorted': 'heapInsertAll',
  'heap-valid': 'heapExtractMin',
  'graph-bfs-dfs': 'bfs',
}

type ChromeMode = 'config' | 'explore'

function hasSeenTour(): boolean {
  try {
    return localStorage.getItem(TOUR_STORAGE_KEY) === '1'
  } catch {
    return false
  }
}

function App() {
  // Created once, lazily: a stable value that is not a ref, so reading it during
  // render is fine. The controller owns the index and the timer (ADR-4).
  const [controller] = useState<PlaybackController>(() =>
    createPlaybackController(),
  )

  const snapshot = useSyncExternalStore(
    controller.subscribe,
    controller.getSnapshot,
  )

  const { theme, toggleTheme } = useTheme()

  // A shared link is read once, during the first render, so the initial state is
  // the shared run rather than the default demo. Reading it in an effect would
  // cause a second render with the wrong trace visible for a frame.
  const [initialShared] = useState<ShareableRun | null>(() => {
    if (import.meta.env.MODE === 'test') return null
    if (typeof window === 'undefined') return null
    return readRunFromSearch(window.location.search)
  })

  const [structureId, setStructureId] = useState(
    initialShared?.structureId ?? DEFAULT_STRUCTURE,
  )
  const [operationId, setOperationId] = useState(
    initialShared?.operationId ?? DEFAULT_OPERATION,
  )
  const [valuesText, setValuesText] = useState(
    initialShared?.valuesText ?? DEFAULT_VALUES,
  )
  const [valueText, setValueText] = useState(
    initialShared?.valueText ?? DEFAULT_VALUE,
  )
  const [positionText, setPositionText] = useState(
    initialShared?.positionText ?? DEFAULT_POSITION,
  )
  const [edgesText, setEdgesText] = useState(
    initialShared?.edgesText ?? DEFAULT_EDGES,
  )
  const [sourceText, setSourceText] = useState(initialShared?.sourceText ?? 'A')
  const [directed, setDirected] = useState(initialShared?.directed ?? false)
  const [report, setReport] = useState<ValidationReport | null>(null)

  const [chromeMode, setChromeMode] = useState<ChromeMode>(
    initialShared === null ? 'config' : 'explore',
  )
  const [guideOpen, setGuideOpen] = useState(initialShared === null)
  const [sidebarPinned, setSidebarPinned] = usePersistentState<boolean>(
    'dsviz.sidebarPinned',
    false,
  )
  const [stepMs, setStepMsState] = useState(DEFAULT_STEP_MS)
  const [runSerial, setRunSerial] = useState(0)

  const [tourOpen, setTourOpen] = useState(false)
  const [helpOpen, setHelpOpen] = useState(false)

  const [practiceOn, setPracticeOn] = useState(false)
  const [practiceScore, setPracticeScore] = useState<PracticeScore>({
    correct: 0,
    answered: 0,
  })
  const [practiceAnswered, setPracticeAnswered] = useState(false)
  const [practiceNudge, setPracticeNudge] = useState(false)
  const [practiceSession, setPracticeSession] = useState(0)

  const [shareCopied, setShareCopied] = useState(false)

  const lastRunRef = useRef<RunRequestState | null>(null)
  const hasInitialised = useRef(false)
  const shareTimer = useRef<number | null>(null)

  /** Fills the text fields from a preset — the same fields a user would type in. */
  const applyPreset = useCallback((preset: PresetDataset): void => {
    if (preset.structureId === 'graph') {
      setEdgesText(presetEdgesToText(preset))
      setSourceText(preset.source)
      setDirected(preset.directed)
    } else {
      setValuesText(presetValuesToText(preset))
    }
  }, [])

  const resetPractice = useCallback((): void => {
    setPracticeAnswered(false)
    setPracticeNudge(false)
  }, [])

  const selectStructure = useCallback(
    (id: string): void => {
      setStructureId(id)
      const entry = getStructure(id)
      const preset = presetsForStructure(id as StructureId)[0]
      if (preset !== undefined) {
        applyPreset(preset)
        setOperationId(
          PRESET_OPERATION[preset.id] ?? entry?.operations[0] ?? id,
        )
      } else {
        setOperationId(entry?.operations[0] ?? id)
      }
      setGuideOpen(true)
      setChromeMode('config')
      resetPractice()
    },
    [applyPreset, resetPractice],
  )

  const selectPreset = useCallback(
    (presetId: string): void => {
      const preset = getPreset(presetId)
      if (preset === undefined) return
      setStructureId(preset.structureId)
      applyPreset(preset)
      const suggested = PRESET_OPERATION[preset.id]
      if (suggested !== undefined) setOperationId(suggested)
      setGuideOpen(true)
      setChromeMode('config')
      resetPractice()
    },
    [applyPreset, resetPractice],
  )

  const selectOperation = useCallback(
    (id: string): void => {
      setOperationId(id)
      // Delete/search should act on something that is actually in the dataset.
      // When the value field still holds the untouched insert default, replace it
      // with the first dataset token so the form does not suggest "45" for a list
      // that does not contain 45.
      if (
        (id === 'deleteByValue' || id === 'bstDelete' || id === 'bstSearch') &&
        valueText === DEFAULT_VALUE
      ) {
        const first = valuesText
          .split(/[\s,]+/)
          .map((token) => token.trim())
          .find((token) => token.length > 0)
        if (first !== undefined) setValueText(first)
      }
      setGuideOpen(true)
      setChromeMode('config')
      resetPractice()
    },
    [resetPractice, valueText, valuesText],
  )

  /**
   * Runs a request and loads its trace. Returns the validation report, or `null`
   * if the pipeline itself threw. The caller uses `report.ok` to decide whether a
   * trace was loaded and whether any advisory token should stay visible.
   */
  const applyRun = useCallback(
    (request: RunRequestState, seekIndex?: number): ValidationReport | null => {
      try {
        const outcome = runOperation(request)
        setReport(outcome.report)
        if (!outcome.ok) return outcome.report
        controller.load(outcome.input)
        lastRunRef.current = request
        setRunSerial((serial) => serial + 1)
        if (seekIndex !== undefined) controller.seek(seekIndex)
        return outcome.report
      } catch (error) {
        controller.fail(error instanceof Error ? error.message : String(error))
        return null
      }
    },
    [controller],
  )

  const visualise = useCallback((): void => {
    const request: RunRequestState = {
      structureId,
      operationId,
      valuesText,
      valueText,
      positionText,
      edgesText,
      sourceText,
      directed,
    }
    const outcome = applyRun(request)
    const ok = outcome?.ok === true
    const hasNotices =
      outcome?.tokens.some((token) => token.status !== 'accepted') ?? false
    resetPractice()
    if (ok && !hasNotices) {
      // The run is loaded: give the stage the space. The compact inputs strip
      // keeps the operation and dataset one click away.
      setChromeMode('explore')
      setGuideOpen(false)
    } else {
      // An advisory token (e.g. a skipped duplicate) or a validation failure must
      // not disappear with the form, so keep the guide open next to its input.
      setChromeMode('config')
      setGuideOpen(true)
    }
  }, [
    applyRun,
    directed,
    edgesText,
    operationId,
    positionText,
    resetPractice,
    sourceText,
    structureId,
    valueText,
    valuesText,
  ])

  // Show something useful on first paint instead of an empty shell. In a real
  // browser, a shared link takes precedence over the default demo; its fields
  // were already used to seed the state above. The actual load is queued so the
  // effect body itself never calls a state setter synchronously.
  useEffect(() => {
    let cancelled = false

    queueMicrotask(() => {
      // The guard lives inside the queued task: StrictMode runs the effect,
      // cleans it up, then runs it again. The first task is cancelled, the
      // second one performs the load exactly once.
      if (cancelled || hasInitialised.current) return
      hasInitialised.current = true
      if (initialShared !== null) {
        const request: RunRequestState = {
          structureId: initialShared.structureId,
          operationId: initialShared.operationId,
          valuesText: initialShared.valuesText,
          valueText: initialShared.valueText,
          positionText: initialShared.positionText,
          edgesText: initialShared.edgesText,
          sourceText: initialShared.sourceText,
          directed: initialShared.directed,
        }
        if (applyRun(request, initialShared.index)?.ok === true) return
      }
      visualise()
    })

    return () => {
      cancelled = true
    }
  }, [applyRun, initialShared, visualise])

  // Keep the address bar shareable without adding history entries. The current
  // origin is passed explicitly: `buildRunUrl` defaults to the public share URL,
  // but `replaceState` may not cross origins. Tests run in jsdom and are
  // deliberately kept out so one test cannot leak a run into the next through
  // `window.location`.
  useEffect(() => {
    if (import.meta.env.MODE === 'test') return
    if (!snapshot.structureId || snapshot.trace.length === 0) return
    if (lastRunRef.current === null) return
    const url = buildRunUrl(
      toShareableRun(lastRunRef.current, snapshot.index),
      window.location.href,
    )
    try {
      window.history.replaceState(null, '', url)
    } catch {
      // A sandboxed iframe can refuse history writes; the copy button still works.
    }
  }, [runSerial, snapshot.index, snapshot.structureId, snapshot.trace.length])

  useEffect(
    () => () => {
      if (shareTimer.current !== null) {
        window.clearTimeout(shareTimer.current)
      }
    },
    [],
  )

  useEffect(() => {
    if (import.meta.env.MODE === 'test') return
    if (hasSeenTour()) return
    const timer = window.setTimeout(() => {
      // The tour points at the catalogue and the inputs form, so open both
      // before the first spotlight appears.
      setChromeMode('config')
      setGuideOpen(true)
      setHelpOpen(false)
      setTourOpen(true)
    }, 900)
    return () => window.clearTimeout(timer)
  }, [])

  const meta = getOperationMeta(operationId)
  const listing = getPseudocode(meta?.pseudocodeId ?? operationId)

  // Only show the loaded trace when it belongs to the current selection.
  const loaded =
    snapshot.operationId === operationId && snapshot.structureId === structureId
  const state = loaded ? controller.getState() : null
  const currentStep = loaded ? snapshot.trace[snapshot.index] : undefined

  // The code and complexity panes follow the INSTRUCTION executing, not the
  // operation that was selected: a composed trace inserts the dataset first (the
  // insert listing) and runs the selected operation later (its own listing), so the
  // highlight switches phase as the trace advances.
  const activeOperationId = currentStep?.operation ?? operationId
  const activeMeta = getOperationMeta(activeOperationId) ?? meta
  const activeListing =
    getPseudocode(activeMeta?.pseudocodeId ?? activeOperationId) ?? listing

  // Graph traces use stable internal ids (`v1`, `v2`, …), but the drawing uses
  // human labels (`A`, `B`, …). Decode ids to labels for every learner-facing
  // surface: narration, the live region, practice options and the
  // traversal panel. The trace itself keeps the ids the algorithm needs.
  const graphLabels = useMemo(() => {
    if (state === null || state.structureId !== 'graph') return null
    const labels: Record<string, string> = {}
    for (const vertex of state.model.vertices) labels[vertex.id] = vertex.label
    return labels
  }, [state])

  const humanizeGraphLabel = useCallback(
    (text: string): string => humanizeGraphText(text, graphLabels),
    [graphLabels],
  )

  const narrationText = humanizeGraphLabel(currentStep?.narration ?? '')
  const graphSourceId =
    state?.structureId === 'graph' &&
    (snapshot.operationId === 'bfs' || snapshot.operationId === 'dfs')
      ? snapshot.trace[0]?.highlight.active
      : undefined

  const structureLabel =
    getStructure(state?.structureId ?? structureId)?.label ?? structureId
  const operationLabel =
    activeMeta?.label ?? meta?.label ?? 'Choose an operation'
  const hasTrace = loaded && snapshot.trace.length > 0
  const autoHideSidebar = chromeMode === 'explore' && hasTrace

  const practicePrediction = useMemo(() => {
    if (!(practiceOn && loaded)) return null
    const prediction = buildPrediction(snapshot.trace, snapshot.index)
    if (prediction === null || graphLabels === null) return prediction
    return {
      ...prediction,
      options: prediction.options.map((option) => ({
        ...option,
        text: humanizeGraphLabel(option.text),
      })),
    }
  }, [
    practiceOn,
    loaded,
    snapshot.trace,
    snapshot.index,
    graphLabels,
    humanizeGraphLabel,
  ])

  const openGuide = useCallback((): void => {
    setGuideOpen(true)
    setChromeMode('config')
  }, [])

  const toggleGuide = useCallback((): void => {
    if (guideOpen) {
      setGuideOpen(false)
      // With a trace loaded, hiding the form is a request for the stage to take
      // the space, so the catalogue collapses with it.
      if (hasTrace) setChromeMode('explore')
    } else {
      setGuideOpen(true)
      setChromeMode('config')
    }
  }, [guideOpen, hasTrace])

  const changeSpeed = useCallback(
    (nextStepMs: number): void => {
      setStepMsState(nextStepMs)
      controller.setStepMs(nextStepMs)
    },
    [controller],
  )

  const togglePlay = useCallback((): void => {
    if (snapshot.phase === 'PLAYING') {
      controller.pause()
      return
    }
    if (practiceOn) {
      setPracticeNudge(true)
      return
    }
    setChromeMode('explore')
    setGuideOpen(false)
    controller.play()
  }, [controller, practiceOn, snapshot.phase])

  const stepForward = useCallback((): void => {
    if (practiceOn && practicePrediction !== null && !practiceAnswered) {
      setPracticeNudge(true)
      return
    }
    setChromeMode('explore')
    setGuideOpen(false)
    controller.stepForward()
    // The next step always starts with a fresh prediction, whether practice is
    // on or off. Keeping this in the command (not an index-watching effect) means
    // there is no one-render window where the previous answer still counts.
    resetPractice()
  }, [
    controller,
    practiceAnswered,
    practiceOn,
    practicePrediction,
    resetPractice,
  ])

  const stepBack = useCallback((): void => {
    resetPractice()
    setChromeMode('explore')
    setGuideOpen(false)
    controller.stepBack()
  }, [controller, resetPractice])

  const restartTrace = useCallback((): void => {
    resetPractice()
    setChromeMode('explore')
    setGuideOpen(false)
    controller.restart()
  }, [controller, resetPractice])

  const seekTo = useCallback(
    (index: number): void => {
      resetPractice()
      setChromeMode('explore')
      setGuideOpen(false)
      controller.seek(index)
    },
    [controller, resetPractice],
  )

  const togglePractice = useCallback((): void => {
    const next = !practiceOn
    setPracticeOn(next)
    resetPractice()
    if (next) {
      controller.pause()
      setChromeMode('explore')
      setGuideOpen(false)
      setPracticeScore({ correct: 0, answered: 0 })
      setPracticeSession((session) => session + 1)
    }
  }, [controller, practiceOn, resetPractice])

  const answerPractice = useCallback((correct: boolean): void => {
    setPracticeScore((score) => ({
      correct: score.correct + (correct ? 1 : 0),
      answered: score.answered + 1,
    }))
    setPracticeAnswered(true)
    setPracticeNudge(false)
  }, [])

  const continuePractice = useCallback((): void => {
    setPracticeAnswered(true)
    setChromeMode('explore')
    setGuideOpen(false)
    controller.stepForward()
    resetPractice()
  }, [controller, resetPractice])

  const restartPractice = useCallback((): void => {
    setPracticeScore({ correct: 0, answered: 0 })
    resetPractice()
    setPracticeSession((session) => session + 1)
    setChromeMode('explore')
    setGuideOpen(false)
    controller.restart()
  }, [controller, resetPractice])

  const shareRunNow = useCallback((): ShareableRun => {
    const request: RunRequestState = lastRunRef.current ?? {
      structureId,
      operationId,
      valuesText,
      valueText,
      positionText,
      edgesText,
      sourceText,
      directed,
    }
    return toShareableRun(request, loaded ? snapshot.index : 0)
  }, [
    directed,
    edgesText,
    loaded,
    operationId,
    positionText,
    snapshot.index,
    sourceText,
    structureId,
    valueText,
    valuesText,
  ])

  const share = useCallback(async (): Promise<void> => {
    const url = buildRunUrl(shareRunNow())
    let copied = false
    try {
      if (
        typeof navigator !== 'undefined' &&
        navigator.clipboard?.writeText !== undefined
      ) {
        await navigator.clipboard.writeText(url)
        copied = true
      } else if (
        typeof document !== 'undefined' &&
        typeof document.execCommand === 'function'
      ) {
        const area = document.createElement('textarea')
        area.value = url
        area.setAttribute('readonly', '')
        area.style.position = 'fixed'
        area.style.opacity = '0'
        document.body.appendChild(area)
        area.select()
        copied = document.execCommand('copy')
        area.remove()
      }
    } catch {
      copied = false
    }

    if (copied) {
      setShareCopied(true)
      if (shareTimer.current !== null) window.clearTimeout(shareTimer.current)
      shareTimer.current = window.setTimeout(() => setShareCopied(false), 2200)
    }

    if (import.meta.env.MODE !== 'test') {
      try {
        window.history.replaceState(null, '', url)
      } catch {
        // Ignore sandboxed history restrictions.
      }
    }
  }, [shareRunNow])

  const closeTour = useCallback((): void => {
    setTourOpen(false)
    try {
      localStorage.setItem(TOUR_STORAGE_KEY, '1')
    } catch {
      // Storage is optional; the tour simply opens next time.
    }
  }, [])

  const startTour = useCallback((): void => {
    setChromeMode('config')
    setGuideOpen(true)
    setHelpOpen(false)
    setTourOpen(true)
  }, [])

  useKeyboardShortcuts({
    onTogglePlay: togglePlay,
    onStepForward: stepForward,
    onStepBack: stepBack,
    onRestart: restartTrace,
    onFirst: () => seekTo(0),
    onLast: () => seekTo(snapshot.trace.length - 1),
    onHelp: () => setHelpOpen(true),
    onEscape: () => {
      if (tourOpen) closeTour()
      else if (helpOpen) setHelpOpen(false)
    },
  })

  return (
    <WorkspaceShell
      error={snapshot.error}
      autoHideSidebar={autoHideSidebar}
      sidebarPinned={sidebarPinned}
      onToggleSidebarPinned={() => setSidebarPinned((pinned) => !pinned)}
      brandContext={
        <>
          <span className="truncate">{structureLabel}</span>
          <span className="text-subtle">/</span>
          <span className="truncate text-ink-dim">{operationLabel}</span>
          <span className="text-subtle">·</span>
          <span className="font-mono tabular-nums">
            {hasTrace ? `${snapshot.index + 1}/${snapshot.trace.length}` : '—'}
          </span>
        </>
      }
      toolbar={
        <div data-tour="toolbar-tools" className="flex items-center gap-0.5">
          <ToolButton
            label="Structures"
            onClick={() => setSidebarPinned((pinned) => !pinned)}
            toggle
            active={sidebarPinned}
            icon={<PanelLeftIcon size={15} />}
          />
          <span className="mx-1 hidden h-4 w-px bg-line sm:block" />
          <ToolButton
            label={practiceOn ? 'Practice on' : 'Practice'}
            onClick={togglePractice}
            toggle
            active={practiceOn}
            icon={<TargetIcon size={15} />}
          />
          <ToolButton
            label={shareCopied ? 'Link copied' : 'Share'}
            onClick={() => void share()}
            icon={<ShareIcon size={15} />}
          />
          <ToolButton
            label={theme === 'dark' ? 'Light theme' : 'Dark theme'}
            onClick={toggleTheme}
            icon={
              theme === 'dark' ? <SunIcon size={15} /> : <MoonIcon size={15} />
            }
          />
          <ToolButton
            label="Tour"
            onClick={startTour}
            icon={<CompassIcon size={15} />}
          />
          <ToolButton
            label="Keys"
            onClick={() => setHelpOpen(true)}
            icon={<KeyboardIcon size={15} />}
          />
        </div>
      }
      sidebar={
        <CatalogueSidebar
          entries={listStructures()}
          selectedId={structureId}
          selectedOperationId={operationId}
          onSelect={selectStructure}
          onSelectOperation={selectOperation}
        />
      }
      guide={
        <OperationGuide
          structureId={structureId}
          structureLabel={structureLabel}
          operation={meta}
          valuesText={valuesText}
          valueText={valueText}
          positionText={positionText}
          edgesText={edgesText}
          sourceText={sourceText}
          directed={directed}
          presets={presetsForStructure(structureId as StructureId)}
          report={report}
          collapsed={!guideOpen}
          onToggle={toggleGuide}
          onValuesChange={setValuesText}
          onValueChange={setValueText}
          onPositionChange={setPositionText}
          onEdgesChange={setEdgesText}
          onSourceChange={setSourceText}
          onDirectedChange={setDirected}
          onPresetSelect={selectPreset}
          onVisualise={visualise}
        />
      }
      stage={
        <VisualizationStage
          structureLabel={structureLabel}
          operationLabel={operationLabel}
          snapshot={snapshot}
          onEditInputs={guideOpen ? undefined : openGuide}
          structure={
            <StructurePane
              state={state}
              step={currentStep}
              variant="stage"
              sourceId={graphSourceId}
            />
          }
          practice={
            practiceOn ? (
              <PracticePanel
                key={`${snapshot.index}-${snapshot.trace.length}-${practiceSession}`}
                prediction={practicePrediction}
                score={practiceScore}
                nudge={practiceNudge}
                onAnswer={answerPractice}
                onContinue={continuePractice}
                onRestart={restartPractice}
                onExit={togglePractice}
              />
            ) : undefined
          }
          narration={
            <NarrationPanel
              text={narrationText}
              milestone={currentStep?.milestone}
              hasStep={currentStep !== undefined}
              variant="stage"
            />
          }
          controls={
            <PlaybackControls
              snapshot={snapshot}
              stepMs={stepMs}
              playDisabled={practiceOn}
              note={
                practiceOn
                  ? 'Practice mode: answer the prediction, then step on — or exit practice from the stage.'
                  : undefined
              }
              onPlay={togglePlay}
              onPause={() => controller.pause()}
              onStepForward={stepForward}
              onStepBack={stepBack}
              onRestart={restartTrace}
              onSeek={seekTo}
              onStepMsChange={changeSpeed}
            />
          }
        />
      }
      rail={
        <>
          <PseudocodePane
            lines={activeListing?.lines ?? []}
            activeLine={currentStep?.codeLine ?? 0}
            operationLabel={activeMeta?.label}
          />
          <AuxStatePane
            aux={currentStep?.aux}
            hasStep={currentStep !== undefined}
            structureId={state?.structureId ?? structureId}
            activeId={currentStep?.highlight.active}
            edges={currentStep?.highlight.edges}
            labelFor={
              graphLabels === null ? undefined : (id) => graphLabels[id] ?? id
            }
          />
          <ComplexityPanel
            meta={activeMeta}
            summary={loaded ? snapshot.summary : null}
            index={loaded ? snapshot.index : 0}
            total={loaded ? snapshot.trace.length : 0}
          />
        </>
      }
      announcer={
        <StepAnnouncer
          index={loaded ? snapshot.index : 0}
          total={loaded ? snapshot.trace.length : 0}
          narration={narrationText}
        />
      }
      overlay={
        <>
          {tourOpen && <TourOverlay onClose={closeTour} />}
          {helpOpen && <ShortcutsDialog onClose={() => setHelpOpen(false)} />}
        </>
      }
    />
  )
}

export default App
