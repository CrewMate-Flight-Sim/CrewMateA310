import { setLvar } from "@/API/simvarApi"
import { delay } from "@/lib/utils"

export async function setAPUBleed(position: number) {
  await setLvar(position, "A310_apu_bleed", "APU bleed")
}

export async function setStartAPU(position: number) {
  const ok = await setLvar(position, "A310_apu_master_switch", "APU master switch")
  if (!ok) return

  await delay(2000)

  await setLvar(position, "A310_apu_start_button", "APU start button")
}
