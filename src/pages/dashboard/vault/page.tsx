import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useDemoGate } from "@/components/DemoGateModal.tsx";
import { useMutation, useQuery } from "convex/react";
import { toast } from "sonner";
import {
  Globe, ArrowLeft, Shield, Upload, Trash2, FileText,
  AlertTriangle, AlertCircle, LayoutDashboard, Settings, LogOut, LogIn, Bell, BellRing, Download, Eye,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { useSeo } from "@/hooks/use-seo.ts";
import { useSmartBack } from "@/hooks/use-smart-back.ts";
import { useDemoAuth } from "@/hooks/use-demo-auth.ts";
import { useAuth } from "@/hooks/use-auth.ts";
import { AuthAccessPanel } from "@/components/auth/access-panel.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { api } from "@/convex/_generated/api.js";
import type { Doc, Id } from "@/convex/_generated/dataModel.js";
import { canUseDocumentVault } from "@/lib/plan-gates.ts";
import { cn } from "@/lib/utils.ts";

type DemoVaultDocument = Doc<"vault_documents"> & { url: string | null };

const DEMO_VAULT_DOCUMENTS: DemoVaultDocument[] = [
  {
    _id: "demo_doc_passport" as Id<"vault_documents">,
    _creationTime: Date.now(),
    userId: "demo_user" as Id<"users">,
    category: "identity",
    label: "UK Passport",
    storageId: "demo_storage" as Id<"_storage">,
    fileName: "passport-scan.pdf",
    fileSize: 482_000,
    mimeType: "application/pdf",
    expiryDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 45).toISOString().slice(0, 10),
    uploadedAt: new Date().toISOString(),
    url: "#",
  },
  {
    _id: "demo_doc_bankstatement" as Id<"vault_documents">,
    _creationTime: Date.now(),
    userId: "demo_user" as Id<"users">,
    category: "financial",
    label: "March Bank Statement",
    storageId: "demo_storage" as Id<"_storage">,
    fileName: "march-statement.pdf",
    fileSize: 215_000,
    mimeType: "application/pdf",
    uploadedAt: new Date().toISOString(),
    url: "#",
  },
];

const DEMO_VAULT_REMINDERS: Doc<"reminders">[] = [
  {
    _id: "demo_reminder_passport" as Id<"reminders">,
    _creationTime: Date.now(),
    userId: "demo_user" as Id<"users">,
    vaultDocumentId: "demo_doc_passport" as Id<"vault_documents">,
    title: "UK Passport expires soon",
    dueDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 15).toISOString().slice(0, 10),
    email: "demo@visaclear.local",
    sent: false,
    createdAt: new Date().toISOString(),
  },
];

type CategoryValue = "identity" | "financial" | "employment" | "travel" | "education" | "photo" | "legal" | "medical" | "other";

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50 MB
const ALLOWED_MIME_TYPES = [
  "image/jpeg",
  "image/jpg",   // non-standard but reported by some Windows/older systems
  "image/png",
  "image/webp",
  "image/heic",  // iPhone camera photos
  "image/heif",
  "application/pdf",
];

export default function DocumentVaultPage() {
  const { t } = useTranslation("vault");
  useSeo({ title: "Document Vault — VisaClear Pro", description: "Your permanent, organized store for every visa document." });
  const navigate = useNavigate();
  const goBack = useSmartBack("/dashboard");

  const CATEGORIES = [
    { value: "identity" as CategoryValue, label: t("cat.identity"), hint: t("cat.identity_hint") },
    { value: "financial" as CategoryValue, label: t("cat.financial"), hint: t("cat.financial_hint") },
    { value: "employment" as CategoryValue, label: t("cat.employment"), hint: t("cat.employment_hint") },
    { value: "travel" as CategoryValue, label: t("cat.travel"), hint: t("cat.travel_hint") },
    { value: "education" as CategoryValue, label: t("cat.education"), hint: t("cat.education_hint") },
    { value: "photo" as CategoryValue, label: t("cat.photo"), hint: t("cat.photo_hint") },
    { value: "legal" as CategoryValue, label: t("cat.legal"), hint: t("cat.legal_hint") },
    { value: "medical" as CategoryValue, label: t("cat.medical"), hint: t("cat.medical_hint") },
    { value: "other" as CategoryValue, label: t("cat.other"), hint: t("cat.other_hint") },
  ];

  const expiryStatus = (expiryDate?: string): { label: string; tone: "ok" | "amber" | "red" } | null => {
    if (!expiryDate) return null;
    const days = Math.ceil((new Date(expiryDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    if (days < 0) return { label: t("expiry.expired"), tone: "red" };
    if (days <= 30) return { label: t("expiry.soon", { days }), tone: "red" };
    if (days <= 90) return { label: t("expiry.soon", { days }), tone: "amber" };
    return { label: t("expiry.ok", { date: expiryDate }), tone: "ok" };
  };
  const { isDemoAuthenticated, user: demoUser, signOut } = useDemoAuth();
  const { isAuthenticated, signOut: signOutReal } = useAuth();
  const canAccess = isDemoAuthenticated || isAuthenticated;

  const user = useQuery(api.users.getCurrentUser, isDemoAuthenticated ? "skip" : {});
  const documents = useQuery(api.vault.listMyDocuments, isDemoAuthenticated ? "skip" : {});
  const reminders = useQuery(api.reminders.getReminders, isDemoAuthenticated ? "skip" : {});
  const generateUploadUrl = useMutation(api.vault.generateUploadUrl);
  const addDocument = useMutation(api.vault.addDocument);
  const deleteDocument = useMutation(api.vault.deleteDocument);
  const createExpiryReminder = useMutation(api.vault.createExpiryReminder);
  const getDocumentDownloadUrl = useMutation(api.vault.getDocumentDownloadUrl);

  const { gate, GateModal } = useDemoGate();

  const [demoDocuments, setDemoDocuments] = useState<DemoVaultDocument[]>(DEMO_VAULT_DOCUMENTS);
  const [demoReminders, setDemoReminders] = useState<Doc<"reminders">[]>(DEMO_VAULT_REMINDERS);
  const visibleDocuments = isDemoAuthenticated ? demoDocuments : (documents ?? []);
  // Real documents haven't loaded yet — without this, every category
  // briefly renders "no documents in this category" (t("doc.empty")) for
  // one render cycle before listMyDocuments resolves, which reads as data
  // loss for a page holding a user's ID/financial documents.
  const documentsLoading = !isDemoAuthenticated && documents === undefined;
  const visibleReminders = isDemoAuthenticated ? demoReminders : (reminders ?? []);

  const plan = isDemoAuthenticated ? (demoUser?.plan ?? "expert") : (user?.plan ?? "free");
  const canUseVault = canUseDocumentVault(plan);

  const [category, setCategory] = useState<CategoryValue>("identity");
  const [label, setLabel] = useState("");
  const [expiryDate, setExpiryDate] = useState("");
  const [uploading, setUploading] = useState(false);
  const [editingExpiryId, setEditingExpiryId] = useState<string | null>(null);
  const [editingExpiryValue, setEditingExpiryValue] = useState("");
  const updateDocumentExpiry = useMutation(api.vault.updateDocumentExpiry);

  const handleSignOut = async () => {
    if (isAuthenticated) {
      await signOutReal();
      navigate("/");
      return;
    }
    signOut();
    navigate("/");
  };

  const deriveLabel = (file: File) =>
    label.trim() || file.name.replace(/\.[^.]+$/, "");

  const handleFilesSelected = async (files: FileList) => {
    const fileArray = Array.from(files);
    let added = 0;

    setUploading(true);
    try {
      for (const file of fileArray) {
        if (file.size > MAX_FILE_SIZE) {
          toast.error(`${file.name}: ${t("toast.too_large")}`);
          continue;
        }
        if (!ALLOWED_MIME_TYPES.includes(file.type)) {
          toast.error(`${file.name}: ${t("toast.bad_type")}`);
          continue;
        }

        const fileLabel = deriveLabel(file);

        if (isDemoAuthenticated) {
          gate();
          break;
        }

        try {
          const uploadUrl = await generateUploadUrl({});
          const response = await fetch(uploadUrl, {
            method: "POST",
            headers: { "Content-Type": file.type },
            body: file,
          });
          if (!response.ok) throw new Error("Upload failed");
          const { storageId } = await response.json();
          await addDocument({
            storageId,
            category,
            label: fileLabel,
            fileName: file.name,
            fileSize: file.size,
            mimeType: file.type,
            expiryDate: expiryDate || undefined,
          });
          added++;
        } catch {
          toast.error(`${file.name}: ${t("toast.upload_error")}`);
        }
      }
    } finally {
      setUploading(false);
    }

    if (added === 0) return;
    if (added === 1) {
      toast.success(t("toast.doc_added", { label: deriveLabel(fileArray[0]) }));
    } else {
      toast.success(`${added} files added to vault.`);
    }
    setLabel("");
    setExpiryDate("");
  };

  const handleDelete = async (id: string) => {
    if (isDemoAuthenticated) {
      setDemoDocuments((prev) => prev.filter((d) => d._id !== id));
      setDemoReminders((prev) => prev.filter((r) => r.vaultDocumentId !== id));
      toast.success(t("toast.doc_removed"));
      return;
    }
    try {
      await deleteDocument({ id: id as Parameters<typeof deleteDocument>[0]["id"] });
      toast.success(t("toast.doc_removed"));
    } catch {
      toast.error(t("toast.remove_error"));
    }
  };

  const handleRemindMe = async (id: string) => {
    if (gate()) return;
    try {
      await createExpiryReminder({ id: id as Parameters<typeof createExpiryReminder>[0]["id"] });
      toast.success(t("toast.reminder_set"));
    } catch {
      toast.error(t("toast.reminder_error"));
    }
  };

  const handleSaveExpiry = async (id: string) => {
    if (gate()) { setEditingExpiryId(null); return; }
    try {
      await updateDocumentExpiry({ id: id as Parameters<typeof updateDocumentExpiry>[0]["id"], expiryDate: editingExpiryValue || undefined });
      toast.success(t("toast.expiry_updated"));
      setEditingExpiryId(null);
    } catch {
      toast.error(t("toast.expiry_error"));
    }
  };

  const isRealUrl = (url: string | null): url is string =>
    Boolean(url) && url !== "#";

  // Real documents no longer carry a ready-made URL — listMyDocuments
  // returns `url: null` for them (only the demo/seeded rows use "#" or a
  // blob: URL). For a real doc we mint a fresh, short-lived link right at
  // the moment of the click, so a leaked link can't be reused later.
  const resolveRealDocumentUrl = async (documentId: Id<"vault_documents">): Promise<string | null> => {
    try {
      return await getDocumentDownloadUrl({ documentId });
    } catch {
      toast.error("Couldn't open that document. Please try again.");
      return null;
    }
  };

  const handlePreview = async (doc: { _id: Id<"vault_documents">; url: string | null }) => {
    if (doc.url === "#") {
      toast.info("This is a sample demo document — upload your own files to preview them.");
      return;
    }
    // Demo-mode, user-uploaded-this-session files already have a real blob: URL.
    if (doc.url && doc.url.startsWith("blob:")) {
      window.open(doc.url, "_blank", "noopener,noreferrer");
      return;
    }
    const freshUrl = await resolveRealDocumentUrl(doc._id);
    if (freshUrl) window.open(freshUrl, "_blank", "noopener,noreferrer");
  };

  const handleDownload = async (doc: { _id: Id<"vault_documents">; url: string | null }, fileName: string) => {
    if (doc.url === "#") {
      toast.info("This is a sample demo document — upload your own files to download them.");
      return;
    }
    const url = doc.url && doc.url.startsWith("blob:") ? doc.url : await resolveRealDocumentUrl(doc._id);
    if (!isRealUrl(url)) return;
    // Blob URLs (user-uploaded files in demo mode) can be downloaded directly
    // without fetching — they're already in memory.
    if (url.startsWith("blob:")) {
      const a = document.createElement("a");
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      return;
    }
    // iOS Safari doesn't support programmatic blob downloads for remote URLs —
    // open directly so the native PDF/image viewer handles it.
    if (/iphone|ipad|ipod/i.test(navigator.userAgent)) {
      window.open(url, "_blank", "noopener,noreferrer");
      return;
    }
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error("fetch failed");
      const blob = await res.blob();
      const objectUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = objectUrl;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(objectUrl);
    } catch {
      window.open(url, "_blank", "noopener,noreferrer");
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 border-b border-border/60 bg-background/90 backdrop-blur-md">
        <div className="max-w-3xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={goBack} className="text-muted-foreground hover:text-primary transition-colors cursor-pointer p-1 -ml-1">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-md bg-primary flex items-center justify-center">
                <Globe className="w-3.5 h-3.5 text-primary-foreground" />
              </div>
              <div>
                <span className="font-serif text-lg font-semibold text-primary">VisaClear</span>
                <span className="text-[10px] text-muted-foreground ml-1.5 tracking-widest uppercase">by Vericore</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="hidden sm:flex items-center gap-1.5 text-xs font-semibold text-primary">
              <Shield className="w-3.5 h-3.5 text-accent" /> {t("header.badge")}
            </div>
            {canAccess && (
              <>
                <button onClick={() => navigate("/dashboard")} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-muted-foreground hover:text-primary hover:bg-primary/5 transition-colors cursor-pointer border border-transparent hover:border-primary/20" title={t("nav.dashboard")}>
                  <LayoutDashboard className="w-3.5 h-3.5" />
                  <span className="hidden md:inline">{t("nav.dashboard")}</span>
                </button>
                <button onClick={() => navigate("/settings/profile")} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-muted-foreground hover:text-primary hover:bg-primary/5 transition-colors cursor-pointer border border-transparent hover:border-primary/20" title={t("nav.settings")}>
                  <Settings className="w-3.5 h-3.5" />
                  <span className="hidden md:inline">{t("nav.settings")}</span>
                </button>
                <button onClick={() => void handleSignOut()} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-muted-foreground hover:text-destructive hover:bg-destructive/5 transition-colors cursor-pointer border border-transparent hover:border-destructive/20" title={t("nav.sign_out")}>
                  <LogOut className="w-3.5 h-3.5" />
                  <span className="hidden md:inline">{t("nav.sign_out")}</span>
                </button>
              </>
            )}
          </div>
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-4 py-8">
        {!canAccess ? (
          <div className="text-center py-20">
            <div className="w-16 h-16 rounded-2xl bg-primary/8 flex items-center justify-center mx-auto mb-5">
              <LogIn className="w-7 h-7 text-primary" />
            </div>
            <h2 className="font-serif text-3xl font-semibold text-primary mb-3">{t("signin.title")}</h2>
            <p className="text-muted-foreground text-sm mb-6 max-w-sm mx-auto leading-relaxed">
              {t("signin.body")}
            </p>
            <div className="max-w-sm mx-auto">
              <AuthAccessPanel returnPath="/dashboard/vault" />
            </div>
          </div>
        ) : !canUseVault ? (
          <div className="text-center py-16 border border-dashed border-border rounded-2xl">
            <Shield className="w-10 h-10 text-muted-foreground/40 mx-auto mb-4" />
            <h2 className="font-serif text-2xl font-semibold text-primary mb-2">{t("upgrade.title")}</h2>
            <p className="text-sm text-muted-foreground max-w-sm mx-auto mb-6 leading-relaxed">
              {t("upgrade.body")}
            </p>
            <Button className="cursor-pointer font-semibold" onClick={() => navigate("/pricing")}>
              {t("upgrade.cta")}
            </Button>
          </div>
        ) : (
          <div className="space-y-8">
            <div className="bg-card border border-border rounded-2xl p-5">
              <h2 className="font-semibold text-sm text-primary uppercase tracking-widest mb-4">{t("add.title")}</h2>
              <div className="grid sm:grid-cols-2 gap-3 mb-3">
                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1.5">{t("add.category")}</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as typeof category)}
                    className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                  >
                    {CATEGORIES.map((c) => (
                      <option key={c.value} value={c.value}>{c.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1.5">{t("add.expiry")}</label>
                  <input
                    type="date"
                    value={expiryDate}
                    onChange={(e) => setExpiryDate(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
              </div>
              <div className="mb-3">
                <label className="block text-xs font-semibold text-foreground mb-1.5">{t("add.label")}</label>
                <input
                  type="text"
                  value={label}
                  onChange={(e) => setLabel(e.target.value)}
                  placeholder={t("add.label_placeholder") + " (optional when uploading multiple)"}
                  className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
              <label className={cn(
                "flex flex-col items-center justify-center gap-1.5 border border-dashed border-border rounded-xl py-6 cursor-pointer hover:border-primary/40 hover:bg-primary/5 transition-colors text-sm font-semibold text-primary",
                uploading && "opacity-60 pointer-events-none",
              )}>
                <div className="flex items-center gap-2">
                  <Upload className="w-4 h-4" />
                  {uploading ? t("add.uploading") : t("add.upload_cta")}
                </div>
                <span className="text-[11px] font-normal text-muted-foreground">
                  JPG, PNG, PDF, WEBP, HEIC · up to 50 MB · select multiple at once
                </span>
                <input
                  type="file"
                  multiple
                  accept=".pdf,.jpg,.jpeg,.png,.webp,.heic,.heif,image/jpeg,image/jpg,image/png,image/webp,image/heic,image/heif,application/pdf"
                  className="hidden"
                  disabled={uploading}
                  onChange={(e) => {
                    if (e.target.files && e.target.files.length > 0) {
                      void handleFilesSelected(e.target.files);
                    }
                    e.target.value = "";
                  }}
                />
              </label>
            </div>

            {CATEGORIES.map((cat) => {
              const docsInCategory = visibleDocuments.filter((d) => d.category === cat.value);
              return (
                <div key={cat.value}>
                  <div className="mb-2">
                    <h3 className="font-semibold text-sm text-primary uppercase tracking-widest">{cat.label}</h3>
                    <p className="text-xs text-muted-foreground mt-0.5">{cat.hint}</p>
                  </div>
                  {documentsLoading ? (
                    <div className="space-y-2 mb-2">
                      <Skeleton className="h-14 w-full rounded-xl" />
                    </div>
                  ) : docsInCategory.length === 0 ? (
                    <p className="text-xs text-muted-foreground/70 italic mb-2">{t("doc.empty")}</p>
                  ) : (
                    <div className="space-y-2 mb-2">
                      {docsInCategory.map((doc) => {
                        const status = expiryStatus(doc.expiryDate);
                        const hasReminder = visibleReminders.some((r) => r.vaultDocumentId === doc._id && !r.sent);
                        return (
                          <div key={doc._id} className="bg-card border border-border rounded-xl p-3 flex items-center gap-3">
                            <FileText className="w-4 h-4 text-muted-foreground shrink-0" />
                            <div className="flex-1 min-w-0">
                              <button
                                onClick={() => void handlePreview(doc)}
                                className="text-sm font-medium text-foreground truncate hover:text-primary hover:underline cursor-pointer text-left block w-full"
                              >
                                {doc.label}
                              </button>
                              <div className="text-xs text-muted-foreground truncate">{doc.fileName}</div>
                            </div>
                            {editingExpiryId === doc._id ? (
                              <div className="flex items-center gap-1">
                                <input
                                  type="date"
                                  value={editingExpiryValue}
                                  onChange={(e) => setEditingExpiryValue(e.target.value)}
                                  className="w-24 px-2 py-1 text-xs rounded-md border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                                  autoFocus
                                />
                                <button onClick={() => void handleSaveExpiry(doc._id)} className="text-[11px] font-semibold text-accent hover:underline cursor-pointer">{t("doc.save_expiry")}</button>
                                <button onClick={() => setEditingExpiryId(null)} className="text-[11px] text-muted-foreground hover:underline cursor-pointer">{t("doc.cancel_expiry")}</button>
                              </div>
                            ) : (
                              <button
                                onClick={() => { setEditingExpiryId(doc._id); setEditingExpiryValue(doc.expiryDate ?? ""); }}
                                className="shrink-0 cursor-pointer"
                                title="Edit expiry date"
                              >
                                {status ? (
                                  <span className={cn(
                                    "flex items-center gap-1 text-[11px] font-semibold px-2 py-1 rounded-full",
                                    status.tone === "red" && "bg-destructive/10 text-destructive",
                                    status.tone === "amber" && "bg-amber-500/10 text-amber-600",
                                    status.tone === "ok" && "bg-muted text-muted-foreground",
                                  )}>
                                    {status.tone !== "ok" && (status.tone === "red" ? <AlertCircle className="w-3 h-3" /> : <AlertTriangle className="w-3 h-3" />)}
                                    {status.label}
                                  </span>
                                ) : (
                                  <span className="text-[11px] font-semibold px-2 py-1 rounded-full border border-dashed border-border text-muted-foreground hover:text-accent hover:border-accent/40 transition-colors">
                                    {t("doc.add_expiry")}
                                  </span>
                                )}
                              </button>
                            )}
                            {doc.expiryDate && (
                              hasReminder ? (
                                <span className="flex items-center gap-1 text-[11px] font-semibold px-2 py-1 rounded-full shrink-0 bg-accent/10 text-accent" title="We'll email you before this expires">
                                  <BellRing className="w-3 h-3" /> {t("doc.reminder_set")}
                                </span>
                              ) : (
                                <button
                                  onClick={() => void handleRemindMe(doc._id)}
                                  className="flex items-center gap-1 text-[11px] font-semibold px-2 py-1 rounded-full shrink-0 border border-border text-muted-foreground hover:text-accent hover:border-accent/40 transition-colors cursor-pointer"
                                  title="Get an email reminder before this expires"
                                >
                                  <Bell className="w-3 h-3" /> {t("doc.remind_me")}
                                </button>
                              )
                            )}
                            <button
                              onClick={() => void handlePreview(doc)}
                              className="p-1.5 rounded-lg hover:bg-accent/10 text-muted-foreground hover:text-accent transition-colors cursor-pointer shrink-0"
                              title="Preview"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => void handleDownload(doc, doc.fileName)}
                              className="p-1.5 rounded-lg hover:bg-accent/10 text-muted-foreground hover:text-accent transition-colors cursor-pointer shrink-0"
                              title="Download"
                            >
                              <Download className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => void handleDelete(doc._id)}
                              className="p-1.5 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors cursor-pointer shrink-0"
                              title="Delete"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>


      {GateModal}
    </div>
  );
}
