export const SPECIALISATIONS = ["Tourist / Visit", "Student", "Work", "Family / Spouse", "Business", "Transit", "Asylum", "Investor"];
export const LANGUAGES_LIST = ["English", "French", "Polish", "German", "Spanish", "Arabic", "Hausa", "Yoruba", "Igbo", "Swahili", "Hindi", "Tagalog"];

export type AgentPlanId =
  | "agent_listing"
  | "agent_featured"
  | "agency_white_label";

export type BillingCycle = "monthly" | "yearly";

export type AgentPlan = {
  id: AgentPlanId;
  name: string;
  badge: string;
  monthlyPrice: number;
  yearlyPrice: number;
  description: string;
  audience: string;
  leadTarget: string;
  features: string[];
  cta: string;
  highlight: boolean;
};

export const AGENT_PLANS: AgentPlan[] = [
  {
    id: "agent_listing",
    name: "Verified Listing",
    badge: "Start here",
    monthlyPrice: 29,
    yearlyPrice: 290,
    description:
      "A verified profile, trust badge, and direct applicant enquiries for solo consultants.",
    audience: "Solo consultants",
    leadTarget: "Direct enquiries from applicants looking for help on your routes",
    features: [
      "Verified partner profile",
      "Listed in the VisaClear marketplace",
      "Direct applicant contact requests",
      "Basic dashboard and follow-up tools",
    ],
    cta: "Start verified listing",
    highlight: false,
  },
  {
    id: "agent_featured",
    name: "Featured Placement",
    badge: "Growth plan",
    monthlyPrice: 79,
    yearlyPrice: 790,
    description:
      "Priority marketplace visibility for agents who want more qualified demand.",
    audience: "Growing agencies",
    leadTarget: "More enquiries through priority placement in search results",
    features: [
      "Everything in Verified Listing",
      "Featured ranking in priority routes",
      "Enhanced trust and conversion signals",
      "Lead intent notes from applicant checklists",
    ],
    cta: "Get featured",
    highlight: true,
  },
  {
    id: "agency_white_label",
    name: "Agency White-Label",
    badge: "By application",
    monthlyPrice: 149,
    yearlyPrice: 1490,
    description:
      "A branded workspace for agencies that want to run VisaClear under their own identity — hand-built per partner, not self-serve yet.",
    audience: "Multi-consultant teams",
    leadTarget: "Custom client volume",
    features: [
      "White-label applicant experience",
      "Advanced agent dashboard",
      "Team-ready client workflows",
      "Priority onboarding and support",
    ],
    cta: "Apply for white-label",
    highlight: false,
  },
];

export function getAgentPlan(planId: string | null | undefined) {
  return (
    AGENT_PLANS.find((plan) => plan.id === planId) ?? AGENT_PLANS[0]
  );
}

export function getAgentPlanPrice(plan: AgentPlan, billing: BillingCycle) {
  return billing === "yearly" ? plan.yearlyPrice : plan.monthlyPrice;
}
