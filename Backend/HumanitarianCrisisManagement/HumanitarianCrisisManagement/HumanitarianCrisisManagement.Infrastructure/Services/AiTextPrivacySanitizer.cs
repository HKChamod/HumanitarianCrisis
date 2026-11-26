using System.Text.RegularExpressions;
using HumanitarianCrisisManagement.Application.Interfaces;

namespace HumanitarianCrisisManagement.Infrastructure.Services;

/// <summary>
/// Redacts recognizable personal and contact information from citizen-authored free text
/// before external AI transmission, and fails closed (omits the text) whenever residual
/// identifying risk cannot be reliably excluded.
/// Never logs original or redacted personal data.
/// </summary>
public sealed class AiTextPrivacySanitizer : IAiTextPrivacySanitizer
{
    public static readonly AiTextPrivacySanitizer Default = new();

    private const int MinOperationalTextLength = 12;
    private static readonly TimeSpan RegexTimeout = TimeSpan.FromMilliseconds(200);

    // 1. Explicit labeled personal/contact segments (e.g., "Address: ...", "Phone: ...", "Name: ...")
    private static readonly Regex LabeledPersonalDetailRegex = new(
        @"\b(?:home\s+address|street\s+address|address|contact\s+name|full\s+name|name|contact\s+number|phone(?:\s+number)?|tel(?:ephone)?|mobile(?:\s+number)?|whatsapp|viber|nic(?:\s+no\.?)?|national\s+id|passport(?:\s+no\.?)?|email(?:\s+address)?)\s*[:=]\s*[^;\r\n]+",
        RegexOptions.Compiled | RegexOptions.IgnoreCase | RegexOptions.CultureInvariant,
        RegexTimeout);

    // 2. Email addresses
    private static readonly Regex EmailRegex = new(
        @"\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b",
        RegexOptions.Compiled | RegexOptions.IgnoreCase | RegexOptions.CultureInvariant,
        RegexTimeout);

    // 3. URLs / web links
    private static readonly Regex UrlRegex = new(
        @"\b(?:https?://|www\.)\S+",
        RegexOptions.Compiled | RegexOptions.IgnoreCase | RegexOptions.CultureInvariant,
        RegexTimeout);

    // 4. Sri Lankan old NIC (9 digits + V/X)
    private static readonly Regex SriLankaOldNicRegex = new(
        @"(?<!\d)\d{2}[\s-]?\d{3}[\s-]?\d{4}[\s-]?[VX](?!\w)",
        RegexOptions.Compiled | RegexOptions.IgnoreCase | RegexOptions.CultureInvariant,
        RegexTimeout);

    // 5. Sri Lankan new NIC (12 digits starting with 19 or 20)
    private static readonly Regex SriLankaNewNicRegex = new(
        @"(?<!\d)(?:19|20)\d{2}[\s-]?\d{4}[\s-]?\d{4}(?!\d)",
        RegexOptions.Compiled | RegexOptions.IgnoreCase | RegexOptions.CultureInvariant,
        RegexTimeout);

    // 6. Sri Lankan international phone numbers (+94 / 0094 / 94 + mobile or landline area code + 7 digits)
    private static readonly Regex SriLankaInternationalPhoneRegex = new(
        @"(?<!\d)(?:\+94|0094|\(?94\)?)[\s.-]?(?:\(?0?\)?[\s.-]?)?(?:7[01245678]|11|2[134567]|3[1-8]|4[157]|5[12457]|6[3567]|81|91)[\s.-]?\d{3}[\s.-]?\d{4}(?!\d)",
        RegexOptions.Compiled | RegexOptions.IgnoreCase | RegexOptions.CultureInvariant,
        RegexTimeout);

    // 7. Sri Lankan local mobile (07X) and landline (0XX) phone numbers
    private static readonly Regex SriLankaLocalPhoneRegex = new(
        @"(?<!\d)\(?0(?:7[01245678]|11|2[134567]|3[1-8]|4[157]|5[12457]|6[3567]|81|91)\)?[\s.-]?\d{3}[\s.-]?\d{4}(?!\d)",
        RegexOptions.Compiled | RegexOptions.IgnoreCase | RegexOptions.CultureInvariant,
        RegexTimeout);

    // 8. Generic international phone numbers (+CC ...)
    private static readonly Regex GenericInternationalPhoneRegex = new(
        @"(?<!\w)\+\d{1,3}[\s.-]?(?:\(?\d{1,4}\)?[\s.-]?){2,4}\d{2,4}(?!\d)",
        RegexOptions.Compiled | RegexOptions.IgnoreCase | RegexOptions.CultureInvariant,
        RegexTimeout);

    // 9. GPS coordinates (decimal degrees)
    private static readonly Regex GpsCoordinateRegex = new(
        @"(?<!\d)-?\d{1,2}\.\d{4,8}\s*°?\s*[NS]?\s*[,/\s]\s*-?\d{1,3}\.\d{4,8}\s*°?\s*[EW]?(?!\d)",
        RegexOptions.Compiled | RegexOptions.IgnoreCase | RegexOptions.CultureInvariant,
        RegexTimeout);

    // 10. Explicit house/apartment/unit/plot numbers with optional street phrase
    private static readonly Regex HouseOrUnitAddressRegex = new(
        @"\b(?:No\.?\s*\d+[A-Za-z]?(?:/\d+[A-Za-z]?)?|House\s+(?:No\.?\s*)?\d+[A-Za-z]?(?:/\d+)?|Apt\.?\s*[A-Za-z0-9-]+|Flat\s*[A-Za-z0-9-]+|Unit\s*[A-Za-z0-9-]+|Plot\s*#?\d+[A-Za-z]?)\b(?:[,\s]+(?:[A-Za-z0-9.'-]+\s+){0,4}(?:Road|Rd\.?|Street|St\.?|Lane|Ln\.?|Avenue|Ave\.?|Mawatha|Mw\.?|Drive|Dr\.?|Place|Pl\.?|Gardens|Terrace|Crescent|Circular|Waththa|Watta|Scheme|Colony|Housing)\b)?",
        RegexOptions.Compiled | RegexOptions.IgnoreCase | RegexOptions.CultureInvariant,
        RegexTimeout);

    // 11. Explicit street/road/lane/mawatha names
    private static readonly Regex StreetAddressRegex = new(
        @"\b(?:\d+[A-Za-z]?(?:/\d+)?\s+)?(?:[A-Za-z0-9.'-]+\s+){1,3}(?:Road|Rd\.?|Street|St\.?|Lane|Ln\.?|Avenue|Ave\.?|Mawatha|Mw\.?|Drive|Dr\.?|Place|Pl\.?|Gardens|Terrace|Crescent|Circular|Waththa|Watta|Scheme)\b",
        RegexOptions.Compiled | RegexOptions.IgnoreCase | RegexOptions.CultureInvariant,
        RegexTimeout);

    // 12. Sri Lankan passport-style IDs (N/P/D + 7 digits)
    private static readonly Regex PassportIdRegex = new(
        @"\b[NPD]\d{7}\b",
        RegexOptions.Compiled | RegexOptions.CultureInvariant,
        RegexTimeout);

    // 13. Explicit titled person names (Mr./Mrs./Ms./Miss/Dr./Rev.)
    private static readonly Regex TitledNameRegex = new(
        @"\b(?:Mr\.?|Mrs\.?|Ms\.?|Miss|Dr\.?|Rev\.?)\s+[A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,2}\b",
        RegexOptions.Compiled | RegexOptions.CultureInvariant,
        RegexTimeout);

    // 14. Explicit self-introduction name phrases ("my name is ...", "I am ...", "contact person ...")
    private static readonly Regex SelfIntroNameRegex = new(
        @"\b(?:my\s+name\s+is|i\s+am|this\s+is|ask\s+for|contact\s+person(?:\s+is)?)\s+[A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,2}\b",
        RegexOptions.Compiled | RegexOptions.IgnoreCase | RegexOptions.CultureInvariant,
        RegexTimeout);

    // Residual risk detectors (fail-closed checks after redaction)
    private static readonly Regex ResidualLongDigitSequenceRegex = new(
        @"(?<!\d)(?:\d[\s-]?){7,}(?!\d)",
        RegexOptions.Compiled | RegexOptions.CultureInvariant,
        RegexTimeout);

    private static readonly Regex ResidualIdentityCueRegex = new(
        @"\b(?:nic|national\s+id|passport|whatsapp|viber|call\s+me|contact\s+me|reach\s+me|my\s+address|home\s+address|residing\s+at|living\s+at|son\s+of|daughter\s+of|wife\s+of|husband\s+of|my\s+name\s+is)\b",
        RegexOptions.Compiled | RegexOptions.IgnoreCase | RegexOptions.CultureInvariant,
        RegexTimeout);

    private static readonly Regex RedactionTokenRegex = new(
        @"\[REDACTED_[A-Z_]+\]",
        RegexOptions.Compiled | RegexOptions.CultureInvariant,
        RegexTimeout);

    private static readonly Regex WhitespaceRegex = new(
        @"\s+",
        RegexOptions.Compiled | RegexOptions.CultureInvariant,
        RegexTimeout);

    private static readonly (Regex Pattern, string Replacement)[] RedactionRules =
    [
        (LabeledPersonalDetailRegex, "[REDACTED_PERSONAL_DETAIL]"),
        (EmailRegex, "[REDACTED_EMAIL]"),
        (UrlRegex, "[REDACTED_URL]"),
        (SriLankaOldNicRegex, "[REDACTED_NIC]"),
        (SriLankaNewNicRegex, "[REDACTED_NIC]"),
        (SriLankaInternationalPhoneRegex, "[REDACTED_PHONE]"),
        (SriLankaLocalPhoneRegex, "[REDACTED_PHONE]"),
        (GenericInternationalPhoneRegex, "[REDACTED_PHONE]"),
        (GpsCoordinateRegex, "[REDACTED_LOCATION]"),
        (HouseOrUnitAddressRegex, "[REDACTED_ADDRESS]"),
        (StreetAddressRegex, "[REDACTED_ADDRESS]"),
        (PassportIdRegex, "[REDACTED_ID]"),
        (TitledNameRegex, "[REDACTED_NAME]"),
        (SelfIntroNameRegex, "[REDACTED_NAME]")
    ];

    public AiSanitizedTextResult SanitizeFreeText(string? rawText, int maxLength)
    {
        if (string.IsNullOrWhiteSpace(rawText))
        {
            return new AiSanitizedTextResult(false, null, 0, "Empty description");
        }

        try
        {
            var current = rawText.Trim();
            var totalRedactions = 0;

            foreach (var (pattern, replacement) in RedactionRules)
            {
                var matches = pattern.Matches(current);
                if (matches.Count > 0)
                {
                    totalRedactions += matches.Count;
                    current = pattern.Replace(current, replacement);
                }
            }

            // Fail-closed check 1: residual unredacted 7+ digit sequences (potential phone/ID/account number)
            if (ResidualLongDigitSequenceRegex.IsMatch(current))
            {
                return new AiSanitizedTextResult(
                    false,
                    null,
                    totalRedactions,
                    "Omitted due to residual unredacted numeric identifier risk");
            }

            // Fail-closed check 2: residual personal/contact/address cue words suggesting unredacted PII
            if (ResidualIdentityCueRegex.IsMatch(current))
            {
                return new AiSanitizedTextResult(
                    false,
                    null,
                    totalRedactions,
                    "Omitted due to residual personal/contact cue risk");
            }

            var normalized = WhitespaceRegex.Replace(current, " ").Trim();

            // Fail-closed check 3: if little or no operational text remains after stripping redaction placeholders
            var withoutTokens = RedactionTokenRegex.Replace(normalized, " ");
            var operationalChars = withoutTokens.Count(char.IsLetterOrDigit);
            if (operationalChars < MinOperationalTextLength)
            {
                return new AiSanitizedTextResult(
                    false,
                    null,
                    totalRedactions,
                    "Omitted because insufficient non-personal operational text remained after redaction");
            }

            if (maxLength > 0 && normalized.Length > maxLength)
            {
                normalized = normalized[..maxLength].TrimEnd();
            }

            return new AiSanitizedTextResult(true, normalized, totalRedactions);
        }
        catch (RegexMatchTimeoutException)
        {
            // Fail closed if sanitization cannot complete reliably
            return new AiSanitizedTextResult(
                false,
                null,
                0,
                "Omitted because privacy sanitization timed out");
        }
    }
}
