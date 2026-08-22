import { simvarSet } from "@/API/simvarApi"
import { delay } from "@/lib/utils"

export async function setAPUBleed(position: number) {
  try {
    const expression = `${position} (>L:A310_apu_bleed)`
    await simvarSet(expression)
  } catch (error) {
    console.error("Error setting APU bleed (LVAR):", error)
  }
}

export async function setStartAPU(position: number) {
  try {
    const expression = `${position} (>L:A310_apu_master_switch)`
    const expression1 = `${position} (>L:A310_apu_start_button)`
    await simvarSet(expression)
    await delay(2000)
    await simvarSet(expression1)
  } catch (error) {
    console.error("Error setting APU (LVAR):", error)
  }
}
