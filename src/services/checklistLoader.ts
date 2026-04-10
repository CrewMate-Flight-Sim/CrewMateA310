import afterLanding from "@/data/checklists/10_after_landing.json"
import parking from "@/data/checklists/11_parking.json"
import beforeStartP1 from "@/data/checklists/1_before_start_to_the_line.json"
import beforeStartP2 from "@/data/checklists/2_before_start_below_the_line.json"
import afterStart from "@/data/checklists/3_after_start.json"
import beforeTakeoffP1 from "@/data/checklists/4_before_takeoff_to_the_line.json"
import beforeTakeoffP2 from "@/data/checklists/5_before_takeoff_below_the_line.json"
import afterTakeoffP1 from "@/data/checklists/6_climb_to_the_line.json"
import afterTakeoffP2 from "@/data/checklists/7_climb_below_the_line.json"
import approach from "@/data/checklists/8_approach.json"
import landing from "@/data/checklists/9_landing.json"
import type { Checklist } from "@/types/checklist"

export const allChecklists: Checklist[] = [
  beforeStartP1,
  beforeStartP2,
  afterStart,
  beforeTakeoffP1,
  beforeTakeoffP2,
  afterTakeoffP1,
  afterTakeoffP2,
  approach,
  landing,
  afterLanding,
  parking
] as Checklist[]

export function getChecklistById(id: string): Checklist | undefined {
  return allChecklists.find((c) => c.id === id)
}
