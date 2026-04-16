import { simvarSet } from "@/API/simvarApi"

export async function setStartAPU(position: number) {
  try {
    const expression = `${position} (>L:A310_apu_master_switch)`
    const expression1 = `${position} (>L:A310_apu_start_button)`
    const expression2 = `${position} (>L:A310_apu_bleed)`
    await simvarSet(expression)

    await new Promise((resolve) => setTimeout(resolve, 2000)) // 2 seconds

    await simvarSet(expression1)

    await new Promise((resolve) => setTimeout(resolve, 45000)) // 45 seconds
    await simvarSet(expression2)
  } catch (error) {
    console.error("Error setting APU (LVAR):", error)
  }
}
