# This script uses Azure Cognitive Services for high-quality TTS
# You'll need a free Azure account: https://azure.microsoft.com/free/

# === LOAD .env ===
$envFile = Join-Path $PSScriptRoot ".env"
if (Test-Path $envFile) {
    Get-Content $envFile | ForEach-Object {
        if ($_ -match '^\s*([^#][^=]+?)\s*=\s*(.+)\s*$') {
            [Environment]::SetEnvironmentVariable($Matches[1], $Matches[2], 'Process')
        }
    }
}
else {
    Write-Error ".env file not found at: $envFile (copy .env.example and fill in your values)"
    exit 1
}

# === CONFIGURATION ===
$azureKey = $env:AZURE_TTS_KEY
$azureRegion = $env:AZURE_TTS_REGION
$voiceName = "en-US-JennyNeural"   # Jenny neural voice

# Other voices:
# "en-US-AriaNeural"  - Female, friendly
# "en-US-GuyNeural"   - Male, professional
# "en-US-DavisNeural" - Male, authoritative
# "en-US-JennyNeural"  - Female, clear

$phrases = @{
    "0"                                         = "Zero"
    "1"                                         = "One"
    "100_knots"                                 = "One hundred knots"
    "2"                                         = "Two"
    "3"                                         = "Three"
    "4"                                         = "Four"
    "5"                                         = "Five"
    "6"                                         = "Six"
    "7"                                         = "Seven"
    "8"                                         = "Eight"
    "9"                                         = "Niner"
    "after_start_checklist_completed"           = "After start checklist completed"
    "anti_ice"                                  = "Anti ice"
    "approach_checklist_completed"              = "Approach checklist completed"
    "are_you_sure"                              = "Are you sure?"
    "auto_brake"                                = "Auto brake"
    "before_start_checklist_completed"          = "Before start checklist completed"
    "cabin"                                     = "Cabin"
    "cabin_landing"                             = "Cabin crew, please be seated for landing"
    "cabin_ready"                               = "Cabin is ready"
    "cabin_takeoff"                             = "Cabin crew, please be seated for takeoff"
    "check"                                     = "Check"
    "check_beacon"                              = "Beacon is not on"
    "check_belts"                               = "Seat belt sign is not on"
    "check_flaps"                               = "Check flaps"
    "check_landing_gear"                        = "Check landing gear"
    "check_seatbelts"                           = "Check seatbelts"
    "check_speed"                               = "Check speed"
    "check_spoilers"                            = "Check spoilers"
    "checked"                                   = "Checked"
    "clear_right"                               = "Clear right"
    "confirmed"                                 = "Confirmed"
    "decel"                                     = "Deecel"
    "fire_test"                                 = "A P U Fire test"
    "five_minutes"                              = "Five minutes"
    "five_minutes_not_passed"                   = "Five minutes not passed yet"
    "fl_100"                                    = "Flight level one hundred"
    "flight_controls"                           = "Flight controls"
    "fuel_quantity"                             = "Fuel quantity"
    "fuel_pumps"                                = "Fuel pumps"
    "full_down"                                 = "Full down"
    "full_left"                                 = "Full left"
    "full_right"                                = "Full right"
    "full_up"                                   = "Full up"
    "gear_down"                                 = "Gear down"
    "gear_up"                                   = "Gear up"
    "landing_checklist_completed"               = "Landing checklist completed"
    "minimum"                                   = "Minimum"
    "neutral"                                   = "Neutral"
    "no_reverse_engine_1_and_2"                 = "No reverse engine one and two"
    "no_spoilers"                               = "No spoilers"
    "now_at"                                    = "Now"
    "Ok"                                        = "Ok"
    "one_to_go"                                 = "One thousand to go"
    "packs_one_and_two"                         = "Packs one and two"
    "parking_brake"                             = "Parking brake"
    "parking_checklist_completed"               = "Parking checklist completed"
    "passing_flight_level"                      = "Passing flight level"
    "point"                                     = "Point"
    "positive_climb"                            = "Positive climb"
    "pressure_zero"                             = "Pressure zero"
    "ready"                                     = "Ready"
    "reverse_green"                             = "Reverse green"
    "rotate"                                    = "Rotate"
    "rud_trim"                                  = "Rudder trim"
    "set"                                       = "Set"
    "speed_checked"                             = "Speed checked"
    "spoilers"                                  = "Spoilers"
    "standard_cross_checked"                    = "Standard cross checked"
    "standard_set"                              = "Standard Set"
    "takeoff_config"                            = "Takeoff Config"
    "ten_thousand"                              = "Ten thousand"
    "thousand"                                  = "Thousand"
    "thrust_set"                                = "Thrust set"
    "TOGA"                                      = "Toga"
    "tons"                                      = "Tons"
    "transiton_altitude"                        = "Transition altitude"
    "transiton_level"                           = "Transition level"
    "transponder"                               = "Transponder"
    "v_one"                                     = "V one"
    "walkaround"                                = "I'll perform the walkaround now"
    "walkaround_completed"                      = "Walkaround completed, all good no issues found"
    "wing_lights"                               = "Wing lights"
    # new/changed
    "80_knots"                                  = "Eighty knots"
    "altimeters"                                = "Altimeters"
    "apu"                                       = "A P U"
    "apu_bleed"                                 = "A P U bleed"
    "askid"                                     = "Anti skid"
    "apu_bat"                                   = "A P U and Batteries"
    "secure_checklist_completed"                = "Securing aircraft checklist completed"
    "before_start_to_the_line_completed"        = "Before start checklist to the line completed"
    "before_takeoff_checklist_complete"         = "Before takeoff checklist complete"
    "before_takeoff_completed_to_the_line"      = "Before Takeoff Checklist completed to the line"
    "brakes"                                    = "Brake and anti skid"
    "briefing"                                  = "Briefing"
    "climb_to_the_line_completed"               = "After takeoff climb checklist to the line completed"
    "climb_checklist_completed"                 = "After takeoff climb checklist completed"
    "cockpit_prep"                              = "Cockpit prep"
    "diff_p"                                    = "Differential pressure"
    "ecam_stat"                                 = "E CAM status"
    "engines"                                   = "Engines"
    "gear_neutral"                              = "Gear neutral"
    "gear"                                      = "Landing gear"
    "hand_signal"                               = "Hand signal"
    "ign"                                       = "Ignition"
    "ldg_elev"                                  = "Landing elevation"
    "light_sign"                                = "Lights and signs"
    "go_around_alt_set"                         = "Go around altitude set"
    "navigation"                                = "Navigation"
    "radar"                                     = "Weather Radar"
    "pack_1_on"                                 = "Pack one on"
    "pack_2_on"                                 = "Pack two on"
    "parking_brake_and_chocks"                  = "Parking brake and chocks"
    "performance_fmas"                          = "Performance and F M A's"
    "pitch_trim"                                = "Pitch Trim"
    "signs"                                     = "Signs"
    "slats_ext"                                 = "Slats extended"
    "slats_flaps"                               = "Slats and flaps"
    "slats_retr"                                = "Slats retracted"
    "flaps_0"                                   = "Flaps zero"
    "flaps_15"                                  = "Flaps fifteen"
    "flaps_20"                                  = "Flaps twenty"
    "flaps_40"                                  = "Flaps fourty"
    "valve_open"                                = "Valve open"
    "valve_closed"                              = "Valve closed"
    "after_landing_checklist_completed"         = "After Landing checklist completed"
    "15_0" = "Fifteen zero"
    "15" = "Fifteen"
    "20" = "Twenty"
}
# Derive folder name from voice: "en-US-JennyNeural" -> "Jenny"
$voiceShortName = ($voiceName -replace '^.*-([A-Za-z]+)Neural$', '$1')
if ([string]::IsNullOrWhiteSpace($voiceShortName) -or $voiceShortName -eq $voiceName) {
    $voiceShortName = $voiceName  # fallback to full name
}
$outDir = Join-Path $PSScriptRoot "..\src-tauri\sounds\$voiceShortName"
$outDir = [System.IO.Path]::GetFullPath($outDir)
New-Item -ItemType Directory -Force -Path $outDir | Out-Null

$ffmpegExe = "C:\Users\extra\Downloads\Wwise-Unpacker-master\Tools\ffmpeg.exe"

if (-not (Test-Path $ffmpegExe)) {
    Write-Error "FFmpeg not found at: $ffmpegExe"
    exit 1
}

if ([string]::IsNullOrWhiteSpace($azureKey) -or $azureKey -eq "your_azure_tts_key_here") {
    Write-Error "Please set AZURE_TTS_KEY in PSscripts/.env"
    Write-Host ""
    Write-Host "To get a free Azure key:"
    Write-Host "1. Go to https://azure.microsoft.com/free/"
    Write-Host "2. Create a free account"
    Write-Host "3. Create a Speech Service resource"
    Write-Host "4. Copy the key and region"
    exit 1
}

$count = 0
$total = $phrases.Count

Write-Host "Using Azure TTS with voice: $voiceName"
Write-Host ""

foreach ($file in $phrases.Keys) {
    $count++
    $text = $phrases[$file]
    $mp3Path = "$outDir\$file.mp3"
    $oggPath = "$outDir\$file.ogg"

    Write-Host "[$count/$total] Processing: $file"

    try {
        # Build SSML
        $ssml = @"
<speak version='1.0' xml:lang='en-US'>
    <voice name='$voiceName'>
        <prosody rate='-5%' pitch='+0%'>
            $text
        </prosody>
    </voice>
</speak>
"@

        # Call Azure TTS API
        $headers = @{
            "Ocp-Apim-Subscription-Key" = $azureKey
            "Content-Type"              = "application/ssml+xml"
            "X-Microsoft-OutputFormat"  = "audio-16khz-128kbitrate-mono-mp3"
        }

        $uri = "https://$azureRegion.tts.speech.microsoft.com/cognitiveservices/v1"
        
        $response = Invoke-RestMethod -Uri $uri -Method Post -Headers $headers -Body $ssml -OutFile $mp3Path
        
        # Convert to OGG
        $ffmpegArgs = "-i `"$mp3Path`" -c:a libvorbis -q:a 4 `"$oggPath`" -y"
        $process = Start-Process -FilePath $ffmpegExe -ArgumentList $ffmpegArgs -Wait -NoNewWindow -PassThru
        
        if ($process.ExitCode -eq 0) {
            Remove-Item $mp3Path -ErrorAction SilentlyContinue
        }
    }
    catch {
        Write-Error "Error processing $file : $_"
    }
}

Write-Host ""
Write-Host "✓ Completed! Audio files created in $outDir"