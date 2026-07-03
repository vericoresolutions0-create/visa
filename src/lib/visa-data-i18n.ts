import { getChecklist, type VisaChecklist, type VisaType } from "./visa-data.ts";
import frContent from "./content-i18n/checklist.fr.json";
import esContent from "./content-i18n/checklist.es.json";
import ptContent from "./content-i18n/checklist.pt.json";
import arContent from "./content-i18n/checklist.ar.json";
import hiContent from "./content-i18n/checklist.hi.json";

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

// Translated text overlaid onto the English source data at read time, keyed
// by the stable item/checklist ids in visa-data.ts. Any field missing from
// the overlay (untranslated yet, or a language file not caught up) silently
// falls back to the English value below — content is never blank.
const OVERLAYS: Record<string, ChecklistContentOverlay> = {
  fr: frContent as ChecklistContentOverlay,
  es: esContent as ChecklistContentOverlay,
  pt: ptContent as ChecklistContentOverlay,
  ar: arContent as ChecklistContentOverlay,
  hi: hiContent as ChecklistContentOverlay,
};

export function getLocalizedChecklist(
  destination: string,
  visaType: VisaType,
  language: string
): VisaChecklist | null {
  const base = getChecklist(destination, visaType);
  if (!base) return null;
  const overlay = OVERLAYS[language];
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
