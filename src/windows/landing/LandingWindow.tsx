import { emit } from "@tauri-apps/api/event"
import { getCurrentWindow } from "@tauri-apps/api/window"
import { Info } from "lucide-react"
import { useEffect } from "react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { TooltipProvider, Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip"
import { usePerformanceStore } from "@/store/performanceStore"

const selectCls =
  "w-full h-8 bg-slate-900/50 border border-slate-600 text-white text-xs rounded-md px-2 focus:outline-none focus:ring-2 focus:ring-cyan-500"

export function LandingWindow() {
  const { landing, setLandingData } = usePerformanceStore()

  useEffect(() => {
    getCurrentWindow()
      .show()
      .catch(() => {})
  }, [])

  const handleChange = (name: string, value: string | number) => {
    setLandingData({ [name]: value } as Partial<typeof landing>)
    emit("landing-updated", { ...landing, [name]: value })
  }

  const handleNumberInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    handleChange(e.target.name, Number(e.target.value))
  }

  const handleSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    handleChange(e.target.name, e.target.value)
  }

  const labelRow = "flex items-center gap-1 h-4"

  return (
    <div className="h-screen bg-black text-white p-3 flex flex-col gap-3">
      {/* Flaps + Anti Ice */}

      <div className="grid grid-cols-3 gap-2">
        <div className="space-y-1">
          <div className={labelRow}>
            <Label htmlFor="antiIce" className="text-[10px] font-mono text-cyan-400 uppercase tracking-widest">
              Anti Ice
            </Label>

            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info className="w-3.5 h-3.5 text-slate-400 cursor-help hover:text-cyan-400 transition-colors" />
                </TooltipTrigger>
                <TooltipContent className="text-xs max-w-[200px] bg-slate-800 border-slate-700">
                  Will leave Flaps down on "After Landing" flow if Anti Ice is used
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>

          <select
            id="antiIce"
            name="antiIce"
            value={landing.antiIce}
            onChange={handleSelectChange}
            className={selectCls}
          >
            <option value="off">OFF</option>
            <option value="oneng">ENG</option>
            <option value="onengwing">ENG+WING</option>
          </select>
        </div>

        <div className="space-y-1">
          <div className={labelRow}>
            <Label htmlFor="transitionLevel" className="text-[10px] font-mono text-cyan-400 uppercase tracking-widest">
              TL
            </Label>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info className="w-3.5 h-3.5 text-slate-400 cursor-help hover:text-cyan-400 transition-colors" />
                </TooltipTrigger>
                <TooltipContent className="text-xs max-w-[200px] bg-slate-800 border-slate-700">
                  Transition Level
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          <Input
            type="number"
            id="transitionLevel"
            name="transitionLevel"
            value={landing.transitionLevel ?? ""}
            onChange={handleNumberInput}
            className="h-8 bg-slate-900/50 border-slate-600 text-white text-xs font-mono text-center px-1 focus-visible:ring-cyan-500"
            placeholder="—"
          />
        </div>
        <div className="space-y-1">
          <div className={labelRow}>
            <Label htmlFor="missedAltitude" className="text-[10px] font-mono text-cyan-400 uppercase tracking-widest">
              Missed App (ft)
            </Label>
          </div>
          <Input
            type="number"
            min={1000}
            max={20000}
            id="missedAltitude"
            name="missedAltitude"
            value={landing.missedAltitude}
            onChange={handleNumberInput}
            className="h-8 bg-slate-900/50 border-slate-600 text-white text-xs font-mono text-center px-1 focus-visible:ring-cyan-500"
            placeholder="-"
          />
        </div>
      </div>

      {/* APU + Auto Brake */}
      <div className="grid grid-cols-3 gap-2">
        <div className="space-y-1">
          <div className={labelRow}>
            <Label htmlFor="landingElevation" className="text-[10px] font-mono text-cyan-400 uppercase tracking-widest">
              Landing Elevation
            </Label>
          </div>

          <Input
            type="number"
            id="landingElevation"
            name="landingElevation"
            value={landing.landingElevation ?? ""}
            step={50}
            onChange={handleNumberInput}
            className="h-8 bg-slate-900/50 border-slate-600 text-white text-xs font-mono text-center px-1 focus-visible:ring-cyan-500"
            placeholder="—"
          />
        </div>

        <div className="space-y-1">
          <div className={labelRow}>
            <Label htmlFor="apuStart" className="text-[10px] font-mono text-cyan-400 uppercase tracking-widest">
              APU
            </Label>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info className="w-3.5 h-3.5 text-slate-400 cursor-help hover:text-cyan-400 transition-colors" />
                </TooltipTrigger>
                <TooltipContent className="text-xs max-w-[200px] bg-slate-800 border-slate-700">
                  Will start the APU on "After Landing" flow if set to "Auto"
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>

          <select
            id="apuStart"
            name="apuStart"
            value={landing.apuStart}
            onChange={handleSelectChange}
            className={selectCls}
          >
            <option value="auto">Auto</option>
            <option value="manual">Manual</option>
          </select>
        </div>

        <div className="space-y-1">
          <div className={labelRow}>
            <Label htmlFor="autoBrake" className="text-[10px] font-mono text-cyan-400 uppercase tracking-widest">
              AUTO BRAKE
            </Label>

            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info className="w-3.5 h-3.5 text-slate-400 cursor-help hover:text-cyan-400 transition-colors" />
                </TooltipTrigger>
                <TooltipContent className="text-xs max-w-[200px] bg-slate-800 border-slate-700">
                  Autobrake will be set after ground spoilers are armed
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>

          <select
            id="autoBrake"
            name="autoBrake"
            value={landing.autoBrake}
            onChange={handleSelectChange}
            className={selectCls}
          >
            <option value="off">OFF</option>
            <option value="min">LOW</option>
            <option value="med">MED</option>
            <option value="max">MAX</option>
          </select>
        </div>
      </div>

      <Button
        onClick={() => getCurrentWindow().close()}
        className="w-full h-8 bg-cyan-600 hover:bg-cyan-700 text-white font-semibold text-sm mt-3"
      >
        Ok
      </Button>
    </div>
  )
}
