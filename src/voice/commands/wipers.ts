import { simvarSet } from "@/API/simvarApi"
import { playSound } from "@/services/playSounds"
import { useTelemetryStore } from "@/store/telemetryStore"

const wipersSpeedLimit = 230 // knots

export async function setWipers(position: number) {
  try {
    const { telemetry } = useTelemetryStore.getState()
    const currentSpeed = telemetry?.ias ?? 0
    if (position != 0 && currentSpeed > wipersSpeedLimit) {
      playSound("check_speed.ogg")
      return
    }

    const expression1 = `${position} (>L:A310_CPT_WIPER_KNOB)`
    const expression2 = `${position} (>L:A310_FO_WIPER_KNOB)`
    await simvarSet(expression1)
    await simvarSet(expression2)
    playSound("check.ogg")
  } catch (error) {
    console.error("Error setting wipers:", error)
  }
}
