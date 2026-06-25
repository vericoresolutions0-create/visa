import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  users: defineTable({
    tokenIdentifier: v.string(),
    name: v.optional(v.string()),
    email: v.optional(v.string()),
    phone: v.optional(v.string()),
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
  })
    .index("by_token", ["tokenIdentifier"])
    .index("by_role", ["role"])
    .index("by_referral_code", ["referralCode"])
    .index("by_plan", ["plan"]),

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
  })
    .index("by_user", ["userId"])
    .index("by_user_archived", ["userId", "archived"]),

  vault_documents: defineTable({
    userId: v.id("users"),
    category: v.union(
      v.literal("identity"),
      v.literal("financial"),
      v.literal("employment"),
      v.literal("travel"),
      v.literal("education"),
      v.literal("photo"),
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
    .index("by_user_category", ["userId", "category"]),

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

  reminders: defineTable({
    userId: v.id("users"),
    checklistId: v.optional(v.id("saved_checklists")),
    title: v.string(),
    note: v.optional(v.string()),
    dueDate: v.string(),
    email: v.string(),
    sent: v.boolean(),
    createdAt: v.string(),
  })
    .index("by_user", ["userId"])
    .index("by_due_date", ["dueDate"]),

  rejection_analyses: defineTable({
    userId: v.id("users"),
    destination: v.string(),
    visaType: v.string(),
    refusalText: v.string(),
    analysis: v.string(),
    recoveryPlan: v.string(),
    createdAt: v.string(),
  }).index("by_user", ["userId"]),

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
    verified: v.boolean(),
    rating: v.optional(v.number()),
    reviewCount: v.optional(v.number()),
    createdAt: v.string(),
  }).index("by_user", ["userId"]),
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
    destination: v.string(),
    visaType: v.string(),
    status: v.union(
      v.literal("awaiting_documents"),
      v.literal("documents_received"),
      v.literal("in_review"),
      v.literal("complete"),
    ),
    claimedByUserId: v.optional(v.id("users")),
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
    uploadedByUserId: v.id("users"),
    uploadedAt: v.string(),
  }).index("by_intake", ["intakeId"]),

  // Platform-wide daily backstop for ai/photoChecker.ts, which is an
  // intentionally open, no-sign-in-required guest feature. There's no user
  // to gate by, so this caps total daily spend if it's ever scraped/scripted.
  photo_check_daily_usage: defineTable({
    dateKey: v.string(),
    count: v.number(),
  }).index("by_date", ["dateKey"]),

  // Single-row denormalized counters for the admin dashboard. See
  // convex/platformStats.ts — never read with collect() across the real
  // tables, which would be a full scan at scale.
  platform_stats: defineTable({
    totalUsers: v.number(),
    totalChecklists: v.number(),
    totalAgents: v.number(),
    totalRejectionAnalyses: v.number(),
  }),
});
