import { getSettleInGuide, type SettleInGuide } from "./settle-in-data.ts";

type SettleInItemOverlay = {
  title?: string;
  description?: string;
  where?: string;
  tip?: string;
};

type SettleInSectionOverlay = {
  label?: string;
  items?: Record<string, SettleInItemOverlay>;
};

// Keyed by destination, then by section id. Missing fields fall back to the
// English source from settle-in-data.ts, same pattern as visa-data-i18n.ts.
type SettleInContentOverlay = Record<string, Record<string, SettleInSectionOverlay>>;

// Loaded lazily on first request for each non-English language.
const overlayCache: Record<string, SettleInContentOverlay> = {};
const loadingPromises: Record<string, Promise<void>> = {};

export function ensureSettleInLanguageLoaded(language: string): Promise<void> {
  if (language === "en" || language in overlayCache) return Promise.resolve();
  if (language in loadingPromises) return loadingPromises[language];

  const load = async () => {
    try {
      let mod: { default: unknown };
      if (language === "fr")      mod = await import("./content-i18n/settle-in.fr.json");
      else if (language === "es") mod = await import("./content-i18n/settle-in.es.json");
      else if (language === "pt") mod = await import("./content-i18n/settle-in.pt.json");
      else if (language === "ar") mod = await import("./content-i18n/settle-in.ar.json");
      else if (language === "hi") mod = await import("./content-i18n/settle-in.hi.json");
      else return;
      overlayCache[language] = mod.default as SettleInContentOverlay;
    } catch {
      // On failure, getLocalizedSettleInGuide silently returns English content
    }
  };

  loadingPromises[language] = load();
  return loadingPromises[language];
}

export function getLocalizedSettleInGuide(destination: string, language: string): SettleInGuide | null {
  const base = getSettleInGuide(destination);
  if (!base) return null;
  const overlay = overlayCache[language]?.[destination];
  if (!overlay) return base;

  return {
    ...base,
    sections: base.sections.map((section) => {
      const sectionOverlay = overlay[section.id];
      if (!sectionOverlay) return section;
      return {
        ...section,
        label: sectionOverlay.label ?? section.label,
        items: section.items.map((item) => {
          const itemOverlay = sectionOverlay.items?.[item.id];
          if (!itemOverlay) return item;
          return {
            ...item,
            title: itemOverlay.title ?? item.title,
            description: itemOverlay.description ?? item.description,
            where: itemOverlay.where ?? item.where,
            tip: itemOverlay.tip ?? item.tip,
          };
        }),
      };
    }),
  };
}
