import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { Authenticated, AuthLoading, Unauthenticated, useMutation, useQuery } from "convex/react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { api } from "@/convex/_generated/api.js";
import { useSeo } from "@/hooks/use-seo.ts";
import { useSmartBack } from "@/hooks/use-smart-back.ts";
import { type VisaType } from "@/lib/visa-data.ts";
import { getLocalizedChecklist, ensureChecklistLanguageLoaded } from "@/lib/visa-data-i18n.ts";
import { Button } from "@/components/ui/button.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { SignInButton } from "@/components/ui/signin.tsx";
import { WaitTimeStat } from "@/components/wait-time-stat.tsx";
import { PreSubmissionAuditCard } from "@/components/checklist/pre-submission-audit.tsx";
import {
  Globe,
  Shield,
  CheckCircle2,
  UploadCloud,
  LogIn,
  FileWarning,
  Loader2,
  ArrowLeft,
} from "lucide-react";

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB, matches document-scan use case
const ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp", "application/pdf"];

function PortalHeader() {
  const { t } = useTranslation("client-portal");
  const goBack = useSmartBack("/");
  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/90 backdrop-blur-md">
      <div className="max-w-2xl mx-auto px-6 py-4 flex items-center gap-3">
        <button onClick={goBack} className="text-muted-foreground hover:text-primary transition-colors cursor-pointer p-1 -ml-1">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="w-7 h-7 rounded-md bg-primary flex items-center justify-center">
          <Globe className="w-3.5 h-3.5 text-primary-foreground" />
        </div>
        <div>
          <span className="font-serif text-lg font-semibold text-primary">VisaClear</span>
          <span className="text-[10px] text-muted-foreground ml-1.5 tracking-widest uppercase">{t("header.tag")}</span>
        </div>
      </div>
    </header>
  );
}

function ClientPortalInner({
  token,
  destination,
  visaType,
  clientName,
}: {
  token: string;
  destination: string;
  visaType: string;
  clientName: string;
}) {
  const { t, i18n } = useTranslation("client-portal");
  const [, setI18nTick] = useState(0);
  useEffect(() => {
    ensureChecklistLanguageLoaded(i18n.language).then(() => setI18nTick((n) => n + 1));
  }, [i18n.language]);
  const checklist = getLocalizedChecklist(destination, visaType as VisaType, i18n.language);
  const uploads = useQuery(api.clientIntakes.listMyUploadsForIntake, { token });
  const generateUploadUrl = useMutation(api.clientIntakes.generateUploadUrl);
  const recordDocument = useMutation(api.clientIntakes.recordDocument);
  const [uploadingIds, setUploadingIds] = useState<Set<string>>(new Set());

  const uploadedLabels = new Set((uploads ?? []).map((u) => u.label));

  if (!checklist) {
    return (
      <div className="text-center py-16">
        <FileWarning className="w-10 h-10 text-amber-500 mx-auto mb-3" />
        <p className="text-sm text-muted-foreground">
          {t("no_checklist")}
        </p>
      </div>
    );
  }

  const handleFileSelected = async (itemId: string, label: string, file: File) => {
    if (file.size > MAX_FILE_SIZE) {
      toast.error(t("toast.too_large"));
      return;
    }
    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      toast.error(t("toast.bad_type"));
      return;
    }

    setUploadingIds((prev) => new Set(prev).add(itemId));
    try {
      const uploadUrl = await generateUploadUrl({ token });
      const response = await fetch(uploadUrl, {
        method: "POST",
        headers: { "Content-Type": file.type },
        body: file,
      });
      if (!response.ok) throw new Error("Upload failed");
      const { storageId } = await response.json();
      await recordDocument({
        token,
        storageId,
        label,
        fileName: file.name,
        fileSize: file.size,
        mimeType: file.type,
      });
      toast.success(t("toast.uploaded", { label }));
    } catch {
      toast.error(t("toast.upload_failed", { label }));
    } finally {
      setUploadingIds((prev) => {
        const next = new Set(prev);
        next.delete(itemId);
        return next;
      });
    }
  };

  const requiredCount = checklist.items.filter((i) => i.required).length;
  const requiredUploaded = checklist.items.filter((i) => i.required && uploadedLabels.has(i.title)).length;

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs uppercase tracking-[0.2em] font-semibold text-accent mb-2">
          {t("greeting", { name: clientName || t("there") })}
        </p>
        <h1 className="font-serif text-3xl font-semibold text-primary mb-2">
          {t("title")}
        </h1>
        <p className="text-sm text-muted-foreground">
          {t("subtitle", { destination, visaType })}
        </p>
        <div className="mt-4 rounded-xl border border-border bg-card p-4">
          <div className="flex items-center justify-between text-xs font-semibold mb-2">
            <span className="text-muted-foreground">{t("required_docs")}</span>
            <span className="text-primary">{requiredUploaded} / {requiredCount}</span>
          </div>
          <div className="h-2 rounded-full bg-secondary overflow-hidden">
            <div
              className="h-full bg-primary transition-all"
              style={{ width: `${requiredCount === 0 ? 0 : Math.round((requiredUploaded / requiredCount) * 100)}%` }}
            />
          </div>
        </div>
        <div className="mt-4">
          <WaitTimeStat destination={destination} visaType={visaType} variant="card" />
        </div>
      </div>

      <PreSubmissionAuditCard destination={destination} visaType={visaType} />

      <div className="space-y-3">
        {checklist.items.map((item) => {
          const isUploaded = uploadedLabels.has(item.title);
          const isUploading = uploadingIds.has(item.id);
          return (
            <div
              key={item.id}
              className="rounded-xl border border-border bg-card p-4 flex items-center justify-between gap-4"
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-semibold text-foreground truncate">{item.title}</p>
                  {item.required && (
                    <span className="text-[10px] uppercase tracking-wide text-muted-foreground">{t("item.required")}</span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-0.5 truncate">{item.description}</p>
              </div>
              <label
                className={`shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold cursor-pointer transition-colors ${
                  isUploaded
                    ? "bg-accent/10 text-accent border border-accent/20"
                    : "bg-primary text-primary-foreground hover:bg-primary/90"
                }`}
              >
                {isUploading ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : isUploaded ? (
                  <CheckCircle2 className="w-3.5 h-3.5" />
                ) : (
                  <UploadCloud className="w-3.5 h-3.5" />
                )}
                {isUploading ? t("upload.uploading") : isUploaded ? t("upload.replace") : t("upload.upload")}
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp,application/pdf"
                  className="hidden"
                  disabled={isUploading}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    e.target.value = "";
                    if (file) void handleFileSelected(item.id, item.title, file);
                  }}
                />
              </label>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function ClientPortalPage() {
  const { t } = useTranslation("client-portal");
  const { token } = useParams<{ token: string }>();
  useSeo({
    title: "Document Upload",
    description: "Securely upload your visa application documents for your agent to review.",
  });

  const intake = useQuery(
    api.clientIntakes.getIntakeByToken,
    token ? { token } : "skip",
  );

  return (
    <div className="min-h-screen bg-background">
      <PortalHeader />
      <div className="max-w-2xl mx-auto px-4 py-10">
        {intake === undefined && (
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-20 w-full rounded-xl" />)}
          </div>
        )}
        {intake === null && (
          <div className="text-center py-16">
            <FileWarning className="w-10 h-10 text-amber-500 mx-auto mb-3" />
            <h2 className="font-serif text-2xl font-semibold text-primary mb-2">{t("link_not_found.title")}</h2>
            <p className="text-sm text-muted-foreground">
              {t("link_not_found.body")}
            </p>
          </div>
        )}
        {intake && token && (
          <>
            <AuthLoading>
              <div className="space-y-4">
                {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-20 w-full rounded-xl" />)}
              </div>
            </AuthLoading>
            <Unauthenticated>
              <div className="text-center py-16">
                <div className="w-16 h-16 rounded-2xl bg-primary/8 flex items-center justify-center mx-auto mb-5">
                  <LogIn className="w-7 h-7 text-primary" />
                </div>
                <h2 className="font-serif text-3xl font-semibold text-primary mb-3">{t("signin.title")}</h2>
                <p className="text-muted-foreground text-sm mb-6 max-w-sm mx-auto">
                  {t("signin.body")}
                </p>
                <SignInButton size="lg" className="cursor-pointer font-semibold" signInText={t("signin.cta")} />
                <div className="mt-6 flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
                  <Shield className="w-3.5 h-3.5" />
                  {t("signin.footer")}
                </div>
              </div>
            </Unauthenticated>
            <Authenticated>
              <ClientPortalInner
                token={token}
                destination={intake.destination}
                visaType={intake.visaType}
                clientName={intake.clientName}
              />
            </Authenticated>
          </>
        )}
      </div>
    </div>
  );
}
