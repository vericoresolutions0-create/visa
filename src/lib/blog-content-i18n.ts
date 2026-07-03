import frContent from "./content-i18n/blog.fr.json";
import esContent from "./content-i18n/blog.es.json";
import ptContent from "./content-i18n/blog.pt.json";
import arContent from "./content-i18n/blog.ar.json";
import hiContent from "./content-i18n/blog.hi.json";

export type BlogArticleOverlay = {
  title?: string;
  category?: string;
  excerpt?: string;
  body?: string;
};

type BlogContentOverlay = Record<string, BlogArticleOverlay>;

const OVERLAYS: Record<string, BlogContentOverlay> = {
  fr: frContent as BlogContentOverlay,
  es: esContent as BlogContentOverlay,
  pt: ptContent as BlogContentOverlay,
  ar: arContent as BlogContentOverlay,
  hi: hiContent as BlogContentOverlay,
};

export function getLocalizedArticleOverlay(articleId: string, language: string): BlogArticleOverlay | null {
  return OVERLAYS[language]?.[articleId] ?? null;
}
