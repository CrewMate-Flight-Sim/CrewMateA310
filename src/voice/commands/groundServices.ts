import { simvarSet } from "@/API/simvarApi"

export async function setGPU(on: boolean) {
  try {
    await simvarSet(`${on ? 1 : 0} (>L:A310_gpu_avail)`)
  } catch (error) {
    console.error("Error setting GPU (LVAR):", error)
  }
}

export async function setASU(on: boolean) {
  try {
    await simvarSet(`${on ? 1 : 0} (>L:A310_AC_UNIT_STATE)`)
  } catch (error) {
    console.error("Error setting ASU (LVAR):", error)
  }
}

export async function disconnectAllGround() {
  try {
    await simvarSet("0 (>L:A310_gpu_avail)")
    await simvarSet("0 (>L:A310_AC_UNIT_STATE)")
  } catch (error) {
    console.error("Error disconnecting all ground services (LVAR):", error)
  }
}
