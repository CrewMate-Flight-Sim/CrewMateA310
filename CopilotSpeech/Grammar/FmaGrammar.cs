using System.Collections.Generic;
using System.Linq;

partial class Program
{
    // ─── FMA Callout Grammar ─────────────────────────────────────────────────
    //
    // ATHR | VERT | LAT | ARMED
    static IEnumerable<string> GetFmaCallouts() =>
        GetTakeoffFmaCallouts()
            .Concat(GetClimbFmaCallouts())
            .Concat(GetCruiseFmaCallouts())
            .Concat(GetDescentFmaCallouts())
            .Concat(GetApproachFmaCallouts())
            .Concat(GetGoAroundFmaCallouts())
            .Concat(GetLandingFmaCallouts())
            .Concat(GetSingleModeFmaCallouts());

    /// Yields all combinations of one or more non-null parts joined by a space.
    /// Null entries in each list mean "this column is absent".
    static IEnumerable<string> BuildFmaCombos(
        IEnumerable<string?> athrTokens,
        IEnumerable<string?> vertTokens,
        IEnumerable<string?> latTokens,
        IEnumerable<string?> armedTokens
    )
    {
        var seen = new HashSet<string>();
        foreach (var athr in athrTokens)
        foreach (var vert in vertTokens)
        foreach (var lat in latTokens)
        foreach (var armed in armedTokens)
        {
            var parts = new[] { athr, vert, lat, armed }.Where(p => p != null).ToArray();
            if (parts.Length == 0)
                continue;
            var phrase = string.Join(" ", parts);
            if (seen.Add(phrase))
                yield return phrase;
        }
    }

    // ─── Takeoff ─────────────────────────────────────────────────────────────
    // ATHR: MAN TOGA / MAN FLEX N
    // VERT: SRS
    // LAT:  RUNWAY (optional)
    // ARMED: AUTOTHRUST BLUE (optional)
    static IEnumerable<string> GetTakeoffFmaCallouts()
    {
        var athr = new List<string?> { "man toga" };
        for (int t = 40; t <= 75; t++)
            athr.Add($"man flex {t}");

        return BuildFmaCombos(
            athr,
            new[] { "srs" },
            new string?[] { null, "runway" },
            new string?[] { null, "autothrust blue" }
        );
    }

    // ─── Climb ───────────────────────────────────────────────────────────────
    static IEnumerable<string> GetClimbFmaCallouts() =>
        BuildFmaCombos(
            new string?[] { null, "thrust d climb", "thrust climb", "speed", "mach" },
            new string?[] { "srs", "climb", "open climb", "expedite climb" },
            new string?[] { null, "runway", "nav", "heading", "track" },
            new string?[] { null, "climb blue", "alt blue", "alt cruise blue", "nav blue" }
        );

    // ─── Cruise ──────────────────────────────────────────────────────────────
    static IEnumerable<string> GetCruiseFmaCallouts() =>
        BuildFmaCombos(
            new string?[] { null, "speed", "mach" },
            new string?[] { "alt", "altitude", "alt cruise", "alt cst", "alt star" },
            new string?[] { null, "nav", "heading", "track" },
            new string?[] { null, "des blue", "alt cruise blue", "alt cst blue" }
        );

    // ─── Descent ─────────────────────────────────────────────────────────────
    static IEnumerable<string> GetDescentFmaCallouts() =>
        BuildFmaCombos(
            new string?[] { null, "thrust idle", "speed", "mach" },
            new string?[] { "descent", "open descent", "expedite descent" },
            new string?[] { null, "nav", "heading", "track" },
            new string?[] { null, "alt blue", "alt cruise blue", "alt star blue" }
        );

    // ─── Approach ────────────────────────────────────────────────────────────
    static IEnumerable<string> GetApproachFmaCallouts() =>
        BuildFmaCombos(
            new string?[] { null, "speed", "mach" },
            new string?[] { null, "alt", "alt star", "glide slope", "glide slope star" },
            new string?[]
            {
                null,
                "nav",
                "heading",
                "track",
                "loc",
                "loc star",
                "localiser",
                "localiser star",
            },
            new string?[]
            {
                null,
                "loc blue",
                "loc star blue",
                "gs blue",
                "glide slope blue",
                "land blue",
                "nav blue",
                "alt blue",
            }
        );

    // ─── Go-Around ───────────────────────────────────────────────────────────
    static IEnumerable<string> GetGoAroundFmaCallouts() =>
        BuildFmaCombos(
            new string?[] { "man toga", "man mct" },
            new string?[] { "srs" },
            new string?[] { null, "nav", "heading", "track", "go around track" },
            new string?[] { null, "climb blue", "alt blue", "nav blue" }
        );

    // ─── Landing / Flare / Rollout ───────────────────────────────────────────
    static IEnumerable<string> GetLandingFmaCallouts() =>
        BuildFmaCombos(
            new string?[] { null, "speed" },
            new string?[] { "land", "flare", "rollout", "glide slope", "glide slope star" },
            new string?[] { null, "land", "rollout" },
            new string?[] { null }
        );

    // ─── Standalone mode tokens ──────────────────────────────────────────────
    // Covers any single-column callout (e.g. just "nav", "loc blue", "alt")
    static IEnumerable<string> GetSingleModeFmaCallouts()
    {
        // Active VERT
        var vert = new[]
        {
            "srs",
            "climb",
            "open climb",
            "expedite climb",
            "alt",
            "altitude",
            "alt cruise",
            "alt cst",
            "alt star",
            "des",
            "descent",
            "open descent",
            "expedite descent",
            "vs",
            "fpa",
            "glide slope",
            "glide slope star",
            "flare",
            "rollout",
            "land",
        };
        // Active LAT
        var lat = new[]
        {
            "nav",
            "heading",
            "track",
            "loc",
            "loc star",
            "localiser",
            "localiser star",
            "land",
            "rollout",
            "go around track",
            "runway",
        };
        // Active ATHR
        var athr = new[]
        {
            "man toga",
            "man mct",
            "thr clb",
            "thrust climb",
            "thr idle",
            "thrust idle",
            "thr mct",
            "speed",
            "mach",
            "alpha floor",
            "toga lock",
        };
        // Armed (blue) — standalone
        var armed = new[]
        {
            "climb blue",
            "alt blue",
            "alt cruise blue",
            "alt cst blue",
            "alt star blue",
            "descent blue",
            "loc blue",
            "loc star blue",
            "glide slope blue",
            "glide slope star blue",
            "land blue",
            "nav blue",
            "autothrust blue",
        };

        foreach (var t in vert)
            yield return t;
        foreach (var t in lat)
            yield return t;
        foreach (var t in athr)
            yield return t;
        foreach (var t in armed)
            yield return t;
    }
}
