import { emit } from "@tauri-apps/api/event"
import { getCurrentWindow } from "@tauri-apps/api/window"
import { useEffect } from "react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { usePerformanceStore } from "@/store/performanceStore"

const selectCls =
  "w-full h-8 bg-slate-900/50 border border-slate-600 text-white text-xs rounded-md px-2 focus:outline-none focus:ring-2 focus:ring-cyan-500"

export function TakeoffWindow() {
  const { takeoff, setTakeoffData } = usePerformanceStore()

  useEffect(() => {
    getCurrentWindow()
      .show()
      .catch(() => {})
  }, [])

  const handleChange = (name: string, value: string | number) => {
    setTakeoffData({ [name]: value } as Partial<typeof takeoff>)
    emit("takeoff-updated", { ...takeoff, [name]: value })
  }

  const handleNumberInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    handleChange(e.target.name, Number(e.target.value))
  }

  const handleSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    handleChange(e.target.name, e.target.value)
  }

  return (
    <div className="h-screen bg-black text-white p-3 flex flex-col gap-3">
      {/*  V Speeds */}
      <div className="grid grid-cols-3 gap-2">
        {(["v1", "vr", "v2"] as const).map((speed) => (
          <div key={speed} className="space-y-1">
            <Label htmlFor={speed} className="text-[10px] font-mono text-cyan-400 uppercase tracking-widest">
              {speed.toUpperCase()}
            </Label>
            <Input
              type="number"
              id={speed}
              name={speed}
              min={100}
              max={200}
              value={takeoff[speed] ?? ""}
              onChange={handleNumberInput}
              className="h-8 bg-slate-900/50 border-slate-600 text-white text-xs font-mono text-center px-1 focus-visible:ring-cyan-500"
              placeholder="—"
            />
          </div>
        ))}
      </div>

      {/* Thrust + Packs + Anti Ice */}
      <div className="grid grid-cols-3 gap-2">
        <div className="space-y-1">
          <Label htmlFor="thrustSetting" className="text-[10px] font-mono text-cyan-400 uppercase tracking-widest">
            Thrust
          </Label>
          <select
            id="thrustSetting"
            name="thrustSetting"
            value={takeoff.thrustSetting}
            onChange={handleSelectChange}
            className={selectCls}
          >
            <option value="toga">TOGA</option>
            <option value="flex">FLEX</option>
          </select>
        </div>

        <div className="space-y-1">
          <Label htmlFor="packs" className="text-[10px] font-mono text-cyan-400 uppercase tracking-widest">
            Packs
          </Label>
          <select id="packs" name="packs" value={takeoff.packs} onChange={handleSelectChange} className={selectCls}>
            <option value="on">ON</option>
            <option value="off">OFF</option>
            <option value="apu">APU PACK</option>
          </select>
        </div>

        <div className="space-y-1">
          <Label htmlFor="antiIce" className="text-[10px] font-mono text-cyan-400 uppercase tracking-widest">
            Anti Ice
          </Label>
          <select
            id="antiIce"
            name="antiIce"
            value={takeoff.antiIce}
            onChange={handleSelectChange}
            className={selectCls}
          >
            <option value="off">OFF</option>
            <option value="oneng">ENG</option>
            <option value="onengwing">ENG+WING</option>
          </select>
        </div>
      </div>

      <Button
        onClick={() => getCurrentWindow().close()}
        className="w-full h-8 bg-cyan-600 hover:bg-cyan-700 text-white font-semibold text-sm mt-auto"
      >
        Ok
      </Button>
    </div>
  )
}
