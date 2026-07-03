import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { CheckCircle2, PartyPopper } from "lucide-react";
import type { Doc } from "@/convex/_generated/dataModel.js";
import { Button } from "@/components/ui/button.tsx";
import { cn } from "@/lib/utils.ts";
import { getLocalizedSettleInGuide } from "@/lib/settle-in-data-i18n.ts";

export function SettleInToolkit({
  trip,
  onSave,
}: {
  trip: Doc<"saved_checklists">;
  onSave: (checkedItems: string[], progress: number) => void | Promise<void>;
}) {
  const { t, i18n } = useTranslation("settle_in");
  const guide = getLocalizedSettleInGuide(trip.destination, i18n.language);
  const [checkedItems, setCheckedItems] = useState<string[]>(trip.settleInCheckedItems ?? []);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setCheckedItems(trip.settleInCheckedItems ?? []);
  }, [trip.settleInCheckedItems]);

  if (!guide) {
    return (
      <div className="bg-card border border-border rounded-2xl p-5">
        <div className="flex items-center gap-2 mb-1">
          <PartyPopper className="w-4 h-4 text-accent" />
          <h3 className="font-semibold text-sm text-primary uppercase tracking-widest">{t("title")}</h3>
        </div>
        <p className="text-xs text-muted-foreground mt-2">
          {t("coming_soon", { destination: trip.destination })}
        </p>
      </div>
    );
  }

  const totalItems = guide.sections.reduce((sum, s) => sum + s.items.length, 0);
  const progress = totalItems === 0 ? 0 : Math.round((checkedItems.length / totalItems) * 100);

  const toggleItem = (itemId: string) => {
    setCheckedItems((prev) =>
      prev.includes(itemId) ? prev.filter((id) => id !== itemId) : [...prev, itemId],
    );
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave(checkedItems, progress);
      toast.success(t("toast.saved"));
    } catch {
      toast.error(t("toast.save_failed"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-card border border-border rounded-2xl p-5">
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2">
          <PartyPopper className="w-4 h-4 text-accent" />
          <h3 className="font-semibold text-sm text-primary uppercase tracking-widest">{t("title")}</h3>
        </div>
        <span className="text-xs font-semibold text-accent">{t("complete_pct", { progress })}</span>
      </div>
      <p className="text-xs text-muted-foreground mt-1 mb-4">
        {t("intro", { destination: trip.destination })}
      </p>

      <div className="space-y-4">
        {guide.sections.map((section) => (
          <div key={section.id}>
            <h4 className="text-xs font-semibold text-primary uppercase tracking-wide mb-2">{section.label}</h4>
            <div className="space-y-1.5">
              {section.items.map((item) => {
                const checked = checkedItems.includes(item.id);
                return (
                  <label
                    key={item.id}
                    className="flex items-start gap-2.5 bg-background border border-border rounded-lg p-2.5 cursor-pointer hover:border-accent/40 transition-colors"
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleItem(item.id)}
                      className="mt-0.5 shrink-0"
                    />
                    <div className="min-w-0">
                      <div className={cn("text-sm font-medium", checked ? "text-muted-foreground line-through" : "text-foreground")}>
                        {item.title}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">{item.description}</p>
                      <p className="text-[11px] text-muted-foreground/70 mt-1">{t("where", { where: item.where })}</p>
                    </div>
                  </label>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <Button size="sm" disabled={saving} className="cursor-pointer mt-4" onClick={() => void handleSave()}>
        {saving ? t("saving") : (
          <span className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5" /> {t("save")}</span>
        )}
      </Button>
    </div>
  );
}
