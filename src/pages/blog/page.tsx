import { useState } from "react";
import { motion } from "motion/react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api.js";

import { Button } from "@/components/ui/button.tsx";
import { Globe, ArrowLeft, Clock, ChevronRight, BookOpen, Tag, Plane, HelpCircle, Lightbulb, AlertCircle, MessageSquare } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useSeo } from "@/hooks/use-seo.ts";
import { useSmartBack } from "@/hooks/use-smart-back.ts";
import { useCountryName } from "@/hooks/use-country-name.ts";
import { DESTINATION_FLAGS } from "@/lib/destination-flags.ts";
import { cn, convexErrMsg } from "@/lib/utils.ts";
import { toast } from "sonner";
import { getLocalizedArticleOverlay } from "@/lib/blog-content-i18n.ts";

function formatDate(iso: string | undefined, lang = "en") {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString(lang, { month: "long", day: "numeric", year: "numeric" });
}

type CommunityCategory = "experience" | "question" | "tip" | "complaint";
const COMMUNITY_CATEGORY_CONFIG: Record<CommunityCategory, { label: string; Icon: typeof Plane; color: string }> = {
  experience: { label: "Experience", Icon: Plane,        color: "text-blue-600 bg-blue-50 border-blue-200" },
  question:   { label: "Question",   Icon: HelpCircle,   color: "text-purple-600 bg-purple-50 border-purple-200" },
  tip:        { label: "Tip",        Icon: Lightbulb,    color: "text-amber-600 bg-amber-50 border-amber-200" },
  complaint:  { label: "Complaint",  Icon: AlertCircle,  color: "text-red-600 bg-red-50 border-red-200" },
};

export default function BlogPage() {
  const { t, i18n } = useTranslation("blog");
  useSeo({ title: "Blog", description: "Visa tips, country guides, and immigration insights from the VisaClear team. Everything you need to know to get your visa approved." });
  const navigate = useNavigate();
  const goBack = useSmartBack("/");
  const translateCountry = useCountryName();
  const [activeTab, setActiveTab] = useState<"articles" | "community">("articles");
  const [activeCategory, setActiveCategory] = useState("All");
  const [newsletterEmail, setNewsletterEmail] = useState("");
  const [subscribing, setSubscribing] = useState(false);
  const subscribeToNewsletter = useMutation(api.newsletter.subscribe);
  const featuredCommunityPosts = useQuery(api.community.listFeaturedPosts) ?? [];
  const articlesRaw = useQuery(api.blog.listPublished);
  const articles = (articlesRaw ?? []).map((a) => {
    // Static JSON overlay covers the 10 original seeded articles (manually curated).
    const jsonOverlay = getLocalizedArticleOverlay(a.slug, i18n.language);
    // DB translations cover any article the admin translates via the admin panel.
    type LangTrans = { title?: string; category?: string; excerpt?: string };
    const dbOverlay = (a as { translations?: Record<string, LangTrans> }).translations?.[i18n.language] ?? null;
    const overlay = jsonOverlay ?? dbOverlay;
    if (!overlay) return a;
    return {
      ...a,
      title: overlay.title ?? a.title,
      category: overlay.category ?? a.category,
      excerpt: overlay.excerpt ?? a.excerpt,
    };
  });
  const loadingArticles = articlesRaw === undefined;

  const allCategories = ["All", ...Array.from(new Set(articles.map((a) => a.category)))];
  const filtered = activeCategory === "All" ? articles : articles.filter((p) => p.category === activeCategory);
  const featured = articles.find((p) => p.featured);
  const rest = filtered.filter((p) => !p.featured || activeCategory !== "All");

  const handleSubscribe = async () => {
    if (!newsletterEmail.trim()) {
      toast.error(t("toast.email_required"));
      return;
    }
    setSubscribing(true);
    try {
      const result = await subscribeToNewsletter({ email: newsletterEmail });
      toast.success(result.alreadySubscribed ? t("toast.already_subscribed") : t("toast.subscribed"));
      setNewsletterEmail("");
    } catch (err) {
      toast.error(convexErrMsg(err) ?? t("toast.subscribe_failed"));
    } finally {
      setSubscribing(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Nav */}
      <header className="border-b border-border/40 px-6 py-4 flex items-center justify-between sticky top-0 z-40 bg-background/95 backdrop-blur">
        <div className="flex items-center gap-3">
          <button onClick={goBack} className="p-2 rounded-lg hover:bg-muted transition-colors cursor-pointer">
            <ArrowLeft className="w-4 h-4" />
          </button>
          <button onClick={() => navigate("/")} className="flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity">
            <Globe className="w-5 h-5 text-accent" />
            <span className="font-serif font-semibold text-primary">VisaClear</span>
            <span className="text-xs text-muted-foreground tracking-widest uppercase">{t("header.resources")}</span>
          </button>
        </div>
        <Button size="sm" onClick={() => navigate("/checklist")} className="cursor-pointer">
          {t("header.cta")}
        </Button>
      </header>

      <div className="max-w-5xl mx-auto px-6 py-16">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-10">
          <p className="text-xs tracking-widest uppercase font-semibold text-accent mb-3">{t("page.eyebrow")}</p>
          <h1 className="font-serif text-3xl md:text-5xl font-semibold text-primary mb-4">{t("page.title")}</h1>
          <p className="text-muted-foreground max-w-xl mx-auto">
            {t("page.subtitle")}
          </p>
        </motion.div>

        {/* Tab switcher */}
        <div className="flex items-center gap-2 mb-10 border-b border-border">
          <button
            type="button"
            onClick={() => setActiveTab("articles")}
            className={cn(
              "px-5 py-2.5 text-sm font-semibold transition-colors cursor-pointer border-b-2 -mb-px",
              activeTab === "articles"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-primary",
            )}
          >
            Articles
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("community")}
            className={cn(
              "flex items-center gap-1.5 px-5 py-2.5 text-sm font-semibold transition-colors cursor-pointer border-b-2 -mb-px",
              activeTab === "community"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-primary",
            )}
          >
            <MessageSquare className="w-3.5 h-3.5" />
            Community
          </button>
        </div>

        {/* Community tab */}
        {activeTab === "community" && (
          <div>
            {featuredCommunityPosts.length === 0 ? (
              <div className="text-center py-20">
                <MessageSquare className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-muted-foreground text-sm mb-4">No community posts featured yet.</p>
                <Button variant="outline" onClick={() => navigate("/community")} className="cursor-pointer">
                  Browse Community
                </Button>
              </div>
            ) : (
              <>
                <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-5 mb-8">
                  {featuredCommunityPosts.map((post) => {
                    const cfg = COMMUNITY_CATEGORY_CONFIG[post.category as CommunityCategory];
                    const Icon = cfg?.Icon ?? Plane;
                    return (
                      <motion.article
                        key={post._id}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-background border border-border/50 rounded-2xl p-5 flex flex-col gap-3"
                      >
                        <div className="flex items-center gap-2">
                          <span className={cn("flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-full border", cfg?.color)}>
                            <Icon className="w-3 h-3" />
                            {cfg?.label}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {DESTINATION_FLAGS[post.country] ?? "🌍"} {translateCountry(post.country)}
                          </span>
                        </div>
                        <h3 className="font-serif text-base font-semibold text-primary leading-snug">{post.title}</h3>
                        <p className="text-sm text-muted-foreground leading-relaxed line-clamp-3">{post.body}</p>
                        <p className="text-[11px] text-muted-foreground/60 mt-auto">
                          Anonymous · {new Date(post.createdAt).toLocaleDateString("en-GB", { month: "short", year: "numeric" })}
                        </p>
                      </motion.article>
                    );
                  })}
                </div>
                <div className="text-center">
                  <Button onClick={() => navigate("/community")} className="cursor-pointer">
                    View All Community Posts <ChevronRight className="w-4 h-4 ml-1" />
                  </Button>
                </div>
              </>
            )}
          </div>
        )}

        {/* Articles tab */}
        {activeTab === "articles" && <>

        {/* Featured post */}
        {featured && activeCategory === "All" && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-primary rounded-2xl p-6 md:p-10 mb-8 md:mb-12 cursor-pointer group"
            onClick={() => navigate(`/blog/${featured.slug}`)}
          >
            <div className="flex flex-wrap items-center gap-3 mb-4">
              <span className="bg-accent text-white text-xs font-semibold px-3 py-1 rounded-full">{featured.category}</span>
              <span className="text-primary-foreground/50 text-xs flex items-center gap-1"><Clock className="w-3 h-3" />{featured.readTime}</span>
              <span className="text-primary-foreground/50 text-xs">{formatDate(featured.publishedAt, i18n.language)}</span>
            </div>
            <h2 className="font-serif text-3xl font-semibold text-primary-foreground mb-3 group-hover:text-accent transition-colors leading-snug">
              {featured.title}
            </h2>
            <p className="text-primary-foreground/65 leading-relaxed mb-5">{featured.excerpt}</p>
            <div className="flex items-center gap-1.5 text-accent font-semibold text-sm">
              {t("featured.read")} <ChevronRight className="w-4 h-4" />
            </div>
          </motion.div>
        )}

        {/* Category filter */}
        <div className="flex flex-wrap gap-2 mb-10">
          {allCategories.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-4 py-2 rounded-full text-sm font-semibold transition-all cursor-pointer ${
                activeCategory === cat
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Loading skeletons */}
        {loadingArticles && (
          <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="bg-background border border-border/50 rounded-2xl p-6 space-y-3 animate-pulse">
                <div className="h-5 w-24 bg-muted rounded-full" />
                <div className="h-4 w-full bg-muted rounded" />
                <div className="h-4 w-5/6 bg-muted rounded" />
                <div className="h-3 w-3/4 bg-muted rounded" />
              </div>
            ))}
          </div>
        )}

        {/* Post grid */}
        {!loadingArticles && (
          <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-6">
            {rest.map((post, i) => (
              <motion.div
                key={post._id}
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.05 }}
                className="bg-background border border-border/50 rounded-2xl p-6 cursor-pointer hover:border-accent/30 transition-colors group"
                onClick={() => navigate(`/blog/${post.slug}`)}
              >
                <div className="flex items-center gap-2 mb-3">
                  <span className="bg-accent/10 text-accent text-[11px] font-semibold px-2.5 py-1 rounded-full uppercase tracking-[0.12em] flex items-center gap-1">
                    <Tag className="w-2.5 h-2.5" />{post.category}
                  </span>
                </div>
                <h3 className="font-serif text-lg font-semibold text-primary mb-2 leading-snug group-hover:text-accent transition-colors">
                  {post.title}
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed mb-4 line-clamp-3">{post.excerpt}</p>
                <div className="flex items-center justify-between text-xs text-muted-foreground border-t border-border/40 pt-3">
                  <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{post.readTime}</span>
                  <span>{formatDate(post.publishedAt, i18n.language)}</span>
                </div>
              </motion.div>
            ))}
            {rest.length === 0 && (
              <p className="text-muted-foreground text-sm col-span-3 py-10 text-center">No articles in this category yet.</p>
            )}
          </div>
        )}

        </> /* end articles tab */}

        {/* Newsletter CTA */}
        <div className="mt-12 md:mt-16 bg-primary rounded-2xl p-6 sm:p-10 text-center text-primary-foreground">
          <BookOpen className="w-8 h-8 text-accent mx-auto mb-4" />
          <h2 className="font-serif text-2xl font-semibold mb-2">{t("newsletter.title")}</h2>
          <p className="text-primary-foreground/65 text-sm mb-6 max-w-sm mx-auto">
            {t("newsletter.subtitle")}
          </p>
          <div className="flex flex-col sm:flex-row gap-3 max-w-sm mx-auto">
            <input
              type="email"
              placeholder="example@gmail.com"
              value={newsletterEmail}
              onChange={(e) => setNewsletterEmail(e.target.value)}
              disabled={subscribing}
              className="flex-1 px-4 py-2.5 rounded-xl bg-white/10 border border-white/20 text-primary-foreground placeholder:text-primary-foreground/40 text-sm focus:outline-none focus:border-accent disabled:opacity-60"
            />
            <Button
              size="sm"
              disabled={subscribing}
              className="bg-white text-primary hover:bg-white/90 cursor-pointer font-semibold whitespace-nowrap disabled:opacity-60"
              onClick={handleSubscribe}
            >
              {subscribing ? t("newsletter.subscribing") : t("newsletter.subscribe")}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
