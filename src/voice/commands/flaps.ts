import { simvarSet } from "@/API/simvarApi"
import { playSound } from "@/services/playSounds"
import { useTelemetryStore } from "@/store/telemetryStore"

const flapSpeedLimits: Record<number, number> = {
  1: 245,
  2: 210,
  3: 195,
  4: 180
}

const keyEventMap: Record<number, string> = {
  0: "FLAPS_UP",
  1: "FLAPS_1",
  2: "FLAPS_2",
  3: "FLAPS_3",
  4: "FLAPS_DOWN"
}

const soundMap: Record<number, string> = {
  0: "slats_ret.ogg",
  1: "flaps_0.ogg",
  2: "flaps_15.ogg",
  3: "flaps_20.ogg",
  4: "flaps_40.ogg"
}

function delay(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms))
}

export async function setFlaps(setting: number, skipAnnouncement = false) {
  try {
    const { telemetry } = useTelemetryStore.getState()
    const currentSpeed = telemetry?.ias ?? 0
    const isOnGround = telemetry?.onGround ?? 0
    const currentFlapIndex = telemetry?.flapsIndex ?? 0
    const speedLimit = flapSpeedLimits[setting]
    const isInitialExtension = currentFlapIndex === 0 && setting === 1
    const isExtendingOrStatic = setting >= currentFlapIndex && setting > 0
    const isTransition3to4 = currentFlapIndex === 3 && setting === 4

    // 1. FO checks if you're too fast
    if (speedLimit && currentSpeed > speedLimit) {
      playSound("check_speed.ogg")
      return
    }

    const keyEvent = keyEventMap[setting]
    if (!keyEvent) {
      return
    }

    const commandExpression = `(>K:${keyEvent})`

    // 2. FO says "Speed Checked" (Extension only, skip 3->4)
    if (!isOnGround && isExtendingOrStatic && !isTransition3to4) {
      if (!skipAnnouncement) {
        playSound("speed_checked.ogg")
        await delay(1000)
      }
    }

    // 3. FO moves the lever
    await simvarSet(commandExpression)

    // 4. FO confirms the selection (e.g., "Slats Extend" or "Flaps 15")
    await delay(5000)
    if (isInitialExtension) {
      playSound("slats_ext.ogg")
    } else {
      const confirmation = soundMap[setting]
      if (confirmation) playSound(confirmation)
    }
  } catch (error) {
    console.error("[Flaps] Error setting flaps:", error)
  }
}
