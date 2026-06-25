import { useState } from "react";
import { motion } from "motion/react";
import { useNavigate } from "react-router-dom";
import { Authenticated, Unauthenticated, AuthLoading, useMutation, useQuery } from "convex/react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { AuthAccessPanel } from "@/components/auth/access-panel.tsx";
import { useSeo } from "@/hooks/use-seo.ts";
import { cn } from "@/lib/utils.ts";
import { api } from "@/convex/_generated/api.js";
import { AVAILABLE_DESTINATIONS, getAvailableVisaTypes, type VisaType } from "@/lib/visa-data.ts";
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
  FileArchive,
  FileCheck2,
  FileText,
  FolderOpen,
  Globe,
  LayoutDashboard,
  ListChecks,
  LockKeyhole,
  LogIn,
  Send,
  Shield,
  Star,
  UploadCloud,
  UserPlus,
  Users,
  X,
  type LucideIcon,
} from "lucide-react";

type DeadlineTone = "safe" | "warning" | "danger";

type PipelineClient = {
  name: string;
  destination: string;
  visaType: string;
  deadlineDays: number;
  tone: DeadlineTone;
};

type PipelineColumn = {
  stage: string;
  total: number;
  clients: PipelineClient[];
};

type FeaturePanel = {
  title: string;
  eyebrow: string;
  description: string;
  Icon: LucideIcon;
  items: string[];
};

const kpis: Array<{
  label: string;
  value: string;
  detail: string;
  Icon: LucideIcon;
}> = [
  {
    label: "Active clients this month",
    value: "142",
    detail: "+18 this week",
    Icon: Users,
  },
  {
    label: "Applications pending submission",
    value: "37",
    detail: "9 ready today",
    Icon: ClipboardCheck,
  },
  {
    label: "Applications approved this week",
    value: "21",
    detail: "94% approval rate",
    Icon: BadgeCheck,
  },
  {
    label: "Revenue from referrals",
    value: "$4,860",
    detail: "25% recurring commission",
    Icon: CircleDollarSign,
  },
];

const pipelineColumns: PipelineColumn[] = [
  {
    stage: "Inquiry",
    total: 18,
    clients: [
      {
        name: "Amara Okafor",
        destination: "United Kingdom",
        visaType: "Visit visa",
        deadlineDays: 12,
        tone: "safe",
      },
      {
        name: "Ravi Patel",
        destination: "Canada",
        visaType: "Student visa",
        deadlineDays: 6,
        tone: "warning",
      },
    ],
  },
  {
    stage: "Documents",
    total: 31,
    clients: [
      {
        name: "Maria Silva",
        destination: "Portugal",
        visaType: "Schengen",
        deadlineDays: 3,
        tone: "danger",
      },
      {
        name: "Noah Mensah",
        destination: "UAE",
        visaType: "Business",
        deadlineDays: 8,
        tone: "safe",
      },
    ],
  },
  {
    stage: "Ready to Submit",
    total: 14,
    clients: [
      {
        name: "James Carter",
        destination: "Australia",
        visaType: "Work visa",
        deadlineDays: 5,
        tone: "warning",
      },
      {
        name: "Aisha Bello",
        destination: "France",
        visaType: "Tourist",
        deadlineDays: 10,
        tone: "safe",
      },
    ],
  },
  {
    stage: "Submitted",
    total: 22,
    clients: [
      {
        name: "Daniel Park",
        destination: "Japan",
        visaType: "Transit",
        deadlineDays: 16,
        tone: "safe",
      },
    ],
  },
  {
    stage: "Decision",
    total: 11,
    clients: [
      {
        name: "Fatima Khan",
        destination: "Germany",
        visaType: "Family",
        deadlineDays: 2,
        tone: "danger",
      },
    ],
  },
  {
    stage: "Closed",
    total: 46,
    clients: [
      {
        name: "Liam Hughes",
        destination: "Spain",
        visaType: "Digital nomad",
        deadlineDays: 0,
        tone: "safe",
      },
    ],
  },
];

const actions = [
  {
    title: "Chase Maria",
    detail: "Passport still missing",
    priority: "Red",
    Icon: Bell,
  },
  {
    title: "Review James",
    detail: "Documents complete, ready to submit",
    priority: "Amber",
    Icon: FileCheck2,
  },
  {
    title: "Send portal link",
    detail: "Ravi accepted quotation",
    priority: "Today",
    Icon: Send,
  },
  {
    title: "Passport expiry alert",
    detail: "Fatima expires in 87 days",
    priority: "90-day",
    Icon: CalendarClock,
  },
];

const checklist = [
  { label: "Passport bio page", done: true },
  { label: "3 months bank statements", done: true },
  { label: "Employment letter", done: false },
  { label: "Travel itinerary", done: false },
];

const templates = [
  {
    name: "UK Visit Visa",
    detail: "14 documents, 3 client instructions, 21-day timeline",
  },
  {
    name: "Schengen Tourist",
    detail: "12 documents, embassy notes, insurance reminder",
  },
  {
    name: "Canada Student",
    detail: "18 documents, study-plan guidance, biometrics step",
  },
];

const featurePanels: FeaturePanel[] = [
  {
    eyebrow: "Team management",
    title: "Scale the agency without losing control.",
    description:
      "Owners add staff, assign clients, set roles, and keep a full activity trail.",
    Icon: Users,
    items: [
      "Owner, Senior Consultant, Junior Consultant",
      "Assigned-client visibility",
      "Activity log for every action",
    ],
  },
  {
    eyebrow: "Agent analytics",
    title: "Business intelligence for every route.",
    description:
      "Agents see submissions, approval rate, processing time, top destinations, and returning-client health.",
    Icon: BarChart3,
    items: [
      "Applications submitted vs last month",
      "Average processing time by country",
      "Client retention and route volume",
    ],
  },
  {
    eyebrow: "Referral centre",
    title: "Turn every agent into a growth channel.",
    description:
      "A unique referral link tracks upgrades, pending payout, lifetime earnings, and monthly commission.",
    Icon: CircleDollarSign,
    items: [
      "25% recurring commission",
      "Referrals sent and converted",
      "Bank or PayPal payout tracking",
    ],
  },
];

const deadlineStyles: Record<DeadlineTone, string> = {
  safe: "border-border bg-card",
  warning: "border-amber-300 bg-amber-50 text-amber-950",
  danger: "border-red-300 bg-red-50 text-red-950",
};

const deadlineBadgeStyles: Record<DeadlineTone, string> = {
  safe: "bg-primary/8 text-primary",
  warning: "bg-amber-200 text-amber-950",
  danger: "bg-red-200 text-red-950",
};

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

function KpiCard({
  label,
  value,
  detail,
  Icon,
}: {
  label: string;
  value: string;
  detail: string;
  Icon: LucideIcon;
}) {
  return (
    <article className="rounded-lg border border-border bg-card p-4 shadow-sm">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-md bg-primary/8 text-primary">
          <Icon className="h-4 w-4" />
        </div>
        <span className="rounded-full bg-accent/15 px-2.5 py-1 text-[11px] font-semibold text-accent-foreground">
          Preview
        </span>
      </div>
      <div className="text-3xl font-semibold tracking-normal text-primary">
        {value}
      </div>
      <p className="mt-1 text-sm font-medium text-foreground">{label}</p>
      <p className="mt-2 text-xs text-muted-foreground">{detail}</p>
    </article>
  );
}

function PipelineClientCard({ client }: { client: PipelineClient }) {
  return (
    <article
      className={cn(
        "rounded-lg border p-3 shadow-sm transition-colors",
        deadlineStyles[client.tone],
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate text-sm font-semibold text-foreground">
            {client.name}
          </h3>
          <p className="mt-1 text-xs text-muted-foreground">
            {client.destination}
          </p>
        </div>
        <span
          className={cn(
            "shrink-0 rounded-full px-2 py-1 text-[10px] font-semibold",
            deadlineBadgeStyles[client.tone],
          )}
        >
          {client.deadlineDays === 0 ? "Closed" : `${client.deadlineDays}d`}
        </span>
      </div>
      <div className="mt-3 flex items-center justify-between gap-2 text-xs">
        <span className="font-medium text-foreground">{client.visaType}</span>
        <span className="text-muted-foreground">Deadline</span>
      </div>
    </article>
  );
}

type IntakeStatus = "awaiting_documents" | "documents_received" | "in_review" | "complete";

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

function NewClientForm({ onCreated }: { onCreated: (token: string) => void }) {
  const createIntake = useMutation(api.clientIntakes.createIntake);
  const [clientName, setClientName] = useState("");
  const [clientEmail, setClientEmail] = useState("");
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
          value={clientEmail}
          onChange={(e) => setClientEmail(e.target.value)}
          placeholder="Client email (optional)"
          className="w-full px-3 py-2 text-sm rounded-lg border border-input bg-card"
        />
      </div>
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
            <option key={vt} value={vt}>{vt}</option>
          ))}
        </select>
      </div>
      <Button size="sm" className="w-full" disabled={saving} onClick={() => { void handleCreate(); }}>
        {saving ? "Creating..." : "Create client link"}
      </Button>
    </div>
  );
}

function CopyLinkButton({ token }: { token: string }) {
  const [copied, setCopied] = useState(false);
  const link = `${window.location.origin}/client-portal/${token}`;
  return (
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
  );
}

function YourClientsInner() {
  const intakes = useQuery(api.clientIntakes.listMyIntakes, {});
  const [showForm, setShowForm] = useState(false);
  const [justCreatedToken, setJustCreatedToken] = useState<string | null>(null);

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

      {justCreatedToken && (
        <div className="mb-4 rounded-lg border border-primary/20 bg-primary/5 p-4 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-semibold text-primary">Client link ready</p>
            <p className="text-xs text-muted-foreground truncate">{`${window.location.origin}/client-portal/${justCreatedToken}`}</p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <CopyLinkButton token={justCreatedToken} />
            <button
              type="button"
              onClick={() => setJustCreatedToken(null)}
              className="p-1.5 text-muted-foreground hover:text-primary"
            >
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
        <div className="space-y-3">
          {intakes.map((intake) => (
            <div
              key={intake._id}
              className="rounded-lg border border-border bg-card p-3 flex items-center justify-between gap-3"
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-semibold text-foreground truncate">{intake.clientName}</p>
                  <span className={cn("shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold", intakeStatusStyles[intake.status as IntakeStatus])}>
                    {intakeStatusLabels[intake.status as IntakeStatus]}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {intake.destination} &middot; {intake.visaType} &middot; {intake.documents.length} document{intake.documents.length === 1 ? "" : "s"}
                  {intake.claimedByEmail ? ` · uploaded by ${intake.claimedByEmail}` : ""}
                </p>
              </div>
              <CopyLinkButton token={intake.token} />
            </div>
          ))}
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

function PipelineBoard() {
  return (
    <section className="rounded-lg border border-border bg-background p-4 shadow-sm md:p-5">
      <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="mb-1 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.24em] text-accent">
            <LayoutDashboard className="h-3.5 w-3.5" />
            Pipeline board
          </div>
          <h2 className="font-serif text-2xl font-semibold text-primary">
            Every client, every deadline, one view.
          </h2>
        </div>
        <div className="flex w-full rounded-lg border border-border bg-card p-1 sm:w-auto">
          {["Today", "7 days", "All"].map((label, index) => (
            <button
              key={label}
              className={cn(
                "flex-1 rounded-md px-3 py-1.5 text-xs font-semibold transition-colors sm:flex-none",
                index === 0
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-primary",
              )}
              type="button"
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-6">
        {pipelineColumns.map((column) => (
          <div key={column.stage} className="space-y-3">
            <div className="flex items-center justify-between rounded-lg border border-border bg-card px-3 py-2">
              <span className="text-xs font-semibold text-primary">
                {column.stage}
              </span>
              <span className="rounded-full bg-secondary px-2 py-0.5 text-[10px] font-semibold text-secondary-foreground">
                {column.total}
              </span>
            </div>
            {column.clients.map((client) => (
              <PipelineClientCard key={client.name} client={client} />
            ))}
          </div>
        ))}
      </div>
    </section>
  );
}

function TodayActions() {
  return (
    <aside className="rounded-lg border border-border bg-card p-4 shadow-sm md:p-5">
      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <div className="mb-1 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.24em] text-accent">
            <Clock3 className="h-3.5 w-3.5" />
            Today
          </div>
          <h2 className="font-serif text-2xl font-semibold text-primary">
            Action list
          </h2>
        </div>
        <span className="rounded-full bg-primary/8 px-2.5 py-1 text-[11px] font-semibold text-primary">
          Auto
        </span>
      </div>
      <div className="space-y-3">
        {actions.map((action) => (
          <button
            key={action.title}
            className="w-full rounded-lg border border-border bg-background p-3 text-left transition-colors hover:border-primary/30 hover:bg-primary/5"
            type="button"
          >
            <div className="flex items-start gap-3">
              <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-accent/15 text-accent-foreground">
                <action.Icon className="h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <p className="truncate text-sm font-semibold text-foreground">
                    {action.title}
                  </p>
                  <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                    {action.priority}
                  </span>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  {action.detail}
                </p>
              </div>
            </div>
          </button>
        ))}
      </div>
      <Button className="mt-4 w-full" size="sm">
        Work today&apos;s list
      </Button>
    </aside>
  );
}

function ClientPortalPreview() {
  return (
    <section className="rounded-lg border border-border bg-card p-5 shadow-sm md:p-6">
      <div className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr] lg:items-center">
        <div>
          <SectionHeader
            eyebrow="Client portal"
            title="The demo feature that sells itself."
            description="Agents send one branded link. Clients upload documents, follow their checklist, track status, and message the agency from their phone."
            Icon={UploadCloud}
          />
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            {[
              "Personal visa checklist",
              "Labeled document uploads",
              "Progress and status tracker",
              "Direct message thread",
            ].map((item) => (
              <div
                key={item}
                className="flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-2 text-sm font-medium text-foreground"
              >
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
              The portal can use the agency logo, colors, and domain so clients
              experience the agency brand from start to finish.
            </p>
          </div>
        </div>

        <div className="mx-auto w-full max-w-sm rounded-[2rem] border border-primary/20 bg-primary p-3 shadow-xl shadow-primary/10">
          <div className="rounded-[1.5rem] bg-card p-4">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-accent">
                  Northstar Visas
                </p>
                <h3 className="font-serif text-xl font-semibold text-primary">
                  UK Visit Visa
                </h3>
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
                <div
                  key={item.label}
                  className="flex items-center justify-between rounded-lg border border-border bg-background px-3 py-2"
                >
                  <span className="text-xs font-medium text-foreground">
                    {item.label}
                  </span>
                  {item.done ? (
                    <CheckCircle2 className="h-4 w-4 text-accent" />
                  ) : (
                    <UploadCloud className="h-4 w-4 text-muted-foreground" />
                  )}
                </div>
              ))}
            </div>
            <div className="mt-4 rounded-lg border border-dashed border-accent/50 bg-accent/10 p-4 text-center">
              <UploadCloud className="mx-auto mb-2 h-5 w-5 text-accent-foreground" />
              <p className="text-xs font-semibold text-primary">
                Upload employment letter
              </p>
            </div>
            <div className="mt-4 rounded-lg border border-border bg-background p-3">
              <p className="text-xs font-semibold text-primary">
                Your agent is reviewing your documents
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Message: Bank statements received. Thank you.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function ClientProfileAndVault() {
  return (
    <section className="grid gap-5 lg:grid-cols-[1fr_0.95fr]">
      <article className="rounded-lg border border-border bg-card p-5 shadow-sm md:p-6">
        <SectionHeader
          eyebrow="Client profile"
          title="Everything about one client in one place."
          description="Returning clients do not start from zero. Their details, history, notes, messages, and previous applications stay ready."
          Icon={FolderOpen}
        />
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          {[
            ["Name", "Maria Silva"],
            ["Nationality", "Brazil"],
            ["Passport", "YA842913"],
            ["Expiry", "18 Sep 2026"],
            ["Destination", "Portugal"],
            ["Visa type", "Schengen"],
          ].map(([label, value]) => (
            <div key={label} className="rounded-lg border border-border bg-background p-3">
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                {label}
              </p>
              <p className="mt-1 text-sm font-semibold text-foreground">
                {value}
              </p>
            </div>
          ))}
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          {["Application history", "Private notes", "Communication log"].map(
            (item) => (
              <div
                key={item}
                className="rounded-lg border border-primary/15 bg-primary/5 px-3 py-3 text-sm font-semibold text-primary"
              >
                {item}
              </div>
            ),
          )}
        </div>
      </article>

      <article className="rounded-lg border border-border bg-card p-5 shadow-sm md:p-6">
        <SectionHeader
          eyebrow="Document vault"
          title="The retention layer."
          description="Every upload becomes a permanent, tagged record with expiry alerts before critical documents go stale."
          Icon={FileArchive}
        />
        <div className="mt-5 space-y-3">
          {[
            ["Passport copy", "Uploaded 12 Jan 2026", "Expires in 88 days"],
            ["Bank statements", "Uploaded 18 Jun 2026", "Verified"],
            ["Employment letter", "Requested today", "Missing"],
          ].map(([name, upload, status]) => (
            <div
              key={name}
              className="flex items-center justify-between gap-3 rounded-lg border border-border bg-background p-3"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-foreground">
                  {name}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">{upload}</p>
              </div>
              <span className="shrink-0 rounded-full bg-secondary px-2.5 py-1 text-[11px] font-semibold text-secondary-foreground">
                {status}
              </span>
            </div>
          ))}
        </div>
        <div className="mt-4 rounded-lg border border-amber-300 bg-amber-50 p-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-amber-950">
            <CalendarClock className="h-4 w-4" />
            90-day passport expiry alert
          </div>
          <p className="mt-1 text-xs text-amber-900">
            Fatima Khan needs a renewal reminder before the next application.
          </p>
        </div>
      </article>
    </section>
  );
}

function TemplatesSection() {
  return (
    <section className="rounded-lg border border-border bg-card p-5 shadow-sm md:p-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <SectionHeader
          eyebrow="Application templates"
          title="Repeat visas become ten-second workflows."
          description="Common visa types preload the checklist, client instructions, notes, and processing timeline."
          Icon={ListChecks}
        />
        <Button variant="secondary" className="md:w-auto">
          <FileText className="h-4 w-4" />
          New template
        </Button>
      </div>
      <div className="mt-5 grid gap-3 md:grid-cols-3">
        {templates.map((template) => (
          <article
            key={template.name}
            className="rounded-lg border border-border bg-background p-4"
          >
            <div className="mb-3 flex items-center justify-between">
              <FileText className="h-5 w-5 text-accent" />
              <span className="rounded-full bg-primary/8 px-2.5 py-1 text-[11px] font-semibold text-primary">
                Saved
              </span>
            </div>
            <h3 className="text-base font-semibold text-primary">
              {template.name}
            </h3>
            <p className="mt-2 min-h-10 text-sm leading-relaxed text-muted-foreground">
              {template.detail}
            </p>
            <Button className="mt-4 w-full" size="sm" variant="secondary">
              Apply template
            </Button>
          </article>
        ))}
      </div>
    </section>
  );
}

function GrowthPanels() {
  return (
    <section className="grid gap-5 lg:grid-cols-3">
      {featurePanels.map((panel) => (
        <article
          key={panel.eyebrow}
          className="rounded-lg border border-border bg-card p-5 shadow-sm"
        >
          <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <panel.Icon className="h-5 w-5" />
          </div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-accent">
            {panel.eyebrow}
          </p>
          <h3 className="mt-2 font-serif text-2xl font-semibold leading-tight text-primary">
            {panel.title}
          </h3>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            {panel.description}
          </p>
          <div className="mt-4 space-y-2">
            {panel.items.map((item) => (
              <div key={item} className="flex items-start gap-2 text-sm text-foreground">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
                <span>{item}</span>
              </div>
            ))}
          </div>
        </article>
      ))}
    </section>
  );
}

function OnboardingExperience() {
  return (
    <section className="rounded-lg border border-border bg-primary p-5 text-primary-foreground shadow-sm md:p-6">
      <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
        <div>
          <div className="mb-2 inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.24em] text-accent">
            <UserPlus className="h-3.5 w-3.5" />
            First 10 minutes
          </div>
          <h2 className="font-serif text-3xl font-semibold leading-tight">
            Onboarding that makes the agent feel the magic immediately.
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-primary-foreground/75">
            One real client, one portal link, one simulated upload notification.
          </p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          {[
            ["1", "Add your first client", "Name, email, destination in 60 seconds"],
            ["2", "Send portal link", "One click, branded client experience"],
            ["3", "Uploaded passport", "Simulated notification lands instantly"],
            ["4", "Stay decision", "The agent has felt the operating system"],
          ].map(([step, title, detail]) => (
            <div
              key={step}
              className="rounded-lg border border-white/15 bg-white/10 p-4"
            >
              <div className="mb-3 flex h-8 w-8 items-center justify-center rounded-md bg-accent text-sm font-bold text-accent-foreground">
                {step}
              </div>
              <h3 className="font-semibold">{title}</h3>
              <p className="mt-1 text-sm text-primary-foreground/70">
                {detail}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export default function AgentDashboardPreviewPage() {
  useSeo({
    title: "Agent Operating System",
    description:
      "VisaClear agent dashboard, client portal, document vault, templates, team management, analytics, and referral centre.",
  });

  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 border-b border-border/70 bg-background/95 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <button
              aria-label="Go back"
              className="-ml-1 rounded-md p-1 text-muted-foreground transition-colors hover:bg-secondary hover:text-primary"
              onClick={() => navigate(-1)}
              type="button"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <button
              className="flex min-w-0 items-center gap-2.5 text-left"
              onClick={() => navigate("/")}
              type="button"
            >
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary">
                <Globe className="h-4 w-4 text-primary-foreground" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-serif text-lg font-semibold leading-none text-primary">
                    VisaClear
                  </span>
                  <span className="hidden rounded-full bg-accent/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-accent-foreground sm:inline">
                    Agent OS
                  </span>
                </div>
                <p className="truncate text-[11px] text-muted-foreground">
                  Operating system for visa agencies
                </p>
              </div>
            </button>
          </div>
          <Button
            size="sm"
            className="shrink-0"
            onClick={() => document.getElementById("your-clients")?.scrollIntoView({ behavior: "smooth" })}
          >
            <UserPlus className="h-4 w-4" />
            Add client
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-6 md:py-8">
        <motion.section
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-lg border border-border bg-card p-5 shadow-sm md:p-6"
        >
          <div className="grid gap-6 lg:grid-cols-[1fr_auto] lg:items-end">
            <div>
              <div className="mb-3 inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.24em] text-accent">
                <Shield className="h-3.5 w-3.5" />
                Agent platform blueprint
              </div>
              <h1 className="max-w-4xl font-serif text-3xl font-semibold leading-tight text-primary md:text-5xl">
                The operating system for the entire visa business.
              </h1>
              <p className="mt-3 max-w-3xl text-sm leading-relaxed text-muted-foreground md:text-base">
                From first inquiry to boarding the plane, the agent sees the
                business, the client sees their portal, and every document,
                deadline, message, and payout has a home.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:min-w-[360px]">
              {[
                ["Deadline guard", "3-day red alerts"],
                ["White-label", "Agency tier ready"],
                ["Retention", "Permanent vault"],
                ["Growth", "25% referral"],
              ].map(([label, value]) => (
                <div
                  key={label}
                  className="rounded-lg border border-border bg-background p-3"
                >
                  <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                    {label}
                  </p>
                  <p className="mt-1 text-sm font-semibold text-primary">
                    {value}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </motion.section>

        <YourClients />

        <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {kpis.map((kpi) => (
            <KpiCard key={kpi.label} {...kpi} />
          ))}
        </section>

        <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
          <PipelineBoard />
          <TodayActions />
        </section>

        <ClientPortalPreview />

        <ClientProfileAndVault />

        <TemplatesSection />

        <GrowthPanels />

        <section className="grid gap-5 lg:grid-cols-[0.95fr_1.05fr]">
          <article className="rounded-lg border border-border bg-card p-5 shadow-sm md:p-6">
            <SectionHeader
              eyebrow="Revenue"
              title="Referral and commission centre."
              description="Agents see the exact commercial result of promoting VisaClear to travelers who upgrade to Pro."
              Icon={CreditCard}
            />
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              {[
                ["Referrals sent", "312"],
                ["Conversions", "68"],
                ["Pending payout", "$1,240"],
                ["Total earned", "$18,420"],
              ].map(([label, value]) => (
                <div
                  key={label}
                  className="rounded-lg border border-border bg-background p-4"
                >
                  <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                    {label}
                  </p>
                  <p className="mt-1 text-2xl font-semibold text-primary">
                    {value}
                  </p>
                </div>
              ))}
            </div>
            <div className="mt-4 flex items-center gap-2 rounded-lg border border-accent/30 bg-accent/10 p-3 text-sm font-semibold text-primary">
              <Star className="h-4 w-4 text-accent" />
              25% recurring commission for the life of every subscription.
            </div>
          </article>

          <article className="rounded-lg border border-border bg-card p-5 shadow-sm md:p-6">
            <SectionHeader
              eyebrow="Security and control"
              title="Built for confidential client operations."
              description="The platform keeps private notes private, role access scoped, and sensitive documents organized by client and application."
              Icon={LockKeyhole}
            />
            <div className="mt-5 space-y-3">
              {[
                ["Role-based access", "Junior consultants see assigned clients only"],
                ["Document history", "Every file keeps upload date and tag"],
                ["Communication log", "Messages stay attached to the client profile"],
              ].map(([title, detail]) => (
                <div
                  key={title}
                  className="flex items-start gap-3 rounded-lg border border-border bg-background p-3"
                >
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
                  <div>
                    <p className="text-sm font-semibold text-foreground">
                      {title}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {detail}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </article>
        </section>

        <OnboardingExperience />
      </main>
    </div>
  );
}
