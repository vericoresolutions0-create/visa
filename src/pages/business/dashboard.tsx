import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Authenticated, AuthLoading, Unauthenticated, useMutation, useQuery } from "convex/react";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { api } from "@/convex/_generated/api.js";
import type { Id } from "@/convex/_generated/dataModel.js";
import { Button } from "@/components/ui/button.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { Textarea } from "@/components/ui/textarea.tsx";
import { useSeo } from "@/hooks/use-seo.ts";
import { useSmartBack } from "@/hooks/use-smart-back.ts";
import { useAuth } from "@/hooks/use-auth.ts";
import { buildComplianceCsv, buildComplianceCsvFileName, triggerCsvDownload } from "@/lib/compliance-export.ts";
import { NotificationBell } from "@/components/NotificationBell.tsx";
import { cn, convexErrMsg } from "@/lib/utils.ts";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog.tsx";
import {
  Globe, Building2, GraduationCap, Scale, LogIn, UserPlus, Download,
  LayoutDashboard, Table2, X, ChevronRight, Search, Send, Ban, ClipboardList, ArrowLeft, LogOut,
  Sparkles, History, FileDown,
} from "lucide-react";
import { AgentAIChat } from "@/components/AgentAIChat.tsx";

type PipelineStage = "invited" | "accepted" | "in_progress" | "ready" | "relocated";
type LinkStatus = "pending" | "accepted" | "declined" | "revoked";

type CohortRow = {
  linkId: Id<"org_employee_links">;
  invitedEmail: string;
  status: LinkStatus;
  department?: string;
  roleTitle?: string;
  targetRelocationDate?: string;
  pipelineStage: PipelineStage;
  createdAt: string;
  noteCount: number;
  employeeName: string | null;
  readinessPercent: number | null;
  employerVisibleStatus: "Ready" | "Needs Attention" | "Not Started" | null;
};

type OrgCtx = {
  memberLabel: string;
  inviteLabel: string;
  emailPlaceholder: string;
  detailsTitle: string;
  field1Label: string;
  field2Label: string;
  field3Label: string;
  emptyCohort: string;
  exportLabel: string;
  headerTag: string;
  headerIcon: typeof Building2;
  pipelineLabels: Record<PipelineStage, string>;
};

function getOrgCtx(orgType?: string | null): OrgCtx {
  switch (orgType) {
    case "university":
      return {
        memberLabel: "Student",
        inviteLabel: "Invite Student",
        emailPlaceholder: "student@university.ac.uk",
        detailsTitle: "Academic Details",
        field1Label: "Faculty / School",
        field2Label: "Programme / Course",
        field3Label: "Target enrolment date",
        emptyCohort: "Invite your first student to see your cohort build up here.",
        exportLabel: "Export Student Report",
        headerTag: "University Dashboard",
        headerIcon: GraduationCap,
        pipelineLabels: {
          invited: "Invited",
          accepted: "Accepted",
          in_progress: "Visa Applied",
          ready: "Visa Approved",
          relocated: "Enrolled",
        },
      };
    case "law_firm":
      return {
        memberLabel: "Client",
        inviteLabel: "Invite Client",
        emailPlaceholder: "client@example.com",
        detailsTitle: "Case Details",
        field1Label: "Case Type",
        field2Label: "Matter Reference",
        field3Label: "Target decision date",
        emptyCohort: "Invite your first client to see your caseload build up here.",
        exportLabel: "Export Case Report",
        headerTag: "Client Dashboard",
        headerIcon: Scale,
        pipelineLabels: {
          invited: "Invited",
          accepted: "Onboarded",
          in_progress: "Gathering Documents",
          ready: "Application Submitted",
          relocated: "Decision Received",
        },
      };
    default:
      return {
        memberLabel: "Employee",
        inviteLabel: "Invite Employee",
        emailPlaceholder: "employee@company.com",
        detailsTitle: "Business Details",
        field1Label: "Department",
        field2Label: "Role / Title",
        field3Label: "Target relocation date",
        emptyCohort: "Invite your first employee to see your cohort build up here.",
        exportLabel: "Export Compliance Report",
        headerTag: "Employer Dashboard",
        headerIcon: Building2,
        pipelineLabels: {
          invited: "Invited",
          accepted: "Accepted",
          in_progress: "In Progress",
          ready: "Ready",
          relocated: "Relocated",
        },
      };
  }
}

const PIPELINE_STAGES: PipelineStage[] = ["invited", "accepted", "in_progress", "ready", "relocated"];

const STATUS_BADGE: Record<LinkStatus, string> = {
  pending: "bg-amber-50 text-amber-700 border-amber-200",
  accepted: "bg-green-50 text-green-700 border-green-200",
  declined: "bg-muted text-muted-foreground border-border",
  revoked: "bg-muted text-muted-foreground border-border",
};

function InviteEmployeeForm({ orgCtx }: { orgCtx: OrgCtx }) {
  const { t } = useTranslation("business");
  const inviteEmployee = useMutation(api.employerCohort.inviteEmployee);
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleInvite = async () => {
    if (!email.trim()) {
      toast.error(t("dashboard.invite_required"));
      return;
    }
    setSubmitting(true);
    try {
      await inviteEmployee({ email });
      toast.success(t("dashboard.invite_sent"));
      setEmail("");
    } catch (err) {
      toast.error(convexErrMsg(err) ?? t("dashboard.invite_failed"));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col sm:flex-row gap-2">
      <Input
        type="email"
        placeholder={orgCtx.emailPlaceholder}
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        disabled={submitting}
        className="flex-1 sm:max-w-xs"
      />
      <Button onClick={() => { void handleInvite(); }} disabled={submitting} className="cursor-pointer font-semibold whitespace-nowrap">
        <UserPlus className="w-4 h-4 mr-1.5" />
        {submitting ? t("dashboard.inviting") : orgCtx.inviteLabel}
      </Button>
    </div>
  );
}

function ReadinessBar({ percent }: { percent: number | null }) {
  if (percent === null) {
    return <span className="text-xs text-muted-foreground">—</span>;
  }
  return (
    <div className="flex items-center gap-2 w-28">
      <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
        <div className="h-full bg-accent rounded-full" style={{ width: `${percent}%` }} />
      </div>
      <span className="text-xs font-semibold text-foreground w-9 text-right">{percent}%</span>
    </div>
  );
}

function StatusBadge({ status }: { status: LinkStatus }) {
  const { t } = useTranslation("business");
  return (
    <span className={cn("inline-flex items-center text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full border", STATUS_BADGE[status])}>
      {t(`dashboard.status.${status}`)}
    </span>
  );
}

function EmployeeDetailPanel({ row, onClose, orgCtx }: { row: CohortRow; onClose: () => void; orgCtx: OrgCtx }) {
  const { t } = useTranslation("business");
  const notes = useQuery(api.employerCohort.listEmployeeNotes, { linkId: row.linkId });
  const updateDetails = useMutation(api.employerCohort.updateEmployeeDetails);
  const addNote = useMutation(api.employerCohort.addEmployeeNote);
  const [department, setDepartment] = useState(row.department ?? "");
  const [roleTitle, setRoleTitle] = useState(row.roleTitle ?? "");
  const [targetDate, setTargetDate] = useState(row.targetRelocationDate ?? "");
  const [noteText, setNoteText] = useState("");
  const [saving, setSaving] = useState(false);

  const handleSaveDetails = async () => {
    setSaving(true);
    try {
      await updateDetails({ linkId: row.linkId, department: department || undefined, roleTitle: roleTitle || undefined, targetRelocationDate: targetDate || undefined });
      toast.success(t("dashboard.details_saved"));
    } catch (err) {
      toast.error(convexErrMsg(err) ?? t("dashboard.details_save_failed"));
    } finally {
      setSaving(false);
    }
  };

  const handleAddNote = async () => {
    if (!noteText.trim()) return;
    try {
      await addNote({ linkId: row.linkId, note: noteText });
      setNoteText("");
    } catch (err) {
      toast.error(convexErrMsg(err) ?? t("dashboard.note_add_failed"));
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/30" onClick={onClose}>
      <div className="bg-background w-full max-w-md h-full overflow-y-auto p-6 space-y-6" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-serif text-xl font-semibold text-primary">{row.employeeName ?? row.invitedEmail}</h3>
            <p className="text-xs text-muted-foreground">{row.invitedEmail}</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-3">
          <h4 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">{orgCtx.detailsTitle}</h4>
          <Input placeholder={orgCtx.field1Label} value={department} onChange={(e) => setDepartment(e.target.value)} />
          <Input placeholder={orgCtx.field2Label} value={roleTitle} onChange={(e) => setRoleTitle(e.target.value)} />
          <Input type="date" placeholder={orgCtx.field3Label} value={targetDate} onChange={(e) => setTargetDate(e.target.value)} />
          <Button size="sm" disabled={saving} onClick={() => { void handleSaveDetails(); }} className="cursor-pointer font-semibold">
            {saving ? t("dashboard.saving") : t("dashboard.save_details")}
          </Button>
        </div>

        <div className="space-y-3">
          <h4 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">{t("dashboard.private_notes")}</h4>
          <p className="text-xs text-muted-foreground">{t("dashboard.private_notes_desc")}</p>
          <div className="space-y-2">
            <Textarea placeholder={t("dashboard.note_placeholder")} value={noteText} onChange={(e) => setNoteText(e.target.value)} rows={3} />
            <Button size="sm" onClick={() => { void handleAddNote(); }} className="cursor-pointer font-semibold">{t("dashboard.add_note")}</Button>
          </div>
          <div className="space-y-2">
            {notes === undefined ? (
              <Skeleton className="h-16 w-full rounded-lg" />
            ) : notes.length === 0 ? (
              <p className="text-xs text-muted-foreground italic">{t("dashboard.no_notes")}</p>
            ) : (
              notes.map((n) => (
                <div key={n._id} className="bg-muted/30 rounded-lg p-3 text-xs">
                  <p className="text-foreground mb-1">{n.note}</p>
                  <p className="text-muted-foreground">{new Date(n.createdAt).toLocaleString("en-GB")}</p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function EmployeeCard({
  row,
  onView,
  onResend,
  onRevoke,
  orgCtx,
}: {
  row: CohortRow;
  onView: () => void;
  onResend: (id: Id<"org_employee_links">) => void;
  onRevoke: (id: Id<"org_employee_links">) => void;
  orgCtx: OrgCtx;
}) {
  const { t } = useTranslation("business");
  return (
    <article className="bg-card border border-border rounded-xl p-4 space-y-3 cursor-pointer active:bg-muted/30" onClick={onView}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="font-semibold text-foreground truncate">{row.employeeName ?? row.invitedEmail}</div>
          {row.employeeName && <div className="text-xs text-muted-foreground truncate">{row.invitedEmail}</div>}
        </div>
        <StatusBadge status={row.status} />
      </div>
      <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
        <div>
          <span className="block text-[10px] uppercase tracking-wide text-muted-foreground mb-0.5">{orgCtx.field1Label}</span>
          <span className="text-foreground">{row.department ?? "—"}</span>
        </div>
        <div>
          <span className="block text-[10px] uppercase tracking-wide text-muted-foreground mb-0.5">{t("dashboard.th_notes")}</span>
          <span className="text-foreground flex items-center gap-1"><ClipboardList className="w-3 h-3" />{row.noteCount}</span>
        </div>
      </div>
      <div>
        <span className="block text-[10px] uppercase tracking-wide text-muted-foreground mb-1">{t("dashboard.th_readiness")}</span>
        <ReadinessBar percent={row.readinessPercent} />
      </div>
      {(row.status === "pending" || row.status === "accepted") && (
        <div className="flex items-center gap-2 pt-2 border-t border-border" onClick={(e) => e.stopPropagation()}>
          <button onClick={onView} className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold border border-border bg-card text-foreground hover:bg-muted/50 transition-colors cursor-pointer">
            <ChevronRight className="w-3 h-3" /> View
          </button>
          {row.status === "pending" && (
            <button onClick={() => onResend(row.linkId)} className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold border border-accent/30 bg-accent/8 text-accent hover:bg-accent/15 transition-colors cursor-pointer">
              <Send className="w-3 h-3" /> {t("dashboard.resend")}
            </button>
          )}
          <button onClick={() => onRevoke(row.linkId)} className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold border border-transparent text-destructive hover:bg-destructive/8 hover:border-destructive/20 transition-colors cursor-pointer ml-auto">
            <Ban className="w-3 h-3" /> {t("dashboard.revoke")}
          </button>
        </div>
      )}
    </article>
  );
}

function PipelineBoard({ cohort, onAdvance, orgCtx }: { cohort: CohortRow[]; onAdvance: (row: CohortRow, stage: PipelineStage) => void; orgCtx: OrgCtx }) {
  const { t } = useTranslation("business");
  const active = cohort.filter((r) => r.status === "pending" || r.status === "accepted");
  const columns = PIPELINE_STAGES.map((stage) => ({ stage, label: orgCtx.pipelineLabels[stage] }));

  return (
    <div className="-mx-4 sm:mx-0 overflow-x-auto">
      <div className="flex gap-3 sm:grid sm:grid-cols-2 lg:grid-cols-5 min-w-[640px] sm:min-w-0 px-4 sm:px-0 pb-2 sm:pb-0">
        {columns.map((column, idx) => {
          const colRows = active.filter((r) => r.pipelineStage === column.stage);
          const nextStage = columns[idx + 1]?.stage;
          return (
            <div key={column.stage} className="space-y-2.5 min-w-[140px] sm:min-w-0">
              <div className="flex items-center justify-between rounded-lg border border-border bg-card px-3 py-2">
                <span className="text-xs font-semibold text-primary">{column.label}</span>
                <span className="rounded-full bg-secondary px-2 py-0.5 text-[10px] font-semibold text-secondary-foreground">{colRows.length}</span>
              </div>
              {colRows.map((row) => (
                <article key={row.linkId} className="rounded-lg border border-border bg-card p-3 shadow-sm space-y-2">
                  <h4 className="text-sm font-semibold text-foreground truncate">{row.employeeName ?? row.invitedEmail}</h4>
                  <ReadinessBar percent={row.readinessPercent} />
                  {nextStage && (
                    <button
                      onClick={() => onAdvance(row, nextStage)}
                      className="text-[11px] font-semibold text-accent hover:underline cursor-pointer flex items-center gap-1"
                    >
                      {t("dashboard.move_to", { stage: columns[idx + 1].label })} <ChevronRight className="w-3 h-3" />
                    </button>
                  )}
                </article>
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function AIBanner({ onTryIt }: { onTryIt: () => void }) {
  const [visible, setVisible] = useState(() => localStorage.getItem("vc_ai_banner_business") !== "1");

  const dismiss = () => {
    localStorage.setItem("vc_ai_banner_business", "1");
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div className="flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-3 shadow-sm animate-in fade-in slide-in-from-top-1 duration-200">
      <div className="w-8 h-8 rounded-lg bg-primary/8 flex items-center justify-center shrink-0">
        <Sparkles className="w-4 h-4 text-primary" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-foreground leading-snug">
          AI HR Assistant{" "}
          <span className="text-[10px] font-bold uppercase tracking-widest text-primary/60 bg-primary/8 rounded px-1.5 py-0.5 ml-1 align-middle">New</span>
        </p>
        <p className="text-xs text-muted-foreground mt-0.5 leading-snug hidden sm:block">
          Check cohort readiness, flag stalled employees, or draft an HR follow-up.
        </p>
      </div>
      <button
        onClick={onTryIt}
        className="shrink-0 text-xs font-semibold text-primary-foreground bg-primary rounded-lg px-3 py-1.5 hover:opacity-90 transition-opacity cursor-pointer"
      >
        Try it →
      </button>
      <button
        onClick={dismiss}
        className="shrink-0 p-1 rounded-md text-muted-foreground/50 hover:text-muted-foreground hover:bg-muted/50 transition-colors cursor-pointer"
        aria-label="Dismiss"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

function DashboardInner() {
  const { t } = useTranslation("business");
  const navigate = useNavigate();
  const myOrg = useQuery(api.organizations.getMyOrganization);
  // listMyCohort is gated server-side on the org being approved (see
  // getMyOrgAdminMembershipOrThrow) — calling it before myOrg has resolved
  // to "approved" would throw and crash the page, so it's skipped until then.
  const cohort = useQuery(api.employerCohort.listMyCohort, myOrg?.approvalStatus === "approved" ? {} : "skip");
  const resendInvite = useMutation(api.employerCohort.resendInvite);
  const revokeInvite = useMutation(api.employerCohort.revokeInvite);
  const setPipelineStage = useMutation(api.employerCohort.setPipelineStage);
  const renameOrg = useMutation(api.organizations.renameOrganization);
  const generateExportUploadUrl = useMutation(api.complianceExportHistory.generateExportUploadUrl);
  const recordComplianceExport = useMutation(api.complianceExportHistory.recordComplianceExport);
  const getExportDownloadUrl = useMutation(api.complianceExportHistory.getExportDownloadUrl);
  const inviteCoAdmin = useMutation(api.orgAdminInvites.inviteCoAdmin);
  const revokeAdminInvite = useMutation(api.orgAdminInvites.revokeAdminInvite);
  const removeCoAdmin = useMutation(api.orgAdminInvites.removeCoAdmin);

  const [view, setView] = useState<"table" | "pipeline" | "ai">("table");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<LinkStatus | "all">("all");
  const [selectedRow, setSelectedRow] = useState<CohortRow | null>(null);
  const [showRenameForm, setShowRenameForm] = useState(false);
  const [newOrgName, setNewOrgName] = useState("");
  const [renamingSaving, setRenamingSaving] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [showExportHistory, setShowExportHistory] = useState(false);
  const [downloadingHistoryId, setDownloadingHistoryId] = useState<string | null>(null);
  const [showInviteAdminForm, setShowInviteAdminForm] = useState(false);
  const [newAdminEmail, setNewAdminEmail] = useState("");
  const [invitingAdmin, setInvitingAdmin] = useState(false);
  const [removingAdminId, setRemovingAdminId] = useState<string | null>(null);
  const [revokingInviteId, setRevokingInviteId] = useState<string | null>(null);

  const exportHistory = useQuery(api.complianceExportHistory.listMyExportHistory, showExportHistory ? {} : "skip");
  const orgAdmins = useQuery(api.orgAdminInvites.listMyOrgAdmins, myOrg?.orgRole === "org_admin" ? {} : "skip");

  useEffect(() => {
    if (myOrg === null) navigate("/business/onboarding", { replace: true });
    else if (myOrg && myOrg.type === "household") navigate("/dashboard/household", { replace: true });
    // Pending/rejected orgs have nothing to see here — the onboarding page
    // owns their status screen so there's exactly one place that shows it.
    else if (myOrg && myOrg.approvalStatus !== "approved") navigate("/business/onboarding", { replace: true });
  }, [myOrg, navigate]);

  // Anything other than "a real org, approved, cohort loaded" renders this
  // same loading skeleton — myOrg being null/household/non-approved all
  // mean the effect above is about to navigate away, so there's nothing
  // meaningful to show in the meantime.
  if (myOrg === undefined || !myOrg || myOrg.type === "household" || myOrg.approvalStatus !== "approved" || cohort === undefined) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-20 w-full rounded-xl" />)}
      </div>
    );
  }

  const orgCtx = getOrgCtx(myOrg.type);

  const filtered = (cohort as CohortRow[]).filter((row) => {
    if (statusFilter !== "all" && row.status !== statusFilter) return false;
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      const haystack = `${row.employeeName ?? ""} ${row.invitedEmail} ${row.department ?? ""}`.toLowerCase();
      if (!haystack.includes(q)) return false;
    }
    return true;
  });

  const handleAdvance = async (row: CohortRow, stage: PipelineStage) => {
    try {
      await setPipelineStage({ linkId: row.linkId, pipelineStage: stage });
    } catch (err) {
      toast.error(convexErrMsg(err) ?? t("dashboard.pipeline_update_failed"));
    }
  };

  const handleResend = async (linkId: Id<"org_employee_links">) => {
    try {
      await resendInvite({ linkId });
      toast.success(t("dashboard.invite_resent"));
    } catch (err) {
      toast.error(convexErrMsg(err) ?? t("dashboard.resend_failed"));
    }
  };

  const handleRevoke = async (linkId: Id<"org_employee_links">) => {
    try {
      await revokeInvite({ linkId });
      toast.success(t("dashboard.access_revoked"));
    } catch (err) {
      toast.error(convexErrMsg(err) ?? t("dashboard.revoke_failed"));
    }
  };

  const handleRename = async () => {
    if (!newOrgName.trim()) return;
    setRenamingSaving(true);
    try {
      await renameOrg({ name: newOrgName.trim() });
      toast.success("Organisation name updated.");
      setShowRenameForm(false);
      setNewOrgName("");
    } catch (err) {
      toast.error(convexErrMsg(err) ?? "Could not save. Try again.");
    } finally {
      setRenamingSaving(false);
    }
  };

  // Persists the exact CSV to compliance_export_history (real audit trail —
  // re-downloading a past entry later must return exactly what was exported
  // that day, not the live cohort re-rendered). Best-effort: if the persist
  // step fails, the download the admin actually asked for still happens —
  // this feature adds a history on top of the export, it must never be able
  // to break the export itself.
  const handleExportCompliance = async () => {
    setExporting(true);
    const rows = cohort as CohortRow[];
    const csv = buildComplianceCsv(rows, myOrg.type);
    const fileName = buildComplianceCsvFileName(myOrg.name, myOrg.type);
    try {
      const uploadUrl = await generateExportUploadUrl({});
      const uploadResult = await fetch(uploadUrl, {
        method: "POST",
        headers: { "Content-Type": "text/csv" },
        body: csv,
      });
      if (!uploadResult.ok) throw new Error("Upload failed");
      const { storageId } = await uploadResult.json();
      await recordComplianceExport({ storageId, fileName, rowCount: rows.length });
    } catch (err) {
      console.error("Failed to save compliance export to history", err);
      toast.error("Export downloaded, but couldn't be saved to your export history.");
    } finally {
      triggerCsvDownload(csv, fileName);
      setExporting(false);
    }
  };

  const handleDownloadHistoryEntry = async (historyId: Id<"compliance_export_history">) => {
    setDownloadingHistoryId(historyId);
    // Safari (especially iOS PWAs) silently blocks window.open() once it's
    // called after an await — no error, the tab just never appears. Opening
    // a blank tab synchronously and redirecting it once the real URL is
    // ready keeps it tied to the original tap.
    const preopened = window.open("", "_blank", "noreferrer");
    try {
      const url = await getExportDownloadUrl({ historyId });
      if (preopened) {
        preopened.location.href = url;
      } else if (!window.open(url, "_blank", "noreferrer")) {
        window.location.href = url;
      }
    } catch (err) {
      preopened?.close();
      toast.error(convexErrMsg(err) ?? "Could not open this export. Please try again.");
    } finally {
      setDownloadingHistoryId(null);
    }
  };

  const handleInviteAdmin = async () => {
    if (!newAdminEmail.trim()) return;
    setInvitingAdmin(true);
    try {
      await inviteCoAdmin({ email: newAdminEmail.trim() });
      toast.success("Admin invite sent.");
      setShowInviteAdminForm(false);
      setNewAdminEmail("");
    } catch (err) {
      toast.error(convexErrMsg(err) ?? "Could not send the invite. Please try again.");
    } finally {
      setInvitingAdmin(false);
    }
  };

  const handleRevokeAdminInvite = async (inviteId: Id<"org_admin_invites">) => {
    setRevokingInviteId(inviteId);
    try {
      await revokeAdminInvite({ inviteId });
      toast.success("Invite revoked.");
    } catch (err) {
      toast.error(convexErrMsg(err) ?? "Could not revoke the invite. Please try again.");
    } finally {
      setRevokingInviteId(null);
    }
  };

  const handleRemoveAdmin = async (userId: Id<"users">) => {
    if (!window.confirm("Remove this person's admin access?")) return;
    setRemovingAdminId(userId);
    try {
      await removeCoAdmin({ userId });
      toast.success("Admin removed.");
    } catch (err) {
      toast.error(convexErrMsg(err) ?? "Could not remove this admin. Please try again.");
    } finally {
      setRemovingAdminId(null);
    }
  };

  const pending = (cohort as CohortRow[]).filter((r) => r.status === "pending").length;
  const relocated = (cohort as CohortRow[]).filter((r) => r.pipelineStage === "relocated").length;
  // Accepted-and-not-yet-relocated — was previously computed as two
  // overlapping counts added together (status === "accepted" PLUS
  // pipelineStage in {in_progress, ready}), so anyone accepted AND advanced
  // past the initial "accepted" stage was counted twice, letting "Active"
  // exceed "Total" on the stats bar.
  const active = (cohort as CohortRow[]).filter((r) => r.status === "accepted" && r.pipelineStage !== "relocated").length;
  // "Total"/header count should mean people currently in the cohort — not
  // every row ever created. Re-inviting someone after they declined or were
  // revoked creates a new row rather than reusing the old one (by design,
  // so the old row stays visible as history under the status filter below),
  // but that meant declined/revoked rows were still counted toward the
  // headcount forever, inflating it for any org with normal invite churn.
  const cohortTotal = (cohort as CohortRow[]).filter((r) => r.status !== "declined" && r.status !== "revoked").length;

  return (
    <div className="space-y-6">
      <AIBanner onTryIt={() => setView("ai")} />
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-serif text-2xl sm:text-3xl font-semibold text-primary">{myOrg.name}</h1>
          <p className="text-sm text-muted-foreground">{t(cohortTotal === 1 ? "dashboard.cohort_person_one" : "dashboard.cohort_person_other", { count: cohortTotal })}</p>
        </div>
        <div className="flex gap-2 shrink-0">
          <Button
            variant="outline"
            size="icon"
            onClick={() => setShowExportHistory(true)}
            className="cursor-pointer"
            title="Export history"
            aria-label="Export history"
          >
            <History className="w-4 h-4" />
          </Button>
          <Button
            variant="outline"
            disabled={exporting}
            onClick={() => void handleExportCompliance()}
            className="cursor-pointer font-semibold disabled:opacity-60"
          >
            <Download className="w-4 h-4 sm:mr-1.5" />
            <span className="hidden sm:inline">{exporting ? "Exporting…" : orgCtx.exportLabel}</span>
          </Button>
        </div>
      </div>

      <Dialog open={showExportHistory} onOpenChange={setShowExportHistory}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-serif text-xl text-primary">Export History</DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground">
              Every compliance report {myOrg.name} has exported. Each entry downloads exactly what was exported that day, not the live cohort.
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-96 overflow-y-auto -mx-1 px-1">
            {exportHistory === undefined ? (
              <div className="space-y-2 py-2">
                {[1, 2, 3].map((i) => <Skeleton key={i} className="h-14 w-full rounded-lg" />)}
              </div>
            ) : exportHistory.length === 0 ? (
              <div className="py-10 text-center">
                <FileDown className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">No exports yet. Your first export will appear here.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {exportHistory.map((entry) => (
                  <div key={entry._id} className="flex items-center justify-between gap-3 border border-border rounded-lg px-3 py-2.5">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-foreground truncate">
                        {new Date(entry.exportedAt).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        {entry.rowCount} {entry.rowCount === 1 ? "row" : "rows"} · Exported by {entry.exportedByName}
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={downloadingHistoryId === entry._id}
                      onClick={() => void handleDownloadHistoryEntry(entry._id)}
                      className="cursor-pointer font-semibold shrink-0 disabled:opacity-60"
                    >
                      <Download className="w-3.5 h-3.5 mr-1.5" />
                      {downloadingHistoryId === entry._id ? "Opening…" : "Download"}
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Stats bar — only shown once there are cohort members */}
      {cohort.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "Total", value: cohortTotal, color: "text-primary" },
            { label: "Invited", value: pending, color: "text-amber-600" },
            { label: "Active", value: active, color: "text-blue-600" },
            { label: "Completed", value: relocated, color: "text-emerald-600" },
          ].map(({ label, value, color }) => (
            <div key={label} className="rounded-xl border border-border bg-card px-4 py-3.5">
              <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-1">{label}</p>
              <p className={cn("text-2xl font-bold tabular-nums", color)}>{value}</p>
            </div>
          ))}
        </div>
      )}

      <div className="bg-card border border-border rounded-xl p-4">
        <InviteEmployeeForm orgCtx={orgCtx} />
      </div>

      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-3">
          <div className="flex gap-1 bg-muted/40 rounded-lg p-1">
            <button
              onClick={() => setView("table")}
              className={cn("flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-md cursor-pointer", view === "table" ? "bg-card text-primary shadow-sm" : "text-muted-foreground")}
            >
              <Table2 className="w-3.5 h-3.5" /> {t("dashboard.table_view")}
            </button>
            <button
              onClick={() => setView("pipeline")}
              className={cn("flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-md cursor-pointer", view === "pipeline" ? "bg-card text-primary shadow-sm" : "text-muted-foreground")}
            >
              <LayoutDashboard className="w-3.5 h-3.5" /> {t("dashboard.pipeline_view")}
            </button>
            <button
              onClick={() => setView("ai")}
              className={cn("flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-md cursor-pointer", view === "ai" ? "bg-card text-primary shadow-sm" : "text-muted-foreground")}
            >
              <Sparkles className="w-3.5 h-3.5" /> {t("dashboard.ai_view")}
            </button>
          </div>
        </div>
        {view === "table" && (
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1 sm:max-w-xs">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
              <Input placeholder={t("dashboard.search_placeholder")} value={search} onChange={(e) => setSearch(e.target.value)} className="pl-8 h-9 w-full" />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as LinkStatus | "all")}
              className="h-9 rounded-md border border-border bg-background px-2.5 text-xs"
            >
              <option value="all">{t("dashboard.all_statuses")}</option>
              <option value="pending">{t("dashboard.option_pending")}</option>
              <option value="accepted">{t("dashboard.option_accepted")}</option>
              <option value="declined">{t("dashboard.option_declined")}</option>
              <option value="revoked">{t("dashboard.option_revoked")}</option>
            </select>
          </div>
        )}
      </div>

      {view === "ai" ? (
        <div className="h-[calc(100vh-10rem)] min-h-130">
          <AgentAIChat mode="business" className="h-full" />
        </div>
      ) : cohort.length === 0 ? (
        <div className="border border-dashed border-border rounded-xl p-10 text-center text-sm text-muted-foreground">
          {orgCtx.emptyCohort}
        </div>
      ) : view === "pipeline" ? (
        <PipelineBoard cohort={cohort as CohortRow[]} onAdvance={handleAdvance} orgCtx={orgCtx} />
      ) : (
        <>
          {/* Mobile cards */}
          <div className="md:hidden space-y-3">
            {filtered.map((row) => (
              <EmployeeCard
                key={row.linkId}
                row={row}
                onView={() => setSelectedRow(row)}
                onResend={(id) => { void handleResend(id); }}
                onRevoke={(id) => { void handleRevoke(id); }}
                orgCtx={orgCtx}
              />
            ))}
          </div>
          {/* Desktop table */}
          <div className="hidden md:block bg-card border border-border rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/30 text-xs text-muted-foreground uppercase tracking-wide">
                <tr>
                  <th className="text-left px-4 py-2.5">{orgCtx.memberLabel}</th>
                  <th className="text-left px-4 py-2.5">{orgCtx.field1Label}</th>
                  <th className="text-left px-4 py-2.5">{t("dashboard.th_status")}</th>
                  <th className="text-left px-4 py-2.5">{t("dashboard.th_readiness")}</th>
                  <th className="text-left px-4 py-2.5">{t("dashboard.th_notes")}</th>
                  <th className="text-right px-4 py-2.5">{t("dashboard.th_actions")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.map((row) => (
                  <tr key={row.linkId} className="hover:bg-muted/20 cursor-pointer" onClick={() => setSelectedRow(row)}>
                    <td className="px-4 py-3">
                      <div className="font-semibold text-foreground">{row.employeeName ?? row.invitedEmail}</div>
                      {row.employeeName && <div className="text-xs text-muted-foreground">{row.invitedEmail}</div>}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{row.department ?? "—"}</td>
                    <td className="px-4 py-3"><StatusBadge status={row.status} /></td>
                    <td className="px-4 py-3"><ReadinessBar percent={row.readinessPercent} /></td>
                    <td className="px-4 py-3 text-muted-foreground">
                      <span className="flex items-center gap-1"><ClipboardList className="w-3.5 h-3.5" />{row.noteCount}</span>
                    </td>
                    <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                      <div className="flex justify-end items-center gap-1.5">
                        <button
                          onClick={() => setSelectedRow(row)}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold border border-border bg-card text-foreground hover:bg-muted/50 hover:border-primary/30 transition-colors cursor-pointer"
                        >
                          <ChevronRight className="w-3 h-3" /> View
                        </button>
                        {row.status === "pending" && (
                          <button
                            onClick={() => { void handleResend(row.linkId); }}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold border border-accent/30 bg-accent/8 text-accent hover:bg-accent/15 transition-colors cursor-pointer"
                          >
                            <Send className="w-3 h-3" /> {t("dashboard.resend")}
                          </button>
                        )}
                        {(row.status === "pending" || row.status === "accepted") && (
                          <button
                            onClick={() => { void handleRevoke(row.linkId); }}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold border border-transparent text-destructive hover:bg-destructive/8 hover:border-destructive/20 transition-colors cursor-pointer"
                          >
                            <Ban className="w-3 h-3" /> {t("dashboard.revoke")}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {selectedRow && <EmployeeDetailPanel row={selectedRow} onClose={() => setSelectedRow(null)} orgCtx={orgCtx} />}

      {/* Organisation settings */}
      {myOrg.orgRole === "org_admin" && (
        <div className="mt-8 border-t border-border/60 pt-6">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Organisation Settings</p>
            {!showRenameForm && (
              <button
                onClick={() => { setNewOrgName(myOrg.name); setShowRenameForm(true); }}
                className="text-xs font-semibold text-primary hover:underline cursor-pointer"
              >
                Rename
              </button>
            )}
          </div>
          {showRenameForm ? (
            <div className="bg-card border border-border rounded-xl p-4 space-y-3">
              <label className="block text-xs font-semibold text-foreground">Organisation name</label>
              <Input
                value={newOrgName}
                onChange={(e) => setNewOrgName(e.target.value)}
                placeholder="Enter new name"
                maxLength={200}
                className="w-full"
                onKeyDown={(e) => { if (e.key === "Enter") void handleRename(); }}
              />
              <div className="flex gap-2">
                <Button disabled={renamingSaving || !newOrgName.trim()} onClick={() => { void handleRename(); }} className="cursor-pointer font-semibold" size="sm">
                  {renamingSaving ? "Saving…" : "Save"}
                </Button>
                <Button variant="outline" size="sm" onClick={() => { setShowRenameForm(false); setNewOrgName(""); }} className="cursor-pointer">
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              <span className="font-medium text-foreground">{myOrg.name}</span>
              {myOrg.type && <span className="ml-2 text-[10px] font-semibold uppercase tracking-wide bg-muted px-1.5 py-0.5 rounded">{myOrg.type.replace("_", " ")}</span>}
            </p>
          )}

          {/* Admins — same secure token-invite pattern as employee invites,
              a separate table (org_admin_invites) since a co-admin isn't a
              cohort member being tracked. Removing an admin is always
              blocked server-side if it would leave zero admins. */}
          <div className="mt-6">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Admins</p>
              {!showInviteAdminForm && (
                <button
                  onClick={() => setShowInviteAdminForm(true)}
                  className="text-xs font-semibold text-primary hover:underline cursor-pointer"
                >
                  Invite a co-admin
                </button>
              )}
            </div>

            {showInviteAdminForm && (
              <div className="bg-card border border-border rounded-xl p-4 space-y-3 mb-3">
                <label className="block text-xs font-semibold text-foreground">Colleague's email</label>
                <Input
                  type="email"
                  value={newAdminEmail}
                  onChange={(e) => setNewAdminEmail(e.target.value)}
                  placeholder="colleague@company.com"
                  className="w-full"
                  onKeyDown={(e) => { if (e.key === "Enter") void handleInviteAdmin(); }}
                />
                <div className="flex gap-2">
                  <Button disabled={invitingAdmin || !newAdminEmail.trim()} onClick={() => void handleInviteAdmin()} className="cursor-pointer font-semibold disabled:opacity-60" size="sm">
                    {invitingAdmin ? "Sending…" : "Send Invite"}
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => { setShowInviteAdminForm(false); setNewAdminEmail(""); }} className="cursor-pointer">
                    Cancel
                  </Button>
                </div>
              </div>
            )}

            {orgAdmins === undefined ? (
              <Skeleton className="h-16 w-full rounded-lg" />
            ) : (
              <div className="space-y-2">
                {orgAdmins.admins.map((admin) => (
                  <div key={admin.userId} className="flex items-center justify-between gap-3 border border-border rounded-lg px-3 py-2">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">
                        {admin.name ?? admin.email}{admin.isYou && <span className="ml-1.5 text-[10px] font-semibold uppercase text-accent">You</span>}
                      </p>
                      {admin.name && <p className="text-xs text-muted-foreground truncate">{admin.email}</p>}
                    </div>
                    {orgAdmins.admins.length > 1 && (
                      <button
                        onClick={() => void handleRemoveAdmin(admin.userId)}
                        disabled={removingAdminId === admin.userId}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold border border-transparent text-destructive hover:bg-destructive/8 hover:border-destructive/20 transition-colors cursor-pointer disabled:opacity-50 shrink-0"
                      >
                        <Ban className="w-3 h-3" /> {removingAdminId === admin.userId ? "Removing…" : "Remove"}
                      </button>
                    )}
                  </div>
                ))}
                {orgAdmins.pendingInvites.map((invite) => (
                  <div key={invite._id} className="flex items-center justify-between gap-3 border border-dashed border-border rounded-lg px-3 py-2">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-muted-foreground truncate">{invite.invitedEmail}</p>
                      <p className="text-xs text-muted-foreground/70">Invite pending</p>
                    </div>
                    <button
                      onClick={() => void handleRevokeAdminInvite(invite._id)}
                      disabled={revokingInviteId === invite._id}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold border border-transparent text-destructive hover:bg-destructive/8 hover:border-destructive/20 transition-colors cursor-pointer disabled:opacity-50 shrink-0"
                    >
                      <Ban className="w-3 h-3" /> {revokingInviteId === invite._id ? "Revoking…" : "Revoke"}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function BusinessDashboardPage() {
  useSeo({ title: "Organisation Dashboard", description: "Track your cohort's visa readiness — employees, students, or clients — in one consent-first dashboard." });
  const { t } = useTranslation("business");
  const navigate = useNavigate();
  const goBack = useSmartBack("/business");
  const { signOut } = useAuth();

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border/40 px-6 py-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <button onClick={goBack} className="text-muted-foreground hover:text-primary transition-colors cursor-pointer p-1 -ml-1">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="w-7 h-7 rounded-md bg-primary flex items-center justify-center shrink-0">
            <Globe className="w-3.5 h-3.5 text-primary-foreground" />
          </div>
          <span className="font-serif font-semibold text-primary">VisaClear</span>
          <span className="text-xs text-muted-foreground tracking-widest uppercase hidden sm:flex items-center gap-1">
            {t("header_tag")}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <NotificationBell />
          <button
            onClick={async () => { await signOut(); navigate("/"); }}
            className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-red-600 border border-border hover:border-red-200 hover:bg-red-50 transition-colors cursor-pointer px-3 py-1.5 rounded-lg"
          >
            <LogOut className="w-3.5 h-3.5" />
            Sign out
          </button>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 py-6 sm:px-6 sm:py-10">
        <AuthLoading>
          <Skeleton className="h-64 w-full rounded-2xl" />
        </AuthLoading>
        <Unauthenticated>
          <div className="text-center py-16 bg-card border border-border rounded-2xl">
            <div className="w-14 h-14 rounded-2xl bg-primary/8 flex items-center justify-center mx-auto mb-5">
              <LogIn className="w-6 h-6 text-primary" />
            </div>
            <h2 className="font-serif text-2xl font-semibold text-primary mb-3">{t("dashboard.signin_title")}</h2>
            <Button
              size="lg"
              className="cursor-pointer font-semibold"
              onClick={() => navigate(`/login?returnTo=${encodeURIComponent("/business/dashboard")}`)}
            >
              {t("dashboard.signin_cta")}
            </Button>
          </div>
        </Unauthenticated>
        <Authenticated>
          <DashboardInner />
        </Authenticated>
      </div>
    </div>
  );
}
