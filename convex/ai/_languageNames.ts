// Locale code -> English language name, used to instruct an AI model which
// language to respond in. Kept separate from src/i18n.ts since that file
// runs i18next/React init side effects that must never execute inside a
// Convex Node action.
export const LANGUAGE_NAMES: Record<string, string> = {
  fr: "French",
  es: "Spanish",
  pt: "Portuguese",
  ar: "Arabic",
  hi: "Hindi",
};

export function languageInstruction(language: string | undefined): string {
  const name = language ? LANGUAGE_NAMES[language] : undefined;
  return name ? `\n\nRespond entirely in ${name}, not English.` : "";
}
