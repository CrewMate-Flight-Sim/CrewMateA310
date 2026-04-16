import { buildPassingAltitudeSequence } from "@/hooks/useCallouts"
import { abortChecklist, executeChecklist } from "@/services/checklistRunner"
import { executeFlow } from "@/services/flowRunner"
import { playSound, playSoundSequence } from "@/services/playSounds"
import { useGroundEngineerStore } from "@/store/groundEngineerStore"
import { usePassingAltitudeStore } from "@/store/passingAltitudeStore"
import { usePerformanceStore } from "@/store/performanceStore"
import { usePreflightTimerStore } from "@/store/preflightTimerStore"
import { useSettingsStore } from "@/store/settingsStore"
import { useTelemetryStore } from "@/store/telemetryStore"

import { setEngAntiIce, setWingAntiIce } from "./commands/anti_ice"
import { setStartAPU } from "./commands/apu"
import {
  setAirspeedDial,
  setAltitudeDial,
  setAPPR,
  setAutoPilot,
  setFlightDirector,
  setHeadingDial,
  setLOC,
  setLevelOff,
  setSelSpeed,
  setSelAlt,
  syncHeading,
  setHdgSel,
  setNav
} from "./commands/autoPilot"
import { setStdBaro } from "./commands/baro"
import { startEngine1, startEngine2, setIgnKnob } from "./commands/engine"
import { setFlaps } from "./commands/flaps"
import { flightControlsCheck } from "./commands/flight_controls_check"
import { setGearHandle } from "./commands/gear"
import { executeGoAround } from "./commands/goAround"
import { disconnectAllGround, setASU, setGPU } from "./commands/groundServices"
import { setLandingLights, setStrobeLights, setTaxiLights } from "./commands/lights"
import { setSeatBelts } from "./commands/seat_belts"
import { setWipers } from "./commands/wipers"

const delay = (ms: number) => new Promise<void>((r) => setTimeout(r, ms))
const randomDelay = (min: number, max: number) => delay(min + Math.random() * (max - min))

const gePack = () => useSettingsStore.getState().geSoundPack

// Commands that are allowed to fire even while a checklist is running.
export const checklistAbortCommands = new Set(["checklist_cancel"])

// ─── Discrete command map ─────────────────────────────────────────────────────

export const discreteCommandMap: Record<string, () => void | Promise<void>> = {
  // ── Gear ──────────────────────────────────────────────────────────────────
  gear_up: () => setGearHandle(0),
  gear_down: () => setGearHandle(1),

  // ── Flaps ─────────────────────────────────────────────────────────────────
  slats_ret: () => setFlaps(0),
  slats_ext: () => setFlaps(1),
  flaps_15: () => setFlaps(2),
  flaps_20: () => setFlaps(3),
  flaps_40: () => setFlaps(4),
  go_around_flaps: () => executeGoAround(),

  // ── Lights ────────────────────────────────────────────────────────────────
  landing_lights_on: () => {
    playSound("check.ogg")
    setLandingLights(0)
  },
  landing_lights_off: () => {
    playSound("check.ogg")
    setLandingLights(2)
  },
  takeoff_lights_on: () => {
    playSound("check.ogg")
    setTaxiLights(0)
  },
  taxi_lights_on: () => {
    playSound("check.ogg")
    setTaxiLights(1)
  },
  taxi_lights_off: () => {
    playSound("check.ogg")
    setTaxiLights(2)
  },
  strobe_lights_on: () => {
    playSound("check.ogg")
    setStrobeLights(0)
  },
  strobe_lights_auto: () => {
    playSound("check.ogg")
    setStrobeLights(1)
  },
  strobe_lights_off: () => {
    playSound("check.ogg")
    setStrobeLights(2)
  },

  // ── Flight director & bird ────────────────────────────────────────────────
  flight_director_on: () => {
    playSound("check.ogg")
    setFlightDirector(1)
  },
  flight_director_off: () => {
    playSound("check.ogg")
    setFlightDirector(0)
  },
  // ── Autopilot  ──────────────────────────────────────────────
  autopilot_engage: () => {
    playSound("check.ogg")
    setAutoPilot(1)
  },
  autopilot_disconnect: () => setAutoPilot(0),

  // ── FCU knob commands ──────────────────────────────
  pull_heading: () => {
    playSound("check.ogg")
    setHdgSel(1)
  },
  push_heading: () => {
    playSound("check.ogg")
    syncHeading(1)
  },
  manage_nav: () => {
    playSound("check.ogg")
    setNav(1)
  },
  pull_altitude: () => {
    playSound("check.ogg")
    setSelAlt(1)
  },
  pull_speed: () => {
    playSound("check.ogg")
    setSelSpeed(1)
  },
  push_to_level_off: () => {
    playSound("check.ogg")
    setLevelOff(1)
  },
  arm_approach: () => {
    playSound("check.ogg")
    setAPPR(1)
  },
  arm_localizer: () => {
    playSound("check.ogg")
    setLOC(1)
  },

  // ── Baro ──────────────────────────────────────────────────────────────────
  set_standard: () => {
    const t = useTelemetryStore.getState().telemetry
    const passingAlt = usePassingAltitudeStore.getState()

    setStdBaro(1)

    // Only trigger passing altitude callout if:
    // - Airborne
    // - Climbing (VS > 100 fpm)
    // - Not already tracking a passing altitude
    if (t && !t.onGround && t.vs > 100 && !passingAlt.isTracking()) {
      const targetAlt = t.pAlt + t.vs * (9 / 60)

      // Play "standard crosschecked, passing FL XXX" sequence
      const sequence = buildPassingAltitudeSequence(targetAlt)
      playSoundSequence(sequence)

      // Store target for "now" callout detection
      passingAlt.setTarget(targetAlt)
    }
  },

  // ── APU ───────────────────────────────────────────────────────────────────
  apu_start: () => {
    playSound("check.ogg")
    setStartAPU(1)
  },

  // ── Anti-ice ──────────────────────────────────────────────────────────────
  engine_anti_ice_on: () => {
    playSound("check.ogg")
    setEngAntiIce(1)
  },
  engine_anti_ice_off: () => {
    playSound("check.ogg")
    setEngAntiIce(0)
  },
  wing_anti_ice_on: () => {
    playSound("check.ogg")
    setWingAntiIce(1)
  },
  wing_anti_ice_off: () => {
    playSound("check.ogg")
    setWingAntiIce(0)
  },

  // ── Seat belts ────────────────────────────────────────────────────────────
  seat_belts_on: () => {
    playSound("check.ogg")
    setSeatBelts(1)
  },
  seat_belts_off: () => {
    playSound("check.ogg")
    setSeatBelts(0)
  },

  // ── Wipers ────────────────────────────────────────────────────────────────
  wipers_off: () => setWipers(0),
  wipers_slow: () => setWipers(1),
  wipers_fast: () => setWipers(2),

  // ── Brake check ───────────────────────────────────────────────────────────
  brake_check: () => playSound("pressure_zero.ogg"),

  // ── Flight controls ───────────────────────────────────────────────────────
  flight_controls_check: async () => {
    await playSound("ready.ogg")
    await flightControlsCheck()
  },

  // ── Preflight timer ───────────────────────────────────────────────────────
  prepare_aircraft: () => usePreflightTimerStore.getState().start(),

  // ── Engine start ──────────────────────────────────────────────────────────
  engine_start_2: async () => {
    await playSound("check.ogg")
    const startAB = Math.random() < 0.5 ? 0 : 1
    await setIgnKnob(startAB)
    await new Promise((resolve) => setTimeout(resolve, 2000))
    await startEngine2(1)
  },
  engine_start_1: async () => {
    await playSound("check.ogg")
    await startEngine1(1)
  },

  // ── Flows ─────────────────────────────────────────────────────────────────
  clear_left: () => executeFlow("clear_left"),
  runway_entry_procedure: () => executeFlow("before_takeoff"),
  clear_for_takeoff: () => executeFlow("takeoff"),
  before_pushback_procedure: () => executeFlow("before_pushback"),

  // ── Checklists ────────────────────────────────────────────────────────────
  checklist_before_startP1: () => executeChecklist("before_start_to_the_line"),
  checklist_before_startP2: () => executeChecklist("before_start_below_the_line"),
  checklist_after_start: () => executeChecklist("after_start"),
  checklist_before_takeoffP1: () => executeChecklist("before_takeoff_to_the_line"),
  checklist_before_takeoffP2: () => executeChecklist("before_takeoff_below_the_line"),
  checklist_after_takeoffP1: () => executeChecklist("climb_to_the_line"),
  checklist_after_takeoffP2: () => executeChecklist("climb_below_the_line"),
  checklist_after_landing: () => executeChecklist("after_landing"),
  checklist_apporach: () => executeChecklist("approach"),
  checklist_landing: () => executeChecklist("landing"),
  checklist_parking: () => executeChecklist("parking"),
  checklist_cancel: () => abortChecklist(),

  // ── RTO / Continue  ─────────────────────────────────────
  //abort_takeoff: () => playSound("check.ogg"),
  continue: () => playSound("check.ogg"),

  // ── Ground engineer ───────────────────────────────────────────────────────
  ground_call: async () => {
    await randomDelay(2000, 6000)
    await playSound("go_ahead.ogg", { pack: gePack() })
    useGroundEngineerStore.getState().activate()
  },
  connect_gpu: async () => {
    if (!useGroundEngineerStore.getState().isActive) return
    useGroundEngineerStore.getState().deactivate()
    await randomDelay(3000, 8000)
    await setGPU(true)
    await playSound("gpu_on.ogg", { pack: gePack() })
  },
  disconnect_gpu: async () => {
    if (!useGroundEngineerStore.getState().isActive) return
    useGroundEngineerStore.getState().deactivate()
    await randomDelay(3000, 8000)
    await setGPU(false)
    await playSound("gpu_off.ogg", { pack: gePack() })
  },
  connect_asu: async () => {
    if (!useGroundEngineerStore.getState().isActive) return
    useGroundEngineerStore.getState().deactivate()
    await randomDelay(3000, 8000)
    await setASU(true)
    await playSound("asu_on.ogg", { pack: gePack() })
  },
  disconnect_asu: async () => {
    if (!useGroundEngineerStore.getState().isActive) return
    useGroundEngineerStore.getState().deactivate()
    await randomDelay(3000, 8000)
    await setASU(false)
    await playSound("asu_off.ogg", { pack: gePack() })
  },
  disconnect_all_ground: async () => {
    if (!useGroundEngineerStore.getState().isActive) return
    useGroundEngineerStore.getState().deactivate()
    await randomDelay(5000, 12000)
    await disconnectAllGround()
    await playSound("gpu_off.ogg", { pack: gePack() })
  }
}

// ─── FO command dispatcher (heading, altitude, speed, fma) ────────

export async function dispatchFoCommand(commandType: string, payload: Record<string, unknown>): Promise<boolean> {
  const verb = (payload.verb as string | undefined) ?? "set"
  const isPull = verb === "pull"

  switch (commandType) {
    case "discrete": {
      const cmd = payload.command as string | undefined
      if (!cmd) return false
      const handler = discreteCommandMap[cmd]
      if (handler) await handler()
      return true
    }

    case "heading": {
      const value = payload.value as number
      if (isPull) {
        setHdgSel(1)
        await delay(500)
      }
      setHeadingDial(value)
      return true
    }

    case "altitude": {
      playSound("check.ogg")
      const feet = payload.flightLevel != null ? (payload.flightLevel as number) * 100 : (payload.value as number)
      if (isPull) {
        setSelAlt(1)
        await delay(500)
      }
      setAltitudeDial(feet)
      return true
    }

    case "speed": {
      const value = payload.value as number
      if (isPull) {
        setSelSpeed(1)
        await delay(500)
      }
      setAirspeedDial(value)
      return true
    }

    case "fma_callout": {
      playSound("check.ogg")
      return true
    }

    case "missed_approach_altitude": {
      if ((payload.mode as string) === "auto") {
        const alt = usePerformanceStore.getState().landing?.["missedAltitude"]
        if (alt != null) {
          playSound("go_around_alt_set.ogg")
          setAltitudeDial(alt)
        }
      } else if (payload.value != null) {
        playSound("go_around_alt_set.ogg")
        setAltitudeDial(payload.value as number)
      }
      return true
    }

    default:
      return false
  }
}
