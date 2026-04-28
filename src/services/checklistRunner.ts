import { listen } from "@tauri-apps/api/event"

import { simvarGet } from "@/API/simvarApi"
import { getChecklistById } from "@/services/checklistLoader"
import { isSoundPlaying, playSound, playSoundSequence } from "@/services/playSounds"
import { useCabinReadyTimerStore } from "@/store/cabinReadyTimerStore"
import { useChecklistStore } from "@/store/checklistStore"
import { usePerformanceStore } from "@/store/performanceStore"
import { useSettingsStore } from "@/store/settingsStore"
import { useTelemetryStore } from "@/store/telemetryStore"
import { useVoiceHintProgressStore } from "@/store/voiceHintProgressStore"
import type { Check, ChecklistItem, ValidationRule } from "@/types/checklist"

// ─── Helpers ──────────────────────────────────────────────────────────────────

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

async function waitForSoundFinished() {
  while (await isSoundPlaying()) {
    await sleep(100)
  }
}

function checkAbort(signal: AbortSignal) {
  if (signal.aborted) throw new Error("Checklist aborted")
}

async function waitForSpeechResponse(signal: AbortSignal): Promise<string | null> {
  if (signal.aborted) return null

  return new Promise<string | null>((resolve) => {
    let unlistenFn: (() => void) | null = null
    let resolved = false

    const done = (value: string | null) => {
      if (resolved) return
      resolved = true
      unlistenFn?.()
      resolve(value)
    }

    signal.addEventListener("abort", () => done(null), { once: true })

    listen<{ text?: string; type?: string }>("speech_recognized", (event) => {
      if (event.payload?.type === "speech_unrecognized") return
      const text = event.payload?.text?.trim().toLowerCase()
      if (text) done(text)
    }).then((fn) => {
      unlistenFn = fn
      if (signal.aborted) done(null)
    })
  })
}

// Pre-compiled regex for spelled-out number words used in baro/feet confirmation.
const NUMBER_WORD = `(?:zero|one|two|three|four|five|six|seven|eight|nine|niner|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen|twenty|thirty|forty|fifty|sixty|seventy|eighty|ninety|hundred|thousand)`
const NUMBER_WORDS_RE = new RegExp(`\\b${NUMBER_WORD}(?:[\\s-]+${NUMBER_WORD}){0,3}\\b`, "i")

function matchesResponse(spoken: string, token: string): boolean {
  if (token === "*") return true
  if (token === "#2") return /\b\d{2}\b/.test(spoken)
  if (token === "#3") return /\b\d{3}\b/.test(spoken)
  if (token === "#4") return /\b\d{4}\b/.test(spoken)
  return spoken.includes(token.toLowerCase())
}

function matchesAnyResponse(spoken: string, responses: string[]): boolean {
  return responses.some((r) => matchesResponse(spoken, r))
}

function getStoreValue(storePath: string): string | undefined {
  const state = usePerformanceStore.getState() as unknown as Record<string, Record<string, string>>
  const [section, key] = storePath.split(".")
  return state[section]?.[key]
}

async function readSimVar(expression: string): Promise<number | null> {
  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      const value = await simvarGet(expression)
      if (value !== null) {
        console.log(
          `[ChecklistRunner] readSimVar("${expression}") → ${value}${attempt > 0 ? ` (attempt ${attempt + 1})` : ""}`
        )
        return value
      }
    } catch (err) {
      console.warn(`[ChecklistRunner] Failed to read simvar "${expression}":`, err)
      return null
    }
    await sleep(150)
  }
  console.warn(`[ChecklistRunner] readSimVar("${expression}") → null after retries`)
  return null
}

// ─── Core check runner ────────────────────────────────────────────────────────

async function runChecks(checks: Check[], signal: AbortSignal): Promise<boolean> {
  for (const check of checks) {
    let pass = false

    if (check.type === "any") {
      pass = false
      for (const group of check.groups ?? []) {
        const groupOk = await runChecks(group, signal)
        if (groupOk) {
          pass = true
          break
        }
      }
    }

    if (check.type === "simvar") {
      const raw = await readSimVar(check.var!)
      checkAbort(signal)

      let expected: number | null = null
      if (typeof check.expected === "boolean") {
        expected = check.expected ? 1 : 0
      } else if (typeof check.expected === "number") {
        expected = check.expected
      } else if (typeof check.expected === "object" && check.expected !== null) {
        const storeRaw = getStoreValue(check.expected.store)
        if (storeRaw !== undefined) {
          const n = parseFloat(String(storeRaw))
          expected = isNaN(n) ? null : n
        }
      }

      if (typeof check.expected === "boolean") {
        const rawBool = raw !== null ? (raw > 0.5 ? 1 : 0) : null
        pass = rawBool !== null && expected !== null && rawBool === expected
      } else if (check.strict) {
        pass = raw !== null && expected !== null && raw === expected
      } else {
        pass = raw !== null && expected !== null && Math.abs(raw - expected) < 0.1
      }
    }

    if (check.type === "store") {
      const val = getStoreValue(check.store!)
      pass = val === check.equals
    }

    if (!pass) {
      console.log(
        `[ChecklistRunner] check FAILED: type="${check.type}" var="${check.var ?? check.store}" expected="${check.expected ?? check.equals}"`
      )
      return false
    }
  }

  return true
}

async function findPassingRule(
  validations: ValidationRule[],
  spoken: string,
  signal: AbortSignal
): Promise<ValidationRule | null> {
  // Find the rule whose response token best (longest) matches spoken
  let bestMatch: ValidationRule | undefined
  let bestLen = -1

  for (const rule of validations) {
    const w = rule.when

    if (w.responses) {
      for (const token of w.responses) {
        if (matchesResponse(spoken, token) && token.length > bestLen) {
          bestLen = token.length
          bestMatch = rule
        }
      }
    }
  }

  // If a response-based rule matched, only check that one
  if (bestMatch) {
    const ok = await runChecks(bestMatch.checks ?? [], signal)
    return ok ? bestMatch : null
  }

  // No response matched — try always/store rules in order (handles silent mode
  // and items with no response-based validations)
  for (const rule of validations) {
    const w = rule.when
    const conditionMet = (w.store && getStoreValue(w.store.path) === w.store.equals) || w.always === true

    if (!conditionMet) continue

    const ok = await runChecks(rule.checks ?? [], signal)
    if (ok) return rule
  }

  return null
}

// ─── Abort controller ─────────────────────────────────────────────────────────

let abortController: AbortController | null = null

// ─── Normal-mode execution ────────────────────────────────────────────────────

async function executeNormalItem(item: ChecklistItem, index: number, signal: AbortSignal): Promise<void> {
  const { setStepStatus } = useChecklistStore.getState()
  setStepStatus(index, "active")

  if (!item.challenge) {
    setStepStatus(index, "complete")
    return
  }

  const responseList = item.response ?? []
  const hold = () => useSettingsStore.getState().holdOnIncorrect

  while (true) {
    checkAbort(signal)

    await waitForSoundFinished()
    await playSound(item.challenge)
    await waitForSoundFinished()
    checkAbort(signal)

    // ── Wait for a matching spoken response ───────────────────────────────
    let spoken: string | null = null
    while (true) {
      spoken = await waitForSpeechResponse(signal)
      if (spoken === null) return // aborted

      if (responseList.length === 0 || matchesAnyResponse(spoken, responseList)) {
        const s = spoken.toLowerCase().trim()

        const expectsFeet = responseList.some((r) => r.toLowerCase().includes("feet"))
        if ((item.baro_confirmation || expectsFeet) && !s.includes("set and checked")) {
          if (!(/\b\d{2,4}\b/.test(s) || NUMBER_WORDS_RE.test(s))) continue
        }

        break
      }
    }

    const s = spoken!
    checkAbort(signal)

    // ── Run validations ───────────────────────────────────────────────────
    if (item.validations?.length) {
      const rule = await findPassingRule(item.validations, s, signal)

      if (!rule) {
        await playSound(item.incorrect ?? "are_you_sure.ogg")
        await waitForSoundFinished()
        if (hold()) continue
        else break
      }

      if (rule.copilot_response) {
        await playSound(rule.copilot_response)
        await waitForSoundFinished()
      }

      break
    }

    // ── Baro confirmation ─────────────────────────────────────────────────
    if (item.baro_confirmation) {
      const t = useTelemetryStore.getState().telemetry
      if (t !== null) {
        const spokenMatch = s.match(/\b(\d{3,4})\b/)
        const spokenNum = spokenMatch ? parseInt(spokenMatch[1], 10) : null
        const isHpa = spokenNum !== null ? spokenNum >= 920 && spokenNum <= 1060 : t.cptBaro === 1
        const value = isHpa
          ? Math.round(t.captAltimeterSettingMB ?? 0)
          : Math.round((t.captAltimeterSettingHG ?? 0) * 100)
        const filenames = [
          ...String(value)
            .split("")
            .map((d) => `${d}.ogg`),
          "set.ogg"
        ]
        await playSoundSequence(filenames)
      }
    }

    break
  }

  if (item.copilot_response) {
    await waitForSoundFinished()
    await playSound(item.copilot_response)
    await waitForSoundFinished()
  }

  setStepStatus(index, "complete")
}

// ─── Public API ───────────────────────────────────────────────────────────────

const BLOCKED_CHECKLISTS = new Set(["before_takeoff_to_the_line", "before_takeoff_below_the_line"])

export async function executeChecklist(checklistId: string): Promise<void> {
  const store = useChecklistStore.getState()

  if (abortController) {
    abortController.abort()
    abortController = null
  }

  const checklist = getChecklistById(checklistId)
  if (!checklist) {
    store.setError(`Checklist "${checklistId}" not found`)
    return
  }

  const cabinTimer = useCabinReadyTimerStore.getState()
  if (cabinTimer.isRunning && BLOCKED_CHECKLISTS.has(checklistId)) {
    playSound("cabin_not_secure.ogg")
    store.setError("Cannot start before takeoff checklist - cabin ready timer is running")
    return
  }

  store.setChecklist(checklist)

  abortController = new AbortController()
  const { signal } = abortController

  try {
    // Standard execution flow
    for (let i = 0; i < checklist.items.length; i++) {
      checkAbort(signal)
      store.setStepIndex(i)
      await executeNormalItem(checklist.items[i], i, signal)
    }

    // Completion sequence
    await waitForSoundFinished()
    await playSound(checklist.completion)
    await waitForSoundFinished()

    store.setExecutionState("completed")
    useVoiceHintProgressStore.getState().recordChecklistCompleted(checklist.id)

    // Trigger timer for specific checklist
    if (checklistId === "before_start_below_the_line") {
      const duration = 5 + Math.random() * 4
      cabinTimer.startTimer(duration)
      console.log(`[CabinReadyTimer] Started with ${duration.toFixed(1)} minutes duration`)
    }
  } catch (err) {
    const message = String(err)
    if (message.includes("aborted")) {
      store.setExecutionState("aborted")
    } else {
      store.setError(message)
    }
  } finally {
    abortController = null
  }
}

export function abortChecklist(): void {
  if (abortController) {
    abortController.abort()
    abortController = null
  }
}
