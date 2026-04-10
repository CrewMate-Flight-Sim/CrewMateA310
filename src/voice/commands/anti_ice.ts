import { simvarSet } from "@/API/simvarApi"

export async function setEngAntiIce(position: number) {
  try {
    const expression1 = `${position} (>L:A310_ENG1_ANTI_ICE)`
    const expression2 = `${position} (>L:A310_ENG2_ANTI_ICE)`
    await simvarSet(expression1)
    await simvarSet(expression2)
  } catch (error) {
    console.error("Error setting engine anti-ice:", error)
  }
}

export async function setWingAntiIce(position: number) {
  try {
    const expression = `${position} (>L:A310_WING_ANTI_ICE)`
    await simvarSet(expression)
  } catch (error) {
    console.error("Error setting wing anti ice:", error)
  }
}
