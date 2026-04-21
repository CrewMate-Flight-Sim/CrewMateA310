namespace VoiceSidecar
{
    public record VoiceCommand(string Type, string Raw, Dictionary<string, object> Payload);

    /// Dispatches a recognized grammar result to a structured VoiceCommand.
    public static class CommandDispatcher
    {
        public static VoiceCommand? Dispatch(
            string actionRuleId,
            string cmdId,
            string cmdValue,
            string rawText
        )
        {
            if (!int.TryParse(cmdId, out var pid))
                return null;

            return actionRuleId switch
            {
                "FO_COMMANDS" => DispatchFo(pid, cmdValue, rawText),
                "FMA_CALLOUTS" => DispatchFma(cmdValue, rawText),
                "DISCRETE_COMMANDS" => DispatchDiscrete(pid, rawText),
                _ => null,
            };
        }

        // FO_COMMANDS
        private static VoiceCommand? DispatchFo(int pid, string cval, string raw)
        {
            return pid switch
            {
                1 => Heading(cval, raw),
                2 => FlightLevel(cval, raw),
                3 => AltitudeFeet(cval, raw),
                4 => Speed(cval, raw),
                7 => Altimeter(cval, raw),
                8 => Fuel(cval, "kg", balanced: false, raw),
                9 => Fuel(cval, "kg", balanced: true, raw),
                10 => Fuel(cval, "lbs", balanced: false, raw),
                11 => Fuel(cval, "lbs", balanced: true, raw),
                12 => FuelTons(cval, balanced: false, raw),
                13 => FuelTons(cval, balanced: true, raw),
                16 => MissedApproachFeet(cval, raw),
                17 => MissedApproachFL(cval, raw),
                18 => Minimums(cval, "mda", raw),
                19 => Minimums(cval, "dh", raw),
                20 => PitchTrim(cval, raw),
                21 => LdgElev(cval, raw),
                _ => null,
            };
        }

        private static VoiceCommand? Heading(string cval, string raw)
        {
            if (!int.TryParse(cval, out var v) || v < 0 || v > 359)
                return null;
            return Cmd("heading", raw, new() { ["value"] = v });
        }

        private static VoiceCommand? FlightLevel(string cval, string raw)
        {
            if (!int.TryParse(cval, out var fl) || fl < 10 || fl > 450)
                return null;
            return Cmd(
                "altitude",
                raw,
                new()
                {
                    ["value"] = fl * 100,
                    ["unit"] = "feet",
                    ["flightLevel"] = fl,
                }
            );
        }

        private static VoiceCommand? AltitudeFeet(string cval, string raw)
        {
            if (!int.TryParse(cval, out var v) || v < 100 || v > 60000)
                return null;
            return Cmd("altitude", raw, new() { ["value"] = v, ["unit"] = "feet" });
        }

        private static VoiceCommand? Speed(string cval, string raw)
        {
            if (!int.TryParse(cval, out var v) || v < 60 || v > 400)
                return null;
            return Cmd("speed", raw, new() { ["value"] = v, ["unit"] = "knots" });
        }

        private static VoiceCommand? Altimeter(string cval, string raw)
        {
            if (!int.TryParse(cval, out var v))
                return null;

            // inHg
            if (v is >= 2700 and <= 3100)
            {
                return Cmd(
                    "altimeter",
                    raw,
                    new()
                    {
                        ["value"] = Math.Round(v / 100.0, 2),
                        ["unit"] = "inHg",
                        ["raw"] = v,
                    }
                );
            }

            // hPa
            if (v is >= 900 and <= 1100)
                return Cmd(
                    "altimeter",
                    raw,
                    new()
                    {
                        ["value"] = v,
                        ["unit"] = "hPa",
                        ["raw"] = v,
                    }
                );

            return null;
        }

        private static VoiceCommand? Fuel(string cval, string unit, bool balanced, string raw)
        {
            // cval = "thousands|hundreds" e.g. "60|600" → 60600
            var parts = cval.Split('|');
            if (parts.Length != 2)
                return null;
            if (!int.TryParse(parts[0], out var thousands))
                return null;
            if (!int.TryParse(parts[1], out var hundreds))
                return null;
            var qty = thousands * 1000 + hundreds;
            if (qty <= 0 || qty > 999_999)
                return null;
            return Cmd(
                "fuel",
                raw,
                new()
                {
                    ["quantity"] = qty,
                    ["unit"] = unit,
                    ["balanced"] = balanced,
                }
            );
        }

        private static VoiceCommand? FuelTons(string cval, bool balanced, string raw)
        {
            // cval = "18.5"
            if (
                !double.TryParse(
                    cval,
                    System.Globalization.NumberStyles.Any,
                    System.Globalization.CultureInfo.InvariantCulture,
                    out var tons
                )
            )
                return null;
            if (tons <= 0 || tons > 999)
                return null;
            return Cmd(
                "fuel",
                raw,
                new()
                {
                    ["quantity"] = Math.Round(tons, 1),
                    ["unit"] = "t",
                    ["balanced"] = balanced,
                }
            );
        }

        private static VoiceCommand? MissedApproachFeet(string cval, string raw)
        {
            if (!int.TryParse(cval, out var v) || v < 100 || v > 60000)
                return null;
            return Cmd(
                "missed_approach_altitude",
                raw,
                new()
                {
                    ["mode"] = "manual",
                    ["value"] = v,
                    ["unit"] = "feet",
                }
            );
        }

        private static VoiceCommand? MissedApproachFL(string cval, string raw)
        {
            if (!int.TryParse(cval, out var fl) || fl < 10 || fl > 450)
                return null;
            return Cmd(
                "missed_approach_altitude",
                raw,
                new()
                {
                    ["mode"] = "manual",
                    ["value"] = fl * 100,
                    ["unit"] = "feet",
                    ["flightLevel"] = fl,
                }
            );
        }

        private static VoiceCommand? Minimums(string cval, string type, string raw)
        {
            // cval = plain integer string: "450", "160", "1000", "50"
            // type = "baro" | "radio"
            // Realistic range: 0–10000 ft. Grammar only generates values that SAPI
            // actually heard, so we just sanity-check the bounds.
            if (!int.TryParse(cval, out var v) || v < 0 || v > 10000)
                return null;
            return Cmd(
                "minimums",
                raw,
                new()
                {
                    ["type"] = type,
                    ["value"] = v,
                    ["unit"] = "feet",
                }
            );
        }

        private static VoiceCommand? PitchTrim(string cval, string raw)
        {
            if (
                !double.TryParse(
                    cval,
                    System.Globalization.NumberStyles.Any,
                    System.Globalization.CultureInfo.InvariantCulture,
                    out var trimValue
                )
            )
                return null;

            // Sanity check for A310 green band: roughly -3.0 to 4.0
            if (trimValue < -5.0 || trimValue > 5.0)
                return null;

            return Cmd(
                "pitch_trim",
                raw,
                new() { ["value"] = trimValue, ["direction"] = trimValue >= 0 ? "up" : "down" }
            );
        }

        private static VoiceCommand? LdgElev(string cval, string raw)
        {
            // cval = plain integer string: "50", "650", "1050", "6000"
            if (!int.TryParse(cval, out var v) || v < -1000 || v > 15000)
                return null;

            return Cmd("landing_elev", raw, new() { ["value"] = v, ["unit"] = "feet" });
        }

        private static VoiceCommand DispatchFma(string cval, string raw)
        {
            var payload = new Dictionary<string, object>();

            // urgent: "||||||A.FLOOR"
            var parts = cval.Split('|');

            // parts[0]=thrust, [1]=vertical, [2]=lateral, [3]=combined,
            //         [4]=approachCat, [5]=armed, [6]=urgent
            void Set(int i, string key)
            {
                if (parts.Length > i && parts[i].Length > 0)
                    payload[key] = parts[i];
            }

            Set(0, "thrust");
            Set(1, "vertical");
            Set(2, "lateral");
            Set(3, "combined");
            Set(4, "approachCat");
            Set(5, "armed");
            Set(6, "urgent");

            return Cmd("fma_callout", raw, payload);
        }

        // ─── DISCRETE_COMMANDS ────────────────────────────────────────────────────

        private static readonly Dictionary<int, string> DiscreteNames = new()
        {
            // 1-9: Primary Flight Controls
            [1] = "gear_up",
            [2] = "gear_down",
            [3] = "slats_ret",
            [4] = "slats_ext_zero",
            [5] = "flaps_15",
            [6] = "flaps_20",
            [7] = "flaps_40",
            [8] = "go_around_flaps",

            // 10-19: Lights & Flight Director
            [10] = "landing_lights_on",
            [11] = "landing_lights_off",
            [12] = "takeoff_lights_on",
            [13] = "strobe_lights_on",
            [14] = "strobe_lights_auto",
            [15] = "strobe_lights_off",
            [16] = "taxi_lights_on",
            [17] = "taxi_lights_off",
            [18] = "flight_director_on",
            [19] = "flight_director_off",

            // 20-32: Checklists
            [20] = "checklist_parking",
            [21] = "checklist_before_startP1",
            [22] = "checklist_before_startP2",
            [23] = "checklist_after_start",
            [24] = "checklist_before_takeoffP1",
            [25] = "checklist_before_takeoffP2",
            [26] = "checklist_after_takeoffP1",
            [27] = "checklist_after_takeoffP2",
            [28] = "checklist_approach",
            [29] = "checklist_landing",
            [30] = "checklist_after_landing",
            [31] = "checklist_cancel",
            [32] = "set_and_checked",
            // 33-49: Procedures & Engines
            [33] = "prepare_aircraft",
            [34] = "engine_start_1",
            [35] = "engine_start_2",
            [36] = "apu_start",
            [37] = "clear_left",
            [38] = "runway_entry_procedure",
            [39] = "before_start_procedure",
            [40] = "clear_for_takeoff",
            [41] = "abort_takeoff",
            [42] = "continue",
            [43] = "shutdown_procedure",
            [44] = "flight_controls_check",
            [45] = "des_prep",

            // 50-69: Systems & Safety
            [50] = "wing_anti_ice_on",
            [51] = "wing_anti_ice_off",
            [52] = "engine_anti_ice_on",
            [53] = "engine_anti_ice_off",
            [54] = "wipers_off",
            [55] = "wipers_slow",
            [56] = "wipers_fast",
            [57] = "seat_belts_on",
            [58] = "seat_belts_off",
            [59] = "chocks_in_place",
            [60] = "parking_brake_set",
            [61] = "cabin_crew_arm_slides",
            [62] = "cabin_crew_disarm_slides",
            [63] = "brake_check",
            [64] = "set_standard",
            [65] = "eng_ai_on",
            [66] = "norm_on",
            // 70-98: Standard Responses
            [67] = "fifteen zero",
            [68] = "fifteen",
            [69] = "twenty",
            [70] = "completed",
            [71] = "confirm",
            [72] = "negative",
            [73] = "checked",
            [74] = "set",
            [75] = "on",
            [76] = "off",
            [77] = "armed",
            [78] = "disarmed",
            [79] = "on_and_auto",
            [80] = "up_neutral",
            [81] = "standard_set",
            [82] = "normal",
            [83] = "secured",
            [84] = "low",
            [85] = "mid",
            [86] = "max",
            [87] = "check_zero",
            [88] = "retracted",
            [89] = "down",
            [90] = "removed",
            [91] = "released",
            [92] = "received",
            [93] = "started",
            [94] = "running",
            [95] = "advised",
            [96] = "closed",
            [97] = "check_and_read",
            [98] = "fourty_response",
            [99] = "twenty_response",

            // 100-112: Autopilot Modes
            [100] = "autopilot_engage",
            [101] = "autopilot_disconnect",
            [102] = "pull_altitude",
            [103] = "push_heading",
            [104] = "pull_speed",
            [105] = "pull_heading",
            [106] = "manage_nav",
            [107] = "push_to_level_off",
            [108] = "arm_approach",
            [109] = "arm_localizer",

            // 113-125: Ground & Engineering
            [113] = "ground_call",
            [114] = "connect_gpu",
            [115] = "disconnect_gpu",
            [116] = "connect_asu",
            [117] = "disconnect_asu",
            [118] = "connect_acu",
            [119] = "disconnect_acu",
            [120] = "disconnect_all_ground",
            [121] = "confirmed",
            [122] = "ta_ra",
            [123] = "cont_relight",
            [124] = "secure",
            [125] = "on_apu",
            [126] = "apu_tbs",
            [127] = "brakes_on_chocks_on",
        };

        private static VoiceCommand? DispatchDiscrete(int pid, string raw)
        {
            if (!DiscreteNames.TryGetValue(pid, out var name))
                return null;
            return Cmd("discrete", raw, new() { ["command"] = name });
        }

        // ─── Helper ───────────────────────────────────────────────────────────────

        private static VoiceCommand Cmd(
            string type,
            string raw,
            Dictionary<string, object> payload
        ) => new(type, raw, payload);
    }
}
