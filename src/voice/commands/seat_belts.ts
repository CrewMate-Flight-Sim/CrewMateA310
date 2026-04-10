import { simvarSet } from "@/API/simvarApi"

export async function setSeatBelts(position: number) {
  try {
    const expression = `${position} (>L:A310_SEATBELTS_SWITCH)`
    await simvarSet(expression)
  } catch (error) {
    console.error("Error setting seat belts:", error)
  }
}
