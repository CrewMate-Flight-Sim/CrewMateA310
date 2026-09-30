import { gsxClient } from "@/API/gsxApi"
import { setLvar } from "@/API/simvarApi"

gsxClient.connect()

export async function setGPU(on: boolean) {
  await setLvar(on ? 1 : 0, "A310_gpu_avail", "GPU")
}

export async function setASU(on: boolean) {
  await setLvar(on ? 1 : 0, "A310_AC_UNIT_STATE", "ASU")
}

export async function disconnectAllGround() {
  await setGPU(false)
  await setASU(false)
}

export async function callPushback() {
  try {
    await gsxClient.triggerService("Departure")
  } catch (error) {
    console.error("[GroundServices] Failed to call GSX pushback:", error)
  }
}
