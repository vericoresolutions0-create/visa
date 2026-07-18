import type { ReactNode } from "react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import { Button } from "@/components/ui/button.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { Building2, Copy, Plus, Eye, UserPlus, ListChecks } from "lucide-react";
import { cn, convexErrMsg } from "@/lib/utils.ts";
import { toast } from "sonner";

export function PartnersAdminPanel() {
  const { t } = useTranslation("admin");
  const partners = useQuery(api.partners.listPartners, {});
  const createPartner = useMutation(api.partners.createPartner);
  const toggleActive = useMutation(api.partners.togglePartnerActive);
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [partnerType, setPartnerType] = useState<"university" | "agency" | "other">("university");
  const [submitting, setSubmitting] = useState(false);
  const [copiedSlug, setCopiedSlug] = useState<string | null>(null);

  const handleCreate = async () => {
    setSubmitting(true);
    try {
      const result = await createPartner({ name, slug: slug || name, partnerType });
      toast.success(t("partners.toast_created", { slug: result.slug }));
      setName("");
      setSlug("");
      setShowForm(false);
    } catch (err) {
      const message = convexErrMsg(err) ?? t("partners.toast_create_error");
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleCopyLink = (partnerSlug: string) => {
    const link = `${window.location.origin}/?ref=${partnerSlug}`;
    void navigator.clipboard.writeText(link);
    setCopiedSlug(partnerSlug);
    toast.success(t("partners.toast_link_copied"));
    setTimeout(() => setCopiedSlug(null), 2000);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-sm text-primary uppercase tracking-widest">
            {t("partners.heading", { count: partners?.length ?? 0 })}
          </h3>
          <p className="text-xs text-muted-foreground mt-1">
            {t("partners.description")}
          </p>
        </div>
        <Button size="sm" onClick={() => setShowForm((v) => !v)} className="cursor-pointer">
          <Plus className="w-3.5 h-3.5" /> {showForm ? t("partners.cancel") : t("partners.add")}
        </Button>
      </div>

      {showForm && (
        <div className="rounded-lg border border-border bg-background p-4 space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t("partners.name_placeholder")}
              className="w-full px-3 py-2 text-sm rounded-lg border border-input bg-card"
            />
            <input
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              placeholder={t("partners.slug_placeholder")}
              className="w-full px-3 py-2 text-sm rounded-lg border border-input bg-card"
            />
          </div>
          <select
            value={partnerType}
            onChange={(e) => setPartnerType(e.target.value as typeof partnerType)}
            className="w-full px-3 py-2 text-sm rounded-lg border border-input bg-card"
          >
            <option value="university">{t("partners.type_university")}</option>
            <option value="agency">{t("partners.type_agency")}</option>
            <option value="other">{t("partners.type_other")}</option>
          </select>
          <Button size="sm" className="w-full cursor-pointer" disabled={!name.trim() || submitting} onClick={() => { void handleCreate(); }}>
            {submitting ? t("partners.creating") : t("partners.create")}
          </Button>
        </div>
      )}

      {partners === undefined ? (
        <Skeleton className="h-40 w-full rounded-xl" />
      ) : partners.length === 0 ? (
        <div className="border border-dashed border-border rounded-xl p-8 text-center text-sm text-muted-foreground">
          {t("partners.empty")}
        </div>
      ) : (
        <div className="space-y-2">
          {partners.map((p) => (
            <div key={p._id} className="rounded-lg border border-border bg-card p-4">
              <div className="flex items-center justify-between gap-3 mb-3">
                <div className="flex items-center gap-2 min-w-0">
                  <Building2 className="w-4 h-4 text-accent shrink-0" />
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-foreground truncate">{p.name}</p>
                    <p className="text-[11px] text-muted-foreground capitalize">{p.partnerType}</p>
                  </div>
                </div>
                <button
                  onClick={() => { void toggleActive({ partnerId: p._id, active: !p.active }); }}
                  className={cn(
                    "shrink-0 text-[10px] font-bold px-2 py-1 rounded-full cursor-pointer transition-colors",
                    p.active ? "bg-green-50 text-green-700 border border-green-200" : "bg-secondary text-secondary-foreground border border-border"
                  )}
                >
                  {p.active ? t("partners.active") : t("partners.inactive")}
                </button>
              </div>

              <div className="flex items-center gap-2 p-2.5 bg-muted/40 rounded-lg border border-border mb-3 text-xs font-mono text-muted-foreground overflow-hidden">
                <span className="truncate flex-1">
                  {typeof window !== "undefined" ? `${window.location.origin}/?ref=${p.slug}` : ""}
                </span>
                <button
                  onClick={() => handleCopyLink(p.slug)}
                  className="shrink-0 inline-flex items-center gap-1 text-[11px] font-semibold text-primary hover:text-primary/80 cursor-pointer"
                >
                  <Copy className="w-3 h-3" /> {copiedSlug === p.slug ? t("partners.copied") : t("partners.copy")}
                </button>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div className="bg-muted/30 rounded-lg p-2.5 text-center">
                  <div className="flex items-center justify-center gap-1 text-muted-foreground mb-1">
                    <Eye className="w-3 h-3" />
                    <span className="text-[10px] uppercase tracking-wide font-semibold">{t("partners.visits")}</span>
                  </div>
                  <p className="text-sm font-bold text-primary">{p.visits}</p>
                </div>
                <div className="bg-muted/30 rounded-lg p-2.5 text-center">
                  <div className="flex items-center justify-center gap-1 text-muted-foreground mb-1">
                    <UserPlus className="w-3 h-3" />
                    <span className="text-[10px] uppercase tracking-wide font-semibold">{t("partners.signups")}</span>
                  </div>
                  <p className="text-sm font-bold text-primary">{p.signups}</p>
                </div>
                <div className="bg-muted/30 rounded-lg p-2.5 text-center">
                  <div className="flex items-center justify-center gap-1 text-muted-foreground mb-1">
                    <ListChecks className="w-3 h-3" />
                    <span className="text-[10px] uppercase tracking-wide font-semibold">{t("partners.checklists")}</span>
                  </div>
                  <p className="text-sm font-bold text-primary">{p.checklistCompletions}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
