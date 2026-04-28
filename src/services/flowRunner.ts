import { simvarGet, simvarSet } from "@/API/simvarApi"
import { getFlowById, resolveFlow } from "@/services/flowLoader"
import { playSound, isSoundPlaying } from "@/services/playSounds"
import { useCabinReadyTimerStore } from "@/store/cabinReadyTimerStore"
import { useFlowStore } from "@/store/flowStore"
import { usePerformanceStore } from "@/store/performanceStore"
import { useSettingsStore } from "@/store/settingsStore"
import { useVoiceHintProgressStore } from "@/store/voiceHintProgressStore"
import type { Flow, FlowStep, FlowConditionValue } from "@/types/flow"

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const STEP_DELAY_MIN_MS = 500
const STEP_DELAY_MAX_MS = 1500
const STEP_DELAY_RANGE_MS = STEP_DELAY_MAX_MS - STEP_DELAY_MIN_MS

const SIMVAR_READ_RETRIES = 5
const SIMVAR_READ_RETRY_DELAY_MS = 150
const STEP_VERIFY_RETRIES = 5
const STEP_VERIFY_DELAY_MS = 300
const STEP_SOUND_AFTER_DELAY_MS = 1000

const POST_LANDING_TIMER_MINUTES = 5
const FUZZY_EQUALS_EPSILON = 0.5

const BLOCKED_FLOWS = new Set(["before_takeoff"])

// ---------------------------------------------------------------------------
// Utilities
// ---------------------------------------------------------------------------

const sleep = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms))

function getRandomStepDelay(): number {
  return Math.random() * STEP_DELAY_RANGE_MS + STEP_DELAY_MIN_MS
}

function fuzzyEquals(a: number, b: number, epsilon = FUZZY_EQUALS_EPSILON): boolean {
  return Math.abs(a - b) < epsilon
}

function toNumber(value: number | string): number {
  return typeof value === "string" ? parseFloat(value) : value
}

async function waitForSoundFinished(): Promise<void> {
  while (await isSoundPlaying()) {
    await sleep(100)
  }
}

// ---------------------------------------------------------------------------
// SimVar I/O
// ---------------------------------------------------------------------------

async function readSimvar(expression: string): Promise<number | null> {
  for (let attempt = 0; attempt < SIMVAR_READ_RETRIES; attempt++) {
    try {
      const value = await simvarGet(expression)
      if (value !== null) return value
    } catch (err) {
      console.warn(`[FlowRunner] Failed to read "${expression}":`, err)
      return null
    }
    await sleep(SIMVAR_READ_RETRY_DELAY_MS)
  }
  return null
}

async function writeSimvar(expression: string): Promise<void> {
  try {
    await simvarSet(expression)
  } catch (err) {
    console.error(`[FlowRunner] Failed to write "${expression}":`, err)
    throw err
  }
}

// ---------------------------------------------------------------------------
// Condition evaluation
// ---------------------------------------------------------------------------

function resolveFlowOption(path: string): unknown {
  const { takeoff, landing } = usePerformanceStore.getState()
  const { lightsControlMode } = useSettingsStore.getState()
  const root: Record<string, unknown> = {
    takeoff,
    landing,
    settings: { lightsControlMode }
  }
  return path.split(".").reduce<unknown>((acc, key) => {
    if (!acc || typeof acc !== "object") return undefined
    return (acc as Record<string, unknown>)[key]
  }, root)
}

function optionMatchesExpected(actual: unknown, expected: FlowConditionValue): boolean {
  if (typeof actual === "number" && typeof expected === "number") {
    return fuzzyEquals(actual, expected)
  }
  const actualNum = Number(actual)
  const expectedNum = Number(expected)
  if (!Number.isNaN(actualNum) && !Number.isNaN(expectedNum)) {
    return fuzzyEquals(actualNum, expectedNum)
  }
  return String(actual) === String(expected)
}

function simvarMatchesExpected(actual: number | null, expected: FlowConditionValue): boolean {
  if (typeof expected !== "number" && typeof expected !== "string") return false
  return actual !== null && fuzzyEquals(actual, toNumber(expected))
}

async function shouldExecuteStep(step: FlowStep): Promise<boolean> {
  const condition = step.only_if
  if (!condition) return true

  if ("option" in condition) {
    const optionValue = resolveFlowOption(condition.option)
    if (optionValue === undefined) {
      console.warn(`[FlowRunner] Step "${step.label}" condition option not found: "${condition.option}"`)
      return false
    }
    return condition.one_of.some((expected) => optionMatchesExpected(optionValue, expected))
  }

  const conditionValue = await readSimvar(condition.read)
  if (conditionValue === null) {
    console.warn(`[FlowRunner] Step "${step.label}" condition read failed for "${condition.read}"`)
    return false
  }

  return condition.one_of.some((expected) => simvarMatchesExpected(conditionValue, expected))
}

// ---------------------------------------------------------------------------
// Post-landing timer
// ---------------------------------------------------------------------------

class PostLandingTimer {
  private expiresAt: number | null = null
  private timeoutId: ReturnType<typeof setTimeout> | null = null

  get isActive(): boolean {
    return this.expiresAt !== null && Date.now() < this.expiresAt
  }

  clear(): void {
    if (this.timeoutId !== null) {
      clearTimeout(this.timeoutId as unknown as number)
      this.timeoutId = null
    }
    this.expiresAt = null
  }

  start(minutes: number): void {
    this.clear()
    const safeMinutes = Math.max(1, Math.floor(minutes))
    const delayMs = safeMinutes * 60 * 1000
    this.expiresAt = Date.now() + delayMs
    this.timeoutId = setTimeout(async () => {
      this.expiresAt = null
      this.timeoutId = null
      try {
        await playSound("five_minutes.ogg")
      } catch (err) {
        console.error("[FlowRunner] Failed to play post-landing expiry announcement:", err)
      }
    }, delayMs)
  }
}

// ---------------------------------------------------------------------------
// Flow runner
// ---------------------------------------------------------------------------

class FlowRunner {
  private abortController: AbortController | null = null
  private readonly postLandingTimer = new PostLandingTimer()

  // ── Public API ────────────────────────────────────────────────────────────

  abort(): void {
    this.abortController?.abort()
    this.abortController = null
    useFlowStore.getState().setExecutionState("aborted")
  }

  async execute(flowId: string): Promise<void> {
    if (this.abortController) {
      this.abortController.abort()
      this.abortController = null
    }

    const store = useFlowStore.getState()

    const rawFlow = getFlowById(flowId)
    if (!rawFlow) {
      store.setError(`Flow "${flowId}" not found`)
      return
    }

    const blocked = await this.checkPreconditions(flowId, store)
    if (blocked) return

    const flow: Flow = await resolveFlow(rawFlow)
    store.setFlow(flow)

    if (flow.id === "after_landing") {
      const { postLandingShutdownEnabled } = useSettingsStore.getState()
      if (postLandingShutdownEnabled) {
        this.postLandingTimer.start(POST_LANDING_TIMER_MINUTES)
      }
    }

    this.abortController = new AbortController()
    const { signal } = this.abortController

    try {
      await this.playFlowStartSound(flow, signal)
      await this.runSteps(flow, signal)

      useFlowStore.getState().setExecutionState("completed")
      this.onFlowCompleted(flow)

      await this.playFlowEndSound(flow)
    } catch (err) {
      if (signal.aborted) {
        useFlowStore.getState().setExecutionState("aborted")
      } else {
        useFlowStore.getState().setError(err instanceof Error ? err.message : String(err))
      }
    } finally {
      this.abortController = null
    }
  }

  // ── Precondition checks ───────────────────────────────────────────────────

  private async checkPreconditions(flowId: string, store: ReturnType<typeof useFlowStore.getState>): Promise<boolean> {
    const cabinTimer = useCabinReadyTimerStore.getState()
    if (cabinTimer.isRunning && BLOCKED_FLOWS.has(flowId)) {
      playSound("cabin_not_secure.ogg")
      store.setError("Cannot start before takeoff flow - cabin ready timer is running")
      return true
    }

    return false
  }

  // ── Step iteration ────────────────────────────────────────────────────────

  private async runSteps(flow: Flow, signal: AbortSignal): Promise<void> {
    for (let i = 0; i < flow.steps.length; i++) {
      this.checkAbort(signal)

      const step = flow.steps[i]
      const { setStepIndex, setStepStatus } = useFlowStore.getState()

      setStepIndex(i)
      setStepStatus(i, "executing")

      if (!(await shouldExecuteStep(step))) {
        setStepStatus(i, "skipped")
        if (i < flow.steps.length - 1 && !step.skip_delay) {
          await this.abortableSleep(getRandomStepDelay(), signal)
        }
        continue
      }

      await this.executeStep(step, i, flow, signal)

      if (i < flow.steps.length - 1 && !step.skip_delay) {
        await this.abortableSleep(getRandomStepDelay(), signal)
      }
    }
  }

  // ── Single step execution ─────────────────────────────────────────────────

  private async executeStep(step: FlowStep, index: number, flow: Flow, signal: AbortSignal): Promise<void> {
    const { setStepStatus } = useFlowStore.getState()

    const prevStep = flow.steps[index - 1]
    if (index > 0 && prevStep?.skip_delay) {
      await this.abortableSleep(100, signal)
    }

    const currentValue = await readSimvar(step.read)
    this.checkAbort(signal)

    console.log(`[FlowRunner] Step "${step.label}": read=${currentValue}, expect=${step.expect}`)

    if (simvarMatchesExpected(currentValue, step.expect)) {
      if (step.wait_ms) await this.abortableSleep(step.wait_ms, signal)
      setStepStatus(index, "skipped")
      return
    }

    await writeSimvar(step.on)
    this.checkAbort(signal)

    await this.handlePostWrite(step, signal)
    await this.verifyAndFinish(step, index, signal)
  }

  // ── Post-write phase ──────────────────────────────────────────────────────

  private async handlePostWrite(step: FlowStep, signal: AbortSignal): Promise<void> {
    if (step.sound_on_execute) {
      await waitForSoundFinished()
      await playSound(step.sound_on_execute)
      await waitForSoundFinished()
      this.checkAbort(signal)
    }

    if (step.hold_ms) {
      await this.abortableSleep(step.hold_ms, signal)
      const releaseExpr = step.on.replace(/^-?\d+\s+/, "0 ")
      await writeSimvar(releaseExpr)
      this.checkAbort(signal)
    }

    if (step.wait_ms) {
      await this.abortableSleep(step.wait_ms, signal)
    }
  }

  // ── Verify phase ──────────────────────────────────────────────────────────

  private async verifyAndFinish(step: FlowStep, index: number, signal: AbortSignal): Promise<void> {
    const { setStepStatus } = useFlowStore.getState()

    if (step.skip_verify) {
      setStepStatus(index, "done")
      await this.playSoundAfterExecute(step, signal)
      return
    }

    setStepStatus(index, "verifying")

    let verified = false
    for (let attempt = 0; attempt < STEP_VERIFY_RETRIES; attempt++) {
      this.checkAbort(signal)
      if (!step.skip_delay) await sleep(STEP_VERIFY_DELAY_MS)
      const newValue = await readSimvar(step.read)
      if (simvarMatchesExpected(newValue, step.expect)) {
        verified = true
        break
      }
    }

    if (!verified) {
      console.warn(`[FlowRunner] Step "${step.label}" verification failed (expected ${step.expect})`)
      setStepStatus(index, "failed")
      return
    }

    setStepStatus(index, "done")
    await this.playSoundAfterExecute(step, signal)
  }

  // ── Sound helpers ─────────────────────────────────────────────────────────

  private async playFlowStartSound(flow: Flow, signal: AbortSignal): Promise<void> {
    if (!flow.sound_start) return
    await waitForSoundFinished()
    await playSound(flow.sound_start)
    await waitForSoundFinished()
    this.checkAbort(signal)
  }

  private async playFlowEndSound(flow: Flow): Promise<void> {
    if (!flow.sound_end) return
    await waitForSoundFinished()
    await playSound(flow.sound_end)
  }

  private async playSoundAfterExecute(step: FlowStep, signal: AbortSignal): Promise<void> {
    if (!step.sound_after_execute) return
    if (!step.skip_delay) await this.abortableSleep(STEP_SOUND_AFTER_DELAY_MS, signal)
    await waitForSoundFinished()
    await playSound(step.sound_after_execute)
    await waitForSoundFinished()
    this.checkAbort(signal)
  }

  // ── Flow completion side-effects ──────────────────────────────────────────

  private onFlowCompleted(flow: Flow): void {
    const voiceHints = useVoiceHintProgressStore.getState()
    voiceHints.recordFlowCompleted(flow.id)
    if (flow.id === "shutdown") {
      voiceHints.resetForColdGround()
    }
  }

  // ── Abort / sleep helpers ─────────────────────────────────────────────────

  private checkAbort(signal: AbortSignal): void {
    if (signal.aborted) throw new Error("Flow aborted")
  }

  private async abortableSleep(ms: number, signal: AbortSignal): Promise<void> {
    const interval = 100
    let elapsed = 0
    while (elapsed < ms) {
      this.checkAbort(signal)
      const chunk = Math.min(interval, ms - elapsed)
      await sleep(chunk)
      elapsed += chunk
    }
  }
}

// ---------------------------------------------------------------------------
// Module-level singleton + public API
// ---------------------------------------------------------------------------

const runner = new FlowRunner()

export const executeFlow = (flowId: string): Promise<void> => runner.execute(flowId)
export const abortFlow = (): void => runner.abort()
