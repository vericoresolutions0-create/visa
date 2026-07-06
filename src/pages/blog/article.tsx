import { useNavigate, useParams } from "react-router-dom";
import { motion } from "motion/react";
import { useTranslation } from "react-i18next";
import { ArrowLeft, Globe, Clock, Tag, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button.tsx";
import { useSeo } from "@/hooks/use-seo.ts";
import { useSmartBack } from "@/hooks/use-smart-back.ts";
import { getLocalizedArticleOverlay } from "@/lib/blog-content-i18n.ts";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api.js";

function formatDate(iso: string | undefined, lang = "en") {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString(lang, { month: "long", day: "numeric", year: "numeric" });
}

export default function BlogArticlePage() {
  const { t, i18n } = useTranslation("blog");
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const goBack = useSmartBack("/blog");

  const baseArticle = useQuery(api.blog.getBySlug, id ? { slug: id } : "skip");
  const loading = baseArticle === undefined;

  const overlay = baseArticle ? getLocalizedArticleOverlay(baseArticle.slug, i18n.language) : null;
  const article = baseArticle && overlay ? {
    ...baseArticle,
    title: overlay.title ?? baseArticle.title,
    category: overlay.category ?? baseArticle.category,
    excerpt: overlay.excerpt ?? baseArticle.excerpt,
    body: overlay.body ?? baseArticle.body,
  } : baseArticle;

  useSeo({
    title: article ? article.title : loading ? "Loading…" : "Article Not Found",
    description: article ? article.excerpt : "This article could not be found.",
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <header className="border-b border-border/40 px-6 py-4 flex items-center justify-between sticky top-0 z-40 bg-background/95 backdrop-blur">
          <div className="flex items-center gap-3">
            <button onClick={goBack} className="p-2 rounded-lg hover:bg-muted transition-colors cursor-pointer">
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div className="flex items-center gap-2">
              <Globe className="w-5 h-5 text-accent" />
              <span className="font-serif font-semibold text-primary">VisaClear</span>
            </div>
          </div>
        </header>
        <div className="max-w-3xl mx-auto px-6 py-14 space-y-4 animate-pulse">
          <div className="h-5 w-32 bg-muted rounded-full" />
          <div className="h-10 w-3/4 bg-muted rounded" />
          <div className="h-5 w-full bg-muted rounded" />
          <div className="h-5 w-5/6 bg-muted rounded" />
          <div className="h-5 w-4/5 bg-muted rounded" />
        </div>
      </div>
    );
  }

  if (!article) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center px-6 text-center">
        <h1 className="font-serif text-4xl font-semibold text-primary mb-4">{t("article.not_found_title")}</h1>
        <Button onClick={() => navigate("/blog")} className="cursor-pointer">{t("article.back_to_blog")}</Button>
      </div>
    );
  }

  // Render simple markdown-like body
  const renderBody = (body: string) => {
    return body.split("\n\n").map((block, i) => {
      if (block.startsWith("## ")) {
        return <h2 key={i} className="font-serif text-2xl font-semibold text-primary mt-10 mb-4">{block.replace("## ", "")}</h2>;
      }
      if (block.startsWith("### ")) {
        return <h3 key={i} className="font-semibold text-lg text-primary mt-6 mb-2">{block.replace("### ", "")}</h3>;
      }
      if (block.startsWith("| ")) {
        const rows = block.split("\n").filter((r) => !r.startsWith("|---"));
        return (
          <div key={i} className="overflow-x-auto my-6">
            <table className="w-full text-sm border-collapse">
              {rows.map((row, ri) => {
                const cells = row.split("|").filter((c) => c.trim());
                return ri === 0 ? (
                  <thead key={ri}><tr>{cells.map((c, ci) => <th key={ci} className="border border-border px-4 py-2 text-left font-semibold bg-muted/40">{c.trim()}</th>)}</tr></thead>
                ) : (
                  <tbody key={ri}><tr>{cells.map((c, ci) => <td key={ci} className="border border-border px-4 py-2 text-muted-foreground">{c.trim()}</td>)}</tr></tbody>
                );
              })}
            </table>
          </div>
        );
      }
      if (block.startsWith("- ") || block.includes("\n- ")) {
        const items = block.split("\n").filter((l) => l.startsWith("- "));
        return (
          <ul key={i} className="list-disc list-inside space-y-1.5 text-muted-foreground my-4 ml-2">
            {items.map((item, li) => <li key={li}>{item.replace("- ", "")}</li>)}
          </ul>
        );
      }
      if (block.match(/^\d+\. /)) {
        const items = block.split("\n").filter((l) => l.match(/^\d+\. /));
        return (
          <ol key={i} className="list-decimal list-inside space-y-1.5 text-muted-foreground my-4 ml-2">
            {items.map((item, li) => <li key={li}>{item.replace(/^\d+\. /, "")}</li>)}
          </ol>
        );
      }
      if (block.startsWith("---")) {
        return <hr key={i} className="border-border my-8" />;
      }
      const parts = block.split(/\*\*(.*?)\*\*/g);
      return (
        <p key={i} className="text-muted-foreground leading-relaxed my-4">
          {parts.map((part, pi) => pi % 2 === 1 ? <strong key={pi} className="text-foreground font-semibold">{part}</strong> : part)}
        </p>
      );
    });
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border/40 px-6 py-4 flex items-center justify-between sticky top-0 z-40 bg-background/95 backdrop-blur">
        <div className="flex items-center gap-3">
          <button onClick={goBack} className="p-2 rounded-lg hover:bg-muted transition-colors cursor-pointer">
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="flex items-center gap-2">
            <Globe className="w-5 h-5 text-accent" />
            <span className="font-serif font-semibold text-primary">VisaClear</span>
            <span className="text-xs text-muted-foreground tracking-widest uppercase">{t("header.resources")}</span>
          </div>
        </div>
        <Button size="sm" onClick={() => navigate("/checklist")} className="cursor-pointer">
          {t("header.cta")}
        </Button>
      </header>

      <article className="max-w-3xl mx-auto px-6 py-14 pb-24">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
          <div className="flex flex-wrap items-center gap-3 mb-6">
            <span className="bg-accent/10 text-accent text-xs font-semibold px-3 py-1 rounded-full flex items-center gap-1">
              <Tag className="w-3 h-3" />{article.category}
            </span>
            <span className="text-muted-foreground text-xs flex items-center gap-1"><Clock className="w-3 h-3" />{article.readTime}</span>
            <span className="text-muted-foreground text-xs">{formatDate(article.publishedAt, i18n.language)}</span>
          </div>

          <h1 className="font-serif text-3xl md:text-5xl font-semibold text-primary leading-[1.15] mb-6 text-balance">
            {article.title}
          </h1>

          <p className="text-base md:text-lg text-muted-foreground border-s-4 border-accent/40 ps-5 italic mb-8 md:mb-10 leading-relaxed">
            {article.excerpt}
          </p>

          <div>{renderBody(article.body)}</div>

          <div className="mt-10 md:mt-14 bg-primary rounded-2xl p-6 sm:p-8 text-center text-primary-foreground">
            <h2 className="font-serif text-2xl font-semibold mb-2">{t("article.cta_title")}</h2>
            <p className="text-primary-foreground/65 text-sm mb-5">{t("article.cta_subtitle")}</p>
            <Button
              className="cursor-pointer bg-accent text-white hover:bg-accent/90 font-semibold"
              onClick={() => navigate("/checklist")}
            >
              {t("article.cta_button")} <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        </motion.div>
      </article>
    </div>
  );
}
