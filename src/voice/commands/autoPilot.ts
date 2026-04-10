import { simvarSet } from "@/API/simvarApi"
import { playSound } from "@/services/playSounds"

// Autopilot commands
export async function setAutoPilot(position: number) {
  try {
    const expression = `${position} (>L:A310_AP1_BUTTON)`
    await simvarSet(expression)
  } catch (error) {
    console.error("Error setting autopilot (LVAR):", error)
  }
}

export async function setLevelOff(position: number) {
  try {
    const expression = `${position} (>L:AP1_BUTTON)`
    await simvarSet(expression)
  } catch (error) {
    console.error("Error leveling off (LVAR):", error)
  }
}

export async function setLOC(position: number) {
  try {
    const expression = `${position} (>L:AP6_BUTTON)`
    await simvarSet(expression)
  } catch (error) {
    console.error("Error setting localizer (LVAR):", error)
  }
}

export async function setAPPR(position: number) {
  try {
    const expression = `${position} (>L:AP7_BUTTON)`
    await simvarSet(expression)
  } catch (error) {
    console.error("Error setting approach (LVAR):", error)
  }
}

// Flight director commands
export async function setFlightDirector(position: number) {
  try {
    const expression1 = `${position} (>L:A310_FDIR_SWITCH_CAPT)`
    const expression2 = `${position} (>L:A310_FDIR_SWITCH_FO)`
    await simvarSet(expression1)
    await simvarSet(expression2)
  } catch (error) {
    console.error("Error setting flight director:", error)
  }
}

// Speed commands
export async function setAirspeedDial(knots: number) {
  if (knots < 50 || knots > 400) return
  try {
    await simvarSet(`${knots} (>L:A310_Airspeed_Dial)`)
    playSound("check.ogg")
  } catch (error) {
    console.error("Error setting airspeed dial:", error)
  }
}
export async function setSelSpeed(position: number) {
  try {
    const expression = `${position} (>L:A310_FCU_SELECTED_SPEED_BUTTON)`
    await simvarSet(expression)
  } catch (error) {
    console.error("Error selecting manual speed:", error)
  }
}
// Heading commands
export async function setHeadingDial(degrees: number) {
  if (degrees < 0 || degrees > 360) return
  try {
    await simvarSet(`${degrees} (>L:A310_HEADING_DIAL)`)
    playSound("check.ogg")
  } catch (error) {
    console.error("Error setting heading dial:", error)
  }
}
export async function syncHeading(position: number) {
  try {
    const expression = `${position} (>L:A310_FCU_SYNC_HEADING_BUTTON)`
    await simvarSet(expression)
  } catch (error) {
    console.error("Error syncing heading:", error)
  }
}
export async function setHdgSel(position: number) {
  try {
    const expression = `${position} (>L:A310_FCU_SELECTED_HEADING_BUTTON)`
    await simvarSet(expression)
  } catch (error) {
    console.error("Error syncing heading:", error)
  }
}
export async function setNav(position: number) {
  try {
    const expression = `${position} (>L:A310_FCU_MANAGED_HEADING_BUTTON)`
    await simvarSet(expression)
  } catch (error) {
    console.error("Error selecting managed heading:", error)
  }
}

// Altitude commands
export async function setAltitudeDial(feet: number) {
  if (feet < 100 || feet > 49000) return
  try {
    await simvarSet(`${feet} (>L:A310_Altitude_Dial)`)
  } catch (error) {
    console.error("Error setting altitude dial:", error)
  }
}
export async function setSelAlt(position: number) {
  try {
    const expression = `${position} (>L:A310_FCU_ALTITUDE_PULL_COMMAND)`
    await simvarSet(expression)
  } catch (error) {
    console.error("Error selecting manual altitude:", error)
  }
}
