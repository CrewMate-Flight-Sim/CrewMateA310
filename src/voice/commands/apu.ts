import { simvarSet } from "@/API/simvarApi"

import { delay } from "../commandDispatch"

export async function setStartAPU(position: number) {
  try {
    const expression = `${position} (>L:A310_apu_master_switch)`
    const expression1 = `${position} (>L:A310_apu_start_button)`
    const expression2 = `${position} (>L:A310_apu_bleed)`
    await simvarSet(expression)

    await delay(2000)

    await simvarSet(expression1)

    await delay(5000)
    await simvarSet(expression2)
  } catch (error) {
    console.error("Error setting APU (LVAR):", error)
  }
}
