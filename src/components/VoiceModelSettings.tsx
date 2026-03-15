import { invoke } from "@tauri-apps/api/core"
import { listen } from "@tauri-apps/api/event"
import { Download, Trash2, Loader2, Mic, CheckCircle2 } from "lucide-react"
import { useState, useEffect } from "react"

import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"

interface VoskModelInfo {
  id: string
  name: string
  description: string
  size_mb: number
  url: string
  filename: string
  is_downloaded: boolean
  is_downloading: boolean
  partial_size: number
  languages: string[]
}

interface DownloadProgress {
  model_id: string
  downloaded: number
  total: number
  percentage: number
}

export function VoiceModelSettings() {
  const [models, setModels] = useState<VoskModelInfo[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedModel, setSelectedModel] = useState<string>("")
  const [downloadProgress, setDownloadProgress] = useState<Map<string, DownloadProgress>>(new Map())

  const loadModels = async () => {
    setLoading(true)
    try {
      const [availableModels, selected] = await Promise.all([
        invoke<VoskModelInfo[]>("get_vosk_models"),
        invoke<string | null>("get_selected_vosk_model")
      ])
      setModels(availableModels)
      setSelectedModel(selected ?? "")
    } catch (error) {
      console.error("Failed to load models:", error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadModels()

    const unlisten = listen<DownloadProgress>("vosk-model-download-progress", (event) => {
      setDownloadProgress((prev) => new Map(prev).set(event.payload.model_id, event.payload))
    })

    const unlistenComplete = listen<string>("vosk-model-download-complete", () => {
      loadModels()
      setDownloadProgress(new Map())
    })

    return () => {
      unlisten.then((fn) => fn())
      unlistenComplete.then((fn) => fn())
    }
  }, [])

  const handleDownload = async (modelId: string) => {
    setModels((prev) => prev.map((m) => (m.id === modelId ? { ...m, is_downloading: true } : m)))
    try {
      await invoke("download_vosk_model", { modelId })
    } catch (error) {
      console.error("Failed to download model:", error)
      loadModels()
    }
  }

  const handleDelete = async (modelId: string) => {
    try {
      await invoke("delete_vosk_model", { modelId })
      if (selectedModel === modelId) setSelectedModel("")
      await loadModels()
    } catch (error) {
      console.error("Failed to delete model:", error)
    }
  }

  const handleSelectModel = async (modelId: string) => {
    try {
      await invoke("set_selected_vosk_model", { modelId })
      setSelectedModel(modelId)
    } catch (error) {
      console.error("Failed to select model:", error)
    }
  }

  const downloadedModels = models.filter((m) => m.is_downloaded)
  const notDownloadedModels = models.filter((m) => !m.is_downloaded)

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 pt-1">
        <Mic className="h-3 w-3 text-cyan-400 shrink-0" />
        <span className="text-[10px] font-mono text-cyan-400 uppercase tracking-widest">Voice Recognition</span>
        <div className="flex-1 h-px bg-slate-700/60" />
      </div>

      {loading ? (
        <div className="grid grid-cols-[120px_1fr] items-center gap-3">
          <Label className="text-sm text-slate-300">Installed</Label>
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <Loader2 className="h-3 w-3 animate-spin" />
            <span>Loading…</span>
          </div>
        </div>
      ) : (
        downloadedModels.length > 0 && (
          <div className="grid grid-cols-[120px_1fr] items-start gap-3">
            <Label className="text-sm text-slate-300 pt-1">Installed</Label>
            <div className="space-y-1">
              {downloadedModels.map((model) => {
                const isActive = model.id === selectedModel

                return (
                  <div
                    key={model.id}
                    onClick={() => handleSelectModel(model.id)}
                    className={cn(
                      "flex items-center justify-between rounded-md px-2 py-1.5 border transition-colors cursor-pointer",
                      isActive
                        ? "border-cyan-700/60 bg-cyan-950/30"
                        : "border-slate-700/40 bg-slate-900/30 hover:border-slate-600/60"
                    )}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      {isActive ? (
                        <CheckCircle2 className="h-3 w-3 text-cyan-400 shrink-0" />
                      ) : (
                        <div className="h-3 w-3 rounded-full border border-slate-600 shrink-0" />
                      )}
                      <span className={cn("text-xs truncate", isActive ? "text-white" : "text-slate-300")}>
                        {model.name}
                      </span>
                      <span className="text-[10px] font-mono text-slate-500 shrink-0">{model.size_mb} MB</span>
                    </div>

                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(model.id)}
                      className="h-6 w-6 p-0 text-slate-600 hover:text-red-400 hover:bg-red-950/30 shrink-0"
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                )
              })}
            </div>
          </div>
        )
      )}

      {!loading && notDownloadedModels.length > 0 && (
        <div className="grid grid-cols-[120px_1fr] items-start gap-3">
          <Label className="text-sm text-slate-300 pt-1">Available</Label>
          <div className="space-y-1.5">
            {notDownloadedModels.map((model) => {
              const progress = downloadProgress.get(model.id)
              const isDownloading = model.is_downloading || !!progress

              return (
                <div
                  key={model.id}
                  className="rounded-md border border-slate-700/40 bg-slate-900/30 px-2 py-1.5 space-y-1.5"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-slate-200 truncate">{model.name}</span>
                        <span className="text-[10px] font-mono text-slate-500 shrink-0">{model.size_mb} MB</span>
                      </div>
                      <div className="text-[10px] text-slate-500 mt-0.5">{model.languages.join(", ")}</div>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => handleDownload(model.id)}
                      disabled={isDownloading}
                      className="h-6 px-2 text-[10px] gap-1 shrink-0 bg-slate-800 border border-slate-600 hover:bg-cyan-900/40 hover:border-cyan-600 text-slate-300 hover:text-cyan-300 disabled:opacity-60"
                    >
                      {isDownloading ? (
                        <>
                          <Loader2 className="h-2.5 w-2.5 animate-spin" />
                          {progress ? `${progress.percentage.toFixed(0)}%` : "Starting…"}
                        </>
                      ) : (
                        <Download className="h-2.5 w-2.5" />
                      )}
                    </Button>
                  </div>

                  {progress && (
                    <div className="space-y-1">
                      <div className="w-full h-0.5 bg-slate-800 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-cyan-500 rounded-full transition-all duration-300"
                          style={{ width: `${progress.percentage}%` }}
                        />
                      </div>
                      <div className="flex justify-between text-[10px] font-mono text-slate-500">
                        <span>{(progress.downloaded / 1024 / 1024).toFixed(1)} MB</span>
                        <span className="text-cyan-500">{progress.percentage.toFixed(0)}%</span>
                        <span>{(progress.total / 1024 / 1024).toFixed(1)} MB</span>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
