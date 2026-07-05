import { getChecklist, type VisaChecklist, type VisaType } from "./visa-data.ts";

type ChecklistItemOverlay = {
  title?: string;
  description?: string;
  where?: string;
  tip?: string;
};

type ChecklistContentOverlay = {
  items: Record<string, ChecklistItemOverlay>;
  checklists: Record<string, { successTip?: string; processingTime?: string; fee?: string }>;
};

// Language overlays are loaded on-demand the first time a non-English language
// is requested. English users pay zero bytes for translation files.
const overlayCache: Record<string, ChecklistContentOverlay> = {};
const loadingPromises: Record<string, Promise<void>> = {};

export function ensureChecklistLanguageLoaded(language: string): Promise<void> {
  if (language === "en" || language in overlayCache) return Promise.resolve();
  if (language in loadingPromises) return loadingPromises[language];

  const load = async () => {
    try {
      let mod: { default: unknown };
      if (language === "fr")      mod = await import("./content-i18n/checklist.fr.json");
      else if (language === "es") mod = await import("./content-i18n/checklist.es.json");
      else if (language === "pt") mod = await import("./content-i18n/checklist.pt.json");
      else if (language === "ar") mod = await import("./content-i18n/checklist.ar.json");
      else if (language === "hi") mod = await import("./content-i18n/checklist.hi.json");
      else return;
      overlayCache[language] = mod.default as ChecklistContentOverlay;
    } catch {
      // On failure, getLocalizedChecklist silently returns English content
    }
  };

  loadingPromises[language] = load();
  return loadingPromises[language];
}

export function getLocalizedChecklist(
  destination: string,
  visaType: VisaType,
  language: string
): VisaChecklist | null {
  const base = getChecklist(destination, visaType);
  if (!base) return null;
  const overlay = overlayCache[language];
  if (!overlay) return base;

  const checklistOverlay = overlay.checklists[`${destination}|${visaType}`];

  return {
    ...base,
    successTip: checklistOverlay?.successTip ?? base.successTip,
    processingTime: checklistOverlay?.processingTime ?? base.processingTime,
    fee: checklistOverlay?.fee ?? base.fee,
    items: base.items.map((item) => {
      const itemOverlay = overlay.items[item.id];
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
}
