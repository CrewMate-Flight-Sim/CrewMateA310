using System.Collections.Generic;

partial class Program
{
    static IEnumerable<string> GetCompoundDigitPhrases()
    {
        var seqs4 = GetDigitSequenceList(maxDigits: 4);
        var seqs3 = GetDigitSequenceList(maxDigits: 3);

        // "[digits] set"  e.g. "one zero two three set"
        // "[digits] tons" e.g. "nine tons"
        var suffixes = new[] { "set", "tons" };
        foreach (var seq in seqs4)
        foreach (var suffix in suffixes)
            yield return $"{seq} {suffix}";

        // "[digits] point [digits] tons"  e.g. "nine point five tons", "one zero zero point two tons"
        var singleDigits = new[]
        {
            "zero",
            "one",
            "two",
            "three",
            "four",
            "five",
            "six",
            "seven",
            "eight",
            "nine",
            "niner",
        };
        foreach (var intSeq in seqs3)
        foreach (var dec in singleDigits)
            yield return $"{intSeq} point {dec} tons";

        // Prefix patterns: "set altitude [digits]", "set heading [digits]", etc.
        var prefixes = new[]
        {
            "set altitude",
            "set heading",
            "set speed",
            "set flight level",
            "set missed approach altitude",
            "pull heading",
            "pull speed",
        };
        foreach (var seq in seqs4)
        foreach (var prefix in prefixes)
            yield return $"{prefix} {seq}";
    }

    static List<string> GetDigitSequenceList(int maxDigits)
    {
        var digits = new[]
        {
            "zero",
            "one",
            "two",
            "three",
            "four",
            "five",
            "six",
            "seven",
            "eight",
            "nine",
            "niner",
        };

        var results = new List<string>(digits);
        for (int length = 2; length <= maxDigits; length++)
            BuildDigitSequences(digits, length, new List<string>(), results);

        return results;
    }

    static IEnumerable<string> GetDigitCommands(int maxDigits)
    {
        var digits = new[]
        {
            "zero",
            "one",
            "two",
            "three",
            "four",
            "five",
            "six",
            "seven",
            "eight",
            "nine",
            "niner",
        };

        var results = new List<string>();
        results.AddRange(digits);

        for (int length = 2; length <= maxDigits; length++)
            BuildDigitSequences(digits, length, new List<string>(), results);

        return results;
    }

    static void BuildDigitSequences(
        string[] digits,
        int remaining,
        List<string> current,
        List<string> output
    )
    {
        if (remaining == 0)
        {
            output.Add(string.Join(" ", current));
            return;
        }

        foreach (var d in digits)
        {
            current.Add(d);
            BuildDigitSequences(digits, remaining - 1, current, output);
            current.RemoveAt(current.Count - 1);
        }
    }
}
