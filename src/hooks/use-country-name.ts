import { useTranslation } from "react-i18next";

// Country names are stored and matched everywhere internally in plain
// English (the canonical key used by visa-data.ts, ALL_COUNTRIES, every
// <select> value, every Convex document) — this hook only translates the
// *displayed* label. defaultValue falls back to the raw English name for
// any country not yet in a given locale's countries.json, so a missing
// translation can never show a blank or broken label.
export function useCountryName() {
  const { t } = useTranslation("countries");
  return (name: string) => t(name, { defaultValue: name });
}
