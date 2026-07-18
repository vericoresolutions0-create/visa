import type { ReactNode } from "react";
import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import { Button } from "@/components/ui/button.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { CheckCircle2, XCircle, ChevronDown, ChevronUp, Copy, Plus, Sparkles } from "lucide-react";
import { cn, convexErrMsg } from "@/lib/utils.ts";
import { toast } from "sonner";



// ─── Creators / Influencers ────────────────────────────────────────────────────

export function CreatorsAdminPanel() {
  const creators = useQuery(api.creators.listAll, {});
  const createCode = useMutation(api.creators.createCode);
  const toggleActive = useMutation(api.creators.toggleActive);
  const markPaid = useMutation(api.creators.markCommissionsPaid);

  const [showForm, setShowForm] = useState(false);
  const [cName, setCName] = useState("");
  const [cEmail, setCEmail] = useState("");
  const [cSlug, setCSlug] = useState("");
  const [cRate, setCRate] = useState(20);
  const [cUnlimited, setCUnlimited] = useState(true);
  const [cMonths, setCMonths] = useState(6);
  const [cNotes, setCNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [copiedPortalId, setCopiedPortalId] = useState<string | null>(null);
  const [markingPaid, setMarkingPaid] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const slugify = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

  const handleNameChange = (v: string) => {
    setCName(v);
    // Auto-fill slug from name only while user hasn't manually edited it
    if (!cSlug || cSlug === slugify(cName)) setCSlug(slugify(v));
  };

  const handleCreate = async () => {
    if (!cName.trim() || !cEmail.trim() || !cSlug.trim()) return;
    setSubmitting(true);
    try {
      await createCode({
        name: cName.trim(),
        email: cEmail.trim(),
        slug: cSlug.trim(),
        commissionRatePercent: cRate,
        commissionMonths: cUnlimited ? 0 : cMonths,
        notes: cNotes.trim() || undefined,
      });
      toast.success(`Creator "${cName.trim()}" created — copy their portal link from the table below.`);
      setShowForm(false);
      setCName(""); setCEmail(""); setCSlug(""); setCRate(20);
      setCUnlimited(true); setCMonths(6); setCNotes("");
    } catch (err) {
      const message = convexErrMsg(err) ?? "Failed to create creator.";
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  const copyRef = (slug: string, id: string) => {
    void navigator.clipboard.writeText(`https://visaclear.app/ref/${slug}`);
    setCopiedId(id);
    toast.success("Referral link copied.");
    setTimeout(() => setCopiedId(null), 2000);
  };

  const copyPortal = (token: string, id: string) => {
    void navigator.clipboard.writeText(`${window.location.origin}/creator/portal/${token}`);
    setCopiedPortalId(id);
    toast.success("Portal link copied — send this to the creator privately.");
    setTimeout(() => setCopiedPortalId(null), 2000);
  };

  const handleMarkPaid = async (slug: string, id: string) => {
    setMarkingPaid(id);
    try {
      const count = await markPaid({ creatorSlug: slug });
      toast.success(`Marked ${count} commission row${count === 1 ? "" : "s"} as paid.`);
    } catch {
      toast.error("Could not mark commissions as paid.");
    } finally {
      setMarkingPaid(null);
    }
  };

  const fmtMoney = (cents: number) => `£${(cents / 100).toFixed(2)}`;

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h3 className="font-semibold text-sm text-primary uppercase tracking-widest flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-yellow-500" />
            Creators & Influencers
            {creators && (
              <span className="text-[11px] font-bold bg-yellow-50 text-yellow-700 border border-yellow-200 rounded-full px-2 py-0.5">
                {creators.length} total
              </span>
            )}
          </h3>
          <p className="text-xs text-muted-foreground mt-1">
            Each creator gets a unique link and a private portal. Commission fires on every payment their referred followers make.
          </p>
        </div>
        <Button
          size="sm"
          onClick={() => setShowForm((v) => !v)}
          className="cursor-pointer shrink-0"
        >
          <Plus className="w-3.5 h-3.5" />
          {showForm ? "Cancel" : "Add creator"}
        </Button>
      </div>

      {showForm && (
        <div className="rounded-xl border border-yellow-200 bg-yellow-50/50 p-5 space-y-4">
          <p className="text-xs font-semibold text-yellow-800 uppercase tracking-wider">New creator</p>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">Full name</label>
              <input
                value={cName}
                onChange={(e) => handleNameChange(e.target.value)}
                placeholder="e.g. Amara Osei"
                className="w-full px-3 py-2 text-sm rounded-lg border border-input bg-white"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">Email (for payout contact)</label>
              <input
                type="email"
                value={cEmail}
                onChange={(e) => setCEmail(e.target.value)}
                placeholder="creator@example.com"
                className="w-full px-3 py-2 text-sm rounded-lg border border-input bg-white"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">
              Slug — their link will be{" "}
              <span className="font-mono text-primary">
                visaclear.app/ref/<strong>{cSlug || "slug"}</strong>
              </span>
            </label>
            <input
              value={cSlug}
              onChange={(e) => setCSlug(slugify(e.target.value))}
              placeholder="e.g. amara"
              className="w-full px-3 py-2 text-sm rounded-lg border border-input bg-white font-mono"
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">Commission rate</label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={1}
                  max={50}
                  value={cRate}
                  onChange={(e) => setCRate(Math.min(50, Math.max(1, Number(e.target.value))))}
                  className="w-20 px-3 py-2 text-sm rounded-lg border border-input bg-white text-center font-semibold"
                />
                <span className="text-sm text-muted-foreground">% of each payment</span>
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">Duration</label>
              <label className="flex items-center gap-2 text-sm font-medium cursor-pointer">
                <input
                  type="checkbox"
                  checked={cUnlimited}
                  onChange={(e) => setCUnlimited(e.target.checked)}
                  className="w-4 h-4 accent-yellow-500 cursor-pointer"
                />
                Unlimited — earn on every payment forever
              </label>
              {!cUnlimited && (
                <div className="flex items-center gap-2 mt-1">
                  <input
                    type="number"
                    min={1}
                    max={36}
                    value={cMonths}
                    onChange={(e) => setCMonths(Math.min(36, Math.max(1, Number(e.target.value))))}
                    className="w-20 px-3 py-2 text-sm rounded-lg border border-input bg-white text-center"
                  />
                  <span className="text-sm text-muted-foreground">months</span>
                </div>
              )}
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">Notes (private, optional)</label>
            <input
              value={cNotes}
              onChange={(e) => setCNotes(e.target.value)}
              placeholder="e.g. YouTube — immigration niche, 45k subs"
              className="w-full px-3 py-2 text-sm rounded-lg border border-input bg-white"
            />
          </div>

          <Button
            size="sm"
            className="w-full cursor-pointer"
            disabled={!cName.trim() || !cEmail.trim() || !cSlug.trim() || submitting}
            onClick={() => { void handleCreate(); }}
          >
            {submitting ? "Creating..." : "Create creator"}
          </Button>
        </div>
      )}

      {creators === undefined ? (
        <div className="space-y-3">
          <Skeleton className="h-20 w-full rounded-xl" />
          <Skeleton className="h-20 w-full rounded-xl" />
        </div>
      ) : creators.length === 0 ? (
        <div className="border border-dashed border-border rounded-xl p-10 text-center space-y-2">
          <Sparkles className="w-8 h-8 text-yellow-400 mx-auto" />
          <p className="text-sm font-semibold text-foreground">No creators yet</p>
          <p className="text-xs text-muted-foreground">
            Add your first creator or influencer above — they get a referral link and a private earnings portal.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {creators.map((c) => {
            const isExpanded = expandedId === c._id;
            const hasUnpaid = c.pendingCents > 0;

            return (
              <div
                key={c._id}
                className={cn(
                  "rounded-xl border bg-card transition-all",
                  c.active ? "border-border" : "border-border/50 opacity-60"
                )}
              >
                <div className="flex items-center gap-3 p-4">
                  <div className="w-9 h-9 rounded-full bg-yellow-100 border border-yellow-200 flex items-center justify-center shrink-0">
                    <span className="text-sm font-bold text-yellow-700">{c.name.charAt(0).toUpperCase()}</span>
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-semibold text-foreground">{c.name}</span>
                      <span className="text-[10.5px] font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded">/ref/{c.slug}</span>
                      <span className={cn(
                        "text-[10px] font-bold px-1.5 py-0.5 rounded-full",
                        c.active
                          ? "bg-green-50 text-green-700 border border-green-200"
                          : "bg-secondary text-secondary-foreground border border-border"
                      )}>
                        {c.active ? "Active" : "Paused"}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mt-0.5 text-[11px] text-muted-foreground flex-wrap">
                      <span>{c.commissionRatePercent}% per payment</span>
                      <span>·</span>
                      <span>{c.commissionMonths === 0 ? "Unlimited" : `${c.commissionMonths} months`}</span>
                      {c.notes && <><span>·</span><span className="truncate max-w-[160px]">{c.notes}</span></>}
                    </div>
                  </div>

                  <div className="hidden sm:flex items-center gap-5 text-center shrink-0">
                    {[
                      { label: "Clicks",   value: c.totalClicks.toLocaleString(), color: "text-foreground" },
                      { label: "Signups",  value: c.signupCount.toString(),        color: "text-foreground" },
                      { label: "Paying",   value: c.paidSubscriberCount.toString(), color: "text-blue-600" },
                      { label: "Owed",     value: fmtMoney(c.pendingCents),         color: hasUnpaid ? "text-amber-600" : "text-foreground" },
                      { label: "Total",    value: fmtMoney(c.totalCommissionCents), color: "text-emerald-600" },
                    ].map(({ label, value, color }) => (
                      <div key={label}>
                        <div className={cn("text-sm font-bold tabular-nums", color)}>{value}</div>
                        <div className="text-[10px] text-muted-foreground font-medium">{label}</div>
                      </div>
                    ))}
                  </div>

                  <button
                    onClick={() => setExpandedId(isExpanded ? null : c._id)}
                    className="shrink-0 w-7 h-7 flex items-center justify-center rounded-lg hover:bg-muted transition-colors cursor-pointer text-muted-foreground"
                  >
                    {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </button>
                </div>

                {/* Mobile stats */}
                <div className="sm:hidden grid grid-cols-4 border-t border-border divide-x divide-border">
                  {[
                    { label: "Clicks",  value: c.totalClicks.toLocaleString(), color: "text-foreground" },
                    { label: "Signups", value: c.signupCount.toString(),        color: "text-foreground" },
                    { label: "Paying",  value: c.paidSubscriberCount.toString(), color: "text-blue-600" },
                    { label: "Owed",    value: fmtMoney(c.pendingCents),         color: hasUnpaid ? "text-amber-600" : "text-foreground" },
                  ].map(({ label, value, color }) => (
                    <div key={label} className="py-2 text-center">
                      <div className={cn("text-sm font-bold tabular-nums", color)}>{value}</div>
                      <div className="text-[10px] text-muted-foreground">{label}</div>
                    </div>
                  ))}
                </div>

                {isExpanded && (
                  <div className="border-t border-border p-4 space-y-3">
                    <div className="space-y-1">
                      <p className="text-[10.5px] font-semibold text-muted-foreground uppercase tracking-wide">Referral link (they share this publicly)</p>
                      <div className="flex items-center gap-2 p-2.5 bg-muted/40 rounded-lg border border-border text-xs font-mono text-muted-foreground">
                        <span className="truncate flex-1">https://visaclear.app/ref/{c.slug}</span>
                        <button
                          onClick={() => copyRef(c.slug, c._id)}
                          className="shrink-0 inline-flex items-center gap-1 text-[11px] font-semibold text-primary hover:text-primary/80 cursor-pointer"
                        >
                          {copiedId === c._id ? <CheckCircle2 className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
                          {copiedId === c._id ? "Copied" : "Copy"}
                        </button>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <p className="text-[10.5px] font-semibold text-muted-foreground uppercase tracking-wide">Private portal (send to creator only — never post publicly)</p>
                      <div className="flex items-center gap-2 p-2.5 bg-muted/40 rounded-lg border border-amber-200 bg-amber-50/50 text-xs font-mono text-muted-foreground">
                        <span className="truncate flex-1 select-none text-amber-700">{window.location.origin}/creator/portal/{"•".repeat(16)}</span>
                        <button
                          onClick={() => copyPortal(c.portalToken, c._id)}
                          className="shrink-0 inline-flex items-center gap-1 text-[11px] font-semibold text-amber-700 hover:text-amber-900 cursor-pointer"
                        >
                          {copiedPortalId === c._id ? <CheckCircle2 className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
                          {copiedPortalId === c._id ? "Copied" : "Copy link"}
                        </button>
                      </div>
                      <p className="text-[10.5px] text-muted-foreground">Token is hidden on screen. Clicking Copy puts the full URL on your clipboard.</p>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap pt-1">
                      {hasUnpaid && (
                        <button
                          onClick={() => { void handleMarkPaid(c.slug, c._id); }}
                          disabled={markingPaid === c._id}
                          className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 transition-colors cursor-pointer disabled:opacity-50"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          {markingPaid === c._id ? "Marking..." : `Mark paid (${fmtMoney(c.pendingCents)} owed)`}
                        </button>
                      )}
                      <button
                        onClick={() => { void toggleActive({ codeId: c._id }); }}
                        className={cn(
                          "inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg border transition-colors cursor-pointer",
                          c.active
                            ? "border-red-200 text-red-600 hover:bg-red-50"
                            : "border-green-200 text-green-700 hover:bg-green-50"
                        )}
                      >
                        {c.active
                          ? <><XCircle className="w-3.5 h-3.5" /> Pause</>
                          : <><CheckCircle2 className="w-3.5 h-3.5" /> Reactivate</>
                        }
                      </button>
                      {c.totalCommissionCents > 0 && (
                        <span className="ml-auto text-xs text-muted-foreground font-medium">
                          {fmtMoney(c.totalCommissionCents)} total · {fmtMoney(c.totalCommissionCents - c.pendingCents)} paid out
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
