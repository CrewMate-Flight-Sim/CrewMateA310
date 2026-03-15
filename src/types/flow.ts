export interface FlowStep {
  label: string
  read: string
  on: string
  expect: number | string
  hold_ms?: number
  wait_ms?: number
  skip_verify?: boolean
  sound?: string
  sound_on_execute?: string
  only_if?: { read: string; one_of: number[] }
}

export interface Flow {
  id: string
  name: string
  steps: FlowStep[]
  sound_start?: string
  sound_end?: string
}

export type StepStatus = "pending" | "executing" | "verifying" | "done" | "skipped" | "failed"

export type FlowExecutionState = "idle" | "running" | "completed" | "error" | "aborted"
