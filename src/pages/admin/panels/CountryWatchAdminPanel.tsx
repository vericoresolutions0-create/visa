import type { ReactNode } from "react";
import { useState } from "react";
import { motion } from "motion/react";
import { useTranslation } from "react-i18next";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import { Button } from "@/components/ui/button.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { Textarea } from "@/components/ui/textarea.tsx";
import { CountrySelect } from "@/components/CountrySelect.tsx";
import { toast } from "sonner";

export function CountryWatchAdminPanel() {
  const { t } = useTranslation("admin");
  const updates = useQuery(api.countryWatch.listUpdates, {});
  const publishUpdate = useMutation(api.countryWatch.publishUpdate);
  const [countryName, setCountryName] = useState("");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [publishing, setPublishing] = useState(false);

  const handlePublish = async () => {
    if (!countryName || !title.trim() || !body.trim()) {
      toast.error(t("watch.toast_required"));
      return;
    }
    setPublishing(true);
    try {
      await publishUpdate({ countryName, title: title.trim(), body: body.trim() });
      toast.success(t("watch.toast_published", { country: countryName }));
      setTitle("");
      setBody("");
    } catch {
      toast.error(t("watch.toast_publish_failed"));
    } finally {
      setPublishing(false);
    }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <div className="bg-card border border-border rounded-xl p-5">
        <h3 className="font-semibold text-sm text-primary uppercase tracking-widest mb-4">{t("watch.publish_heading")}</h3>
        <p className="text-xs text-muted-foreground mb-4">
          {t("watch.publish_description")}
        </p>
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-semibold text-foreground mb-1.5">{t("watch.country_label")}</label>
            <CountrySelect
              value={countryName}
              onChange={setCountryName}
              placeholder={t("watch.select_country")}
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-foreground mb-1.5">{t("watch.title_label")}</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={t("watch.title_placeholder")}
              className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-foreground mb-1.5">{t("watch.details_label")}</label>
            <Textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder={t("watch.details_placeholder")}
              className="min-h-[120px]"
            />
          </div>
          <Button disabled={publishing} className="cursor-pointer font-semibold" onClick={() => void handlePublish()}>
            {publishing ? t("watch.publishing") : t("watch.publish")}
          </Button>
        </div>
      </div>

      <div>
        <h3 className="font-semibold text-sm text-primary uppercase tracking-widest mb-3">{t("watch.published_heading")}</h3>
        {updates === undefined ? (
          <Skeleton className="h-20 rounded-xl" />
        ) : updates.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("watch.published_empty")}</p>
        ) : (
          <div className="space-y-2">
            {updates.map((u) => (
              <div key={u._id} className="bg-card border border-border rounded-xl p-4">
                <div className="text-xs font-semibold text-accent uppercase tracking-wide mb-1">{u.countryName}</div>
                <div className="text-sm font-semibold text-foreground mb-1">{u.title}</div>
                <div className="text-xs text-muted-foreground">{u.body}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
}
