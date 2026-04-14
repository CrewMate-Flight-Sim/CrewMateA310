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
    "80_knots"                                  = "Eighty knots"
    "8"                                         = "Eight"
    "9"                                         = "Niner"
    "after_start_checklist_completed"           = "After start checklist completed"
    "altimeters"                                = "Altimeters"
    "anti_ice"                                  = "Anti ice"
    "approach_checklist_completed"              = "Approach checklist completed"
    "apu"                                       = "A P U"
    "apu_bleed"                                 = "A P U bleed"
    "are_you_sure"                              = "Are you sure?"
    "askid"                                     = "Anti skid"
    "auto_brake"                                = "Auto brake"
    "batteries"                                 = "Batteries"
    "before_start_checklist_completed"          = "Before start checklist completed"
    "before_start_to_the_line_completed"        = "Before start checklist to the line completed"
    "before_takeoff_checklist_complete"         = "Before takeoff checklist complete"
    "before_takeoff_completed_to_the_line"      = "Before Takeoff Checklist completed to the line"
    "brakes"                                    = "Brake and anti skid"
    "briefing"                                  = "Briefing"
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
    "climb_to_the_line_completed"               = "After takeoff climb checklist to the line completed"
    "climb_checklist_completed"                 = "After takeoff climb checklist completed"
    "clear_right"                               = "Clear right"
    "cockpit_prep"                              = "Cockpit prep"
    "confirmed"                                 = "Confirmed"
    "diff_p"                                    = "Differential pressure"
    "decel"                                     = "Deecel"
    "ecam_stat"                                 = "E CAM status"
    "engines"                                   = "Engines"
    "efbs"                                      = "EFBs"
    "exterior_lights"                           = "Exterior lights"
    "external_power"                            = "External power"
    "fire_test"                                 = "A P U Fire test"
    "five_minutes"                              = "Five minutes"
    "five_minutes_not_passed"                   = "Five minutes not passed yet"
    "fl_100"                                    = "Flight level one hundred"
    "flaps_0"                                   = "Flaps zero"
    "flaps_15"                                  = "Flaps fifteen"
    "flaps_20"                                  = "Flaps twenty"
    "flaps_40"                                  = "Flaps fourty"
    "flex"                                      = "Flex"
    "flight_controls"                           = "Flight controls"
    "fuel_quantity"                             = "Fuel quantity"
    "fuel_pumps"                                = "Fuel pumps"
    "full_down"                                 = "Full down"
    "full_left"                                 = "Full left"
    "full_right"                                = "Full right"
    "full_up"                                   = "Full up"
    "gear"                                      = "Landing gear"
    "gear_down"                                 = "Gear down"
    "gear_pins_and_covers"                      = "Gear pins and covers"
    "gear_up"                                   = "Gear up"
    "ground_clearance"                          = "Ground clearance"
    "ground_servicing"                          = "Ground servicing"
    "hand_signal"                               = "Hand signal"
    "ign"                                       = "Ignition"
    "landing_checklist_completed"               = "Landing checklist completed"
    "ldg_elev"                                  = "Landing elevation"
    "line_up_checklist_completed"               = "Line up checklist completed"
    "light_sign"                                = "Lights and signs"
    "minimum"                                   = "Minimum"
    "go_around_alt_set"                         = "Go around altitude set"
    "navigation"                                = "Navigation"
    "neutral"                                   = "Neutral"
    "no_reverse_engine_1_and_2"                 = "No reverse engine one and two"
    "no_spoilers"                               = "No spoilers"
    "now_at"                                    = "Now"
    "nws_disc_memo"                             = "nose wheel steering disconnect memo"
    "Ok"                                        = "Ok"
    "one_to_go"                                 = "One thousand to go"
    "packs_1_and_2_on"                          = "Packs one and two on"
    "packs_one_and_two"                         = "Packs one and two"
    "parking_brake"                             = "Parking brake"
    "parking_brake_and_chocks"                  = "Parking brake and chocks"
    "parking_checklist_completed"               = "Parking checklist completed"
    "passing_flight_level"                      = "Passing flight level"
    "performance_fmas"                          = "Performance and F M A's"
    "pitch_trim"                                = "Pitch Trim"
    "point"                                     = "Point"
    "positive_climb"                            = "Positive climb"
    "pressure_zero"                             = "Pressure zero"
    "radar"                                     = "Weather Radar"
    "ready"                                     = "Ready"
    "reverse_green"                             = "Reverse green"
    "rotate"                                    = "Rotate"
    "runway_condition"                          = "Runway condition"
    "rud_trim"                                  = "Rudder trim"
    "securing_the_aircraft_checklist_completed" = "Securing the aircraft checklist completed"
    "set"                                       = "Set"
    "signs"                                     = "Signs"
    "slats_ext"                                 = "Slats extended"
    "slats_flaps"                               = "Slats and flaps"
    "slats_retr"                                = "Slats retracted"
    "speed_checked"                             = "Speed checked"
    "spoilers"                                  = "Spoilers"
    "standard_cross_checked"                    = "Standard cross checked"
    "standard_set"                              = "Standard Set"
    "starting_engine_2"                         = "Starting engine two"
    "takeoff_config"                            = "Takeoff Config"
    "takeoff_runway"                            = "Takeoff runway"
    "takeoff_speeds_and_thrust"                 = "Takeoff speeds and thrust"
    "tcas"                                      = "T CAS"
    "ten_thousand"                              = "Ten thousand"
    "thousand"                                  = "Thousand"
    "thrust_set"                                = "Thrust set"
    "TOGA"                                      = "Toga"
    "tons"                                      = "Tons"
    "transiton_altitude"                        = "Transition altitude"
    "transiton_level"                           = "Transition level"
    "transponder"                               = "Transponder"
    "valve_open"                                = "Valve open"
    "v_2"                                       = "V two"
    "v_one"                                     = "V one"
    "v_r"                                       = "V r"
    "walkaround"                                = "I'll perform the walkaround now"
    "walkaround_completed"                      = "Walkaround completed, all good no issues found"
    "wing_lights"                               = "Wing lights"
    "after_landing_checklist_completed"         = "After Landing checklist completed"
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