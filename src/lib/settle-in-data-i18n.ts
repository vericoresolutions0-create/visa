import { getSettleInGuide, type SettleInGuide } from "./settle-in-data.ts";
import frContent from "./content-i18n/settle-in.fr.json";
import esContent from "./content-i18n/settle-in.es.json";
import ptContent from "./content-i18n/settle-in.pt.json";
import arContent from "./content-i18n/settle-in.ar.json";
import hiContent from "./content-i18n/settle-in.hi.json";

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

const OVERLAYS: Record<string, SettleInContentOverlay> = {
  fr: frContent as SettleInContentOverlay,
  es: esContent as SettleInContentOverlay,
  pt: ptContent as SettleInContentOverlay,
  ar: arContent as SettleInContentOverlay,
  hi: hiContent as SettleInContentOverlay,
};

export function getLocalizedSettleInGuide(destination: string, language: string): SettleInGuide | null {
  const base = getSettleInGuide(destination);
  if (!base) return null;
  const overlay = OVERLAYS[language]?.[destination];
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
