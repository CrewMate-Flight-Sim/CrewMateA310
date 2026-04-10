import { simvarSet } from "@/API/simvarApi"

export async function setStartAPU(position: number) {
  try {
    const expression = `${position} (>L:A310_apu_master_switch)`
    const expression1 = `${position} (>L:A310_apu_start_button)`

    await simvarSet(expression)

    await new Promise((resolve) => setTimeout(resolve, 2000)) // 2 seconds

    await simvarSet(expression1)
  } catch (error) {
    console.error("Error setting APU (LVAR):", error)
  }
}
