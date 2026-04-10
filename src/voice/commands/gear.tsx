import { simvarSet } from "@/API/simvarApi"
import { playSound } from "@/services/playSounds"
import { useTelemetryStore } from "@/store/telemetryStore"

const gearLowerSpeedLimit = 270 // knots

export async function setGearHandle(position: number) {
  try {
    const { telemetry } = useTelemetryStore.getState()
    const currentSpeed = telemetry?.ias ?? 0

    if (position === 1 && currentSpeed > gearLowerSpeedLimit) {
      playSound("check_speed.ogg")
      return
    }

    const eventName = position === 1 ? "GEAR_DOWN" : "GEAR_UP"
    const commandExpression = `(>K:${eventName})`

    if (position === 1) {
      await simvarSet(commandExpression)
      playSound("gear_down.ogg")
    } else {
      await simvarSet(commandExpression)
      playSound("gear_up.ogg")
      setTimeout(() => {
        simvarSet("1 (>L:A310_GEAR_HANDLE_STATUS)")
        setTimeout(() => {
          playSound("gear_neutral.ogg")
        }, 2000)
      }, 15000)
    }
  } catch (error) {
    console.error("Error sending gear key event:", error)
  }
}
