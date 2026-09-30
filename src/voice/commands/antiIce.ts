import { setLvar } from "@/API/simvarApi"

export async function setEngAntiIce(position: number) {
  await setLvar(position, "A310_ENG1_ANTI_ICE", "engine 1 anti-ice")
  await setLvar(position, "A310_ENG2_ANTI_ICE", "engine 2 anti-ice")
}

export async function setWingAntiIce(position: number) {
  await setLvar(position, "A310_WING_ANTI_ICE", "wing anti-ice")
}
