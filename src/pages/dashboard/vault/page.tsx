import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQuery } from "convex/react";
import { toast } from "sonner";
import {
  Globe, ArrowLeft, Shield, Upload, Trash2, FileText,
  AlertTriangle, AlertCircle, LayoutDashboard, Settings, LogOut, LogIn, Bell, BellRing,
} from "lucide-react";
import { useSeo } from "@/hooks/use-seo.ts";
import { useSmartBack } from "@/hooks/use-smart-back.ts";
import { useDemoAuth } from "@/hooks/use-demo-auth.ts";
import { useAuth } from "@/hooks/use-auth.ts";
import { AuthAccessPanel } from "@/components/auth/access-panel.tsx";
import { Button } from "@/components/ui/button.tsx";
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

const CATEGORIES = [
  { value: "identity", label: "Identity", hint: "Passport copies, national ID, birth certificate" },
  { value: "financial", label: "Financial", hint: "Bank statements, payslips, tax returns" },
  { value: "employment", label: "Employment", hint: "Offer letters, employer letters, business registration" },
  { value: "travel", label: "Travel", hint: "Previous visas, travel insurance, bookings" },
  { value: "education", label: "Education", hint: "Degree certificates, enrollment letters, transcripts" },
  { value: "photo", label: "Photographs", hint: "Passport photos, ready to download" },
] as const;

const MAX_FILE_SIZE = 10 * 1024 * 1024;
const ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp", "application/pdf"];

function expiryStatus(expiryDate?: string): { label: string; tone: "ok" | "amber" | "red" } | null {
  if (!expiryDate) return null;
  const days = Math.ceil((new Date(expiryDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  if (days < 0) return { label: "Expired", tone: "red" };
  if (days <= 30) return { label: `Expires in ${days}d`, tone: "red" };
  if (days <= 90) return { label: `Expires in ${days}d`, tone: "amber" };
  return { label: `Expires ${expiryDate}`, tone: "ok" };
}

export default function DocumentVaultPage() {
  useSeo({ title: "Document Vault — VisaClear Pro", description: "Your permanent, organized store for every visa document." });
  const navigate = useNavigate();
  const goBack = useSmartBack("/dashboard");
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

  const [demoDocuments, setDemoDocuments] = useState<DemoVaultDocument[]>(DEMO_VAULT_DOCUMENTS);
  const [demoReminders, setDemoReminders] = useState<Doc<"reminders">[]>(DEMO_VAULT_REMINDERS);
  const visibleDocuments = isDemoAuthenticated ? demoDocuments : (documents ?? []);
  const visibleReminders = isDemoAuthenticated ? demoReminders : (reminders ?? []);

  const plan = isDemoAuthenticated ? (demoUser?.plan ?? "expert") : (user?.plan ?? "free");
  const canUseVault = canUseDocumentVault(plan);

  const [category, setCategory] = useState<typeof CATEGORIES[number]["value"]>("identity");
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

  const handleFileSelected = async (file: File) => {
    if (!label.trim()) {
      toast.error("Give this document a label first (e.g. \"UK Passport\").");
      return;
    }
    if (file.size > MAX_FILE_SIZE) {
      toast.error("File must be under 10MB.");
      return;
    }
    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      toast.error("Please upload a JPG, PNG, WEBP, or PDF file.");
      return;
    }

    if (isDemoAuthenticated) {
      const newDoc: DemoVaultDocument = {
        _id: `demo_doc_${Date.now()}` as Id<"vault_documents">,
        _creationTime: Date.now(),
        userId: "demo_user" as Id<"users">,
        category,
        label: label.trim(),
        storageId: "demo_storage" as Id<"_storage">,
        fileName: file.name,
        fileSize: file.size,
        mimeType: file.type,
        expiryDate: expiryDate || undefined,
        uploadedAt: new Date().toISOString(),
        url: "#",
      };
      setDemoDocuments((prev) => [newDoc, ...prev]);
      toast.success(`${label.trim()} added to your vault. (demo only)`);
      setLabel("");
      setExpiryDate("");
      return;
    }

    setUploading(true);
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
        label: label.trim(),
        fileName: file.name,
        fileSize: file.size,
        mimeType: file.type,
        expiryDate: expiryDate || undefined,
      });
      toast.success(`${label.trim()} added to your vault.`);
      setLabel("");
      setExpiryDate("");
    } catch {
      toast.error("Failed to upload. Please try again.");
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (isDemoAuthenticated) {
      setDemoDocuments((prev) => prev.filter((d) => d._id !== id));
      setDemoReminders((prev) => prev.filter((r) => r.vaultDocumentId !== id));
      toast.success("Document removed. (demo only)");
      return;
    }
    try {
      await deleteDocument({ id: id as Parameters<typeof deleteDocument>[0]["id"] });
      toast.success("Document removed.");
    } catch {
      toast.error("Failed to remove document.");
    }
  };

  const handleRemindMe = async (id: string) => {
    if (isDemoAuthenticated) {
      const doc = demoDocuments.find((d) => d._id === id);
      if (!doc) return;
      const dueDate = doc.expiryDate;
      if (!dueDate) return;
      setDemoReminders((prev) => [
        ...prev,
        {
          _id: `demo_reminder_${Date.now()}` as Id<"reminders">,
          _creationTime: Date.now(),
          userId: "demo_user" as Id<"users">,
          vaultDocumentId: id as Id<"vault_documents">,
          title: `${doc.label} expires soon`,
          dueDate,
          email: "demo@visaclear.local",
          sent: false,
          createdAt: new Date().toISOString(),
        },
      ]);
      toast.success("Reminder set — we'll email you before it expires. (demo only)");
      return;
    }
    try {
      await createExpiryReminder({ id: id as Parameters<typeof createExpiryReminder>[0]["id"] });
      toast.success("Reminder set — we'll email you before it expires.");
    } catch {
      toast.error("Could not set a reminder for this document.");
    }
  };

  const handleSaveExpiry = async (id: string) => {
    if (isDemoAuthenticated) {
      setDemoDocuments((prev) => prev.map((d) => (d._id === id ? { ...d, expiryDate: editingExpiryValue || undefined } : d)));
      toast.success("Expiry date updated. (demo only)");
      setEditingExpiryId(null);
      return;
    }
    try {
      await updateDocumentExpiry({ id: id as Parameters<typeof updateDocumentExpiry>[0]["id"], expiryDate: editingExpiryValue || undefined });
      toast.success("Expiry date updated.");
      setEditingExpiryId(null);
    } catch {
      toast.error("Could not update the expiry date.");
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
            <div className="flex items-center gap-1.5 text-xs font-semibold text-primary">
              <Shield className="w-3.5 h-3.5 text-accent" /> Document Vault
            </div>
            {canAccess && (
              <>
                <button onClick={() => navigate("/dashboard")} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-muted-foreground hover:text-primary hover:bg-primary/5 transition-colors cursor-pointer border border-transparent hover:border-primary/20" title="My Dashboard">
                  <LayoutDashboard className="w-3.5 h-3.5" />
                  <span className="hidden md:inline">My Dashboard</span>
                </button>
                <button onClick={() => navigate("/settings/profile")} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-muted-foreground hover:text-primary hover:bg-primary/5 transition-colors cursor-pointer border border-transparent hover:border-primary/20" title="Settings">
                  <Settings className="w-3.5 h-3.5" />
                  <span className="hidden md:inline">Settings</span>
                </button>
                <button onClick={() => void handleSignOut()} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-muted-foreground hover:text-destructive hover:bg-destructive/5 transition-colors cursor-pointer border border-transparent hover:border-destructive/20" title="Sign out">
                  <LogOut className="w-3.5 h-3.5" />
                  <span className="hidden md:inline">Sign Out</span>
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
            <h2 className="font-serif text-3xl font-semibold text-primary mb-3">Sign In to Continue</h2>
            <p className="text-muted-foreground text-sm mb-6 max-w-sm mx-auto leading-relaxed">
              Upload once, keep forever. Your Document Vault lives here.
            </p>
            <div className="max-w-sm mx-auto">
              <AuthAccessPanel returnPath="/dashboard/vault" />
            </div>
          </div>
        ) : !canUseVault ? (
          <div className="text-center py-16 border border-dashed border-border rounded-2xl">
            <Shield className="w-10 h-10 text-muted-foreground/40 mx-auto mb-4" />
            <h2 className="font-serif text-2xl font-semibold text-primary mb-2">Upload once. Keep forever.</h2>
            <p className="text-sm text-muted-foreground max-w-sm mx-auto mb-6 leading-relaxed">
              The Document Vault is a Pro feature: a permanent, organized store for every passport, bank
              statement, and certificate you'll ever need for a visa application.
            </p>
            <Button className="cursor-pointer font-semibold" onClick={() => navigate("/pricing")}>
              Upgrade to Pro
            </Button>
          </div>
        ) : (
          <div className="space-y-8">
            <div className="bg-card border border-border rounded-2xl p-5">
              <h2 className="font-semibold text-sm text-primary uppercase tracking-widest mb-4">Add a document</h2>
              <div className="grid sm:grid-cols-2 gap-3 mb-3">
                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1.5">Category</label>
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
                  <label className="block text-xs font-semibold text-foreground mb-1.5">Expiry date (optional)</label>
                  <input
                    type="date"
                    value={expiryDate}
                    onChange={(e) => setExpiryDate(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
              </div>
              <div className="mb-3">
                <label className="block text-xs font-semibold text-foreground mb-1.5">Label</label>
                <input
                  type="text"
                  value={label}
                  onChange={(e) => setLabel(e.target.value)}
                  placeholder='e.g. "UK Passport" or "March Bank Statement"'
                  className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
              <label className={cn(
                "flex items-center justify-center gap-2 border border-dashed border-border rounded-xl py-6 cursor-pointer hover:border-primary/40 hover:bg-primary/5 transition-colors text-sm font-semibold text-primary",
                uploading && "opacity-60 pointer-events-none",
              )}>
                <Upload className="w-4 h-4" />
                {uploading ? "Uploading…" : "Choose a file (JPG, PNG, or PDF, up to 10MB)"}
                <input
                  type="file"
                  accept={ALLOWED_MIME_TYPES.join(",")}
                  className="hidden"
                  disabled={uploading}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) void handleFileSelected(file);
                    e.target.value = "";
                  }}
                />
              </label>
            </div>

            {CATEGORIES.map((cat) => {
              const docsInCategory = visibleDocuments.filter((d) => d.category === cat.value);
              return (
                <div key={cat.value}>
                  <div className="flex items-baseline justify-between mb-2">
                    <h3 className="font-semibold text-sm text-primary uppercase tracking-widest">{cat.label}</h3>
                    <span className="text-xs text-muted-foreground">{cat.hint}</span>
                  </div>
                  {docsInCategory.length === 0 ? (
                    <p className="text-xs text-muted-foreground/70 italic mb-2">No documents yet.</p>
                  ) : (
                    <div className="space-y-2 mb-2">
                      {docsInCategory.map((doc) => {
                        const status = expiryStatus(doc.expiryDate);
                        const hasReminder = visibleReminders.some((r) => r.vaultDocumentId === doc._id && !r.sent);
                        return (
                          <div key={doc._id} className="bg-card border border-border rounded-xl p-3 flex items-center gap-3">
                            <FileText className="w-4 h-4 text-muted-foreground shrink-0" />
                            <div className="flex-1 min-w-0">
                              <a href={doc.url ?? "#"} target="_blank" rel="noreferrer" className="text-sm font-medium text-foreground truncate hover:text-primary hover:underline">
                                {doc.label}
                              </a>
                              <div className="text-xs text-muted-foreground truncate">{doc.fileName}</div>
                            </div>
                            {editingExpiryId === doc._id ? (
                              <div className="flex items-center gap-1 shrink-0">
                                <input
                                  type="date"
                                  value={editingExpiryValue}
                                  onChange={(e) => setEditingExpiryValue(e.target.value)}
                                  className="w-32 px-2 py-1 text-xs rounded-md border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                                  autoFocus
                                />
                                <button onClick={() => void handleSaveExpiry(doc._id)} className="text-[11px] font-semibold text-accent hover:underline cursor-pointer">Save</button>
                                <button onClick={() => setEditingExpiryId(null)} className="text-[11px] text-muted-foreground hover:underline cursor-pointer">Cancel</button>
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
                                    Add expiry
                                  </span>
                                )}
                              </button>
                            )}
                            {doc.expiryDate && (
                              hasReminder ? (
                                <span className="flex items-center gap-1 text-[11px] font-semibold px-2 py-1 rounded-full shrink-0 bg-accent/10 text-accent" title="We'll email you before this expires">
                                  <BellRing className="w-3 h-3" /> Reminder set
                                </span>
                              ) : (
                                <button
                                  onClick={() => void handleRemindMe(doc._id)}
                                  className="flex items-center gap-1 text-[11px] font-semibold px-2 py-1 rounded-full shrink-0 border border-border text-muted-foreground hover:text-accent hover:border-accent/40 transition-colors cursor-pointer"
                                  title="Get an email reminder before this expires"
                                >
                                  <Bell className="w-3 h-3" /> Remind me
                                </button>
                              )
                            )}
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

      <footer className="border-t border-border mt-10 py-6 px-6 text-center">
        <p className="text-xs text-muted-foreground italic mb-1">&ldquo;It&apos;s all about Privacy.&rdquo;</p>
        <p className="text-xs text-muted-foreground">
          &copy; {new Date().getFullYear()} Vericore Ltd. · VisaClear is a guidance tool, not legal advice.
        </p>
      </footer>
    </div>
  );
}
