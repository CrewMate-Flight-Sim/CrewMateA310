import afterTakeoffP2 from "@/data/flows/10_both_packs.json"
import climbTenThousand from "@/data/flows/11_climb_ten_thousand_flow.json"
import desPrep from "@/data/flows/12_des_prep.json"
import descTenThousand from "@/data/flows/13_desc_ten_thousand_flow.json"
import landing from "@/data/flows/14_landing.json"
import afterLanding from "@/data/flows/15_after_landing.json"
import parking from "@/data/flows/16_shutdown.json"
import prelimCockpitPrep from "@/data/flows/1_prelim_cockpit_prep.json"
import cockpitPrep from "@/data/flows/2_cockpit_prep.json"
import beforeStart from "@/data/flows/3_before_pushback.json"
import afterStart from "@/data/flows/4_after_start.json"
import clearLeft from "@/data/flows/5_clear_left.json"
import afterControlsCheck from "@/data/flows/6_after_flight_controls_check.json"
import beforeTakeoff from "@/data/flows/7_before_takeoff.json"
import takeoff from "@/data/flows/8_takeoff.json"
import afterTakeoffP1 from "@/data/flows/9_thr_red.json"
import { usePerformanceStore } from "@/store/performanceStore"
import type { Flow, FlowStep } from "@/types/flow"

export const allFlows: Flow[] = [
  prelimCockpitPrep,
  cockpitPrep,
  beforeStart,
  afterStart,
  clearLeft,
  afterControlsCheck,
  beforeTakeoff,
  takeoff,
  afterTakeoffP1,
  afterTakeoffP2,
  climbTenThousand,
  desPrep,
  descTenThousand,
  landing,
  afterLanding,
  parking
] as Flow[]

export function getFlowById(id: string): Flow | undefined {
  return allFlows.find((f) => f.id === id)
}

async function getTemplateVars(): Promise<Record<string, string>> {
  const { takeoff, landing } = usePerformanceStore.getState()
  const vars: Record<string, string> = {}

  const flapsMap: Record<string, string> = {
    "1": "1",
    "2": "2",
    "3": "3"
  }
  vars["flaps"] = flapsMap[takeoff.flaps] ?? "1"

  const packsOn = takeoff.packs === "on"
  vars["pack1_cmd"] = packsOn ? "1 (>L:A300_PACK1_BUTTON)" : "0 (>L:A300_PACK1_BUTTON)"
  vars["pack2_cmd"] = packsOn ? "1 (>L:A300_PACK2_BUTTON)" : "0 (>L:A300_PACK2_BUTTON)"
  vars["pack1_expect"] = packsOn ? "1" : "0"
  vars["pack2_expect"] = packsOn ? "1" : "0"

  const antiIce = takeoff.antiIce ?? "off"
  const engAntiIce = antiIce === "oneng" || antiIce === "onengwing"
  const wingAntiIce = antiIce === "onengwing"

  vars["anti_ice_eng1_cmd"] = engAntiIce ? "1 (>L:A310_ENG1_ANTI_ICE)" : "0 (>L:A310_ENG1_ANTI_ICE)"
  vars["anti_ice_eng2_cmd"] = engAntiIce ? "1 (>L:A310_ENG2_ANTI_ICE)" : "0 (>L:A310_ENG2_ANTI_ICE)"
  vars["anti_ice_wing_cmd"] = wingAntiIce ? "1 (>L:A310_WING_ANTI_ICE)" : "0 (>L:A310_WING_ANTI_ICE)"
  vars["anti_ice_eng1_expect"] = engAntiIce ? "1" : "0"
  vars["anti_ice_eng2_expect"] = engAntiIce ? "1" : "0"
  vars["anti_ice_wing_expect"] = wingAntiIce ? "1" : "0"

  const landingApuAutoStart = (landing.apuStart ?? "auto") === "auto"
  vars["landing_apu_master_cmd"] = landingApuAutoStart
    ? "1 (>L:A310_apu_master_switch)"
    : "0 (>L:A310_apu_master_switch)"
  vars["landing_apu_master_expect"] = landingApuAutoStart ? "1" : "0"
  vars["landing_apu_start_cmd"] = landingApuAutoStart ? "1 (>L:A310_apu_start_button)" : "0 (>L:A310_apu_start_button)"
  vars["landing_apu_start_expect"] = landingApuAutoStart ? "1" : "0"

  const landFlapsMap: Record<string, string> = {
    "20/20": "3",
    "30/40": "4"
  }
  vars["landing_flaps"] = landFlapsMap[landing.flaps] ?? "5"

  return vars
}

function resolveString(str: string, vars: Record<string, string>): string {
  return str.replace(/\{(\w+)\}/g, (match, key: string) => vars[key] ?? match)
}

export async function resolveStep(step: FlowStep, vars?: Record<string, string>): Promise<FlowStep> {
  const templateVars = vars ?? (await getTemplateVars())
  const resolvedOnlyIf = step.only_if
    ? {
        ...step.only_if,
        ...("read" in step.only_if
          ? { read: resolveString(step.only_if.read, templateVars) }
          : { option: resolveString(step.only_if.option, templateVars) }),
        one_of: step.only_if.one_of.map((value) =>
          typeof value === "string" ? resolveString(value, templateVars) : value
        )
      }
    : undefined

  return {
    ...step,
    label: resolveString(step.label, templateVars),
    read: resolveString(step.read, templateVars),
    on: resolveString(step.on, templateVars),
    expect: typeof step.expect === "string" ? parseFloat(resolveString(step.expect, templateVars)) || 0 : step.expect,
    only_if: resolvedOnlyIf
  }
}

export async function resolveFlow(flow: Flow): Promise<Flow> {
  const vars = await getTemplateVars()
  return {
    ...flow,
    steps: await Promise.all(flow.steps.map((s) => resolveStep(s, vars)))
  }
}
