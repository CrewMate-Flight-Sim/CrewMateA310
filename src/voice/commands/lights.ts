import { simvarSet } from "@/API/simvarApi"

export async function setLandingLights(position: number) {
  try {
    const expression = `${position} (>L:INI_LIGHTS_LANDING)`
    await simvarSet(expression)
  } catch (error) {
    console.error("Error setting landing lights:", error)
  }
}

export async function setStrobeLights(position: number) {
  try {
    const expression = `${position} (>L:INI_LIGHTS_STROBE)`
    await simvarSet(expression)
  } catch (error) {
    console.error("Error setting strobe lights:", error)
  }
}

export async function setTaxiLights(position: number) {
  try {
    const expression = `${position} (>L:INI_LIGHTS_NOSE)`
    await simvarSet(expression)
  } catch (error) {
    console.error("Error setting taxi lights:", error)
  }
}
