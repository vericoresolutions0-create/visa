import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { authTables } from "@convex-dev/auth/server";

export default defineSchema({
  ...authTables,
  users: defineTable({
    // Convex Auth's own fields (required shape for its account-linking
    // queries) — image/verification times are unused by VisaClear today but
    // kept so Convex Auth's internals keep working if a provider sets them.
    name: v.optional(v.string()),
    email: v.optional(v.string()),
    phone: v.optional(v.string()),
    image: v.optional(v.string()),
    emailVerificationTime: v.optional(v.number()),
    phoneVerificationTime: v.optional(v.number()),
    isAnonymous: v.optional(v.boolean()),
    country: v.optional(v.string()),
    plan: v.optional(
      v.union(v.literal("free"), v.literal("pro"), v.literal("expert")),
    ),
    trialStartedAt: v.optional(v.string()),
    billingCycle: v.optional(
      v.union(v.literal("monthly"), v.literal("yearly")),
    ),
    subscriptionAmountCents: v.optional(v.number()),
    subscriptionStartedAt: v.optional(v.string()),
    lastPaymentAt: v.optional(v.string()),
    agentPlan: v.optional(
      v.union(
        v.literal("agent_listing"),
        v.literal("agent_featured"),
        v.literal("agency_white_label"),
      ),
    ),
    agentBillingCycle: v.optional(
      v.union(v.literal("monthly"), v.literal("yearly")),
    ),
    agentSubscriptionAmountCents: v.optional(v.number()),
    agentSubscriptionStartedAt: v.optional(v.string()),
    lastAgentPaymentAt: v.optional(v.string()),
    referralCode: v.optional(v.string()),
    referredByCode: v.optional(v.string()),
    referralRewardMonthsGranted: v.optional(v.number()),
    paymentMethod: v.optional(
      v.object({
        type: v.union(v.literal("card"), v.literal("bank")),
        brand: v.optional(v.string()),
        last4: v.string(),
        nameOnMethod: v.string(),
        expiresAt: v.optional(v.string()),
        billingEmail: v.string(),
        updatedAt: v.string(),
      }),
    ),
    payoutSetup: v.optional(
      v.object({
        method: v.union(
          v.literal("bank"),
          v.literal("mobile_money"),
          v.literal("paypal"),
        ),
        accountName: v.string(),
        country: v.string(),
        bankName: v.optional(v.string()),
        accountNumberLast4: v.optional(v.string()),
        mobileMoneyProvider: v.optional(v.string()),
        mobileMoneyLast4: v.optional(v.string()),
        paypalEmail: v.optional(v.string()),
        updatedAt: v.string(),
      }),
    ),
    role: v.optional(v.union(v.literal("admin"), v.literal("user"))),
    onboarded: v.optional(v.boolean()),
    agreedToTermsAt: v.optional(v.string()),
    // Which institutional partner (university, agency) this user arrived
    // via, if any — entirely separate from referralCode/referredByCode
    // below, which is the unrelated peer-to-peer user referral system.
    partnerReferralSlug: v.optional(v.string()),
    stripeCustomerId: v.optional(v.string()),
    stripeSubscriptionId: v.optional(v.string()),
    agentStripeSubscriptionId: v.optional(v.string()),
    agentTrialPlan: v.optional(
      v.union(
        v.literal("agent_listing"),
        v.literal("agent_featured"),
        v.literal("agency_white_label"),
      ),
    ),
    agentTrialExpiresAt: v.optional(v.string()),
    agentTrialGrantedAt: v.optional(v.string()),
    agentTrialGrantedBy: v.optional(v.id("users")),
    agentTrialNote: v.optional(v.string()),
    paystackReference: v.optional(v.string()),
    // Which influencer affiliate code (if any) brought this user to VisaClear.
    // Separate from referredByCode, which is the peer-to-peer user referral system.
    influencerCode: v.optional(v.string()),
    influencerTrackedAt: v.optional(v.string()),
    // Which creator (path-based /ref/:slug affiliate) referred this user.
    // Separate from influencerCode (?af=) and referredByCode (peer referral).
    creatorCode: v.optional(v.string()),
    creatorTrackedAt: v.optional(v.string()),
    isSuspended: v.optional(v.boolean()),
    suspendedAt: v.optional(v.string()),
    suspendedByAdminId: v.optional(v.id("users")),
  })
    .index("email", ["email"])
    .index("phone", ["phone"])
    .index("by_role", ["role"])
    .index("by_referral_code", ["referralCode"])
    .index("by_referred_by_code", ["referredByCode"])
    .index("by_plan", ["plan"])
    .index("by_stripe_subscription", ["stripeSubscriptionId"])
    .index("by_agent_stripe_subscription", ["agentStripeSubscriptionId"])
    .index("by_stripe_customer", ["stripeCustomerId"])
    .index("by_agent_trial_plan", ["agentTrialPlan"])
    .index("by_influencer_code", ["influencerCode"])
    .index("by_creator_code", ["creatorCode"]),

  // A saved_checklists row is a "trip": the checklist IS the trip's core
  // workspace. Pro fields below extend it into the full Multi-Trip Manager
  // (name, travel date, status, private notes) without breaking the plain
  // checklist flow that every plan already relies on.
  saved_checklists: defineTable({
    userId: v.id("users"),
    origin: v.string(),
    destination: v.string(),
    visaType: v.string(),
    checkedItems: v.array(v.string()),
    title: v.string(),
    progress: v.number(),
    savedAt: v.string(),
    tripName: v.optional(v.string()),
    travelDate: v.optional(v.string()),
    status: v.optional(
      v.union(
        v.literal("planning"),
        v.literal("in_progress"),
        v.literal("submitted"),
        v.literal("approved"),
        v.literal("rejected"),
      ),
    ),
    notes: v.optional(v.string()),
    archived: v.optional(v.boolean()),
    settleInCheckedItems: v.optional(v.array(v.string())),
    settleInProgress: v.optional(v.number()),
    // Set when this trip is being tracked by a parent on behalf of a
    // dependent who has no VisaClear account of their own — userId stays
    // the PARENT's id (the dependent has none), so every existing ownership
    // check in checklists.ts keeps working unmodified.
    managedDependentId: v.optional(v.id("managed_dependents")),
  })
    .index("by_user", ["userId"])
    .index("by_user_archived", ["userId", "archived"])
    .index("by_travel_date", ["travelDate"]),

  vault_documents: defineTable({
    userId: v.id("users"),
    category: v.union(
      v.literal("identity"),
      v.literal("financial"),
      v.literal("employment"),
      v.literal("travel"),
      v.literal("education"),
      v.literal("photo"),
      v.literal("legal"),
      v.literal("medical"),
      v.literal("other"),
    ),
    label: v.string(),
    storageId: v.id("_storage"),
    fileName: v.string(),
    fileSize: v.number(),
    mimeType: v.string(),
    expiryDate: v.optional(v.string()),
    uploadedAt: v.string(),
  })
    .index("by_user", ["userId"])
    .index("by_user_category", ["userId", "category"])
    .index("by_expiry_date", ["expiryDate"]),

  country_watches: defineTable({
    userId: v.id("users"),
    countryName: v.string(),
    createdAt: v.string(),
  })
    .index("by_user", ["userId"])
    .index("by_country", ["countryName"]),

  // Real, admin-authored policy change alerts. Visa rule changes can't be
  // honestly detected by an AI guess — these are published by VisaClear staff
  // and emailed out to everyone watching that country, the same way any
  // serious travel-alert product (e.g. embassy mailing lists) works.
  country_policy_updates: defineTable({
    countryName: v.string(),
    title: v.string(),
    body: v.string(),
    publishedAt: v.string(),
    publishedByUserId: v.id("users"),
  }).index("by_country", ["countryName"]),

  // Real monthly usage counters, enforced server-side. "yearMonth" is a
  // UTC "YYYY-MM" bucket so the Pro 10/month AI Visa Assistant cap (and any
  // future per-month limit) is a cheap indexed lookup, not a full table scan.
  ai_assistant_usage: defineTable({
    userId: v.id("users"),
    yearMonth: v.string(),
    count: v.number(),
  }).index("by_user_month", ["userId", "yearMonth"]),

  // Tracks plans paid for via a one-time charge (Stripe Pix/boleto/OXXO,
  // Paystack mobile money/bank transfer/USSD) — these methods have no
  // stored instrument to auto-renew, unlike a real Stripe subscription. A
  // row here only ever exists for someone on this billing path, so the
  // expiry cron's range query never has to reason about undefined values —
  // every row it scans genuinely needs checking. Deleted on renewal or on
  // switching to a real recurring subscription.
  one_time_plan_expirations: defineTable({
    userId: v.id("users"),
    expiresAt: v.string(),
  })
    .index("by_user", ["userId"])
    .index("by_expires", ["expiresAt"]),

  reminders: defineTable({
    userId: v.id("users"),
    checklistId: v.optional(v.id("saved_checklists")),
    vaultDocumentId: v.optional(v.id("vault_documents")),
    title: v.string(),
    note: v.optional(v.string()),
    dueDate: v.string(),
    email: v.string(),
    sent: v.boolean(),
    createdAt: v.string(),
  })
    .index("by_user", ["userId"])
    .index("by_due_date", ["dueDate"])
    .index("by_sent_due_date", ["sent", "dueDate"]),

  rejection_analyses: defineTable({
    userId: v.id("users"),
    destination: v.string(),
    visaType: v.string(),
    refusalText: v.string(),
    analysis: v.string(),
    recoveryPlan: v.string(),
    createdAt: v.string(),
  })
    .index("by_user", ["userId"])
    .index("by_destination_visatype", ["destination", "visaType"]),

  // Tracks PDF uploads for the Rejection Analyser so we can verify the
  // caller uploaded the file themselves before allowing it to be read or
  // deleted. Row is deleted once the file is consumed by the action.
  pending_rejection_uploads: defineTable({
    userId: v.id("users"),
    storageId: v.id("_storage"),
    createdAt: v.string(),
  })
    .index("by_storage", ["storageId"])
    .index("by_user", ["userId"]),

  agent_profiles: defineTable({
    userId: v.id("users"),
    fullName: v.string(),
    email: v.string(),
    phone: v.optional(v.string()),
    country: v.string(),
    specialisations: v.array(v.string()),
    bio: v.string(),
    yearsExperience: v.number(),
    languages: v.array(v.string()),
    // Which destination countries this agent actively serves.
    // Optional so existing profiles stay valid. Empty/absent = not yet declared.
    destinations: v.optional(v.array(v.string())),
    verified: v.boolean(),
    rating: v.optional(v.number()),
    reviewCount: v.optional(v.number()),
    createdAt: v.string(),
    // Denormalized from users.agentPlan at checkout time, so listing/ranking
    // queries never need to join against the users table.
    tier: v.optional(
      v.union(
        v.literal("agent_listing"),
        v.literal("agent_featured"),
        v.literal("agency_white_label"),
      ),
    ),
    // Drives the real-upload "new since you last looked" indicator on the
    // agent dashboard — no email provider is configured yet, so this is the
    // honest, real notification signal available right now.
    lastDashboardViewAt: v.optional(v.string()),
    // Denormalized credit balance for fast reads — updated atomically in
    // marketplace.ts alongside every insert into agent_credit_purchases and
    // marketplace_lead_unlocks. The immutable ledger tables are the source of
    // truth; this field is derived from them and may be recomputed by an admin.
    creditBalance: v.optional(v.number()),
    // Set by the admin Security Intelligence Centre's "Revoke leads" action
    // (convex/securityAudit.ts adminTakeAction) — enforced in
    // marketplace.ts's unlockLead, which blocks any new lead purchase while
    // true. Distinct from a full account suspension (isSuspended on users):
    // this only cuts off marketplace access, not the whole account.
    leadAccessRevoked: v.optional(v.boolean()),
    // Mirrors users.isSuspended, kept in sync by the same
    // securityAudit.ts adminTakeAction handler that sets it. Denormalized
    // here (rather than joining agent_profiles -> users on every marketplace
    // read) so listTieredAgents/searchAgents/getAgentPublicProfile/contactAgent
    // can filter a suspended agent out of public visibility and contact
    // without an extra lookup per row.
    suspended: v.optional(v.boolean()),
    // EU/Global market split for lead marketplace routing and search filtering.
    region: v.optional(v.union(v.literal("global"), v.literal("europe"))),
    // Self-reported professional credential. VisaClear does not verify this
    // independently — admin cross-checks before marking verified: true.
    // Agents who submit a credential get a "Credential submitted" badge;
    // those who don't get an "Unverified" label visible to all users.
    credentialType: v.optional(v.string()),    // "OISC", "RCIC", "Bar Member", etc.
    credentialNumber: v.optional(v.string()),  // the registration/member number
    credentialVerifyUrl: v.optional(v.string()), // direct link to the public register
  })
    .index("by_user", ["userId"])
    .index("by_tier", ["tier"])
    .index("by_verified", ["verified"])
    .index("by_region", ["region"]),

  // A real lead generated by an applicant clicking "Contact Agent" in the
  // marketplace — replaces the old client-side-only toast that never
  // reached the agent.
  agent_contact_requests: defineTable({
    agentProfileId: v.id("agent_profiles"),
    fromUserId: v.optional(v.id("users")),
    fromName: v.optional(v.string()),
    fromEmail: v.optional(v.string()),
    message: v.optional(v.string()),
    createdAt: v.string(),
    read: v.boolean(),
  })
    .index("by_agent", ["agentProfileId"])
    .index("by_from_user", ["fromUserId"]),

  // Per-(email, agent) daily write cap for unauthenticated enquiries.
  // Prevents a guest from spamming the same agent multiple times per day.
  // emailKey is the lowercased, trimmed email address.
  guest_enquiry_daily: defineTable({
    emailKey: v.string(),
    agentProfileId: v.id("agent_profiles"),
    dateKey: v.string(),
    count: v.number(),
  }).index("by_email_agent_date", ["emailKey", "agentProfileId", "dateKey"]),

  // Platform-wide daily backstop for guest agent enquiries — same pattern as
  // contact_daily_usage. Caps total guest enquiries across all agents per day
  // so a botnet with many email addresses still hits a hard ceiling.
  guest_enquiry_global_daily: defineTable({
    dateKey: v.string(),
    count: v.number(),
  }).index("by_date", ["dateKey"]),
  contact_messages: defineTable({
    name: v.string(),
    email: v.string(),
    subject: v.optional(v.string()),
    message: v.string(),
    createdAt: v.string(),
    read: v.boolean(),
  }).index("by_read", ["read"]),

  client_intakes: defineTable({
    agentId: v.id("users"),
    token: v.string(),
    clientName: v.string(),
    clientEmail: v.optional(v.string()),
    clientPhone: v.optional(v.string()),
    destination: v.string(),
    visaType: v.string(),
    status: v.union(
      v.literal("awaiting_documents"),
      v.literal("documents_received"),
      v.literal("in_review"),
      v.literal("complete"),
    ),
    notes: v.optional(v.string()),
    archived: v.optional(v.boolean()),
    claimedByUserId: v.optional(v.id("users")),
    sourceContactRequestId: v.optional(v.id("agent_contact_requests")),
    createdAt: v.string(),
  })
    .index("by_agent", ["agentId"])
    .index("by_token", ["token"]),

  client_documents: defineTable({
    intakeId: v.id("client_intakes"),
    label: v.string(),
    storageId: v.id("_storage"),
    fileName: v.string(),
    fileSize: v.number(),
    mimeType: v.string(),
    uploadedByUserId: v.optional(v.id("users")),
    uploadedAt: v.string(),
  }).index("by_intake", ["intakeId"]),

  // Platform-wide daily backstop for ai/photoChecker.ts, which is an
  // intentionally open, no-sign-in-required guest feature. There's no user
  // to gate by, so this caps total daily spend if it's ever scraped/scripted.
  photo_check_daily_usage: defineTable({
    dateKey: v.string(),
    count: v.number(),
  }).index("by_date", ["dateKey"]),

  // Rate-limits login/signup/password-reset attempts per email to stop
  // brute-force credential guessing — Convex Auth's Password provider has
  // no built-in throttle. 5-minute fixed windows via windowBucket, same
  // self-expiring pattern as the daily-usage tables above (old buckets are
  // simply never queried again, nothing to clean up).
  auth_attempt_counters: defineTable({
    emailFlow: v.string(),     // `${normalizedEmail}|${flow}`, e.g. "user@x.com|signIn"
    windowBucket: v.number(),  // Date.now() floored to a 5-minute window
    count: v.number(),
  }).index("by_email_flow_window", ["emailFlow", "windowBucket"]),

  // Same backstop pattern, for the public (no-sign-in) contact form.
  contact_daily_usage: defineTable({
    dateKey: v.string(),
    count: v.number(),
  }).index("by_date", ["dateKey"]),

  // Short-lived bearer tokens for serving real client files (Vault documents,
  // agent client-intake documents) through the /files/download httpAction
  // instead of Convex's own permanent, unauthenticated storage.getUrl links.
  // Minted only after a fresh ownership check, valid a few minutes, cleaned
  // up by a daily cron — see convex/fileTokens.ts.
  file_download_tokens: defineTable({
    token: v.string(),
    storageId: v.id("_storage"),
    fileName: v.string(),
    mimeType: v.optional(v.string()),
    expiresAt: v.number(),
  }).index("by_token", ["token"]).index("by_expiresAt", ["expiresAt"]),

  // Same backstop pattern, for the public (no-sign-in) Risk Score quiz.
  risk_score_daily_usage: defineTable({
    dateKey: v.string(),
    count: v.number(),
  }).index("by_date", ["dateKey"]),

  // Every real incoming Telegram message the bot answered (or failed to
  // match) — gives the admin panel real visibility into bot usage and
  // match rate without needing the founder to watch logs manually.
  telegram_bot_log: defineTable({
    chatId: v.string(),
    questionText: v.string(),
    matchedDestination: v.optional(v.string()),
    matchedVisaType: v.optional(v.string()),
    matched: v.boolean(),
    createdAt: v.string(),
  }).index("by_created", ["createdAt"]),

  // Exact mirror of telegram_bot_log for the WhatsApp (Twilio) companion
  // bot — fromNumber instead of chatId is the only conceptual difference.
  whatsapp_bot_log: defineTable({
    fromNumber: v.string(),
    questionText: v.string(),
    matchedDestination: v.optional(v.string()),
    matchedVisaType: v.optional(v.string()),
    matched: v.boolean(),
    createdAt: v.string(),
  }).index("by_created", ["createdAt"]),

  // A single real applicant's processing-time data point. waitDays is
  // computed at submission time so every downstream query is just reading
  // a plain number, not re-deriving dates — and so a later rubric/timezone
  // change can never silently change a previously-submitted report's value.
  wait_time_reports: defineTable({
    destination: v.string(),
    visaType: v.string(),
    applicationDate: v.string(),
    decisionDate: v.string(),
    waitDays: v.number(),
    outcome: v.optional(v.union(v.literal("approved"), v.literal("refused"))),
    submittedByUserId: v.id("users"),
    createdAt: v.string(),
  })
    .index("by_destination_visatype", ["destination", "visaType"])
    .index("by_user", ["submittedByUserId"]),

  // A real applicant's "refused then approved" story. Always anonymous to
  // readers (submittedByUserId is only ever used for moderation/abuse
  // follow-up, never returned by the public query) and always reviewed by
  // an admin before going live — public, user-generated content about real
  // refusals carries real risk of spam, defamation, or accidental PII, so
  // nothing here is visible to readers until status is "approved".
  wall_of_fame_stories: defineTable({
    submittedByUserId: v.id("users"),
    destination: v.string(),
    visaType: v.string(),
    refusalCount: v.number(),
    whatWentWrong: v.string(),
    whatFixedIt: v.string(),
    status: v.union(v.literal("pending"), v.literal("approved"), v.literal("rejected")),
    createdAt: v.string(),
    moderatedAt: v.optional(v.string()),
    moderatedByUserId: v.optional(v.id("users")),
  })
    .index("by_status", ["status"])
    .index("by_user", ["submittedByUserId"])
    .index("by_destination_visatype", ["destination", "visaType"])
    // Lets listApprovedStories filter by destination inside the DB query
    // itself when a destination filter is applied, instead of paginating
    // "approved" first and filtering the page in memory afterward — the
    // in-memory approach could return a near-empty page (status:
    // "CanLoadMore") for a less-common destination, requiring several
    // "Load more" clicks to surface real matches even though they exist.
    .index("by_status_destination", ["status", "destination"]),

  // A submitted Risk Score result — deliberately readable by anyone with
  // the _id (no auth check on the read), since the whole point is a
  // shareable link people send to friends/family. userId is set only when
  // the submitter happens to be signed in; the feature works fully for
  // guests, which is what makes it viral-shareable with zero signup friction.
  risk_score_results: defineTable({
    userId: v.optional(v.id("users")),
    destination: v.string(),
    visaType: v.string(),
    answers: v.record(v.string(), v.string()),
    rawScore: v.number(),
    displayScore: v.number(),
    createdAt: v.string(),
  })
    .index("by_user", ["userId"])
    .index("by_created", ["createdAt"]),

  // A pre-submission audit run against the SAME deterministic rubric as the
  // Risk Score (src/lib/risk-score.ts) — reused here, not duplicated, so
  // the two features can never silently disagree about what's a red flag.
  // Distinct purpose from Risk Score: this is framed as "fix these specific
  // things before you submit," not a shareable score.
  checklist_audits: defineTable({
    userId: v.id("users"),
    destination: v.string(),
    visaType: v.string(),
    answers: v.record(v.string(), v.string()),
    flaggedCount: v.number(),
    createdAt: v.string(),
  }).index("by_user_route", ["userId", "destination", "visaType"]),

  // A real institutional partner (university, agency) whose students/clients
  // get a tagged link (?ref=<slug>). Generic by design — adding a new
  // partner is just a new row, never new code. No hard delete: turning a
  // partner inactive preserves its historical stats rather than erasing them.
  partners: defineTable({
    slug: v.string(),
    name: v.string(),
    partnerType: v.union(v.literal("university"), v.literal("agency"), v.literal("other")),
    active: v.boolean(),
    createdAt: v.string(),
  }).index("by_slug", ["slug"]),

  // Every real visit/signup/checklist-completion attributed to a partner
  // link. Scoped strictly by slug so one partner's numbers can never read
  // or be affected by another's — no shared counters, no cross-talk.
  partner_referral_events: defineTable({
    slug: v.string(),
    eventType: v.union(v.literal("visit"), v.literal("signup"), v.literal("checklist_completed")),
    userId: v.optional(v.id("users")),
    createdAt: v.string(),
  }).index("by_slug", ["slug"]),

  // Real leads from the white-label "Apply for a Licence" form — public,
  // no-sign-in, same shape/lifecycle as contact_messages.
  whitelabel_applications: defineTable({
    agencyName: v.string(),
    website: v.optional(v.string()),
    email: v.string(),
    phone: v.optional(v.string()),
    country: v.optional(v.string()),
    volume: v.optional(v.string()),
    plan: v.string(),
    message: v.optional(v.string()),
    createdAt: v.string(),
    read: v.boolean(),
  }).index("by_read", ["read"]),

  // Single-use, email-locked activation codes — an alternate on-ramp into
  // the SAME real agentPlan/agent_profiles.tier system real paying agents
  // already use via completeAgentCheckout. Never carries fabricated
  // payment data; redemption only ever sets the plan field itself.
  license_codes: defineTable({
    code: v.string(),
    email: v.string(),
    plan: v.union(v.literal("agent_listing"), v.literal("agent_featured"), v.literal("agency_white_label")),
    whitelabelApplicationId: v.optional(v.id("whitelabel_applications")),
    issuedByUserId: v.id("users"),
    issuedAt: v.string(),
    expiresAt: v.string(),
    redeemedAt: v.optional(v.string()),
    redeemedByUserId: v.optional(v.id("users")),
  })
    .index("by_code", ["code"])
    .index("by_email", ["email"]),

  // A pending, unverified request to change users.email. Nothing here is
  // trusted as a real identity change until consumedAt is set by
  // confirmEmailChange — which only happens once the user proves control of
  // newEmail by visiting the emailed link while signed in as the account
  // that requested it. This is what keeps users.email trustworthy for
  // employerInvites.ts's and licenseCodes.ts's email-match consent checks.
  pending_email_changes: defineTable({
    userId: v.id("users"),
    newEmail: v.string(),
    token: v.string(),
    requestedAt: v.string(),
    expiresAt: v.string(),
    consumedAt: v.optional(v.string()),
  })
    .index("by_token", ["token"])
    .index("by_user", ["userId"]),

  // Same backstop pattern as contact_daily_usage, for the public white-label
  // application form.
  whitelabel_daily_usage: defineTable({
    dateKey: v.string(),
    count: v.number(),
  }).index("by_date", ["dateKey"]),

  // Community posts — paid users (pro/expert) only. Broader than Wall of Fame:
  // trip experiences, questions, tips, complaints. Every post sits pending until
  // an admin approves it. flaggedByUserIds prevents a single user flagging the
  // same post twice; at 3 flags the post is auto-hidden for re-review.
  community_posts: defineTable({
    userId: v.id("users"),
    title: v.string(),
    body: v.string(),
    category: v.union(
      v.literal("experience"),
      v.literal("question"),
      v.literal("tip"),
      v.literal("complaint"),
    ),
    country: v.string(),
    status: v.union(
      v.literal("pending"),
      v.literal("approved"),
      v.literal("rejected"),
      v.literal("hidden"),
    ),
    flagCount: v.number(),
    flaggedByUserIds: v.array(v.id("users")),
    featured: v.boolean(),
    createdAt: v.string(),
    moderatedAt: v.optional(v.string()),
    moderatedByUserId: v.optional(v.id("users")),
  })
    .index("by_status", ["status"])
    .index("by_status_category", ["status", "category"])
    .index("by_user", ["userId"])
    .index("by_country", ["country"])
    .index("by_featured_status", ["featured", "status"]),

  // Admin-authored blog articles stored in Convex so they can be created,
  // edited, published, and unpublished from the admin panel without a code
  // deploy. The static ARTICLES array in article.tsx is replaced by this table.
  blog_articles: defineTable({
    slug: v.string(),
    title: v.string(),
    excerpt: v.string(),
    body: v.string(),
    category: v.string(),
    readTime: v.string(),
    featured: v.boolean(),
    published: v.boolean(),
    publishedAt: v.optional(v.string()),
    createdByUserId: v.optional(v.id("users")),
    // AI-generated translations stored per article so new articles
    // are fully multilingual without any code deploy.
    translations: v.optional(v.object({
      fr: v.optional(v.object({ title: v.string(), excerpt: v.string(), body: v.string(), category: v.optional(v.string()) })),
      es: v.optional(v.object({ title: v.string(), excerpt: v.string(), body: v.string(), category: v.optional(v.string()) })),
      pt: v.optional(v.object({ title: v.string(), excerpt: v.string(), body: v.string(), category: v.optional(v.string()) })),
      ar: v.optional(v.object({ title: v.string(), excerpt: v.string(), body: v.string(), category: v.optional(v.string()) })),
      hi: v.optional(v.object({ title: v.string(), excerpt: v.string(), body: v.string(), category: v.optional(v.string()) })),
    })),
  })
    .index("by_slug", ["slug"])
    .index("by_published", ["published"])
    .index("by_published_at", ["published", "publishedAt"]),

  // Real blog newsletter subscribers — public, no-sign-in, deduped by email.
  newsletter_subscribers: defineTable({
    email: v.string(),
    subscribedAt: v.string(),
  }).index("by_email", ["email"]),

  // Same backstop pattern, for the public newsletter subscribe form.
  newsletter_daily_usage: defineTable({
    dateKey: v.string(),
    count: v.number(),
  }).index("by_date", ["dateKey"]),

  // One row per company account — the tenant root for the Employer Cohort
  // B2B feature. A user's relationship to an org is additive context (see
  // org_members), never a replacement for their individual-consumer identity.
  organizations: defineTable({
    name: v.string(),
    // Distinguishes real B2B employer orgs (the original use case) from
    // households (a family unit using the exact same invite/consent
    // machinery to track a spouse/adult child's relocation readiness).
    // Optional rather than required: every row that predates this field has
    // no value here, and every read site treats a missing value as
    // "employer" (org?.type ?? "employer") rather than requiring a
    // production data migration before this schema can deploy.
    type: v.optional(v.union(v.literal("employer"), v.literal("household"), v.literal("university"), v.literal("law_firm"))),
    // Manual-review gate for real B2B orgs (households are never gated —
    // see every read site's `type !== "household"` check). Missing means
    // "created before this field existed" and is treated as approved, not
    // retroactively locked out — same reasoning as `type` above.
    approvalStatus: v.optional(v.union(v.literal("pending"), v.literal("approved"), v.literal("rejected"))),
    createdByUserId: v.id("users"),
    createdAt: v.string(),
  })
    .index("by_creator", ["createdByUserId"])
    .index("by_type", ["type"]),

  // Join table: who belongs to which org, and with what role inside it.
  // Deliberately separate from users.role, which is reserved for VisaClear
  // platform admin — same reasoning as agent_profiles being its own table.
  org_members: defineTable({
    organizationId: v.id("organizations"),
    userId: v.id("users"),
    orgRole: v.union(v.literal("org_admin"), v.literal("org_member")),
    joinedAt: v.string(),
  })
    .index("by_org", ["organizationId"])
    .index("by_user", ["userId"]),

  // The consent gate for the Employer Cohort feature. A row existing does
  // NOT mean the employer can see anything about that person — only
  // status === "accepted" unlocks read access, enforced in every query that
  // touches this table, never just in the UI. employeeUserId is set only on
  // acceptance, and linkedChecklistId is chosen by the employee themselves
  // at accept time — the employer never infers which trip is "the" trip.
  org_employee_links: defineTable({
    organizationId: v.id("organizations"),
    invitedEmail: v.string(),
    token: v.string(),
    status: v.union(
      v.literal("pending"),
      v.literal("accepted"),
      v.literal("declined"),
      v.literal("revoked"),
    ),
    invitedByUserId: v.id("users"),
    employeeUserId: v.optional(v.id("users")),
    linkedChecklistId: v.optional(v.id("saved_checklists")),
    // Employer-authored business context — never derived from the
    // employee's private data, always safe regardless of consent status.
    department: v.optional(v.string()),
    roleTitle: v.optional(v.string()),
    // Household-context equivalent of department/roleTitle, e.g. "Spouse",
    // "Adult child" — left unset for employer-type links.
    relationship: v.optional(v.string()),
    targetRelocationDate: v.optional(v.string()),
    pipelineStage: v.union(
      v.literal("invited"),
      v.literal("accepted"),
      v.literal("in_progress"),
      v.literal("ready"),
      v.literal("relocated"),
    ),
    createdAt: v.string(),
    respondedAt: v.optional(v.string()),
    revokedAt: v.optional(v.string()),
    expiresAt: v.optional(v.string()),
  })
    .index("by_org", ["organizationId"])
    .index("by_token", ["token"])
    .index("by_org_email", ["organizationId", "invitedEmail"])
    .index("by_employee_user", ["employeeUserId"])
    .index("by_invited_email", ["invitedEmail"]),

  // Private HR notes — employer-authored, NEVER shown to the employee. No
  // employee-facing query in convex/employerInvites.ts ever reads this.
  org_employee_notes: defineTable({
    linkId: v.id("org_employee_links"),
    organizationId: v.id("organizations"),
    authorUserId: v.id("users"),
    note: v.string(),
    createdAt: v.string(),
  })
    .index("by_link", ["linkId"])
    .index("by_org", ["organizationId"]),

  // A minor (or any dependent with no VisaClear account of their own) that a
  // parent manages directly — no token/consent flow at all, since the
  // parent is the legal data controller for their own minor child. This is
  // deliberately NOT a users row: inventing an account for a child would
  // break every assumption tied to users.email (uniqueness, referral codes,
  // sign-in), so a lightweight sub-record the parent fully owns is simplest
  // and safest.
  managed_dependents: defineTable({
    parentUserId: v.id("users"),
    fullName: v.string(),
    relationship: v.string(),
    dateOfBirth: v.optional(v.string()),
    createdAt: v.string(),
  }).index("by_parent", ["parentUserId"]),

  // Audit trail for sensitive admin actions (plan/role changes, deletions,
  // agent verification) — who did what, to whom, when.
  admin_audit_log: defineTable({
    adminUserId: v.id("users"),
    adminEmail: v.optional(v.string()),
    action: v.string(),
    targetId: v.optional(v.string()),
    details: v.optional(v.string()),
    createdAt: v.string(),
  }).index("by_created", ["createdAt"]),

  // Admin Panel "Vendor Watch" (2026-07-19) — most vendor billing/plan state
  // (Vercel's plan tier, Convex's usage-tier ceiling, a domain registrar's
  // renewal date) has no API this app can read; it only exists on that
  // vendor's own dashboard. Rather than fake a live number, this just
  // records that a human checked it and when — one row per vendor, upserted
  // on each check. vendorKey/label/dashboardUrl are owned by the frontend
  // (src/pages/admin/panels/VendorWatchPanel.tsx), same precedent as
  // visa_status.jurisdiction and eu_renewal_checklist's document ids — this
  // table just stores whichever key string the frontend sends.
  vendor_checks: defineTable({
    vendorKey: v.string(),
    lastCheckedAt: v.string(),
    lastCheckedByAdminId: v.id("users"),
    note: v.optional(v.string()),
  }).index("by_vendorKey", ["vendorKey"]),

  // Added 2026-07-18. Every email in the app goes through the single
  // chokepoint convex/emails/sendEmail.ts — before this table existed, a
  // Resend failure (after retries) was only ever a console.error, with no
  // durable record and no way for an admin to know a real user's password
  // reset / email-change confirmation / invite never arrived. One row per
  // exhausted-retries failure; resolvedAt is set when an admin has reviewed
  // it (same reviewed/dismissed pattern as security_audit_logs).
  email_delivery_failures: defineTable({
    to: v.string(),
    subject: v.string(),
    errorMessage: v.string(),
    attempts: v.number(),
    resolvedAt: v.optional(v.string()),
    createdAt: v.string(),
  })
    .index("by_created", ["createdAt"])
    .index("by_resolved_created", ["resolvedAt", "createdAt"]),

  // Real-time in-app notifications for paid users (pro/expert) and active agents.
  // Created by cron dispatchers (document expiry, trip deadline, reminder due)
  // and the lead sentinel (marketplace_lead_alert for agents with stale leads).
  in_app_notifications: defineTable({
    userId: v.id("users"),
    type: v.union(
      v.literal("reminder_due"),
      v.literal("document_expiry"),
      v.literal("trip_deadline"),
      v.literal("marketplace_lead_alert"),
      v.literal("client_document_uploaded"),
    ),
    title: v.string(),
    body: v.string(),
    linkTo: v.optional(v.string()),
    read: v.boolean(),
    createdAt: v.string(),
  })
    .index("by_user", ["userId"])
    .index("by_user_read", ["userId", "read"]),

  // Per-user monthly count for the rejection analyser (uses gpt-4o, so more
  // expensive than mini). Expert-only feature but we still cap at 20/month as
  // a backstop — no legitimate user needs more than that per month.
  rejection_analyser_usage: defineTable({
    userId: v.id("users"),
    yearMonth: v.string(),
    count: v.number(),
  }).index("by_user_month", ["userId", "yearMonth"]),

  // Real thumbs up/down on the checklist AI Assistant's answers — previously
  // the buttons only updated local component state and showed a "thanks"
  // toast with nothing ever recorded. Records the actual question/answer
  // pair so a low rating is traceable back to what the AI actually said.
  ai_checklist_feedback: defineTable({
    userId: v.id("users"),
    question: v.string(),
    answer: v.string(),
    feedback: v.union(v.literal("up"), v.literal("down")),
    origin: v.string(),
    destination: v.string(),
    visaType: v.string(),
    createdAt: v.string(),
  })
    .index("by_user", ["userId"])
    .index("by_feedback", ["feedback"]),

  // An influencer or content creator who promotes VisaClear in exchange for
  // a 20% commission on the first month's subscription of every user they
  // attribute within a 90-day window. Separate from the peer-to-peer agent
  // referral system — different audience, different rate, different payout.
  influencer_codes: defineTable({
    code: v.string(),           // e.g. "MIKETALKS" — used in ?af=MIKETALKS URLs
    name: v.string(),           // Display name for admin panel
    email: v.string(),          // For payout contact
    commissionRate: v.number(), // 20 (percent of first month's payment)
    attributionWindowDays: v.number(), // 90 days
    portalToken: v.string(),    // Unguessable token for their private stats URL
    active: v.boolean(),
    notes: v.optional(v.string()),
    createdAt: v.string(),
    createdByUserId: v.id("users"),
  })
    .index("by_code", ["code"])
    .index("by_portal_token", ["portalToken"])
    .index("by_active", ["active"]),

  // Immutable ledger of commissions owed to influencers. One row per
  // qualifying first-month payment from a user they attributed. Status starts
  // "pending" and is manually flipped to "paid" by an admin once the payout
  // has been sent — no auto-transfer at this stage.
  influencer_commissions: defineTable({
    influencerCode: v.string(),
    referredUserId: v.id("users"),
    plan: v.union(v.literal("pro"), v.literal("expert")),
    subscriptionAmountCents: v.number(),
    commissionRatePercent: v.number(),
    commissionCents: v.number(),
    status: v.union(v.literal("pending"), v.literal("paid")),
    createdAt: v.string(),
    paidAt: v.optional(v.string()),
    paidByAdminId: v.optional(v.id("users")),
    paymentNotes: v.optional(v.string()),
  })
    .index("by_code", ["influencerCode"])
    .index("by_status", ["status"])
    .index("by_referred_user", ["referredUserId"]),

  // One row per user's active visa setup. Users enter this manually; VisaClear
  // uses it to drive the ILR countdown, absence limit rules, and doc readiness.
  visa_status: defineTable({
    userId: v.id("users"),
    jurisdiction: v.string(), // "uk_ilr" | "eu_ltr" | "de_nbe" | "fr_cr" | "nl_vvotd" | "other"
    visaType: v.string(),     // e.g. "Skilled Worker", "Student", "Family"
    hostCountry: v.string(),  // e.g. "United Kingdom", "Germany"
    grantDate: v.string(),    // ISO date "YYYY-MM-DD"
    expiryDate: v.string(),   // ISO date "YYYY-MM-DD"
    sponsorEmployer: v.optional(v.string()),
    notes: v.optional(v.string()),
    active: v.boolean(),
    createdAt: v.string(),
    updatedAt: v.string(),
    // ILR/settlement document checklist — real user-entered state, not a
    // computed placeholder. Each field here is something the user actually
    // confirmed, not inferred from elapsed time.
    passportExpiryDate: v.optional(v.string()),               // ISO date
    employmentRecordsConfirmedYears: v.optional(v.array(v.number())), // which qualifying years (1..N) the user has confirmed they hold records for
    travelLogConfirmedComplete: v.optional(v.boolean()),       // explicit "this is my full absence history" confirmation
    lifeInUkTestTaken: v.optional(v.boolean()),
    lifeInUkTestDate: v.optional(v.string()),
    englishQualificationConfirmed: v.optional(v.boolean()),
    englishQualificationType: v.optional(v.string()),          // e.g. "IELTS", "Degree taught in English"
  })
    .index("by_user", ["userId"])
    .index("by_user_active", ["userId", "active"]),

  // Every trip a user has logged for absence tracking. One row per trip.
  // daysAbsent is stored as a plain number so queries never re-derive dates.
  travel_trips: defineTable({
    userId: v.id("users"),
    destination: v.string(),       // Country name, e.g. "Nigeria"
    destinationEmoji: v.optional(v.string()), // flag emoji e.g. "🇳🇬"
    departureDate: v.string(),     // ISO "YYYY-MM-DD" (day user LEFT host country)
    returnDate: v.string(),        // ISO "YYYY-MM-DD" (day user RETURNED)
    daysAbsent: v.number(),        // computed at insert/update — (return - departure) in days
    purpose: v.optional(v.string()), // "Holiday", "Business", "Family", "Medical", "Other"
    notes: v.optional(v.string()),
    createdAt: v.string(),
    updatedAt: v.string(),
  })
    .index("by_user", ["userId"])
    .index("by_user_departure", ["userId", "departureDate"]),

  // The European Tracker's "Renewal Document Readiness" checklist — was
  // localStorage-only until 2026-07-19 (silently wiped on browser clear,
  // never synced across devices). Document IDs are defined and owned by the
  // frontend (src/pages/dashboard/european-tracker/page.tsx's
  // EU_DOCUMENT_CHECKLIST), same precedent as visa_status.jurisdiction —
  // this table just stores whichever ID strings the frontend sends, one row
  // per user.
  eu_renewal_checklist: defineTable({
    userId: v.id("users"),
    checkedDocumentIds: v.array(v.string()),
    updatedAt: v.string(),
  })
    .index("by_user", ["userId"]),

  // A content creator or YouTuber who promotes VisaClear via a clean URL
  // (visaclear.app/ref/creator-slug). Different from influencer_codes (?af=):
  // this system uses path-based URLs, tracks clicks, and pays 20% recurring for
  // 12 months per referred subscriber (vs influencer's 20% first month only).
  creator_codes: defineTable({
    slug: v.string(),              // URL slug: "mike-visa-coach"
    name: v.string(),              // Display name for admin panel
    email: v.string(),             // For payout contact
    commissionRatePercent: v.number(), // 20
    commissionMonths: v.number(),  // 12 — max months per subscriber (0 = no cap)
    portalToken: v.string(),       // Unguessable token for their private stats portal
    active: v.boolean(),
    notes: v.optional(v.string()),
    createdAt: v.string(),
    createdByUserId: v.id("users"),
    // Denormalized counters — incremented atomically in logClick/trackSignup
    // so getPortalStats never needs to count event rows (which would silently
    // truncate at scale once a popular creator exceeds the .take() limit).
    clickCount: v.optional(v.number()),
    signupCount: v.optional(v.number()),
  })
    .index("by_slug", ["slug"])
    .index("by_portal_token", ["portalToken"])
    .index("by_active", ["active"]),

  // A single click on a creator's /ref/:slug link. Deduped per sessionId so
  // refreshing the page doesn't inflate the count.
  creator_click_events: defineTable({
    creatorSlug: v.string(),
    sessionId: v.string(),   // random ID stored in sessionStorage
    createdAt: v.string(),
  })
    .index("by_slug", ["creatorSlug"])
    .index("by_slug_and_created", ["creatorSlug", "createdAt"]),

  // Immutable monthly commission ledger for creators. One row per billing month
  // per referred subscriber. monthsFromSignup (1–commissionMonths) enforces the
  // cap — if it equals commissionMonths no further rows are created for that user.
  creator_commissions: defineTable({
    creatorSlug: v.string(),
    referredUserId: v.id("users"),
    plan: v.union(v.literal("pro"), v.literal("expert")),
    billingMonth: v.string(),          // "YYYY-MM" e.g. "2026-08"
    subscriptionAmountCents: v.number(),
    commissionRatePercent: v.number(),
    commissionCents: v.number(),
    monthsFromSignup: v.number(),      // 1..commissionMonths cap check
    status: v.union(v.literal("pending"), v.literal("paid")),
    createdAt: v.string(),
    paidAt: v.optional(v.string()),
    paidByAdminId: v.optional(v.id("users")),
    paymentNotes: v.optional(v.string()),
  })
    .index("by_slug", ["creatorSlug"])
    .index("by_referred_user", ["referredUserId"])
    .index("by_status", ["status"])
    .index("by_slug_and_month", ["creatorSlug", "billingMonth"]),

  // Single-row denormalized counters for the admin dashboard. See
  // convex/platformStats.ts — never read with collect() across the real
  // tables, which would be a full scan at scale.
  platform_stats: defineTable({
    totalUsers: v.number(),
    totalChecklists: v.number(),
    totalAgents: v.number(),
    totalRejectionAnalyses: v.number(),
    proUsers: v.optional(v.number()),
    expertUsers: v.optional(v.number()),
    // Added 2026-07-18 so convex/admin.ts's getAIUsage never has to
    // collect() the full (unboundedly growing) user_daily_usage table just
    // to report an all-time total — see platformStats.ts for the bump site.
    totalAgentAIMessages: v.optional(v.number()),
    totalBusinessAIMessages: v.optional(v.number()),
    // Added 2026-07-18 so convex/systemHealth.ts's getSystemHealth never has
    // to take(5000) users / take(2000) agent_profiles on every reactive
    // re-run just to count two boolean flags — bumped from the single place
    // each flag is toggled (convex/securityAudit.ts adminTakeAction).
    suspendedUsersCount: v.optional(v.number()),
    leadAccessRevokedCount: v.optional(v.number()),
    // Added 2026-07-18, bumped from convex/emails/emailFailures.ts —
    // surfaced on the System Health score so a run of failed emails is a
    // live, scored signal rather than something only visible by opening the
    // Email Delivery admin tab and counting rows.
    unresolvedEmailFailuresCount: v.optional(v.number()),
  }),

  // Immutable idempotency log for payment webhooks. One row per processed
  // provider+reference pair. Paystack retries webhooks on timeout — this
  // table ensures the same charge.success event is never applied twice even
  // if the webhook fires multiple times. Never deleted.
  processed_webhook_events: defineTable({
    provider: v.string(),    // "paystack" (future: "stripe")
    reference: v.string(),   // Paystack reference or Stripe event ID
    processedAt: v.string(),
  }).index("by_provider_reference", ["provider", "reference"]),

  // ── Case Intelligence ──────────────────────────────────────────────────────
  // Computed readiness snapshot per client intake. Refreshed by the agent on
  // demand; never stale-read for scoring decisions — always re-run from current
  // document state. One row per intake (upserted, not appended).
  case_readiness: defineTable({
    agentId: v.id("users"),
    intakeId: v.id("client_intakes"),
    score: v.number(),           // 0–100
    uploadedCount: v.number(),
    requiredCount: v.number(),
    criticalCount: v.number(),
    mediumCount: v.number(),
    recommendCount: v.number(),
    fraudSignalCount: v.number(),
    aiAnalysisRunAt: v.optional(v.string()),
    computedAt: v.string(),
  })
    .index("by_intake", ["intakeId"])
    .index("by_agent", ["agentId"])
    .index("by_agent_score", ["agentId", "score"]),

  // Per-intake fix items — generated by computeReadiness (for document gaps)
  // and by the AI analysis action (for consistency/fraud issues). Deleted and
  // regenerated on each fresh run so the list is always current.
  case_fix_items: defineTable({
    agentId: v.id("users"),
    intakeId: v.id("client_intakes"),
    severity: v.union(v.literal("critical"), v.literal("medium"), v.literal("recommend")),
    category: v.union(
      v.literal("missing_document"),
      v.literal("stale_intake"),
      v.literal("no_documents"),
      v.literal("consistency"),
      v.literal("fraud"),
      v.literal("ai_suggestion"),
    ),
    title: v.string(),
    description: v.string(),
    action: v.string(),
    resolvedAt: v.optional(v.string()),
  })
    .index("by_intake", ["intakeId"])
    .index("by_agent", ["agentId"])
    .index("by_intake_severity", ["intakeId", "severity"]),

  // Cross-document field comparisons generated by the AI analysis action.
  // Deleted and regenerated on each AI analysis run for this intake.
  document_consistency_checks: defineTable({
    agentId: v.id("users"),
    intakeId: v.id("client_intakes"),
    fieldName: v.string(),
    sourceDoc: v.string(),
    sourceValue: v.string(),
    targetDoc: v.string(),
    targetValue: v.string(),
    status: v.union(v.literal("match"), v.literal("mismatch"), v.literal("similar")),
    generatedAt: v.string(),
  })
    .index("by_intake", ["intakeId"])
    .index("by_agent", ["agentId"]),

  // AI-detected fraud pattern signals per document per intake.
  // Deleted and regenerated on each AI analysis run for this intake.
  fraud_signals: defineTable({
    agentId: v.id("users"),
    intakeId: v.id("client_intakes"),
    documentLabel: v.string(),
    signalType: v.string(),
    detail: v.string(),
    confidence: v.number(),  // 0–1
    severity: v.union(v.literal("high"), v.literal("medium"), v.literal("low")),
    reviewedAt: v.optional(v.string()),
    generatedAt: v.string(),
  })
    .index("by_intake", ["intakeId"])
    .index("by_agent", ["agentId"])
    .index("by_severity", ["severity"]),

  // AI-generated cover letter per intake + visa route. The agent edits the
  // generated content in-browser; editedContent holds their saved version.
  cover_letters: defineTable({
    agentId: v.id("users"),
    intakeId: v.id("client_intakes"),
    visaRoute: v.string(),
    generatedContent: v.string(),
    editedContent: v.optional(v.string()),
    issuesAddressed: v.array(v.string()),
    generatedAt: v.string(),
    updatedAt: v.optional(v.string()),
  })
    .index("by_intake", ["intakeId"])
    .index("by_agent", ["agentId"]),

  // Per-slug daily visit counter for the partner referral system. Caps
  // unauthenticated "visit" recording at 500 events per slug per day —
  // same backstop pattern as photo_check_daily_usage. One row per (slug,
  // date); rows accumulate and are never deleted (they're small and
  // serve as a permanent traffic log).
  partner_slug_daily_events: defineTable({
    slug: v.string(),
    dateKey: v.string(),  // "YYYY-MM-DD"
    count: v.number(),
  }).index("by_slug_date", ["slug", "dateKey"]),

  // One row per qualifying payment from a client an agent referred — 15% of
  // a Pro payment, 20% of an Expert payment, logged as an immutable ledger
  // entry (not a mutable running counter) so the commission total is always
  // recomputable and auditable. See convex/agentReferralCommissions.ts for
  // where these are created and convex/agents.ts's getMyProfile-adjacent
  // dashboard query for how they're summarized for the agent.
  agent_referral_commissions: defineTable({
    agentUserId: v.id("users"),
    payingUserId: v.id("users"),
    plan: v.union(v.literal("pro"), v.literal("expert")),
    billingCycle: v.union(v.literal("monthly"), v.literal("yearly")),
    paymentAmountCents: v.number(),
    commissionRatePercent: v.number(),
    commissionCents: v.number(),
    createdAt: v.string(),
  })
    .index("by_agent", ["agentUserId"])
    .index("by_paying_user", ["payingUserId"]),

  // An applicant's open visa-help request, visible to all verified agents in
  // the marketplace. Contact details are masked until an agent pays credits
  // to unlock — the unlock is recorded in marketplace_lead_unlocks.
  // unlockCost is set server-side at submission time from the UNLOCK_COSTS
  // constant in marketplace.ts — never accepted from the client.
  marketplace_leads: defineTable({
    userId: v.id("users"),
    visaType: v.string(),
    destinationCountry: v.string(),
    urgencyLevel: v.union(
      v.literal("urgent"),
      v.literal("standard"),
      v.literal("exploring"),
    ),
    additionalNotes: v.optional(v.string()),
    status: v.union(v.literal("open"), v.literal("closed")),
    unlockCost: v.number(),
    createdAt: v.string(),
    // Set by the lead sentinel cron after agents are notified about this stale lead.
    // Prevents duplicate sentinel notifications on subsequent cron runs.
    sentinelNotifiedAt: v.optional(v.string()),
    // Only set when the lead was auto-created from a Rejection Analyser session
    // with explicit GDPR consent — lets admins/agents distinguish organic from
    // auto-generated leads in the marketplace.
    leadSource: v.optional(v.literal("rejection_analyser")),
    applicantNationality: v.optional(v.string()),
  })
    .index("by_user", ["userId"])
    .index("by_user_and_status", ["userId", "status"])
    .index("by_status", ["status"])
    .index("by_created", ["createdAt"]),

  // Immutable unlock ledger — one row per (agent, lead) pair. Never deleted.
  // The agent's credit balance is debited atomically in the same mutation
  // that inserts this row so the two can never diverge.
  marketplace_lead_unlocks: defineTable({
    leadId: v.id("marketplace_leads"),
    agentUserId: v.id("users"),
    creditsSpent: v.number(),
    unlockedAt: v.string(),
  })
    .index("by_lead", ["leadId"])
    .index("by_agent", ["agentUserId"])
    .index("by_lead_and_agent", ["leadId", "agentUserId"]),

  // Immutable credit acquisition ledger. agent_profiles.creditBalance is
  // derived from this plus marketplace_lead_unlocks — kept in sync atomically,
  // never recomputed from a collect() scan in hot paths.
  agent_credit_purchases: defineTable({
    agentUserId: v.id("users"),
    creditsAdded: v.number(),
    amountPaidCents: v.number(),
    currency: v.string(),
    source: v.union(
      v.literal("paystack"),
      v.literal("stripe"),
      v.literal("admin_grant"),
    ),
    providerReference: v.optional(v.string()),
    grantedByUserId: v.optional(v.id("users")),
    notes: v.optional(v.string()),
    createdAt: v.string(),
  }).index("by_agent", ["agentUserId"]),

  // One row per destination — the live, admin-editable override of the static
  // LAST_VERIFIED_DATES in visa-data.ts. When an admin clicks "Mark Reviewed"
  // in the Data Freshness panel, this row is upserted with today's date and
  // the verifying admin's userId. getFreshnessReport uses this table first,
  // falling back to the static seed date for any destination not yet reviewed.
  visa_freshness: defineTable({
    destination: v.string(),
    lastVerified: v.string(),       // ISO date "YYYY-MM-DD"
    verifiedByUserId: v.id("users"),
    verifiedAt: v.string(),         // ISO datetime
  }).index("by_destination", ["destination"]),

  // One row per marketplace search event. Used to calculate per-agent
  // demand signals ("X applicants searched your routes this month").
  // Global daily write cap enforced in logSearchEvent to prevent abuse.
  agent_search_events: defineTable({
    destination: v.optional(v.string()),
    visaType: v.optional(v.string()),
    sessionId: v.string(),
    createdAt: v.string(),
  })
    .index("by_created", ["createdAt"])
    .index("by_visa_type_created", ["visaType", "createdAt"]),

  // Global daily backstop for agent_search_events. Same pattern as
  // photo_check_daily_usage — caps total event inserts per day.
  agent_search_daily_usage: defineTable({
    dateKey: v.string(),
    count: v.number(),
  }).index("by_date", ["dateKey"]),

  // Per-user per-resource daily write cap. One row per (user, resource, date).
  // Keyed by dateKey ("YYYY-MM-DD") so rows expire naturally — nothing to clean
  // up, and a user who posts on day 1 starts fresh on day 2.
  user_daily_usage: defineTable({
    userId: v.id("users"),
    resource: v.string(),    // e.g. "community_post", "wall_of_fame", "vault_upload", "checklist_save"
    dateKey: v.string(),     // "YYYY-MM-DD"
    count: v.number(),
  })
    .index("by_user_resource_date", ["userId", "resource", "dateKey"])
    // Added 2026-07-18 for convex/admin.ts's getAIUsage — lets the admin
    // panel's 7-day trend/top-users breakdown query "every row for resource
    // X on day Y" directly via index (bounded by that day's real usage),
    // instead of collect()-ing the whole table's history and filtering in JS.
    .index("by_resource_date", ["resource", "dateKey"]),

  // Agent payout requests. One row per withdrawal request; status flows
  // pending → paid (or declined) when an admin processes it. The available
  // balance is derived at query-time by summing agent_referral_commissions
  // minus all paid payout_requests for the same agent — never a mutable counter,
  // so the ledger is always auditable.
  payout_requests: defineTable({
    agentUserId: v.id("users"),
    amountCents: v.number(),
    status: v.union(
      v.literal("pending"),
      v.literal("paid"),
      v.literal("declined"),
    ),
    requestedAt: v.string(),
    notes: v.optional(v.string()),
    adminNotes: v.optional(v.string()),
    processedAt: v.optional(v.string()),
    processedByUserId: v.optional(v.id("users")),
  })
    .index("by_agent", ["agentUserId"])
    .index("by_status", ["status"])
    .index("by_agent_status", ["agentUserId", "status"]),

  // Security audit log — immutable, internal-write-only. Stores the userId of
  // the actor (not tokenIdentifier — userId is the stable FK for our schema).
  // Never exposed via a public query; admin reads go through getSecurityAuditLog.
  security_audit_logs: defineTable({
    actorUserId: v.id("users"),
    action: v.string(),
    severity: v.union(
      v.literal("info"),
      v.literal("warn"),
      v.literal("critical"),
    ),
    resourceType: v.optional(v.string()),
    resourceId: v.optional(v.string()),
    metadata: v.optional(v.string()),
    createdAt: v.string(),
  })
    .index("by_actor", ["actorUserId"])
    .index("by_action", ["action"])
    .index("by_created", ["createdAt"]),

  security_threat_actions: defineTable({
    eventId: v.optional(v.id("security_audit_logs")),
    actorUserId: v.id("users"),
    adminId: v.id("users"),
    action: v.union(
      v.literal("reviewed"),
      v.literal("dismissed"),
      v.literal("note_added"),
      v.literal("user_suspended"),
      v.literal("user_unsuspended"),
      v.literal("leads_revoked"),
      v.literal("leads_restored"),
    ),
    notes: v.optional(v.string()),
    createdAt: v.string(),
  })
    .index("by_event", ["eventId"])
    .index("by_actor", ["actorUserId"])
    .index("by_admin", ["adminId"])
    .index("by_created", ["createdAt"]),

  // Corridor-level policy alert subscriptions — public, no-sign-in, deduped
  // per email+corridor. Keyed by email+origin+destination+visaType so a user
  // can subscribe to multiple corridors without duplicates.
  corridor_alert_subscriptions: defineTable({
    email: v.string(),
    origin: v.string(),
    destination: v.string(),
    visaType: v.string(),
    subscribedAt: v.string(),
  })
    .index("by_email_and_corridor", ["email", "origin", "destination", "visaType"])
    .index("by_corridor", ["origin", "destination", "visaType"]),

  // Same backstop pattern as contact_daily_usage, for the public corridor
  // alert subscription mutation.
  corridor_alert_daily_usage: defineTable({
    dateKey: v.string(),
    count: v.number(),
  }).index("by_date", ["dateKey"]),

  // Daily profile view counter per agent. One row per (agentProfileId, dateKey).
  // Incremented on every public profile page load; capped at 10k/day per agent
  // to prevent abuse. The daily bucket pattern avoids unbounded row growth
  // (one row per day instead of one per view) and lets us sum ranges cheaply.
  agent_profile_views: defineTable({
    agentProfileId: v.id("agent_profiles"),
    dateKey: v.string(),
    count: v.number(),
  }).index("by_agent_and_date", ["agentProfileId", "dateKey"]),

  // Anonymised rejection intelligence — one row per Rejection Analyser run.
  // No personal data, no letter text. Accumulated over time to surface which
  // corridors and refusal codes are most common, giving VisaClear proprietary
  // pattern data no competitor can buy.
  rejection_patterns: defineTable({
    corridor: v.string(),        // "ghana-united-kingdom"
    origin: v.string(),          // "Ghana"
    destination: v.string(),     // "United Kingdom"
    visaType: v.string(),
    refusalCodes: v.array(v.string()),
    missingDocumentCategories: v.array(v.string()),
    successProbability: v.number(),
    analysedAt: v.string(),
  })
    .index("by_corridor", ["corridor"])
    .index("by_destination_visatype", ["destination", "visaType"])
    .index("by_analysed", ["analysedAt"]),

  // User-submitted flags on checklist requirements that may be outdated or
  // wrong. Anonymous at the db level (no userId stored) so the user feels
  // safe reporting without fear of being identified. Admin reviews and either
  // marks as "reviewed" (fix committed) or "dismissed" (not actionable).
  checklist_flags: defineTable({
    corridor: v.string(),
    origin: v.string(),
    destination: v.string(),
    visaType: v.string(),
    requirementTitle: v.optional(v.string()),  // which specific item was flagged
    issueType: v.union(
      v.literal("requirement_changed"),
      v.literal("link_broken"),
      v.literal("missing_information"),
      v.literal("incorrect_information"),
    ),
    notes: v.optional(v.string()),
    submittedAt: v.string(),
    status: v.union(v.literal("pending"), v.literal("reviewed"), v.literal("dismissed")),
    reviewedAt: v.optional(v.string()),
    reviewedByUserId: v.optional(v.id("users")),
  })
    .index("by_status", ["status"])
    .index("by_corridor", ["corridor"])
    .index("by_submitted", ["submittedAt"]),

  // Client-written star ratings for agent profiles. Each authenticated user
  // may submit one review per agent; reviews go to "pending" and only show
  // publicly after admin approval. Rating/reviewCount on agent_profiles are
  // updated atomically when a review is approved.
  agent_reviews: defineTable({
    agentProfileId: v.id("agent_profiles"),
    reviewerUserId: v.id("users"),
    starRating: v.number(),             // 1–5 integer
    comment: v.optional(v.string()),    // max 500 chars, optional
    createdAt: v.string(),
    status: v.union(v.literal("pending"), v.literal("approved"), v.literal("rejected")),
  })
    .index("by_agent_status", ["agentProfileId", "status"])
    .index("by_reviewer_agent", ["reviewerUserId", "agentProfileId"])
    .index("by_status", ["status"]),

  // User-filed quality flags on agent profiles. Anonymous reports are allowed
  // (reportedByUserId is optional) so users who haven't signed in can still
  // flag a scam agent. Admin reviews and either acts or dismisses.
  agent_reports: defineTable({
    agentProfileId: v.id("agent_profiles"),
    reportedByUserId: v.optional(v.id("users")),
    reason: v.union(
      v.literal("fake_credentials"),
      v.literal("inappropriate_behavior"),
      v.literal("scam"),
      v.literal("misleading_information"),
      v.literal("other"),
    ),
    details: v.optional(v.string()),  // max 1000 chars
    createdAt: v.string(),
    status: v.union(v.literal("pending"), v.literal("reviewed"), v.literal("dismissed")),
  })
    .index("by_agent", ["agentProfileId"])
    .index("by_status", ["status"]),

  // Per-destination hash of the official embassy page's stripped text content.
  // A weekly cron compares the live page against the stored hash; if it
  // changes, changedAt is set and the admin sees an alert. Admin dismisses
  // alerts after reviewing and updating the checklist if needed.
  //
  // textSnapshot/aiSummary/aiSeverity/aiChangeAdded/aiChangeRemoved power the
  // "Operation Room" view: textSnapshot is the current page's real stripped
  // text (overwritten each check, so next time it changes we have real "old"
  // text to diff against). aiChangeAdded/Removed are the actual sentences
  // that differed — computed by exact comparison, never invented — and
  // aiSummary/aiSeverity are an OpenAI-generated read of THAT REAL diff
  // (grounded in aiChangeAdded/Removed only, not the full page). All four are
  // set only when a real change is detected; a fetch/AI failure never blocks
  // the underlying hash-diff monitoring itself.
  embassy_page_snapshots: defineTable({
    destination: v.string(),              // "United Kingdom", etc.
    url: v.string(),                      // official embassy URL we monitor
    contentHash: v.string(),              // SHA-256 of stripped text content
    lastCheckedAt: v.string(),            // ISO datetime of last successful fetch
    changedAt: v.optional(v.string()),    // when hash last changed (alert trigger)
    previousHash: v.optional(v.string()), // hash before the change
    alertDismissedAt: v.optional(v.string()), // admin reviewed this change
    textSnapshot: v.optional(v.string()),
    aiSummary: v.optional(v.string()),
    aiSeverity: v.optional(v.union(v.literal("critical"), v.literal("notable"))),
    aiChangeAdded: v.optional(v.array(v.string())),
    aiChangeRemoved: v.optional(v.array(v.string())),
  })
    .index("by_destination", ["destination"])
    .index("by_changed", ["changedAt"]),

  // Real visa approval stories from paid members — moderated by admin before
  // going public. Deliberately lightweight (no name, no photo, no userId in
  // published queries) so it reads as a trust signal, not a testimonials wall.
  approval_stories: defineTable({
    origin: v.string(),
    destination: v.string(),
    visaType: v.string(),
    corridor: v.string(),
    attempts: v.union(v.literal(1), v.literal(2), v.literal(3)),
    shortNote: v.optional(v.string()),  // max 120 chars
    submittedAt: v.string(),
    status: v.union(v.literal("pending"), v.literal("approved"), v.literal("rejected")),
    moderatedAt: v.optional(v.string()),
    moderatedByUserId: v.optional(v.id("users")),
    submittedByUserId: v.optional(v.id("users")),
  })
    .index("by_status", ["status"])
    .index("by_corridor_status", ["corridor", "status"])
    .index("by_submitted", ["submittedAt"])
    .index("by_submitter", ["submittedByUserId"]),
});
