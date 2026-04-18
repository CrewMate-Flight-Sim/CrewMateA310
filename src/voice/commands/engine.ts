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

async function monitorEngineStart(engineNum: number) {
  const isOpenVar = `(L:A310_STARTER${engineNum}_OPEN)`

  // PHASE 1: Wait for Valve to Open
  for (let i = 0; i < 600; i++) {
    const isOpen = await simvarGet(isOpenVar)

    if (isOpen !== null && isOpen > 0.5) {
      await delay(800)
      playSound("valve_open.ogg")
      break // Move to Phase 2
    }
    await delay(100)
  }

  // PHASE 2: Wait for Valve to Close (LVAR returns to 0)
  // We add a small delay so it doesn't immediately "detect" the 0 from Phase 1
  await delay(1000)

  for (let i = 0; i < 600; i++) {
    const isClosed = await simvarGet(isOpenVar)

    // Check for 0 (or less than 0.1 to be safe from float noise)
    if (isClosed !== null && isClosed < 0.1) {
      await delay(800)
      playSound("valve_closed.ogg")
      break // Exit loop, we're done
    }
    await delay(100)
  }
}

export async function startEngine2(position: number) {
  try {
    const expression = `${position} (>L:A310_ENG2_STARTER)`
    await simvarSet(expression)

    // Start the "Watcher" in the background
    if (position === 1) {
      monitorEngineStart(2)
    }
  } catch (error) {
    console.error("Error starting engine 2:", error)
  }
}

export async function startEngine1(position: number) {
  try {
    const expression = `${position} (>L:A310_ENG1_STARTER)`
    await simvarSet(expression)

    // Start the "Watcher" in the background
    if (position === 1) {
      monitorEngineStart(1)
    }
  } catch (error) {
    console.error("Error starting engine 1:", error)
  }
}
