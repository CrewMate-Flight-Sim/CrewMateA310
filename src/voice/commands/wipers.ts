import { setLvar } from "@/API/simvarApi"
import { playSound } from "@/services/playSounds"
import { useTelemetryStore } from "@/store/telemetryStore"

const WIPERS_SPEED_LIMIT = 230 // knots

export async function setWipers(position: number) {
  const { telemetry } = useTelemetryStore.getState()
  const currentSpeed = telemetry?.ias ?? 0
  if (position != 0 && currentSpeed > WIPERS_SPEED_LIMIT) {
    playSound("check_speed.ogg")
    return
  }

  await setLvar(position, "A310_CPT_WIPER_KNOB", "captain wiper")
  await setLvar(position, "A310_FO_WIPER_KNOB", "FO wiper")
  playSound("check.ogg")
}
