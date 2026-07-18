import type { ReactNode } from "react";
import { useState } from "react";
import { motion } from "motion/react";
import { useQuery, useMutation, useAction } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import { Button } from "@/components/ui/button.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { Textarea } from "@/components/ui/textarea.tsx";
import { Trash2, Settings, Plus, Eye, Languages } from "lucide-react";
import { cn, convexErrMsg } from "@/lib/utils.ts";
import { toast } from "sonner";

export function BlogAdminPanel() {
  const articles = useQuery(api.blog.adminList);
  const upsert = useMutation(api.blog.adminUpsert);
  const togglePublished = useMutation(api.blog.adminTogglePublished);
  const deleteArticle = useMutation(api.blog.adminDelete);
  const seedArticles = useMutation(api.blog.adminSeedArticles);
  const translateArticle = useAction(api.blogAI.translateArticle);

  const [editing, setEditing] = useState<string | null>(null); // _id or "new"
  const [saving, setSaving] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const [translating, setTranslating] = useState<string | null>(null); // article _id being translated
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [form, setForm] = useState({
    slug: "", title: "", excerpt: "", body: "", category: "", readTime: "", featured: false, published: true, publishedAt: "",
  });

  const openNew = () => {
    setForm({ slug: "", title: "", excerpt: "", body: "", category: "", readTime: "5 min read", featured: false, published: true, publishedAt: new Date().toISOString().slice(0, 10) });
    setEditing("new");
  };

  const openEdit = (a: NonNullable<typeof articles>[number]) => {
    setForm({
      slug: a.slug, title: a.title, excerpt: a.excerpt, body: a.body,
      category: a.category, readTime: a.readTime, featured: a.featured,
      published: a.published, publishedAt: a.publishedAt ? a.publishedAt.slice(0, 10) : "",
    });
    setEditing(a._id);
  };

  const handleSave = async () => {
    if (!form.slug.trim() || !form.title.trim() || !form.body.trim()) {
      toast.error("Slug, title, and body are required.");
      return;
    }
    setSaving(true);
    try {
      await upsert({
        _id: editing !== "new" ? editing as Parameters<typeof upsert>[0]["_id"] : undefined,
        slug: form.slug.trim(),
        title: form.title.trim(),
        excerpt: form.excerpt.trim(),
        body: form.body,
        category: form.category.trim() || "Guides",
        readTime: form.readTime.trim() || "5 min read",
        featured: form.featured,
        published: form.published,
        publishedAt: form.publishedAt ? new Date(form.publishedAt).toISOString() : undefined,
      });
      toast.success(editing === "new" ? "Article created." : "Article saved.");
      setEditing(null);
    } catch (err) {
      toast.error(convexErrMsg(err) ?? "Failed to save.");
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = async (id: Parameters<typeof togglePublished>[0]["_id"]) => {
    try {
      await togglePublished({ _id: id });
    } catch {
      toast.error("Failed to update.");
    }
  };

  const handleDelete = async (id: Parameters<typeof deleteArticle>[0]["_id"]) => {
    try {
      await deleteArticle({ _id: id });
      toast.success("Article deleted.");
      setConfirmDelete(null);
    } catch {
      toast.error("Failed to delete.");
    }
  };

  const handleSeed = async () => {
    setSeeding(true);
    try {
      const count = await seedArticles({});
      toast.success(`${count} articles loaded successfully.`);
    } catch (err) {
      toast.error(convexErrMsg(err) ?? "Seed failed.");
    } finally {
      setSeeding(false);
    }
  };

  const handleTranslate = async (articleId: string) => {
    setTranslating(articleId);
    try {
      await translateArticle({ articleId: articleId as Parameters<typeof translateArticle>[0]["articleId"] });
      toast.success("Translated into FR · ES · PT · AR · HI. Live for all users immediately.");
    } catch (err) {
      toast.error(convexErrMsg(err) ?? "Translation failed. Check your OpenAI key.");
    } finally {
      setTranslating(null);
    }
  };

  const f = (key: keyof typeof form, val: string | boolean) =>
    setForm((prev) => ({ ...prev, [key]: val }));

  const inputCls = "w-full px-3.5 py-2.5 text-sm rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring";

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-sm text-primary uppercase tracking-widest">Blog Articles</h3>
          <p className="text-xs text-muted-foreground mt-0.5">Create, edit, publish, and delete blog articles. Changes go live instantly.</p>
        </div>
        <Button size="sm" className="cursor-pointer font-semibold" onClick={openNew}>
          <Plus className="w-3.5 h-3.5 mr-1" /> New Article
        </Button>
      </div>

      {/* Seed prompt — only shown when table is empty */}
      {articles !== undefined && articles.length === 0 && editing === null && (
        <div className="bg-accent/5 border border-accent/20 rounded-xl p-5 text-center">
          <p className="text-sm text-muted-foreground mb-3">No articles yet. Load the 10 original VisaClear articles to get started.</p>
          <Button size="sm" disabled={seeding} className="cursor-pointer font-semibold" onClick={() => void handleSeed()}>
            {seeding ? "Loading…" : "Load Default Articles"}
          </Button>
        </div>
      )}

      {/* Edit / create form */}
      {editing !== null && (
        <div className="bg-card border border-border rounded-xl p-5 space-y-4">
          <h4 className="font-semibold text-sm text-primary">{editing === "new" ? "New Article" : "Edit Article"}</h4>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1.5">Slug (URL)</label>
              <input type="text" value={form.slug} onChange={(e) => f("slug", e.target.value)} placeholder="my-article-title" className={inputCls} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1.5">Category</label>
              <input type="text" value={form.category} onChange={(e) => f("category", e.target.value)} placeholder="Visa Tips" className={inputCls} />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-foreground mb-1.5">Title</label>
            <input type="text" value={form.title} onChange={(e) => f("title", e.target.value)} placeholder="Article title" className={inputCls} />
          </div>
          <div>
            <label className="block text-xs font-semibold text-foreground mb-1.5">Excerpt (1–2 sentences shown in the list)</label>
            <Textarea value={form.excerpt} onChange={(e) => f("excerpt", e.target.value)} placeholder="Short description shown on the blog listing page." className="min-h-[70px]" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-foreground mb-1.5">Body (markdown — use ## for headings, **bold**, - lists, 1. ordered lists)</label>
            <Textarea value={form.body} onChange={(e) => f("body", e.target.value)} placeholder="Full article content..." className="min-h-[280px] font-mono text-xs" />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1.5">Read Time</label>
              <input type="text" value={form.readTime} onChange={(e) => f("readTime", e.target.value)} placeholder="5 min read" className={inputCls} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1.5">Published Date</label>
              <input type="date" value={form.publishedAt} onChange={(e) => f("publishedAt", e.target.value)} className={inputCls} />
            </div>
            <div className="flex flex-col gap-2 pt-5">
              <label className="flex items-center gap-2 text-xs font-semibold text-foreground cursor-pointer select-none">
                <input type="checkbox" checked={form.featured} onChange={(e) => f("featured", e.target.checked)} className="cursor-pointer" />
                Featured (shown at top)
              </label>
              <label className="flex items-center gap-2 text-xs font-semibold text-foreground cursor-pointer select-none">
                <input type="checkbox" checked={form.published} onChange={(e) => f("published", e.target.checked)} className="cursor-pointer" />
                Published (visible to users)
              </label>
            </div>
          </div>
          <div className="flex gap-2 pt-2">
            <Button disabled={saving} className="cursor-pointer font-semibold" onClick={() => void handleSave()}>
              {saving ? "Saving…" : "Save Article"}
            </Button>
            <Button variant="outline" className="cursor-pointer" onClick={() => setEditing(null)}>Cancel</Button>
          </div>
        </div>
      )}

      {/* Article list */}
      {articles === undefined ? (
        <div className="space-y-2">
          {[0, 1, 2].map((i) => <Skeleton key={i} className="h-16 rounded-xl" />)}
        </div>
      ) : (
        <div className="space-y-2">
          {articles.map((a) => {
            type ArticleTrans = { translations?: Record<string, unknown> };
            const transObj = (a as ArticleTrans).translations ?? {};
            const transCount = ["fr", "es", "pt", "ar", "hi"].filter((l) => !!transObj[l]).length;
            const isTranslating = translating === a._id;

            return (
              <div key={a._id} className="bg-card border border-border rounded-xl p-4 flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className={cn("text-[10px] font-semibold px-2 py-0.5 rounded-full border", a.published ? "text-green-700 bg-green-50 border-green-200" : "text-muted-foreground bg-muted border-border")}>
                      {a.published ? "Published" : "Draft"}
                    </span>
                    {a.featured && <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-accent/10 text-accent border border-accent/20">Featured</span>}
                    <span className="text-[10px] text-muted-foreground">{a.category}</span>
                    {/* Translation status badge */}
                    {transCount === 5 ? (
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                        5 langs ✓
                      </span>
                    ) : transCount > 0 ? (
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                        {transCount}/5 langs
                      </span>
                    ) : (
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-gray-50 text-gray-500 border border-gray-200">
                        EN only
                      </span>
                    )}
                  </div>
                  <p className="text-sm font-semibold text-foreground truncate">{a.title}</p>
                  <p className="text-xs text-muted-foreground">/blog/{a.slug}</p>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  {/* Translate button */}
                  <button
                    onClick={() => void handleTranslate(a._id)}
                    disabled={isTranslating}
                    className={cn(
                      "p-1.5 rounded-lg transition-colors cursor-pointer",
                      isTranslating
                        ? "text-blue-400 bg-blue-50 animate-pulse"
                        : transCount === 5
                        ? "text-emerald-500 hover:bg-emerald-50"
                        : "text-muted-foreground hover:text-blue-600 hover:bg-blue-50"
                    )}
                    title={transCount === 5 ? "Re-translate (5 langs)" : "Translate to FR · ES · PT · AR · HI"}
                  >
                    <Languages className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => void handleToggle(a._id)}
                    className="p-1.5 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/5 cursor-pointer transition-colors"
                    title={a.published ? "Unpublish" : "Publish"}
                  >
                    <Eye className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => openEdit(a)}
                    className="p-1.5 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/5 cursor-pointer transition-colors"
                    title="Edit"
                  >
                    <Settings className="w-3.5 h-3.5" />
                  </button>
                  {confirmDelete === a._id ? (
                    <>
                      <button onClick={() => void handleDelete(a._id)} className="text-xs font-semibold text-destructive cursor-pointer px-2 py-1 rounded hover:bg-destructive/10">Confirm</button>
                      <button onClick={() => setConfirmDelete(null)} className="text-xs text-muted-foreground cursor-pointer px-1">Cancel</button>
                    </>
                  ) : (
                    <button
                      onClick={() => setConfirmDelete(a._id)}
                      className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/5 cursor-pointer transition-colors"
                      title="Delete"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </motion.div>
  );
}
