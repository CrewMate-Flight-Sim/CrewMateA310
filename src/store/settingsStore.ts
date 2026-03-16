import { invoke } from "@tauri-apps/api/core"
import { emit, listen } from "@tauri-apps/api/event"
import { create } from "zustand"
import { persist } from "zustand/middleware"

export type LightsControlMode = "virtual" | "user"

const defaultLightsControlMode: LightsControlMode = "virtual"

interface SettingsStore {
  voiceEnabled: boolean
  voiceMode: "continuous" | "ptt"
  pttShortcut: string
  soundPack: string
  soundVolume: number
  micGain: number
  lightsControlMode: LightsControlMode
  setVoiceEnabled: (enabled: boolean) => void
  setVoiceMode: (mode: "continuous" | "ptt") => void
  setPttShortcut: (shortcut: string) => void
  setSoundPack: (pack: string) => void
  setSoundVolume: (volume: number) => void
  setMicGain: (gain: number) => void
  setLightsControlMode: (mode: LightsControlMode) => void
}

let isUpdatingFromEvent = false

export const useSettingsStore = create<SettingsStore>()(
  persist(
    (set) => ({
      voiceEnabled: false,
      voiceMode: "continuous",
      pttShortcut: "CmdOrCtrl+Shift+Space",
      soundPack: "Jenny",
      soundVolume: 100,
      micGain: 180,
      lightsControlMode: defaultLightsControlMode,

      setVoiceEnabled: (enabled) => {
        set({ voiceEnabled: enabled })
        if (!isUpdatingFromEvent) {
          emit("settings-changed", { voiceEnabled: enabled })
        }
      },
      setVoiceMode: (mode) => {
        set({ voiceMode: mode })
        if (!isUpdatingFromEvent) {
          emit("settings-changed", { voiceMode: mode })
        }
      },
      setPttShortcut: (shortcut) => {
        set({ pttShortcut: shortcut })
        if (!isUpdatingFromEvent) {
          emit("settings-changed", { pttShortcut: shortcut })
        }
      },
      setSoundPack: (pack) => {
        set({ soundPack: pack })
        if (!isUpdatingFromEvent) {
          emit("settings-changed", { soundPack: pack })
        }
      },
      setSoundVolume: (volume) => {
        set({ soundVolume: volume })
        if (!isUpdatingFromEvent) {
          emit("settings-changed", { soundVolume: volume })
        }
      },
      setMicGain: (gain) => {
        set({ micGain: gain })
        invoke("set_mic_gain", { gain: gain / 100 }).catch(() => {})
        if (!isUpdatingFromEvent) {
          emit("settings-changed", { micGain: gain })
        }
      },
      setLightsControlMode: (mode) => {
        set({ lightsControlMode: mode })
        if (!isUpdatingFromEvent) {
          emit("settings-changed", { lightsControlMode: mode })
        }
      }
    }),
    {
      name: "voice-settings",
      onRehydrateStorage: () => (state) => {
        if (state?.micGain) {
          invoke("set_mic_gain", { gain: state.micGain / 100 }).catch(() => {})
        }
      }
    }
  )
)

listen<
  Partial<
    Omit<
      SettingsStore,
      | "setVoiceEnabled"
      | "setVoiceMode"
      | "setPttShortcut"
      | "setSoundPack"
      | "setSoundVolume"
      | "setMicGain"
      | "setLightsControlMode"
    >
  >
>("settings-changed", (event) => {
  isUpdatingFromEvent = true

  if (event.payload.voiceEnabled !== undefined) {
    useSettingsStore.setState({ voiceEnabled: event.payload.voiceEnabled })
  }
  if (event.payload.voiceMode !== undefined) {
    useSettingsStore.setState({ voiceMode: event.payload.voiceMode })
  }
  if (event.payload.pttShortcut !== undefined) {
    useSettingsStore.setState({ pttShortcut: event.payload.pttShortcut })
  }
  if (event.payload.soundPack !== undefined) {
    useSettingsStore.setState({ soundPack: event.payload.soundPack })
  }
  if (event.payload.soundVolume !== undefined) {
    useSettingsStore.setState({ soundVolume: event.payload.soundVolume })
  }
  if (event.payload.micGain !== undefined) {
    useSettingsStore.setState({ micGain: event.payload.micGain })
  }
  if (event.payload.lightsControlMode !== undefined) {
    useSettingsStore.setState({ lightsControlMode: event.payload.lightsControlMode })
  }

  isUpdatingFromEvent = false
})
