// Deterministic, rule-based approval-likelihood estimate — NOT an AI call.
// A predictive score that changed answer-to-answer or run-to-run would be
// actively misleading for something people screenshot and share, so this
// is a fixed rubric: same answers always produce the same score and the
// same explanation. It is explicitly framed everywhere as guidance based
// on common approval factors, never as an official or guaranteed outcome.

export type RiskScoreCategory =
  | "income"
  | "savings"
  | "bankStatementMonths"
  | "travelHistory"
  | "employmentTies"
  | "propertyAssets"
  | "priorRefusals";

export type RiskScoreOption = {
  value: string;
  label: string;
  points: number;
  // Shown only if this option ends up among the lowest-scoring categories.
  feedback: string;
};

export type RiskScoreQuestion = {
  category: RiskScoreCategory;
  question: string;
  maxPoints: number;
  options: RiskScoreOption[];
};

export const RISK_SCORE_QUESTIONS: RiskScoreQuestion[] = [
  {
    category: "income",
    question: "What is your monthly income (or your sponsor's, in USD equivalent)?",
    maxPoints: 15,
    options: [
      { value: "under_300", label: "Under $300", points: 2, feedback: "Your stated monthly income is on the lower end of what embassies typically expect — a sponsor letter or additional proof of funds can help offset this." },
      { value: "300_800", label: "$300 – $800", points: 6, feedback: "Your income is modest relative to what's typically expected — pairing it with strong savings or a sponsor can strengthen your case." },
      { value: "800_2000", label: "$800 – $2,000", points: 11, feedback: "Your income is reasonable but not a standout strength in your application." },
      { value: "2000_5000", label: "$2,000 – $5,000", points: 14, feedback: "Your income is a solid part of your application." },
      { value: "5000_plus", label: "$5,000+", points: 15, feedback: "Your income is a strong part of your application." },
    ],
  },
  {
    category: "savings",
    question: "How much do you have in savings available for this trip (USD equivalent)?",
    maxPoints: 15,
    options: [
      { value: "under_500", label: "Under $500", points: 2, feedback: "Your available savings are low relative to typical visa expectations — this is often one of the first things officers check." },
      { value: "500_2000", label: "$500 – $2,000", points: 6, feedback: "Your savings are on the lower side for most visa routes — building this up before applying can meaningfully help." },
      { value: "2000_5000", label: "$2,000 – $5,000", points: 10, feedback: "Your savings are reasonable but could be stronger." },
      { value: "5000_15000", label: "$5,000 – $15,000", points: 13, feedback: "Your savings are a solid strength in your application." },
      { value: "15000_plus", label: "$15,000+", points: 15, feedback: "Your savings are a strong part of your application." },
    ],
  },
  {
    category: "bankStatementMonths",
    question: "How many months of consistent bank statements can you show?",
    maxPoints: 10,
    options: [
      { value: "under_1", label: "Less than 1 month", points: 1, feedback: "Most visa routes expect at least 3 months of consistent bank statements — a freshly funded account is a common rejection trigger." },
      { value: "1_2", label: "1 – 2 months", points: 4, feedback: "Most visa routes expect 3+ months of statements — yours is shorter than typically advised." },
      { value: "3", label: "3 months", points: 7, feedback: "3 months meets the common minimum, though some routes prefer 6." },
      { value: "4_6", label: "4 – 6 months", points: 9, feedback: "Your statement history is solid for most routes." },
      { value: "6_plus", label: "6+ months", points: 10, feedback: "Your statement history is a strength in your application." },
    ],
  },
  {
    category: "travelHistory",
    question: "What is your international travel history?",
    maxPoints: 15,
    options: [
      { value: "none", label: "Never travelled internationally", points: 4, feedback: "Having no prior international travel means officers have no track record to rely on, which adds scrutiny — strong ties and financial proof matter even more for you." },
      { value: "issues", label: "Travelled before, but overstayed or had an issue", points: 0, feedback: "A past overstay or compliance issue is one of the most heavily weighted negative factors in any visa decision — addressing this directly in your cover letter is important." },
      { value: "1_2_clean", label: "1–2 countries, no issues", points: 9, feedback: "Some clean travel history helps, though more would strengthen your case further." },
      { value: "3_plus_clean", label: "3+ countries, no issues", points: 15, feedback: "Your travel history is a strength in your application." },
    ],
  },
  {
    category: "employmentTies",
    question: "What is your current employment status?",
    maxPoints: 15,
    options: [
      { value: "unemployed", label: "Unemployed, not studying", points: 2, feedback: "Without employment or study, officers often see a weaker case for why you'd return home — strong financial and family ties become more important to document." },
      { value: "student", label: "Student", points: 8, feedback: "Being enrolled in study is a reasonable tie, though it carries less weight than stable employment." },
      { value: "self_employed", label: "Self-employed / business owner", points: 10, feedback: "Self-employment is a real tie, but officers may want to see clearer business registration and tax records." },
      { value: "employed", label: "Employed full-time", points: 13, feedback: "Stable employment is a solid tie to your home country." },
      { value: "employed_business", label: "Employed full-time and own a business", points: 15, feedback: "Strong, well-documented employment ties." },
    ],
  },
  {
    category: "propertyAssets",
    question: "Do you own property or have significant assets in your home country?",
    maxPoints: 10,
    options: [
      { value: "none", label: "No property or significant assets", points: 2, feedback: "No property or major assets means one less reason for officers to be confident you'll return — family and employment ties matter more for you." },
      { value: "some", label: "Some assets (vehicle, savings account)", points: 5, feedback: "Modest assets help a little, but property ownership carries more weight." },
      { value: "property", label: "Own property or significant assets", points: 10, feedback: "Property and asset ownership is a strong tie to your home country." },
    ],
  },
  {
    category: "priorRefusals",
    question: "Have you ever been refused a visa before (any country)?",
    maxPoints: 20,
    options: [
      { value: "never", label: "Never refused", points: 20, feedback: "A clean visa history is a real strength." },
      { value: "once_addressed", label: "Refused once, and I know exactly why and have fixed it", points: 10, feedback: "A past refusal is visible to officers — clearly addressing the stated reason in a cover letter is essential, and you've already identified it." },
      { value: "once_unclear", label: "Refused once, but I'm not fully sure why", points: 5, feedback: "A past refusal you can't clearly explain is a real risk — getting the refusal letter properly analysed before reapplying matters a lot here." },
      { value: "multiple", label: "Refused more than once", points: 0, feedback: "Multiple refusals significantly raise scrutiny on any new application — a clear, documented explanation of what's changed since the last refusal is critical." },
    ],
  },
];

export type RiskScoreAnswers = Partial<Record<RiskScoreCategory, string>>;

export type RiskScoreFactor = {
  category: RiskScoreCategory;
  question: string;
  selectedLabel: string;
  feedback: string;
  earnedPoints: number;
  maxPoints: number;
};

export type RiskScoreResult = {
  rawScore: number;
  displayScore: number;
  factors: RiskScoreFactor[];
  topWeakFactors: RiskScoreFactor[];
};

const MIN_DISPLAY_SCORE = 8;
const MAX_DISPLAY_SCORE = 93;

export function computeRiskScore(answers: RiskScoreAnswers): RiskScoreResult {
  const factors: RiskScoreFactor[] = RISK_SCORE_QUESTIONS.map((q) => {
    const selectedValue = answers[q.category];
    const option = q.options.find((o) => o.value === selectedValue) ?? q.options[0];
    return {
      category: q.category,
      question: q.question,
      selectedLabel: option.label,
      feedback: option.feedback,
      earnedPoints: selectedValue ? option.points : 0,
      maxPoints: q.maxPoints,
    };
  });

  const rawScore = factors.reduce((sum, f) => sum + f.earnedPoints, 0);
  const displayScore = Math.min(MAX_DISPLAY_SCORE, Math.max(MIN_DISPLAY_SCORE, rawScore));

  const topWeakFactors = [...factors]
    .sort((a, b) => a.earnedPoints / a.maxPoints - b.earnedPoints / b.maxPoints)
    .slice(0, 3);

  return { rawScore, displayScore, factors, topWeakFactors };
}

export function isAnswersComplete(answers: RiskScoreAnswers): boolean {
  return RISK_SCORE_QUESTIONS.every((q) => Boolean(answers[q.category]));
}
