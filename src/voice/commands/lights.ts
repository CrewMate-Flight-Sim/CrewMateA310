import { simvarSet } from "@/API/simvarApi"

export async function setLandingLights(position: number) {
  try {
    const expression1 = `${position} (>L:A310_LANDING_LIGHT_L_SWITCH)`
    const expression2 = `${position} (>L:A310_LANDING_LIGHT_R_SWITCH)`
    await simvarSet(expression2)
    await simvarSet(expression1)
  } catch (error) {
    console.error("Error setting landing lights:", error)
  }
}

export async function setStrobeLights(position: number) {
  try {
    const expression = `${position} (>L:A310_POTENTIOMETER_24)`
    await simvarSet(expression)
  } catch (error) {
    console.error("Error setting strobe lights:", error)
  }
}

export async function setTaxiLights(position: number) {
  try {
    const expression = `${position} (>L:A310_TAXI_LIGHTS_SWITCH)`
    await simvarSet(expression)
  } catch (error) {
    console.error("Error setting taxi lights:", error)
  }
}
