import { simvarGet, simvarSet } from "@/API/simvarApi"
import { playSound } from "@/services/playSounds"

const delay = (ms: number) => new Promise((res) => setTimeout(res, ms))

export async function setIgnKnob(position: number) {
  try {
    const expression = `${position} (>L:A310_eng_ignition_switch)`
    await simvarSet(expression)
  } catch (error) {
    console.error("Error setting ignition knob", error)
  }
}
export async function startEngine2(position: number) {
  try {
    const expression = `${position} (>L:A310_ENG2_STARTER)`
    await simvarSet(expression)
    const isOpen = await simvarGet("(L:A310_STARTER2_OPEN)")
    const n2 = await simvarGet("(L:A310_ENGINE2_N2_DISPLAY)")
    if (isOpen === 1) {
      await delay(800)
      playSound("valve_open.ogg")
    }
    if (n2 !== null && n2 >= 44 && n2 <= 45) {
      await delay(800)
      playSound("valve_closed.ogg")
    }
  } catch (error) {
    console.error("Error starting engine 2:", error)
  }
}

export async function startEngine1(position: number) {
  try {
    const expression = `${position} (>L:A310_ENG1_STARTER)`
    await simvarSet(expression)
    const isOpen = await simvarGet("(L:A310_STARTER1_OPEN)")
    const n2 = await simvarGet("(L:A310_ENGINE1_N2_DISPLAY)")
    if (isOpen === 1) {
      await delay(800)
      playSound("valve_open.ogg")
    }
    if (n2 !== null && n2 >= 44 && n2 <= 45) {
      await delay(800)
      playSound("valve_closed.ogg")
    }
  } catch (error) {
    console.error("Error starting engine 1:", error)
  }
}
