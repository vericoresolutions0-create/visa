// Single source of truth for destination-country flag emojis, used by the
// homepage hero, the rejection analyser's destination picker, and the
// dashboard's trip cards — previously each redefined its own copy of this
// same emoji data independently.
export const DESTINATION_FLAGS: Record<string, string> = {
  "United Kingdom": "🇬🇧",
  "United States": "🇺🇸",
  Canada: "🇨🇦",
  Germany: "🇩🇪",
  Poland: "🇵🇱",
  France: "🇫🇷",
  Australia: "🇦🇺",
  Netherlands: "🇳🇱",
  Ireland: "🇮🇪",
  Italy: "🇮🇹",
  Spain: "🇪🇸",
  Portugal: "🇵🇹",
  Belgium: "🇧🇪",
  Sweden: "🇸🇪",
  Norway: "🇳🇴",
  Switzerland: "🇨🇭",
  Austria: "🇦🇹",
  Denmark: "🇩🇰",
  Finland: "🇫🇮",
  "Czech Republic": "🇨🇿",
  "New Zealand": "🇳🇿",
};
