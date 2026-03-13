# CopilotSpeech — Speech Recognition Engine

CopilotSpeech is the speech recognition sidecar for **CrewMate A350**. It runs as a separate process, handles microphone input, runs Voice Activity Detection (VAD) and Vosk-based speech recognition, and emits recognized commands as JSON to stdout. The main Tauri app reads this stream and dispatches commands accordingly.

---

## Tech Stack

| Component | Technology |
|---|---|
| Speech recognition | [Vosk](https://alphacephei.com/vosk/) (offline, grammar-constrained) |
| Voice activity detection | [Silero VAD](https://github.com/snakers4/silero-vad) via ONNX Runtime |
| Audio input | NAudio (`WaveInEvent`) |
| Runtime | .NET 8, Windows x64 |

---

## Project Structure

```
CopilotSpeech/
├── Program.cs              — Entry point, audio pipeline, VAD, speech processing, normalization
└── Grammar/
    ├── CommandGrammar.cs   — Cockpit command phrases (GetValidCommands)
    ├── FmaGrammar.cs       — Airbus FMA callouts, phase generators, BuildFmaCombos
    └── DigitGrammar.cs     — Digit sequences and compound numeric phrases
```
---

## How It Works

1. Microphone audio is read in 50 ms chunks via NAudio
2. Silero VAD detects speech start/end, buffering frames including a pre-roll to avoid clipping word onsets
3. When speech ends, the buffered PCM is passed to Vosk for recognition
4. Vosk works against a **grammar-constrained vocabulary** — only phrases in `ValidCommands` can be recognized, which improves accuracy and prevents false positives
5. Recognized text is validated, normalized (e.g. `"one zero two three"` → `"1023"`), then emitted as a JSON line on stdout:
   ```json
   { "type": "speech", "text": "gear up", "confidence": 0.7 }
   ```
6. The Tauri app listens on this stream and dispatches the command

---

## Building

Use the build script in the `Scripts/` folder from the **repository root**:

```powershell
.\Scripts\build-sidecar.ps1
```

This will:
- `dotnet publish` the project in Release mode for `win-x64` self-contained
- Copy the resulting `CopilotSpeech.exe` to `src-tauri/bin/` with the correct filename expected by Tauri
- Copy the required native Vosk DLLs from `CopilotSpeech/runtimes/win-x64/native/`
- Copy the Silero VAD model (`silero_vad_v4.onnx`)

> The sidecar must be rebuilt whenever `Program.cs` or any `Grammar/*.cs` file changes, before running `npm run tauri dev` or building a release.

For a quick dev iteration you can also build in Debug mode directly:

```powershell
cd CopilotSpeech
dotnet build -c Debug
```

---

## Grammar — Adding New Commands

**Regular commands** (cockpit actions, checklists, flows): add the phrase string to the `HashSet` in `Grammar/CommandGrammar.cs`.

**FMA callouts** (Airbus FMA mode readbacks): edit `Grammar/FmaGrammar.cs`. The grammar is generated combinatorially — add a new token to the relevant phase generator's token array. For example to add a new VERT mode to the climb phase, add it to the `vertTokens` array in `GetClimbFmaCallouts()`.

**Numeric phrases** (digit sequences, weight/altitude inputs): edit `Grammar/DigitGrammar.cs`.

After editing any grammar file, **rebuild the sidecar** using the script above.

---

## Dependencies

Dependencies are managed via NuGet (see `CopilotSpeech.csproj`):

- `Vosk` 0.3.38
- `NAudio` 2.2.1
- `Microsoft.ML.OnnxRuntime` 1.17.0
- `System.Speech` 8.0.0

The native Vosk runtime DLLs (`libvosk.dll` and MinGW dependencies) must be present alongside the executable at runtime. The build script handles this automatically.
