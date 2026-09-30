import { setLvar } from "@/API/simvarApi"

export async function setLandingLights(position: number) {
  await setLvar(position, "A310_LANDING_LIGHT_R_SWITCH", "right landing light")
  await setLvar(position, "A310_LANDING_LIGHT_L_SWITCH", "left landing light")
}

export async function setStrobeLights(position: number) {
  await setLvar(position, "A310_POTENTIOMETER_24", "strobe lights")
}

export async function setTaxiLights(position: number) {
  await setLvar(position, "A310_TAXI_LIGHTS_SWITCH", "taxi lights")
}
