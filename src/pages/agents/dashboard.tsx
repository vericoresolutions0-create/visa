import { useEffect, useMemo, useState } from "react";
import { motion } from "motion/react";
import { useNavigate } from "react-router-dom";
import { Authenticated, Unauthenticated, AuthLoading, useMutation, useQuery } from "convex/react";
import { ConvexError } from "convex/values";
import { toast } from "sonner";
import { Button } from "@/components/ui/button.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { AuthAccessPanel } from "@/components/auth/access-panel.tsx";
import { WaitTimeStat } from "@/components/wait-time-stat.tsx";
import { useSeo } from "@/hooks/use-seo.ts";
import { useSmartBack } from "@/hooks/use-smart-back.ts";
import { cn } from "@/lib/utils.ts";
import { api } from "@/convex/_generated/api.js";
import type { Id } from "@/convex/_generated/dataModel.js";
import { AVAILABLE_DESTINATIONS, getAvailableVisaTypes, getChecklist, VISA_TYPES, type VisaType } from "@/lib/visa-data.ts";
import {
  ArrowLeft,
  BadgeCheck,
  BarChart3,
  Bell,
  Building2,
  CalendarClock,
  CheckCircle2,
  CircleDollarSign,
  ClipboardCheck,
  Clock3,
  Copy,
  CreditCard,
  FileText,
  FolderOpen,
  Globe,
  LayoutDashboard,
  ListChecks,
  LockKeyhole,
  LogIn,
  MessageCircle,
  Send,
  Shield,
  Star,
  UploadCloud,
  UserPlus,
  Users,
  X,
  type LucideIcon,
} from "lucide-react";

type IntakeStatus = "awaiting_documents" | "documents_received" | "in_review" | "complete";

type IntakeDocument = {
  _id: string;
  label: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  uploadedAt: string;
  url: string | null;
};

type Intake = {
  _id: Id<"client_intakes">;
  token: string;
  clientName: string;
  clientEmail?: string;
  clientPhone?: string;
  destination: string;
  visaType: string;
  status: IntakeStatus;
  createdAt: string;
  claimedByEmail?: string;
  documents: IntakeDocument[];
};

const intakeStatusLabels: Record<IntakeStatus, string> = {
  awaiting_documents: "Awaiting documents",
  documents_received: "Documents received",
  in_review: "In review",
  complete: "Complete",
};

const intakeStatusStyles: Record<IntakeStatus, string> = {
  awaiting_documents: "bg-secondary text-secondary-foreground",
  documents_received: "bg-amber-100 text-amber-900",
  in_review: "bg-primary/10 text-primary",
  complete: "bg-accent/15 text-accent-foreground",
};

function daysSince(iso: string): number {
  return Math.floor((Date.now() - new Date(iso).getTime()) / (1000 * 60 * 60 * 24));
}

function toWhatsAppNumber(phone: string): string {
  return phone.replace(/[^\d]/g, "");
}

function visaTypeLabel(visaType: string): string {
  return VISA_TYPES.find((v) => v.value === visaType)?.label ?? visaType;
}

function requiredDocCount(destination: string, visaType: string): number {
  const checklist = getChecklist(destination, visaType as VisaType);
  return checklist ? checklist.items.filter((i) => i.required).length : 0;
}

function SectionHeader({
  eyebrow,
  title,
  description,
  Icon,
}: {
  eyebrow: string;
  title: string;
  description?: string;
  Icon: LucideIcon;
}) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <div className="mb-2 inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.24em] text-accent">
          <Icon className="h-3.5 w-3.5" />
          {eyebrow}
        </div>
        <h2 className="font-serif text-2xl font-semibold leading-tight text-primary md:text-3xl">
          {title}
        </h2>
        {description && (
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
            {description}
          </p>
        )}
      </div>
    </div>
  );
}

function KpiCard({ label, value, detail, Icon }: { label: string; value: string | number; detail: string; Icon: LucideIcon }) {
  return (
    <article className="rounded-lg border border-border bg-card p-4 shadow-sm">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-md bg-primary/8 text-primary">
          <Icon className="h-4 w-4" />
        </div>
      </div>
      <div className="text-3xl font-semibold tracking-normal text-primary">{value}</div>
      <p className="mt-1 text-sm font-medium text-foreground">{label}</p>
      <p className="mt-2 text-xs text-muted-foreground">{detail}</p>
    </article>
  );
}

function NewClientForm({ onCreated }: { onCreated: (token: string) => void }) {
  const createIntake = useMutation(api.clientIntakes.createIntake);
  const [clientName, setClientName] = useState("");
  const [clientEmail, setClientEmail] = useState("");
  const [clientPhone, setClientPhone] = useState("");
  const [destination, setDestination] = useState("");
  const [visaType, setVisaType] = useState<VisaType | "">("");
  const [saving, setSaving] = useState(false);

  const visaTypes = destination ? getAvailableVisaTypes(destination) : [];

  const handleCreate = async () => {
    if (!clientName || !destination || !visaType) {
      toast.error("Please fill in client name, destination, and visa type.");
      return;
    }
    setSaving(true);
    try {
      const { token } = await createIntake({
        clientName,
        clientEmail: clientEmail || undefined,
        clientPhone: clientPhone || undefined,
        destination,
        visaType,
      });
      toast.success("Client link created.");
      onCreated(token);
    } catch {
      toast.error("Failed to create client link. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="rounded-lg border border-border bg-background p-4 space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <input
          value={clientName}
          onChange={(e) => setClientName(e.target.value)}
          placeholder="Client name *"
          className="w-full px-3 py-2 text-sm rounded-lg border border-input bg-card"
        />
        <input
          value={clientPhone}
          onChange={(e) => setClientPhone(e.target.value)}
          placeholder="Client WhatsApp number (optional)"
          className="w-full px-3 py-2 text-sm rounded-lg border border-input bg-card"
        />
      </div>
      <input
        value={clientEmail}
        onChange={(e) => setClientEmail(e.target.value)}
        placeholder="Client email (optional)"
        className="w-full px-3 py-2 text-sm rounded-lg border border-input bg-card"
      />
      <div className="grid gap-3 sm:grid-cols-2">
        <select
          value={destination}
          onChange={(e) => {
            setDestination(e.target.value);
            setVisaType("");
          }}
          className="w-full px-3 py-2 text-sm rounded-lg border border-input bg-card"
        >
          <option value="">Destination *</option>
          {AVAILABLE_DESTINATIONS.map((d) => (
            <option key={d} value={d}>{d}</option>
          ))}
        </select>
        <select
          value={visaType}
          onChange={(e) => setVisaType(e.target.value as VisaType)}
          disabled={!destination}
          className="w-full px-3 py-2 text-sm rounded-lg border border-input bg-card disabled:opacity-50"
        >
          <option value="">Visa type *</option>
          {visaTypes.map((vt) => (
            <option key={vt} value={vt}>{VISA_TYPES.find((v) => v.value === vt)?.label ?? vt}</option>
          ))}
        </select>
      </div>
      <Button size="sm" className="w-full" disabled={saving} onClick={() => { void handleCreate(); }}>
        {saving ? "Creating..." : "Create client link"}
      </Button>
    </div>
  );
}

function SendLinkButtons({ token, clientName, clientPhone }: { token: string; clientName: string; clientPhone?: string }) {
  const [copied, setCopied] = useState(false);
  const link = `${window.location.origin}/client-portal/${token}`;
  const message = `Hi ${clientName}, please use this secure link to upload your visa documents: ${link}`;
  const whatsappHref = clientPhone
    ? `https://wa.me/${toWhatsAppNumber(clientPhone)}?text=${encodeURIComponent(message)}`
    : `https://wa.me/?text=${encodeURIComponent(message)}`;

  return (
    <div className="flex items-center gap-2 shrink-0">
      <a
        href={whatsappHref}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border border-[#25D366]/30 bg-[#25D366]/10 text-[#1f9e54] hover:bg-[#25D366]/20 transition-colors cursor-pointer shrink-0"
        title={clientPhone ? "Send to client on WhatsApp" : "Share via WhatsApp"}
      >
        <MessageCircle className="w-3.5 h-3.5" />
        WhatsApp
      </a>
      <button
        type="button"
        onClick={() => {
          navigator.clipboard.writeText(link).then(() => {
            setCopied(true);
            toast.success("Link copied to clipboard.");
            setTimeout(() => setCopied(false), 2000);
          }).catch(() => toast.error("Failed to copy link."));
        }}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border border-border text-muted-foreground hover:text-primary hover:border-primary/30 transition-colors cursor-pointer shrink-0"
      >
        {copied ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
        {copied ? "Copied" : "Copy link"}
      </button>
    </div>
  );
}

function IntakeDetailRow({ intake }: { intake: Intake }) {
  const [expanded, setExpanded] = useState(false);
  const required = requiredDocCount(intake.destination, intake.visaType);

  return (
    <div className="rounded-lg border border-border bg-card overflow-hidden">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="w-full p-3 flex items-center justify-between gap-3 text-left cursor-pointer hover:bg-background/60 transition-colors"
      >
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-sm font-semibold text-foreground truncate">{intake.clientName}</p>
            <span className={cn("shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold", intakeStatusStyles[intake.status])}>
              {intakeStatusLabels[intake.status]}
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1.5 flex-wrap">
            <span>
              {intake.destination} &middot; {visaTypeLabel(intake.visaType)} &middot; {intake.documents.length}{required > 0 ? `/${required}` : ""} document{intake.documents.length === 1 ? "" : "s"}
              {intake.claimedByEmail ? ` · uploaded by ${intake.claimedByEmail}` : ""}
            </span>
            <WaitTimeStat destination={intake.destination} visaType={intake.visaType} variant="inline" />
          </p>
        </div>
        <SendLinkButtons token={intake.token} clientName={intake.clientName} clientPhone={intake.clientPhone} />
      </button>
      {expanded && (
        <div className="border-t border-border p-3 bg-background/50 space-y-2">
          {intake.documents.length === 0 ? (
            <p className="text-xs text-muted-foreground py-2">No documents uploaded yet.</p>
          ) : (
            intake.documents.map((doc) => (
              <a
                key={doc._id}
                href={doc.url ?? undefined}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between gap-3 rounded-lg border border-border bg-card p-2.5 hover:border-primary/30 transition-colors"
              >
                <div className="min-w-0 flex items-center gap-2">
                  <FileText className="w-3.5 h-3.5 text-accent shrink-0" />
                  <span className="text-xs font-medium text-foreground truncate">{doc.label}</span>
                </div>
                <span className="text-[10px] text-muted-foreground shrink-0">
                  {new Date(doc.uploadedAt).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                </span>
              </a>
            ))
          )}
        </div>
      )}
    </div>
  );
}

function YourClientsInner() {
  const intakes = useQuery(api.clientIntakes.listMyIntakes, {}) as Intake[] | undefined;
  const [showForm, setShowForm] = useState(false);
  const [justCreatedToken, setJustCreatedToken] = useState<string | null>(null);
  const justCreatedIntake = (intakes ?? []).find((i) => i.token === justCreatedToken);

  return (
    <section className="rounded-lg border border-border bg-background p-4 shadow-sm md:p-5">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="mb-1 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.24em] text-accent">
            <Users className="h-3.5 w-3.5" />
            Your clients
          </div>
          <h2 className="font-serif text-2xl font-semibold text-primary">
            Real clients, real documents.
          </h2>
        </div>
        <Button size="sm" onClick={() => setShowForm((v) => !v)}>
          <UserPlus className="h-4 w-4" />
          {showForm ? "Cancel" : "Add client"}
        </Button>
      </div>

      {showForm && (
        <div className="mb-4">
          <NewClientForm
            onCreated={(token) => {
              setShowForm(false);
              setJustCreatedToken(token);
            }}
          />
        </div>
      )}

      {justCreatedToken && justCreatedIntake && (
        <div className="mb-4 rounded-lg border border-primary/20 bg-primary/5 p-4 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-semibold text-primary">Client link ready — send it now</p>
            <p className="text-xs text-muted-foreground truncate">{`${window.location.origin}/client-portal/${justCreatedToken}`}</p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <SendLinkButtons token={justCreatedToken} clientName={justCreatedIntake.clientName} clientPhone={justCreatedIntake.clientPhone} />
            <button type="button" onClick={() => setJustCreatedToken(null)} className="p-1.5 text-muted-foreground hover:text-primary">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {intakes === undefined && (
        <div className="space-y-3">
          {Array.from({ length: 2 }).map((_, i) => <Skeleton key={i} className="h-16 w-full rounded-lg" />)}
        </div>
      )}

      {intakes && intakes.length === 0 && !showForm && (
        <p className="text-sm text-muted-foreground py-6 text-center">
          No clients yet. Add a client to generate their document upload link.
        </p>
      )}

      {intakes && intakes.length > 0 && (
        <div className="space-y-2">
          {intakes.map((intake) => <IntakeDetailRow key={intake._id} intake={intake} />)}
        </div>
      )}
    </section>
  );
}

function YourClients() {
  return (
    <div id="your-clients">
      <AuthLoading>
        <Skeleton className="h-40 w-full rounded-lg" />
      </AuthLoading>
      <Unauthenticated>
        <section className="rounded-lg border border-border bg-background p-6 shadow-sm">
          <div className="text-center mb-5">
            <LogIn className="h-7 w-7 text-primary mx-auto mb-3" />
            <h2 className="font-serif text-xl font-semibold text-primary mb-2">Sign in to manage real clients</h2>
            <p className="text-sm text-muted-foreground max-w-sm mx-auto">
              Verified agent accounts only. Sign in with Google or your email and password to add clients and send them document upload links.
            </p>
          </div>
          <div className="max-w-sm mx-auto">
            <AuthAccessPanel returnPath="/agents/dashboard" hideDemoOption />
          </div>
        </section>
      </Unauthenticated>
      <Authenticated>
        <YourClientsInner />
      </Authenticated>
    </div>
  );
}

function PipelineBoard({ intakes }: { intakes: Intake[] }) {
  const columns: { stage: IntakeStatus; label: string }[] = [
    { stage: "awaiting_documents", label: "Awaiting Documents" },
    { stage: "documents_received", label: "Documents Received" },
    { stage: "in_review", label: "In Review" },
    { stage: "complete", label: "Complete" },
  ];

  return (
    <section className="rounded-lg border border-border bg-background p-4 shadow-sm md:p-5">
      <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="mb-1 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.24em] text-accent">
            <LayoutDashboard className="h-3.5 w-3.5" />
            Pipeline board
          </div>
          <h2 className="font-serif text-2xl font-semibold text-primary">
            Every real client, every real stage.
          </h2>
        </div>
      </div>

      {intakes.length === 0 ? (
        <p className="text-sm text-muted-foreground py-8 text-center">
          Add your first client to see your pipeline build up here.
        </p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {columns.map((column) => {
            const colIntakes = intakes.filter((i) => i.status === column.stage);
            return (
              <div key={column.stage} className="space-y-3">
                <div className="flex items-center justify-between rounded-lg border border-border bg-card px-3 py-2">
                  <span className="text-xs font-semibold text-primary">{column.label}</span>
                  <span className="rounded-full bg-secondary px-2 py-0.5 text-[10px] font-semibold text-secondary-foreground">
                    {colIntakes.length}
                  </span>
                </div>
                {colIntakes.map((intake) => {
                  const days = daysSince(intake.createdAt);
                  const tone = days >= 7 ? "danger" : days >= 3 ? "warning" : "safe";
                  return (
                    <article
                      key={intake._id}
                      className={cn(
                        "rounded-lg border p-3 shadow-sm",
                        tone === "danger" ? "border-red-300 bg-red-50" : tone === "warning" ? "border-amber-300 bg-amber-50" : "border-border bg-card",
                      )}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <h3 className="truncate text-sm font-semibold text-foreground">{intake.clientName}</h3>
                          <p className="mt-1 text-xs text-muted-foreground">{intake.destination}</p>
                        </div>
                        <span className="shrink-0 rounded-full bg-primary/8 px-2 py-1 text-[10px] font-semibold text-primary">
                          {days === 0 ? "Today" : `${days}d`}
                        </span>
                      </div>
                      <div className="mt-3 flex items-center justify-between gap-2 text-xs">
                        <span className="font-medium text-foreground">{visaTypeLabel(intake.visaType)}</span>
                        <span className="text-muted-foreground">{intake.documents.length} docs</span>
                      </div>
                    </article>
                  );
                })}
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}

type ContactRequest = {
  _id: Id<"agent_contact_requests">;
  fromName?: string;
  fromEmail?: string;
  message?: string;
  createdAt: string;
  read: boolean;
};

function TodayActions({ intakes, contactRequests }: { intakes: Intake[]; contactRequests: ContactRequest[] }) {
  const navigate = useNavigate();
  const markRead = useMutation(api.agents.markContactRequestRead);

  const actions = useMemo(() => {
    const items: { key: string; title: string; detail: string; priority: string; Icon: LucideIcon; onClick?: () => void }[] = [];

    for (const req of contactRequests.filter((r) => !r.read).slice(0, 5)) {
      items.push({
        key: `req-${req._id}`,
        title: `New enquiry from ${req.fromName || req.fromEmail || "an applicant"}`,
        detail: req.message || "Sent via the VisaClear marketplace",
        priority: "New",
        Icon: Bell,
        onClick: () => { void markRead({ id: req._id }); },
      });
    }

    for (const intake of intakes) {
      const days = daysSince(intake.createdAt);
      if (intake.status === "awaiting_documents" && days >= 3) {
        items.push({
          key: `chase-${intake._id}`,
          title: `Chase ${intake.clientName}`,
          detail: `Still no documents uploaded (${days}d)`,
          priority: days >= 7 ? "Red" : "Amber",
          Icon: Bell,
        });
      }
      if (intake.status === "documents_received") {
        items.push({
          key: `review-${intake._id}`,
          title: `Review ${intake.clientName}`,
          detail: "Documents uploaded, ready for your review",
          priority: "Ready",
          Icon: ClipboardCheck,
        });
      }
    }

    return items.slice(0, 8);
  }, [intakes, contactRequests, markRead]);

  return (
    <aside className="rounded-lg border border-border bg-card p-4 shadow-sm md:p-5">
      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <div className="mb-1 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.24em] text-accent">
            <Clock3 className="h-3.5 w-3.5" />
            Today
          </div>
          <h2 className="font-serif text-2xl font-semibold text-primary">Action list</h2>
        </div>
      </div>
      {actions.length === 0 ? (
        <p className="text-sm text-muted-foreground py-6 text-center">Nothing needs your attention right now.</p>
      ) : (
        <div className="space-y-3">
          {actions.map((action) => (
            <button
              key={action.key}
              onClick={action.onClick ?? (() => document.getElementById("your-clients")?.scrollIntoView({ behavior: "smooth" }))}
              className="w-full rounded-lg border border-border bg-background p-3 text-left transition-colors hover:border-primary/30 hover:bg-primary/5 cursor-pointer"
              type="button"
            >
              <div className="flex items-start gap-3">
                <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-accent/15 text-accent-foreground">
                  <action.Icon className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate text-sm font-semibold text-foreground">{action.title}</p>
                    <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">{action.priority}</span>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">{action.detail}</p>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
      <Button className="mt-4 w-full" size="sm" onClick={() => navigate("/agents/dashboard#your-clients")}>
        Open your clients
      </Button>
    </aside>
  );
}

function ClientPortalPreview() {
  const checklist = [
    { label: "Passport bio page", done: true },
    { label: "3 months bank statements", done: true },
    { label: "Employment letter", done: false },
    { label: "Travel itinerary", done: false },
  ];
  return (
    <section className="rounded-lg border border-border bg-card p-5 shadow-sm md:p-6">
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[0.95fr_1.05fr] lg:items-center">
        <div>
          <SectionHeader
            eyebrow="Client portal"
            title="The feature that sells itself."
            description="Send one branded link. Clients upload real documents, follow their real checklist, and track real status from their phone — this is live today, not a mockup."
            Icon={UploadCloud}
          />
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            {[
              "Personal visa checklist",
              "Labeled document uploads",
              "Real progress tracker",
              "WhatsApp delivery",
            ].map((item) => (
              <div key={item} className="flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-2 text-sm font-medium text-foreground">
                <CheckCircle2 className="h-4 w-4 text-accent" />
                {item}
              </div>
            ))}
          </div>
          <div className="mt-5 rounded-lg border border-primary/15 bg-primary/5 p-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-primary">
              <Building2 className="h-4 w-4" />
              Agency tier white-label
            </div>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              The portal can use the agency logo, colors, and domain so clients experience the agency brand from start to finish.
            </p>
          </div>
        </div>

        <div className="mx-auto w-full max-w-sm rounded-[2rem] border border-primary/20 bg-primary p-3 shadow-xl shadow-primary/10">
          <div className="rounded-[1.5rem] bg-card p-4">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-accent">Sample preview</p>
                <h3 className="font-serif text-xl font-semibold text-primary">UK Visit Visa</h3>
              </div>
              <Shield className="h-5 w-5 text-accent" />
            </div>
            <div className="mb-4">
              <div className="mb-2 flex items-center justify-between text-xs font-semibold">
                <span className="text-muted-foreground">File progress</span>
                <span className="text-primary">62%</span>
              </div>
              <div className="h-2 rounded-full bg-secondary">
                <div className="h-full w-[62%] rounded-full bg-accent" />
              </div>
            </div>
            <div className="space-y-2">
              {checklist.map((item) => (
                <div key={item.label} className="flex items-center justify-between rounded-lg border border-border bg-background px-3 py-2">
                  <span className="text-xs font-medium text-foreground">{item.label}</span>
                  {item.done ? <CheckCircle2 className="h-4 w-4 text-accent" /> : <UploadCloud className="h-4 w-4 text-muted-foreground" />}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function TemplatesSection({ intakes }: { intakes: Intake[] }) {
  const [showForm, setShowForm] = useState(false);

  const topCombos = useMemo(() => {
    const counts = new Map<string, { destination: string; visaType: string; count: number }>();
    for (const intake of intakes) {
      const key = `${intake.destination}|${intake.visaType}`;
      const existing = counts.get(key);
      if (existing) existing.count += 1;
      else counts.set(key, { destination: intake.destination, visaType: intake.visaType, count: 1 });
    }
    return [...counts.values()].sort((a, b) => b.count - a.count).slice(0, 3);
  }, [intakes]);

  return (
    <section className="rounded-lg border border-border bg-card p-5 shadow-sm md:p-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <SectionHeader
          eyebrow="Your frequent routes"
          title="Built from your own real client history."
          description="The destination and visa type combinations you handle most, so the next matching client is one click to start."
          Icon={ListChecks}
        />
      </div>
      {topCombos.length === 0 ? (
        <p className="mt-5 text-sm text-muted-foreground text-center py-6">
          Add a few clients and your most common routes will show up here automatically.
        </p>
      ) : (
        <div className="mt-5 grid gap-3 md:grid-cols-3">
          {topCombos.map((combo) => (
            <article key={`${combo.destination}-${combo.visaType}`} className="rounded-lg border border-border bg-background p-4">
              <div className="mb-3 flex items-center justify-between">
                <FileText className="h-5 w-5 text-accent" />
                <span className="rounded-full bg-primary/8 px-2.5 py-1 text-[11px] font-semibold text-primary">
                  {combo.count} client{combo.count === 1 ? "" : "s"}
                </span>
              </div>
              <h3 className="text-base font-semibold text-primary">{combo.destination}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{visaTypeLabel(combo.visaType)}</p>
              <Button className="mt-4 w-full" size="sm" variant="secondary" onClick={() => setShowForm(true)}>
                Add a client for this route
              </Button>
            </article>
          ))}
        </div>
      )}
      {showForm && (
        <div className="mt-4">
          <NewClientForm onCreated={() => setShowForm(false)} />
        </div>
      )}
    </section>
  );
}

function formatCents(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

function ReferralPanel() {
  const stats = useQuery(api.agentReferralCommissions.getMyReferralCommissionStatus, {});
  const ledger = useQuery(api.agentReferralCommissions.getMyReferralCommissionLedger, {});
  const [copied, setCopied] = useState(false);

  return (
    <article className="rounded-lg border border-border bg-card p-5 shadow-sm md:p-6">
      <SectionHeader
        eyebrow="Referrals"
        title="Real signups, tracked honestly."
        description="Every signup via your code is counted here. When a referred client pays for Pro, you earn 15% of that payment — 20% if they pay for Expert. Commission payouts will activate once a real billing connection is in place; this shows the true number today, not a placeholder."
        Icon={CreditCard}
      />
      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <div className="rounded-lg border border-border bg-background p-4">
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Signups via your code</p>
          <p className="mt-1 text-2xl font-semibold text-primary">{stats?.referredSignupCount ?? "—"}</p>
        </div>
        <div className="rounded-lg border border-border bg-background p-4">
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Your referral code</p>
          <button
            type="button"
            disabled={!stats?.referralCode}
            onClick={() => {
              if (!stats?.referralCode) return;
              navigator.clipboard.writeText(stats.referralCode).then(() => {
                setCopied(true);
                toast.success("Referral code copied.");
                setTimeout(() => setCopied(false), 2000);
              }).catch(() => toast.error("Failed to copy."));
            }}
            className="mt-1 flex items-center gap-2 text-lg font-semibold text-primary cursor-pointer disabled:opacity-50"
          >
            {stats?.referralCode ?? "Sign in to see your code"}
            {stats?.referralCode && (copied ? <CheckCircle2 className="h-4 w-4 text-accent" /> : <Copy className="h-4 w-4 text-muted-foreground" />)}
          </button>
        </div>
      </div>
      {stats && (
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <div className="rounded-lg border border-border bg-background p-4">
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Paying clients referred</p>
            <p className="mt-1 text-2xl font-semibold text-primary">{stats.payingClientCount}</p>
          </div>
          <div className="rounded-lg border border-accent/20 bg-accent/5 p-4">
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Commission earned</p>
            <p className="mt-1 text-2xl font-semibold text-accent">{formatCents(stats.totalCommissionCents)}</p>
          </div>
        </div>
      )}
      {ledger && ledger.length > 0 && (
        <div className="mt-3 rounded-lg border border-border bg-background p-4">
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground mb-2">Recent commissions</p>
          <div className="space-y-1.5">
            {ledger.slice(0, 5).map((c) => (
              <div key={c._id} className="flex items-center justify-between gap-3 text-xs">
                <span className="text-muted-foreground">
                  {c.plan === "expert" ? "Expert" : "Pro"} referral &middot; {c.commissionRatePercent}% &middot;{" "}
                  {new Date(c.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                </span>
                <span className="font-semibold text-foreground">{formatCents(c.commissionCents)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </article>
  );
}

const TIER_LABELS: Record<string, string> = {
  agent_listing: "Agent Listing",
  agent_featured: "Agent Featured",
  agency_white_label: "Agency White-Label",
};

function LicenseRedemptionPanel() {
  const myProfile = useQuery(api.agents.getMyProfile, {});
  const redeemCode = useMutation(api.licenseCodes.redeemLicenseCode);
  const [code, setCode] = useState("");
  const [redeeming, setRedeeming] = useState(false);

  const handleRedeem = async () => {
    if (!code.trim()) {
      toast.error("Please enter a license code.");
      return;
    }
    setRedeeming(true);
    try {
      const result = await redeemCode({ code });
      toast.success(`License activated: ${TIER_LABELS[result.plan] ?? result.plan}`);
      setCode("");
    } catch (err) {
      if (err instanceof ConvexError) toast.error((err.data as { message: string }).message);
      else toast.error("Failed to redeem code.");
    } finally {
      setRedeeming(false);
    }
  };

  return (
    <article className="rounded-lg border border-border bg-card p-5 shadow-sm md:p-6">
      <SectionHeader
        eyebrow="License"
        title="Redeem a license code."
        description="If you were issued an activation code (e.g. after a white-label application), enter it here to unlock your plan — no payment needed."
        Icon={BadgeCheck}
      />
      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <div className="rounded-lg border border-border bg-background p-4">
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Current Plan</p>
          <p className="mt-1 text-lg font-semibold text-primary">{myProfile?.tier ? TIER_LABELS[myProfile.tier] ?? myProfile.tier : "Free"}</p>
        </div>
        <div className="rounded-lg border border-border bg-background p-4">
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground mb-2">License Code</p>
          <div className="flex gap-2">
            <input
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="XXXX-XXXX-XXXX"
              disabled={redeeming}
              className="flex-1 h-9 rounded-md border border-border bg-background px-2.5 text-sm font-mono disabled:opacity-60"
            />
            <button
              disabled={redeeming}
              onClick={() => { void handleRedeem(); }}
              className="text-xs font-semibold text-accent hover:underline cursor-pointer disabled:opacity-60 whitespace-nowrap"
            >
              {redeeming ? "Redeeming…" : "Redeem"}
            </button>
          </div>
        </div>
      </div>
    </article>
  );
}

export default function AgentDashboardPreviewPage() {
  useSeo({
    title: "Agent Operating System",
    description: "VisaClear agent dashboard: real client pipeline, document portal, and follow-up tools for visa agencies.",
  });

  const navigate = useNavigate();
  const goBack = useSmartBack("/agents");
  const myProfile = useQuery(api.agents.getMyProfile, {});
  const intakesRaw = useQuery(api.clientIntakes.listMyIntakes, {}) as Intake[] | undefined;
  const intakes = useMemo(() => intakesRaw ?? [], [intakesRaw]);
  const contactRequests = (useQuery(api.agents.getMyContactRequests, {}) ?? []) as ContactRequest[];
  const markDashboardViewed = useMutation(api.agents.markDashboardViewed);

  const lastViewedAt = myProfile?.lastDashboardViewAt;
  const newUploadsSinceLastVisit = useMemo(() => {
    if (!lastViewedAt) return 0;
    let count = 0;
    for (const intake of intakes) {
      for (const doc of intake.documents) {
        if (new Date(doc.uploadedAt) > new Date(lastViewedAt)) count += 1;
      }
    }
    return count;
  }, [intakes, lastViewedAt]);

  useEffect(() => {
    if (myProfile) {
      void markDashboardViewed({}).catch(() => {});
    }
    // Only fire once per real profile load, not on every intake re-fetch.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [myProfile?._id]);

  const unreadEnquiries = contactRequests.filter((r) => !r.read).length;
  const kpis: { label: string; value: string | number; detail: string; Icon: LucideIcon }[] = [
    {
      label: "Total clients",
      value: intakes.length,
      detail: `${intakes.filter((i) => i.status === "complete").length} completed`,
      Icon: Users,
    },
    {
      label: "Awaiting documents",
      value: intakes.filter((i) => i.status === "awaiting_documents").length,
      detail: "Clients who haven't uploaded yet",
      Icon: ClipboardCheck,
    },
    {
      label: "Ready for your review",
      value: intakes.filter((i) => i.status === "documents_received").length,
      detail: "Documents uploaded, awaiting you",
      Icon: BadgeCheck,
    },
    {
      label: "New enquiries",
      value: unreadEnquiries,
      detail: newUploadsSinceLastVisit > 0 ? `${newUploadsSinceLastVisit} new upload${newUploadsSinceLastVisit === 1 ? "" : "s"} since last visit` : "From the marketplace",
      Icon: CircleDollarSign,
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 border-b border-border/70 bg-background/95 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <button aria-label="Go back" className="-ml-1 rounded-md p-1 text-muted-foreground transition-colors hover:bg-secondary hover:text-primary" onClick={goBack} type="button">
              <ArrowLeft className="h-5 w-5" />
            </button>
            <button className="flex min-w-0 items-center gap-2.5 text-left" onClick={() => navigate("/")} type="button">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary">
                <Globe className="h-4 w-4 text-primary-foreground" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-serif text-lg font-semibold leading-none text-primary">VisaClear</span>
                  <span className="hidden rounded-full bg-accent/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-accent-foreground sm:inline">Agent OS</span>
                </div>
                <p className="truncate text-[11px] text-muted-foreground">Operating system for visa agencies</p>
              </div>
            </button>
          </div>
          <Button size="sm" className="shrink-0" onClick={() => document.getElementById("your-clients")?.scrollIntoView({ behavior: "smooth" })}>
            <UserPlus className="h-4 w-4" />
            Add client
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-6 md:py-8">
        <motion.section initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="rounded-lg border border-border bg-card p-5 shadow-sm md:p-6">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_auto] lg:items-end">
            <div>
              <div className="mb-3 inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.24em] text-accent">
                <Shield className="h-3.5 w-3.5" />
                Agent platform
              </div>
              <h1 className="max-w-4xl font-serif text-3xl font-semibold leading-tight text-primary md:text-5xl">
                Your real business, in one place.
              </h1>
              <p className="mt-3 max-w-3xl text-sm leading-relaxed text-muted-foreground md:text-base">
                Every number below comes from your own real clients and documents — nothing here is a demo.
              </p>
            </div>
          </div>
        </motion.section>

        <YourClients />

        <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {kpis.map((kpi) => <KpiCard key={kpi.label} {...kpi} />)}
        </section>

        <section className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
          <PipelineBoard intakes={intakes} />
          <TodayActions intakes={intakes} contactRequests={contactRequests} />
        </section>

        <ClientPortalPreview />

        <TemplatesSection intakes={intakes} />

        <section className="grid gap-5 lg:grid-cols-2">
          <article className="rounded-lg border border-border bg-card p-5 shadow-sm md:p-6">
            <SectionHeader
              eyebrow="Agent analytics"
              title="Business intelligence from your real pipeline."
              description="Computed live from your own clients."
              Icon={BarChart3}
            />
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              {[
                ["Total clients", String(intakes.length)],
                ["Completion rate", intakes.length > 0 ? `${Math.round((intakes.filter((i) => i.status === "complete").length / intakes.length) * 100)}%` : "—"],
                ["Top destination", intakes.length > 0 ? (Object.entries(intakes.reduce((acc, i) => { acc[i.destination] = (acc[i.destination] ?? 0) + 1; return acc; }, {} as Record<string, number>)).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "—") : "—"],
                ["New enquiries", String(unreadEnquiries)],
              ].map(([label, value]) => (
                <div key={label} className="rounded-lg border border-border bg-background p-4">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">{label}</p>
                  <p className="mt-1 text-2xl font-semibold text-primary">{value}</p>
                </div>
              ))}
            </div>
          </article>

          <article className="rounded-lg border border-border bg-card p-5 shadow-sm md:p-6">
            <SectionHeader
              eyebrow="Security and privacy"
              title="Real, account-scoped privacy."
              description="What's actually true today — not a roadmap promise."
              Icon={LockKeyhole}
            />
            <div className="mt-5 space-y-3">
              {[
                ["Account-scoped access", "Only you can see your clients and their documents — enforced on every request, not just in the UI."],
                ["Document history", "Every upload keeps its real upload date and label."],
                ["Secure links", "Each client gets a unique, unguessable upload token instead of a shared inbox."],
              ].map(([title, detail]) => (
                <div key={title} className="flex items-start gap-3 rounded-lg border border-border bg-background p-3">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
                  <div>
                    <p className="text-sm font-semibold text-foreground">{title}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{detail}</p>
                  </div>
                </div>
              ))}
            </div>
          </article>
        </section>

        <ReferralPanel />

        <LicenseRedemptionPanel />

        <section className="rounded-lg border border-border bg-primary p-5 text-primary-foreground shadow-sm md:p-6">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
            <div>
              <div className="mb-2 inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.24em] text-accent">
                <UserPlus className="h-3.5 w-3.5" />
                First 10 minutes
              </div>
              <h2 className="font-serif text-3xl font-semibold leading-tight">Feel the magic with one real client.</h2>
              <p className="mt-3 text-sm leading-relaxed text-primary-foreground/75">
                One real client, one real portal link, one real upload notification.
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {[
                ["1", "Add your first client", "Name, WhatsApp number, destination in 60 seconds"],
                ["2", "Send the link on WhatsApp", "One tap, the client gets it where they already are"],
                ["3", "They upload a document", "Your dashboard updates live — no refresh needed"],
                ["4", "You review and move them forward", "The pipeline reflects reality, not a demo"],
              ].map(([step, title, detail]) => (
                <div key={step} className="rounded-lg border border-white/15 bg-white/10 p-4">
                  <div className="mb-3 flex h-8 w-8 items-center justify-center rounded-md bg-accent text-sm font-bold text-accent-foreground">{step}</div>
                  <h3 className="font-semibold">{title}</h3>
                  <p className="mt-1 text-sm text-primary-foreground/70">{detail}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
