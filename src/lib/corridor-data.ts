import { DESTINATION_FLAGS } from "@/lib/destination-flags.ts";
import { WORLD_DESTINATIONS } from "@/lib/countries.ts";

// ── Slug utilities ──────────────────────────────────────────────────────────

export function countryToSlug(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

export function slugToCountry(slug: string): string | undefined {
  return WORLD_DESTINATIONS.find((c) => countryToSlug(c) === slug);
}

export function countryFlag(name: string): string {
  return DESTINATION_FLAGS[name] ?? "🌍";
}

// ── Types ───────────────────────────────────────────────────────────────────

export interface CorridorRequirement {
  name: string;
  description: string;
  tag: "required" | "advisable" | "watch";
}

export interface CorridorTimelineStep {
  phase: string;
  duration: string;
  description: string;
}

export interface CostItem {
  label: string;
  amountMin: number;
  amountMax: number;
  note?: string;
  optional?: boolean;
}

export interface CorridorVisaType {
  slug: string;
  name: string;
  shortName: string;
  outcome: "permanent_residence" | "temporary_work" | "study" | "visit" | "entrepreneur";
  processingTime: string;
  approvalRate: string;
  duration: string;
  fee: string;
  minIncome?: string;
  minScore?: string;
  requirements: CorridorRequirement[];
  timeline: CorridorTimelineStep[];
  costs: { items: CostItem[]; currency: string; currencySymbol: string };
  faqs: Array<{ q: string; a: string }>;
  commonMistakes: string[];
  legalBasis?: string;
  lastVerified: string;
}

export interface CorridorDefinition {
  origin: string;
  originFlag: string;
  destination: string;
  destinationFlag: string;
  visaTypes: CorridorVisaType[];
}

// Keyed by "originSlug/destinationSlug"
type CorridorMap = Record<string, CorridorDefinition>;

// ── Corridor data ───────────────────────────────────────────────────────────
// Data verified against official government sources. Fees and processing times
// are accurate as at mid-2025 and should be re-checked before each policy
// update cycle. Admin can mark corridors re-verified in the Data Freshness panel.

const CORRIDORS: CorridorMap = {

  // ── Nigeria → Canada ──────────────────────────────────────────────────────
  "nigeria/canada": {
    origin: "Nigeria",
    originFlag: "🇳🇬",
    destination: "Canada",
    destinationFlag: "🇨🇦",
    visaTypes: [
      {
        slug: "express-entry",
        name: "Express Entry — Federal Skilled Worker",
        shortName: "Express Entry",
        outcome: "permanent_residence",
        processingTime: "~6 months after ITA",
        approvalRate: "82%",
        duration: "Permanent Residence",
        fee: "CAD $1,365 + CAD $1,325 RPRF",
        minScore: "470–520 CRS (recent draws)",
        legalBasis: "IRPA s.12(2) / FSWP Reg. SOR/2002-227",
        lastVerified: "2025-07-01",
        requirements: [
          { name: "Nigerian passport (valid 6+ months)", description: "Must cover intended entry date. IRCC accepts a current + expired passport as combined identity evidence.", tag: "required" },
          { name: "IELTS General Training — minimum CLB 7 in all four bands", description: "Listening ≥8.0, Reading ≥6.5, Writing ≥6.0, Speaking ≥6.5. Valid for 2 years. CELPIP accepted as alternative. TEF Canada for French.", tag: "required" },
          { name: "Educational Credential Assessment (WES)", description: "Submit original transcripts from your Nigerian institution directly to WES. Takes 7–20 weeks. Order immediately — IRCC will not waive this requirement.", tag: "required" },
          { name: "Nigerian Police Force Clearance Certificate", description: "From NPF FCID, Abuja or nearest state command. Also required for every country where you lived 6+ months since age 18.", tag: "required" },
          { name: "Employer reference letters (NOC-coded duties)", description: "On company letterhead, signed by HR or supervisor, stating job title, NOC code, hours/week, dates, salary, and main duties that match the NOC lead statement.", tag: "required" },
          { name: "Medical exam by IRCC-designated physician", description: "Panel physicians in Lagos, Abuja, and Port Harcourt. Results submitted directly to IRCC by the clinic. Valid 12 months.", tag: "required" },
          { name: "Settlement funds — CAD $13,757 minimum (single applicant, 2025 LICO)", description: "Must be in your name, unencumbered, with 6 months of bank statements. Gifted money must be disclosed; large recent deposits raise flags.", tag: "advisable" },
          { name: "Do not count NYSC service as skilled work experience", description: "NYSC is not accepted as skilled work experience under FSWP. Only paid, post-NYSC employment in NOC TEER 0–3 qualifies.", tag: "watch" },
        ],
        timeline: [
          { phase: "Weeks 1–12", duration: "Up to 12 weeks", description: "Get IELTS results, submit WES application with transcripts, request NPF clearance, book medical exam. All run in parallel — do not wait for one before starting the next." },
          { phase: "Weeks 12–14", duration: "1–2 weeks", description: "Create your Express Entry profile on the IRCC portal. CRS score is calculated immediately and you enter the pool." },
          { phase: "Variable wait", duration: "Weeks to months", description: "IRCC runs draws every 2 weeks. If your score meets the cutoff you receive an ITA. Profiles expire after 12 months." },
          { phase: "ITA received", duration: "60 days (fixed)", description: "You have exactly 60 days from ITA to submit all documents. IRCC grants no extensions — missing this deadline means re-entering the pool from scratch." },
          { phase: "+6 months", duration: "~6 months", description: "IRCC processing. Biometrics collected at a Canadian VAC in Lagos or Abuja. IRCC may issue an Additional Document Request (ADR) — respond within 30 days." },
          { phase: "Approval", duration: "Final step", description: "You receive a COPR and Permanent Resident Visa. Must land in Canada before the visa expiry date — typically 12 months from your medical exam date." },
        ],
        costs: {
          currency: "CAD",
          currencySymbol: "CA$",
          items: [
            { label: "IRCC application fee (principal)", amountMin: 1365, amountMax: 1365, note: "Paid on submission after ITA" },
            { label: "Right of PR fee (RPRF)", amountMin: 1325, amountMax: 1325, note: "Refunded if refused" },
            { label: "Biometrics fee", amountMin: 85, amountMax: 85 },
            { label: "IELTS test", amountMin: 290, amountMax: 310 },
            { label: "WES credential evaluation", amountMin: 260, amountMax: 350, note: "Standard vs. fast-track" },
            { label: "Medical exam (IRCC panel physician)", amountMin: 350, amountMax: 500 },
            { label: "Police clearance + couriers", amountMin: 30, amountMax: 80, note: "NPF + any other countries lived in" },
            { label: "Document translation/notarization", amountMin: 100, amountMax: 400, optional: true },
          ],
        },
        faqs: [
          { q: "Do I need a job offer to apply for Express Entry?", a: "No — you can apply under the Federal Skilled Worker Program without a job offer. However, a valid LMIA-based job offer adds 50 or 200 CRS points depending on the NOC skill level, and a PNP nomination adds 600 points, effectively guaranteeing an ITA." },
          { q: "Can NYSC service count as my one year of skilled work experience?", a: "No. NYSC is not accepted as skilled work experience under FSWP. Only paid, continuous, post-NYSC employment in a NOC TEER 0, 1, 2, or 3 occupation qualifies. This is one of the most common rejection reasons for Nigerian applicants." },
          { q: "How long does it take to get WES results from Nigeria?", a: "Standard WES processing takes 7–20 weeks from when your institution sends transcripts directly to WES. Do not use the applicant-forwarded option — WES requires institution-to-WES delivery. Order immediately after deciding to apply." },
          { q: "What happens if my CRS score is below the cutoff?", a: "Your profile remains in the pool for 12 months. You can improve your score by: re-testing IELTS for higher language scores, securing a Canadian provincial nomination (+600 pts), obtaining a Canadian job offer (+50 or +200 pts), or adding a French language score." },
          { q: "Can my spouse's credentials boost my CRS score?", a: "Yes. Spousal language scores and education credentials contribute to your core CRS score. If your spouse is highly educated or has strong English/French, include their profile — it can add 10–40 points." },
        ],
        commonMistakes: [
          "Counting NYSC service months as skilled work experience",
          "Submitting employer letters without NOC codes or specific duty descriptions",
          "Forwarding WES documents yourself instead of having your university send directly",
          "Missing the 60-day ITA window by starting document collection after the ITA",
          "Using a non-IRCC-designated physician for the medical exam",
        ],
      },
      {
        slug: "study-permit",
        name: "Study Permit",
        shortName: "Study Permit",
        outcome: "study",
        processingTime: "4–16 weeks",
        approvalRate: "76%",
        duration: "Duration of study + 90 days",
        fee: "CAD $150",
        lastVerified: "2025-07-01",
        requirements: [
          { name: "Letter of Acceptance from a DLI", description: "Acceptance letter from a Designated Learning Institution. You cannot apply without this.", tag: "required" },
          { name: "Proof of financial support", description: "First year tuition + CAD $10,000 for living expenses (or CAD $11,000 for Quebec). 12 months of bank statements.", tag: "required" },
          { name: "Nigerian passport", description: "Valid for the full duration of your study program.", tag: "required" },
          { name: "Statement of Purpose", description: "A genuine personal statement explaining why you chose Canada, this institution, and this program, and why you will return to Nigeria afterward.", tag: "required" },
          { name: "Ties to Nigeria", description: "Evidence you will return: property, family, a career plan. Study permit refusals for Nigerians most often cite insufficient home-country ties.", tag: "watch" },
          { name: "Biometrics", description: "Required for most nationalities including Nigeria. Complete at a VAC in Lagos or Abuja.", tag: "required" },
        ],
        timeline: [
          { phase: "Apply to DLI", duration: "Varies by institution", description: "Apply to your chosen university/college and receive your Letter of Acceptance. Many Nigerian students apply to multiple institutions simultaneously." },
          { phase: "IRCC application", duration: "1 week to compile", description: "Submit your study permit application online with all supporting documents. Pay CAD $150." },
          { phase: "Biometrics", duration: "Within 30 days of request", description: "IRCC will send a Biometric Instruction Letter. Book at a VAC in Lagos or Abuja and attend within the deadline." },
          { phase: "Processing", duration: "4–16 weeks", description: "Current IRCC processing times for Nigerian students vary significantly. Check the IRCC processing time tool with your specific situation." },
        ],
        costs: {
          currency: "CAD",
          currencySymbol: "CA$",
          items: [
            { label: "Study permit application fee", amountMin: 150, amountMax: 150 },
            { label: "Biometrics", amountMin: 85, amountMax: 85 },
            { label: "First year tuition (varies by program)", amountMin: 15000, amountMax: 35000 },
            { label: "Living expenses (IRCC minimum)", amountMin: 10000, amountMax: 10000, note: "Required to prove; actual costs higher in major cities" },
          ],
        },
        faqs: [
          { q: "Can I work while studying in Canada on a study permit?", a: "Yes, if your institution is a DLI and your study permit does not have a 'may not work off-campus' restriction. Most full-time university and college students can work up to 20 hours per week off-campus during the academic term." },
          { q: "Does a study permit lead to PR in Canada?", a: "Indirectly yes. After graduating, most students qualify for a Post-Graduation Work Permit (PGWP) of up to 3 years, during which Canadian work experience accumulates — qualifying you for the Canadian Experience Class under Express Entry." },
        ],
        commonMistakes: [
          "Weak Statement of Purpose that doesn't explain home-country ties",
          "Applying to non-DLI institutions",
          "Not showing sufficient funds for both tuition AND living expenses",
          "Applying too close to the program start date — start 4–6 months early",
        ],
      },
      {
        slug: "visitor-visa",
        name: "Visitor Visa (Temporary Resident Visa)",
        shortName: "Visitor Visa",
        outcome: "visit",
        processingTime: "2–8 weeks",
        approvalRate: "58%",
        duration: "Up to 6 months per entry",
        fee: "CAD $100",
        lastVerified: "2025-07-01",
        requirements: [
          { name: "Nigerian passport", description: "Valid for the duration of intended stay.", tag: "required" },
          { name: "Bank statements (3–6 months)", description: "Showing sufficient funds for the trip. Minimum CAD $2,000–$5,000 recommended for a 2-week visit.", tag: "required" },
          { name: "Proof of employment or business ties to Nigeria", description: "Employer letter with approved leave, or business ownership evidence. IRCC needs to see you have compelling reasons to return.", tag: "required" },
          { name: "Invitation letter (if visiting family/friends)", description: "Signed letter from your Canadian host with their PR/citizenship details, address, and relationship to you.", tag: "advisable" },
          { name: "Travel itinerary and accommodation proof", description: "Hotel bookings or host's address. Shows you have a concrete plan.", tag: "advisable" },
          { name: "Refusal risk: weak home-country ties", description: "TRV refusal rates for Nigerian applicants are high. The single biggest factor is the officer's assessment of whether you will leave Canada after your visit.", tag: "watch" },
        ],
        timeline: [
          { phase: "Prepare documents", duration: "1–2 weeks", description: "Gather bank statements, employment letter, itinerary, and accommodation proof." },
          { phase: "Apply online", duration: "1 day", description: "Submit the TRV application on IRCC's portal. Pay CAD $100." },
          { phase: "Biometrics", duration: "Within 30 days", description: "Book biometrics at Lagos or Abuja VAC if not previously enrolled." },
          { phase: "Processing", duration: "2–8 weeks", description: "IRCC reviews your application. No interview is required for most applicants." },
        ],
        costs: {
          currency: "CAD",
          currencySymbol: "CA$",
          items: [
            { label: "TRV application fee", amountMin: 100, amountMax: 100 },
            { label: "Biometrics (if required)", amountMin: 85, amountMax: 85 },
          ],
        },
        faqs: [
          { q: "Why is the TRV refusal rate high for Nigerians?", a: "IRCC officers assess the likelihood of the applicant overstaying their visa. Nigeria has historically had high TRV refusal rates because officers sometimes find it difficult to assess strong ties to the home country in the documentation provided. The strongest applications show stable employment, property ownership, and clear family ties in Nigeria." },
          { q: "Can I apply for a TRV even if I have relatives in Canada?", a: "Yes, and having family in Canada is not automatically a negative factor. What matters is demonstrating that you have equally strong (or stronger) ties in Nigeria that compel your return. Include an invitation letter from your Canadian family and strong home-country tie evidence simultaneously." },
        ],
        commonMistakes: [
          "Applying without strong employment and home-country tie evidence",
          "Submitting thin bank statements (low balance or inconsistent income)",
          "Not providing an invitation letter when visiting family",
          "Reapplying too quickly after a refusal without addressing the refusal reasons",
        ],
      },
    ],
  },

  // ── Nigeria → United Kingdom ───────────────────────────────────────────────
  "nigeria/united-kingdom": {
    origin: "Nigeria",
    originFlag: "🇳🇬",
    destination: "United Kingdom",
    destinationFlag: "🇬🇧",
    visaTypes: [
      {
        slug: "skilled-worker",
        name: "Skilled Worker Visa",
        shortName: "Skilled Worker",
        outcome: "temporary_work",
        processingTime: "3–8 weeks",
        approvalRate: "78%",
        duration: "Up to 5 years (renewable)",
        fee: "£719 (≤3yr) / £1,420 (>3yr)",
        minIncome: "£29,000/yr minimum (2024 threshold)",
        legalBasis: "Immigration Rules HC 395, Appendix Skilled Worker",
        lastVerified: "2025-06-01",
        requirements: [
          { name: "Certificate of Sponsorship (CoS) from a licensed UK employer", description: "Your employer must hold a Sponsor Licence and assign you a valid CoS reference number before you apply. Without this, you cannot proceed.", tag: "required" },
          { name: "English language requirement (B1 level minimum)", description: "IELTS UKVI Academic or SELT from an approved provider. Minimum: Listening 4.0, Reading 4.0, Writing 4.0, Speaking 4.0. Or a degree taught in English.", tag: "required" },
          { name: "Valid Nigerian passport", description: "Must be valid beyond your planned stay. Do not apply on an expiring passport.", tag: "required" },
          { name: "Financial requirement — £1,270 in personal savings", description: "Must have been in your account for 28 consecutive days ending no more than 31 days before application. Bank statements required.", tag: "required" },
          { name: "Immigration Health Surcharge (IHS)", description: "£1,035 per year paid upfront at application. For a 5-year visa: £5,175 total, paid before the visa is issued.", tag: "required" },
          { name: "Salary at or above the new minimum threshold", description: "From April 2024, the general Skilled Worker salary minimum is £29,000/year, or the 'going rate' for your occupation code (whichever is higher). Healthcare workers have different rates.", tag: "watch" },
        ],
        timeline: [
          { phase: "Employer assigns CoS", duration: "1–2 weeks", description: "Your employer assigns your Certificate of Sponsorship via the UK Visas and Immigration Sponsor Management System. You receive the CoS reference number." },
          { phase: "Application preparation", duration: "1–2 weeks", description: "Gather financial evidence (28-day bank statements), English test result, passport, and pay IHS." },
          { phase: "Submit online application", duration: "1 day", description: "Apply at gov.uk. Pay the visa fee and biometric appointment booking." },
          { phase: "Biometrics at VAC Lagos/Abuja", duration: "Within 2 weeks", description: "Attend your biometric appointment at VFS Global or TLScontact in Lagos or Abuja." },
          { phase: "Processing", duration: "3–8 weeks", description: "UKVI processing from Nigeria. Priority service available for ~£500 (5 business day target)." },
        ],
        costs: {
          currency: "GBP",
          currencySymbol: "£",
          items: [
            { label: "Visa fee (up to 3 years)", amountMin: 719, amountMax: 719 },
            { label: "Immigration Health Surcharge (3 years)", amountMin: 3105, amountMax: 3105, note: "£1,035/year — paid upfront" },
            { label: "IELTS UKVI test", amountMin: 200, amountMax: 215 },
            { label: "Biometric appointment at VAC", amountMin: 10, amountMax: 30, note: "Service fee at VFS/TLScontact" },
            { label: "Priority service (optional)", amountMin: 500, amountMax: 500, optional: true },
          ],
        },
        faqs: [
          { q: "Does my employer need to pay for my Skilled Worker visa?", a: "Your employer must pay the Certificate of Sponsorship fee (£239 for skilled workers) and optionally the Immigration Skills Charge (£364/year for small sponsors, £1,000/year for medium/large). They can but are not required to pay your personal visa fee or IHS." },
          { q: "Can I bring my family to the UK on a Skilled Worker visa?", a: "Yes, your spouse/partner and children under 18 can apply as dependants on your Skilled Worker visa. Each dependant pays the same visa fee and IHS. Your combined salary must still meet any additional income thresholds for dependants." },
          { q: "Does a Skilled Worker visa lead to settlement (ILR)?", a: "Yes — after 5 years on a Skilled Worker visa in a qualifying role, you can apply for Indefinite Leave to Remain (ILR). After 12 months of ILR, you can apply for British citizenship." },
        ],
        commonMistakes: [
          "Applying before the employer has assigned the CoS (common — always verify the CoS reference first)",
          "Using a non-SELT IELTS test (must be IELTS UKVI, not Academic or General Training)",
          "Not maintaining the £1,270 savings balance for 28 consecutive days",
          "Misunderstanding the IHS — it must be paid upfront for the full visa duration, not annually",
          "Applying at an occupation code that doesn't match the CoS",
        ],
      },
      {
        slug: "student",
        name: "Student Visa",
        shortName: "Student",
        outcome: "study",
        processingTime: "3–6 weeks",
        approvalRate: "83%",
        duration: "Duration of course + 4 months",
        fee: "£490",
        lastVerified: "2025-06-01",
        requirements: [
          { name: "Confirmation of Acceptance for Studies (CAS)", description: "Unique reference number assigned by your UKVI-licensed university or college. Apply for your CAS from the institution after receiving an unconditional offer.", tag: "required" },
          { name: "English language (B2 level for degree courses)", description: "IELTS Academic minimum varies by institution, typically 6.0–6.5 overall with no band below 5.5. Some institutions accept online Pearson or Duolingo English Test.", tag: "required" },
          { name: "Financial maintenance requirement", description: "£1,334/month for up to 9 months in London (£9,135 total), or £1,023/month outside London. Plus first year tuition fees must be in your account for 28 days.", tag: "required" },
          { name: "Tuberculosis (TB) test", description: "Required for Nigerian nationals. Must be done at a UK-approved TB testing centre in Nigeria. Certificate valid for 6 months.", tag: "required" },
        ],
        timeline: [
          { phase: "Receive unconditional offer", duration: "Varies", description: "Apply to UK university and receive your unconditional offer letter." },
          { phase: "Request CAS", duration: "1–4 weeks", description: "Ask your institution to assign your CAS. They can only do this within 6 months of your course start date." },
          { phase: "TB test", duration: "1–2 weeks", description: "Book and complete TB test at an approved clinic in Nigeria. Wait for clearance certificate." },
          { phase: "Apply online", duration: "1 day", description: "Submit application at gov.uk with CAS reference, financial evidence, TB certificate." },
          { phase: "Biometrics + processing", duration: "3–6 weeks", description: "Attend VAC appointment. UKVI processes. Priority service available." },
        ],
        costs: {
          currency: "GBP",
          currencySymbol: "£",
          items: [
            { label: "Student visa fee", amountMin: 490, amountMax: 490 },
            { label: "Immigration Health Surcharge (per year of study)", amountMin: 776, amountMax: 776, note: "£776/year — paid upfront for full course duration" },
            { label: "IELTS Academic test", amountMin: 200, amountMax: 215 },
            { label: "TB test at approved clinic", amountMin: 50, amountMax: 90 },
            { label: "First year tuition (Russell Group)", amountMin: 18000, amountMax: 30000 },
          ],
        },
        faqs: [
          { q: "Can I work on a UK Student visa?", a: "Yes, up to 20 hours per week during term time if your institution is a Higher Education Provider (HEP). Full-time work during vacation periods is permitted. You cannot be self-employed or work as an entertainer." },
          { q: "When can I apply for the Student visa?", a: "You can apply up to 6 months before your course starts if you're outside the UK. However, you cannot receive your visa more than 3 months before your course start date, so timing matters." },
        ],
        commonMistakes: [
          "Forgetting the TB test — it often delays applications by weeks",
          "Applying before the CAS is issued or using an expired CAS",
          "Not having 28 consecutive days of financial maintenance in your account",
          "Applying to UKVI-unlicensed institutions (check the Sponsor Register)",
        ],
      },
    ],
  },

  // ── UK → Spain ────────────────────────────────────────────────────────────
  "united-kingdom/spain": {
    origin: "United Kingdom",
    originFlag: "🇬🇧",
    destination: "Spain",
    destinationFlag: "🇪🇸",
    visaTypes: [
      {
        slug: "digital-nomad-visa",
        name: "Digital Nomad Visa (DNV)",
        shortName: "Digital Nomad",
        outcome: "temporary_work",
        processingTime: "6–8 weeks",
        approvalRate: "78%",
        duration: "1 year (renewable for 2 more)",
        fee: "€80",
        minIncome: "€2,646/month (200% Spanish SMI, 2025)",
        legalBasis: "Ley 28/2022 (Ley de Startups), Art. 71–79",
        lastVerified: "2025-07-01",
        requirements: [
          { name: "UK passport (valid 12+ months)", description: "Must cover the initial visa period. Bring the original and a certified copy of the photo page.", tag: "required" },
          { name: "Proof of remote income ≥€2,646/month", description: "3 months of payslips or invoices totalling the threshold. If self-employed, a client contract stating remote delivery. Employment letter confirming remote-work permission from a company not headquartered in Spain.", tag: "required" },
          { name: "Apostilled UK Criminal Record Certificate", description: "ACPO basic certificate with Apostille from the FCDO. Takes 2–4 weeks from ACPO + 2–3 weeks for the Apostille. Total: 4–7 weeks. Start immediately.", tag: "required" },
          { name: "Private health insurance (full Spain coverage)", description: "No co-payments, no exclusions, covers repatriation. Bupa International and AXA PPP accepted by Spanish Consulate London. Must be a full-coverage policy, not travel insurance.", tag: "required" },
          { name: "Accommodation proof for first 90 days", description: "Rental contract or Airbnb/hotel confirmation for the first 3 months. Officers in London frequently request this even though it's listed as 'recommended' not mandatory in the regulations.", tag: "advisable" },
          { name: "Bank statements (6 months)", description: "UK-issued, showing consistent income deposits matching your income evidence. Gaps or inconsistencies between bank statements and payslips cause delays.", tag: "advisable" },
        ],
        timeline: [
          { phase: "Weeks 1–4", duration: "Up to 4 weeks", description: "Order ACPO certificate, apply for Apostille from FCDO, arrange health insurance, get employer letter. ACPO + Apostille takes 4–7 weeks total — start this on day 1." },
          { phase: "Week 4–5", duration: "1–2 weeks", description: "Book consulate appointment online. Spanish Consulate General in London — slots release 4–6 weeks ahead. Morning slots go fastest." },
          { phase: "Appointment", duration: "30 minutes", description: "Attend in person with originals + copies. Pay the €80 fee. Do not travel internationally during processing." },
          { phase: "Weeks 5–11", duration: "6–8 weeks", description: "Consulate processing. No status updates provided. If your file is incomplete, it is rejected outright with no chance to add documents mid-review." },
          { phase: "Decision", duration: "Final step", description: "Passport returned by courier. Must enter Spain within 3 months of visa issuance. Register with local municipality within 30 days of arrival (Empadronamiento)." },
        ],
        costs: {
          currency: "EUR",
          currencySymbol: "€",
          items: [
            { label: "Consulate visa fee", amountMin: 80, amountMax: 80 },
            { label: "ACPO criminal record certificate", amountMin: 23, amountMax: 25 },
            { label: "FCDO Apostille", amountMin: 30, amountMax: 45 },
            { label: "Private health insurance (annual)", amountMin: 200, amountMax: 600 },
            { label: "Document translation to Spanish (if required)", amountMin: 80, amountMax: 250, optional: true },
          ],
        },
        faqs: [
          { q: "Can I work for Spanish clients on the Digital Nomad Visa?", a: "Yes, but with a limit. Up to 20% of your total income can come from Spanish-based clients. The remaining 80%+ must come from clients or employers outside Spain. Exceeding this threshold requires a different visa category." },
          { q: "Does the Digital Nomad Visa qualify for the Beckham Law tax regime?", a: "Yes — you can apply for the Beckham Law (régimen especial de impatriados) within 6 months of registering as a tax resident in Spain. This caps income tax at 24% on earnings up to €600,000/year instead of Spain's progressive rates (up to 47%). High earners save significantly." },
          { q: "Can my family join me in Spain on this visa?", a: "Yes. Your spouse/partner and dependent children can apply as family unit members, either simultaneously or after you're approved. Each member must have private health insurance. The income threshold does not increase for dependants under this visa category." },
        ],
        commonMistakes: [
          "Leaving the ACPO + Apostille process until after booking the consulate appointment — it takes longer than most people expect",
          "Using travel insurance instead of a full private health insurance policy",
          "Working more than 20% for Spanish clients and triggering a different tax/immigration classification",
          "Missing the 3-month window to enter Spain after visa issuance",
          "Not registering at the local municipality (Empadronamiento) within 30 days of arrival",
        ],
      },
      {
        slug: "non-lucrative-visa",
        name: "Non-Lucrative Residence Visa",
        shortName: "Non-Lucrative",
        outcome: "visit",
        processingTime: "8–10 weeks",
        approvalRate: "71%",
        duration: "1 year (renewable)",
        fee: "€80",
        minIncome: "€28,800/year (passive income — 4× annual SMI, 2025)",
        legalBasis: "RD 557/2011, Art. 47",
        lastVerified: "2025-07-01",
        requirements: [
          { name: "Proof of passive income ≥€28,800/year", description: "Pension, rental income, dividends, or investment returns. You are NOT permitted to work in Spain (remote or otherwise) on this visa.", tag: "required" },
          { name: "Apostilled criminal record (UK)", description: "Same as DNV — ACPO certificate + FCDO Apostille.", tag: "required" },
          { name: "Private health insurance (no work permit coverage)", description: "Full coverage for Spain with no co-payments.", tag: "required" },
          { name: "Proof of accommodation in Spain", description: "Rental contract for at least 1 year is strongly advisable.", tag: "advisable" },
          { name: "No income from employment or self-employment while in Spain", description: "This visa strictly prohibits working in Spain. Even remote work for UK clients is technically prohibited, unlike the DNV.", tag: "watch" },
        ],
        timeline: [
          { phase: "Gather documents", duration: "4–6 weeks", description: "Compile passive income evidence (12 months), Apostilled criminal record, health insurance policy." },
          { phase: "Book and attend consulate", duration: "1 day", description: "Spanish Consulate in London. Same-day biometrics taken at some posts." },
          { phase: "Processing", duration: "8–10 weeks", description: "Longer than DNV — this category involves a more detailed financial review." },
        ],
        costs: {
          currency: "EUR",
          currencySymbol: "€",
          items: [
            { label: "Consulate visa fee", amountMin: 80, amountMax: 80 },
            { label: "ACPO + Apostille", amountMin: 53, amountMax: 70 },
            { label: "Private health insurance (annual)", amountMin: 200, amountMax: 600 },
          ],
        },
        faqs: [
          { q: "Can I do remote work on the Non-Lucrative Visa?", a: "Technically no — the NLV prohibits any work activity in Spain, including remote work for foreign employers. If you intend to work remotely, apply for the Digital Nomad Visa instead. Spanish immigration enforcement is increasing scrutiny of NLV holders who work remotely." },
          { q: "Does the NLV lead to permanent residence?", a: "Yes. After 5 years of continuous legal residence in Spain (you can renew the NLV annually for this period), you qualify to apply for Long-Term Residence (residencia de larga duración), which is effectively permanent." },
        ],
        commonMistakes: [
          "Working remotely on an NLV — this is grounds for revocation",
          "Not meeting the passive income threshold (the 4× SMI requirement is higher than many expect)",
          "Not registering tax residency in Spain after 183 days — you become a Spanish tax resident regardless of visa type",
        ],
      },
    ],
  },

  // ── UK → Portugal ─────────────────────────────────────────────────────────
  "united-kingdom/portugal": {
    origin: "United Kingdom",
    originFlag: "🇬🇧",
    destination: "Portugal",
    destinationFlag: "🇵🇹",
    visaTypes: [
      {
        slug: "d7-visa",
        name: "D7 Passive Income Visa",
        shortName: "D7 Visa",
        outcome: "permanent_residence",
        processingTime: "2–3 months",
        approvalRate: "85%",
        duration: "2 years (renewable, leads to PR after 5 years)",
        fee: "€90",
        minIncome: "€820/month (1× Portuguese minimum wage, 2025)",
        legalBasis: "Law No. 23/2007 (Foreigners Law), Art. 60",
        lastVerified: "2025-06-01",
        requirements: [
          { name: "UK passport (valid 6+ months beyond visa)", description: "Standard passport — no apostille required for the passport itself.", tag: "required" },
          { name: "Proof of passive income ≥€820/month", description: "Pension statements, rental income records, dividend statements, or savings income. Remote employment income also accepted in practice, though classified as a passive income visa.", tag: "required" },
          { name: "Portuguese NIF (Tax Identification Number)", description: "Obtain before applying — possible to get via a Portuguese fiscal representative (lawyer or accountant) without visiting Portugal.", tag: "required" },
          { name: "Portuguese bank account", description: "Must show funds on deposit. Many applicants use Wise or similar, though a local bank account is strongly preferable.", tag: "required" },
          { name: "Criminal record from UK (apostilled)", description: "DBS certificate with UK apostille.", tag: "required" },
          { name: "Proof of accommodation in Portugal", description: "Lease agreement for at least 12 months, or a property deed.", tag: "required" },
          { name: "Health insurance valid in Portugal", description: "Full coverage — not required to be a local policy.", tag: "required" },
        ],
        timeline: [
          { phase: "Pre-application setup", duration: "2–4 weeks", description: "Obtain NIF via fiscal representative, open Portuguese bank account or transfer funds, get apostilled DBS check." },
          { phase: "Consulate appointment (London)", duration: "Varies", description: "Book at the Portuguese Consulate in London. Appointment wait times have been 4–12 weeks — book early." },
          { phase: "Processing by SEF/AIMA", duration: "2–3 months", description: "After consulate submission, SEF/AIMA (Portugal's immigration authority) processes the application." },
          { phase: "Arrival in Portugal", duration: "Within visa validity", description: "Must enter Portugal within the visa validity period and then schedule your AIMA appointment in person to receive your residence card." },
        ],
        costs: {
          currency: "EUR",
          currencySymbol: "€",
          items: [
            { label: "D7 visa fee (consulate)", amountMin: 90, amountMax: 90 },
            { label: "AIMA residence permit fee", amountMin: 320, amountMax: 320 },
            { label: "DBS Enhanced check + Apostille", amountMin: 50, amountMax: 80 },
            { label: "NIF via fiscal representative", amountMin: 100, amountMax: 300 },
            { label: "Health insurance (annual)", amountMin: 150, amountMax: 400 },
          ],
        },
        faqs: [
          { q: "Can I work remotely on a D7 visa?", a: "The D7 is officially a 'passive income' visa, but Portugal's immigration authority and tax authority have long accepted remote employment income as qualifying. In practice, most remote workers from the UK successfully apply on D7. If your income is solely from a UK employer, also consider Portugal's Digital Nomad Visa (launched in 2022) which is more explicitly designed for this." },
          { q: "Does the D7 lead to Portuguese citizenship?", a: "Yes — after 5 years of legal residence (3 years with an EU/EEA parent or if you lived in Portugal in the past), you qualify for long-term residence or citizenship. Portugal's citizenship test requires basic Portuguese language proficiency (A2 level)." },
          { q: "Do I need to spend time in Portugal each year?", a: "Yes — you must not be absent from Portugal for more than 6 consecutive months, or 8 months total in any 12-month period, to maintain your residence status. This is less restrictive than some EU visas." },
        ],
        commonMistakes: [
          "Applying without a Portuguese NIF — the consulate will reject applications without one",
          "Booking a consulate appointment before gathering all documents (Portugal's backlog means a wasted slot is a 3-month delay)",
          "Insufficient funds in the Portuguese account — show at least 12 months of income equivalent",
          "Confusing D7 with the Golden Visa — they have very different income vs. investment requirements",
        ],
      },
    ],
  },

  // ── India → United Kingdom ────────────────────────────────────────────────
  "india/united-kingdom": {
    origin: "India",
    originFlag: "🇮🇳",
    destination: "United Kingdom",
    destinationFlag: "🇬🇧",
    visaTypes: [
      {
        slug: "skilled-worker",
        name: "Skilled Worker Visa",
        shortName: "Skilled Worker",
        outcome: "temporary_work",
        processingTime: "3–8 weeks",
        approvalRate: "74%",
        duration: "Up to 5 years (renewable)",
        fee: "£719 (≤3yr) / £1,420 (>3yr)",
        minIncome: "£29,000/yr minimum",
        legalBasis: "Immigration Rules HC 395, Appendix Skilled Worker",
        lastVerified: "2025-06-01",
        requirements: [
          { name: "Certificate of Sponsorship (CoS) from licensed UK employer", description: "Your employer must assign a CoS reference number before you apply. This is the non-negotiable first step.", tag: "required" },
          { name: "English language — IELTS UKVI B1 minimum", description: "Or a degree taught and assessed in English. Exemptions apply for nationals of some English-speaking countries. Ensure you use IELTS UKVI not standard IELTS.", tag: "required" },
          { name: "Financial maintenance — £1,270 in savings for 28 days", description: "Bank statements covering the 28-day period ending no more than 31 days before application. Indian bank statements must be official (stamped), not internet printouts.", tag: "required" },
          { name: "Immigration Health Surcharge", description: "£1,035/year paid upfront. For a 3-year visa: £3,105 total before the visa is issued.", tag: "required" },
          { name: "Salary at or above £29,000/year or occupation going rate", description: "Healthcare workers, shortage occupation roles, and new entrants have different thresholds. Check your specific SOC code against the Skilled Worker appendix.", tag: "required" },
        ],
        timeline: [
          { phase: "Employer assigns CoS", duration: "1–3 weeks", description: "UK employer assigns CoS on UKVI's Sponsor Management System." },
          { phase: "Prepare and submit", duration: "1 week", description: "Compile documents, pay IHS upfront, submit online application." },
          { phase: "Biometrics at VAC India", duration: "Within 3 weeks of request", description: "UKVI Visa Application Centres in major Indian cities. Book early — slots fill quickly." },
          { phase: "Processing", duration: "3–8 weeks", description: "Standard processing from India. Priority services available at higher cost." },
        ],
        costs: {
          currency: "GBP",
          currencySymbol: "£",
          items: [
            { label: "Visa fee (up to 3 years)", amountMin: 719, amountMax: 719 },
            { label: "Immigration Health Surcharge (3 years)", amountMin: 3105, amountMax: 3105 },
            { label: "IELTS UKVI test", amountMin: 180, amountMax: 200 },
            { label: "Priority service (optional)", amountMin: 500, amountMax: 500, optional: true },
          ],
        },
        faqs: [
          { q: "Is there a shortage occupation list for India?", a: "The Shortage Occupation List (SOL) was replaced by the Immigration Salary List (ISL) in April 2024. Roles on the ISL can be offered at 90% of the going rate instead of 100%, but no longer receive the 20% salary discount that the old SOL provided. Check the current ISL before agreeing your salary with your employer." },
          { q: "Can my spouse work in the UK on a Skilled Worker visa?", a: "Yes — dependants of Skilled Worker visa holders can work in the UK without restriction. There is no occupation or salary requirement for dependants' employment." },
        ],
        commonMistakes: [
          "Using standard IELTS results instead of IELTS UKVI",
          "Not checking whether salary meets the occupation 'going rate' (not just the £29,000 minimum)",
          "Having the employer assign the CoS before agreeing the final salary/role — changes after CoS assignment require a new CoS",
        ],
      },
      {
        slug: "student",
        name: "Student Visa",
        shortName: "Student",
        outcome: "study",
        processingTime: "3–6 weeks",
        approvalRate: "81%",
        duration: "Duration of course + 4 months",
        fee: "£490",
        lastVerified: "2025-06-01",
        requirements: [
          { name: "CAS from a UKVI-licensed institution", description: "Confirmation of Acceptance for Studies reference number from your university or college.", tag: "required" },
          { name: "English language (IELTS Academic B2 level)", description: "Typically 6.0–6.5 overall for undergraduate; 6.5–7.0 for postgraduate. Check your specific institution's requirement.", tag: "required" },
          { name: "Financial maintenance", description: "Tuition fee (as stated in CAS) + £1,334/month in London or £1,023/month elsewhere for up to 9 months. Held for 28 consecutive days.", tag: "required" },
          { name: "ATAS clearance (certain subjects)", description: "Academic Technology Approval Scheme — required for some postgraduate research courses in sensitive subjects (advanced engineering, chemistry, physics). Check ATAS list before applying.", tag: "watch" },
        ],
        timeline: [
          { phase: "Receive CAS", duration: "After unconditional offer", description: "Institution assigns CAS within 6 months of course start." },
          { phase: "Apply online", duration: "1 day", description: "Submit on gov.uk. Book biometric appointment at VAC in India." },
          { phase: "Biometrics + processing", duration: "3–6 weeks", description: "Standard processing. Early application strongly recommended for September intake." },
        ],
        costs: {
          currency: "GBP",
          currencySymbol: "£",
          items: [
            { label: "Student visa fee", amountMin: 490, amountMax: 490 },
            { label: "Immigration Health Surcharge (per year)", amountMin: 776, amountMax: 776, note: "Paid upfront for full course duration" },
            { label: "IELTS Academic test", amountMin: 185, amountMax: 195 },
            { label: "First year tuition (typical MSc)", amountMin: 15000, amountMax: 28000 },
          ],
        },
        faqs: [
          { q: "What is the Graduate Route after my UK degree?", a: "The Graduate visa allows you to stay in the UK for 2 years after completing an eligible degree (3 years for PhD). You can work or look for work in any occupation at any salary level. This leads many Indian students to transition to a Skilled Worker visa after finding a sponsored role." },
        ],
        commonMistakes: [
          "Checking ATAS requirement too late — it takes 30–120 days and blocks CAS assignment without it",
          "Not applying early enough for September intake — apply by June at the latest",
        ],
      },
    ],
  },

  // ── Philippines → United Arab Emirates ───────────────────────────────────
  "philippines/united-arab-emirates": {
    origin: "Philippines",
    originFlag: "🇵🇭",
    destination: "United Arab Emirates",
    destinationFlag: "🇦🇪",
    visaTypes: [
      {
        slug: "employment-visa",
        name: "UAE Employment Visa (Residence Permit via Employment)",
        shortName: "Employment Visa",
        outcome: "temporary_work",
        processingTime: "2–4 weeks",
        approvalRate: "91%",
        duration: "2 years (renewable)",
        fee: "AED 300–500 (employer-paid in most cases)",
        lastVerified: "2025-06-01",
        requirements: [
          { name: "Valid Philippine passport (6+ months validity)", description: "Your employer's PRO (Public Relations Officer) will process the entry permit — you do not apply independently for an employment visa.", tag: "required" },
          { name: "Employment contract signed by employer", description: "Duly notarized and attested. Must be registered with POEA/DMW (Philippines) before departure for OFW status and protections.", tag: "required" },
          { name: "POEA/DMW processing and OEC", description: "If hired from the Philippines, your agency/employer must process your documentation with the Philippines Overseas Employment Administration. The Overseas Employment Certificate (OEC) is required for airport clearance.", tag: "required" },
          { name: "Medical fitness test (UAE-approved clinic in Philippines)", description: "GCC-standard medical exam at a UAE-approved clinic in the Philippines. Covers blood tests, chest X-ray, and infectious disease screening. Valid 3 months.", tag: "required" },
          { name: "Biometrics — Emirates ID enrollment", description: "Done in UAE after arrival. Your employer's PRO arranges this within 60 days of your entry permit.", tag: "required" },
          { name: "Degree attestation for professional roles", description: "Degrees must be attested by DFA (Philippines), UAE Embassy in Manila, and UAE's Ministry of Foreign Affairs. This takes 4–8 weeks.", tag: "advisable" },
        ],
        timeline: [
          { phase: "Employer applies for Entry Permit", duration: "1–2 weeks", description: "UAE employer's PRO submits an entry permit application to ICA (Federal Authority for Identity, Citizenship, Customs and Ports Security)." },
          { phase: "Medical exam in Philippines", duration: "3–5 days", description: "Complete GCC-standard medical exam at a Gamca-approved clinic in the Philippines." },
          { phase: "POEA/DMW processing", duration: "2–4 weeks", description: "Agency or employer processes POLO/POEA paperwork, receives OEC." },
          { phase: "Fly to UAE", duration: "After entry permit received", description: "Travel on the entry permit. Your employer meets you and arranges status change." },
          { phase: "Status change to Residence Visa", duration: "2–3 weeks", description: "In UAE, employer PRO converts entry permit to residence visa and processes Emirates ID." },
        ],
        costs: {
          currency: "AED",
          currencySymbol: "AED",
          items: [
            { label: "Medical exam (GAMCA-approved clinic)", amountMin: 1200, amountMax: 2000, note: "In Philippines peso; approx. AED equivalent shown" },
            { label: "POEA processing fees", amountMin: 200, amountMax: 500, note: "Agency fees vary" },
            { label: "Emirates ID fee (paid by employer typically)", amountMin: 300, amountMax: 400 },
            { label: "Residence visa fee (usually employer-paid)", amountMin: 300, amountMax: 500 },
          ],
        },
        faqs: [
          { q: "What protections do OFWs have in the UAE?", a: "Philippine OFWs are protected by the Philippine Overseas Employment Administration (POEA) Standard Employment Contract. Employers must provide accommodation, food, and return flights in most contracts. The UAE's Wage Protection System (WPS) also ensures salary payment through bank transfers rather than cash." },
          { q: "Can I bring my family to the UAE on an Employment visa?", a: "Yes, if your salary meets the minimum sponsorship threshold (AED 4,000/month or AED 3,000/month + employer-provided accommodation). You can sponsor your spouse and children. Your employer must first approve family sponsorship in your contract." },
          { q: "What happens if I want to change employers in UAE?", a: "Under UAE's current labour law, you can change employers without an NOC (No Objection Certificate) after completing 6 months of service. Your new employer handles the visa transfer. Changing before 6 months triggers a 1-year ban in some cases." },
        ],
        commonMistakes: [
          "Leaving the Philippines without the OEC — airport authorities will stop you",
          "Using a non-GAMCA-approved medical clinic (exam result will be rejected)",
          "Not registering with the POLO office in UAE within 30 days of arrival",
          "Sending money home through informal channels instead of registered remittance services (affects OFW status protections)",
        ],
      },
    ],
  },

  // ── Brazil → Portugal ─────────────────────────────────────────────────────
  "brazil/portugal": {
    origin: "Brazil",
    originFlag: "🇧🇷",
    destination: "Portugal",
    destinationFlag: "🇵🇹",
    visaTypes: [
      {
        slug: "d7-visa",
        name: "D7 Passive Income Visa",
        shortName: "D7 Visa",
        outcome: "permanent_residence",
        processingTime: "2–4 months",
        approvalRate: "88%",
        duration: "2 years (renewable, leads to PR/citizenship faster via CPLP)",
        fee: "€90",
        minIncome: "€820/month",
        legalBasis: "Law No. 23/2007 (Foreigners Law), Art. 60 + CPLP Treaty",
        lastVerified: "2025-06-01",
        requirements: [
          { name: "Brazilian passport (valid 6+ months)", description: "Brazil has a bilateral agreement with Portugal — Brazilians have access to preferential treatment (Estatuto de Igualdade) once resident.", tag: "required" },
          { name: "Proof of income ≥€820/month", description: "Remote work income, pension, rental income, or dividends. Brazilian remote workers commonly qualify on employment income.", tag: "required" },
          { name: "Portuguese NIF (Número de Identificação Fiscal)", description: "Can be obtained at the Portuguese Consulate in Brazil or via a fiscal representative.", tag: "required" },
          { name: "Portuguese bank account with funds on deposit", description: "Show at least 3 months of income equivalent. Wise account accepted at most consulates though a local bank is preferable.", tag: "required" },
          { name: "Brazilian criminal record certificate (Antecedentes Criminais)", description: "From the National Criminal Records Office (SINESP/PF). Must be apostilled.", tag: "required" },
          { name: "Accommodation proof in Portugal", description: "Lease agreement for 12+ months, or letter of accommodation from a host.", tag: "required" },
        ],
        timeline: [
          { phase: "Prepare NIF and account", duration: "2–4 weeks", description: "Obtain NIF via consulate or fiscal representative. Open a Portuguese bank account (Millennium BCP, Caixa Geral, or similar)." },
          { phase: "Consulate appointment (São Paulo/Rio/Brasília)", duration: "4–8 weeks wait", description: "Book at the nearest Portuguese Consulate in Brazil. Long backlogs — book immediately." },
          { phase: "AIMA processing", duration: "2–4 months", description: "After consulate approves, SEF/AIMA processes in Portugal. Brazilians benefit from CPLP preferential treatment." },
          { phase: "Arrival + AIMA in-person appointment", duration: "After visa issued", description: "Receive residence card at AIMA office in Portugal. CPLP members can apply for permanent residence after 2 years (vs. 5 years for non-CPLP)." },
        ],
        costs: {
          currency: "EUR",
          currencySymbol: "€",
          items: [
            { label: "D7 visa fee", amountMin: 90, amountMax: 90 },
            { label: "AIMA residence permit", amountMin: 320, amountMax: 320 },
            { label: "NIF via fiscal representative", amountMin: 80, amountMax: 200 },
            { label: "Brazilian criminal record + apostille", amountMin: 50, amountMax: 100 },
            { label: "Health insurance", amountMin: 120, amountMax: 350 },
          ],
        },
        faqs: [
          { q: "Why do Brazilians get faster permanent residence in Portugal?", a: "Brazil is a member of the Community of Portuguese Language Countries (CPLP) and has a bilateral treaty with Portugal (Estatuto de Igualdade). Under these agreements, Brazilian nationals can apply for permanent residence after 2 years of legal residence (vs. 5 years for other nationalities) and have certain rights equivalent to Portuguese citizens once the Estatuto de Igualdade is recognized." },
          { q: "Do I need to learn Portuguese for Portuguese residency?", a: "No Portuguese language requirement exists for the D7 visa or initial residence permit. For citizenship (after 5 years, or 2 years with CPLP), a basic Portuguese language test (A2 level) is required — but for Brazilians this is a very low bar given the shared language." },
        ],
        commonMistakes: [
          "Not obtaining the NIF before the consulate appointment",
          "Apostilling the Brazilian criminal record in the wrong state — federal criminal record from PF must be used, not state-level records",
          "Waiting for AIMA to contact you after arrival — you must proactively book your in-person AIMA appointment",
        ],
      },
    ],
  },

  // ── Ghana → United Kingdom ────────────────────────────────────────────────
  "ghana/united-kingdom": {
    origin: "Ghana",
    originFlag: "🇬🇭",
    destination: "United Kingdom",
    destinationFlag: "🇬🇧",
    visaTypes: [
      {
        slug: "standard-visitor",
        name: "Standard Visitor Visa",
        shortName: "Visitor",
        outcome: "visit",
        processingTime: "3–6 weeks",
        approvalRate: "64%",
        duration: "Up to 6 months per entry",
        fee: "£115",
        legalBasis: "Immigration Rules Part V, Appendix V",
        lastVerified: "2025-07-01",
        requirements: [
          { name: "Ghanaian passport (valid 6+ months beyond intended stay)", description: "Bring the original and a colour photocopy of the bio-data page.", tag: "required" },
          { name: "Bank statements (6 months, clearly showing regular income)", description: "UKVI officers look for evidence of stable, legitimate income — not one-off deposits. Large unexplained cash deposits in the weeks before applying are a red flag.", tag: "required" },
          { name: "Employment letter from Ghanaian employer", description: "On company letterhead, signed by HR, stating your job title, salary, approved leave dates, and that your position remains open on your return.", tag: "required" },
          { name: "Confirmed return ticket and accommodation", description: "A paid return flight booking and hotel reservation or a signed host letter with their UK immigration status.", tag: "required" },
          { name: "Ties to Ghana — property, family, business", description: "The single most scrutinised factor for Ghanaian applicants. Property deeds, utility bills, a business registration certificate, or evidence of dependent family members significantly strengthen your case.", tag: "watch" },
          { name: "Travel history (prior visas)", description: "Previous Schengen, US, or UK visas showing you left on time improve your credibility. Include used passport pages.", tag: "advisable" },
        ],
        timeline: [
          { phase: "Prepare documents", duration: "1–2 weeks", description: "Gather bank statements, employment letter, return flights, and accommodation proof. Do not book flights on a refundable basis — officers notice provisional bookings." },
          { phase: "Apply online at gov.uk", duration: "1 day", description: "Complete the online application and pay the £115 fee. Book biometric appointment at VFS Global in Accra." },
          { phase: "Biometrics at VFS Accra", duration: "Within 2 weeks of application", description: "Attend your appointment at VFS Global in Accra. Your fingerprints and photo are taken and submitted directly to UKVI." },
          { phase: "UKVI processing", duration: "3–6 weeks", description: "No interview required for most applicants. Priority processing (£250) targets 5 business days." },
        ],
        costs: {
          currency: "GBP",
          currencySymbol: "£",
          items: [
            { label: "Standard Visitor visa fee", amountMin: 115, amountMax: 115 },
            { label: "Priority service (optional)", amountMin: 250, amountMax: 250, optional: true },
            { label: "VFS service charge (Accra)", amountMin: 15, amountMax: 30 },
          ],
        },
        faqs: [
          { q: "Why is the refusal rate high for Ghanaian visitor visa applicants?", a: "UKVI officers apply Appendix V: V 4.2 to assess whether they are genuinely satisfied you will leave at the end of your visit. For Ghanaian applicants, the most common refusal grounds are V 4.2(b) — not satisfied you will leave the UK — and V 4.2(e) — not satisfied you can meet the costs of your visit. Strong, verifiable home-country ties (employment, property, dependants) are the most effective counter." },
          { q: "Does having a previous UK refusal affect a new application?", a: "Yes — a prior refusal is disclosed in your application and UKVI can see it. Reapplying too soon without materially addressing the refusal reasons almost always results in another refusal. If Para 320(19) was cited, you must show circumstances have genuinely changed." },
          { q: "Can I apply for a UK Standard Visitor visa even if I have family in the UK?", a: "Yes. Having family in the UK is not a disqualifying factor, but it can increase scrutiny on whether you intend to return. Offset this with equally strong evidence of ties to Ghana — employment, property, and dependants remaining in Ghana." },
        ],
        commonMistakes: [
          "Thin bank statements showing sudden large deposits just before applying",
          "Not providing a proper employer letter — a generic reference is not the same as a leave-approval letter",
          "Booking fully refundable return flights — UKVI officers can distinguish provisional bookings",
          "No evidence of ties to Ghana beyond employment alone",
          "Reapplying within weeks of a refusal without genuinely fixing the stated grounds",
        ],
      },
      {
        slug: "skilled-worker",
        name: "Skilled Worker Visa",
        shortName: "Skilled Worker",
        outcome: "temporary_work",
        processingTime: "3–8 weeks",
        approvalRate: "79%",
        duration: "Up to 5 years (renewable)",
        fee: "£719 (≤3yr) / £1,420 (>3yr)",
        minIncome: "£29,000/yr minimum (2024 threshold)",
        legalBasis: "Immigration Rules HC 395, Appendix Skilled Worker",
        lastVerified: "2025-07-01",
        requirements: [
          { name: "Certificate of Sponsorship (CoS) from a licensed UK employer", description: "Your employer must hold a valid UK Sponsor Licence and assign you a CoS reference number before you apply. The CoS must match your job title and occupation code exactly.", tag: "required" },
          { name: "English language — B1 CEFR minimum", description: "IELTS UKVI (not standard IELTS) minimum scores: Listening 4.0, Reading 4.0, Writing 4.0, Speaking 4.0. A degree taught in English from a recognised university is an accepted alternative.", tag: "required" },
          { name: "Valid Ghanaian passport", description: "Must be valid beyond your planned stay.", tag: "required" },
          { name: "£1,270 in personal savings for 28 consecutive days", description: "Must appear in your bank statements ending no more than 31 days before application. This cannot be gifted or temporarily transferred funds.", tag: "required" },
          { name: "Immigration Health Surcharge (IHS)", description: "£1,035 per year, paid in full upfront. For a 3-year visa: £3,105.", tag: "required" },
          { name: "Salary at or above the occupation 'going rate'", description: "From April 2024, the general minimum is £29,000/year or the published going rate for your occupation code — whichever is higher. Health and care workers have separate rates.", tag: "watch" },
        ],
        timeline: [
          { phase: "Employer assigns CoS", duration: "1–2 weeks", description: "Confirm your employer has a Sponsor Licence and request your CoS reference number." },
          { phase: "Prepare and apply", duration: "1–2 weeks", description: "Gather 28-day bank statements, IELTS UKVI certificate, pay IHS, complete online application at gov.uk." },
          { phase: "Biometrics at VFS Accra", duration: "Within 2 weeks", description: "Book and attend your biometric appointment." },
          { phase: "UKVI processing", duration: "3–8 weeks", description: "Processing from Ghana. Priority service (~£500) targets 5 business days." },
        ],
        costs: {
          currency: "GBP",
          currencySymbol: "£",
          items: [
            { label: "Visa fee (up to 3 years)", amountMin: 719, amountMax: 719 },
            { label: "Immigration Health Surcharge (3 years)", amountMin: 3105, amountMax: 3105, note: "£1,035/year — paid upfront" },
            { label: "IELTS UKVI test", amountMin: 200, amountMax: 215 },
            { label: "VFS biometric service fee", amountMin: 10, amountMax: 30 },
            { label: "Priority service (optional)", amountMin: 500, amountMax: 500, optional: true },
          ],
        },
        faqs: [
          { q: "Does my Ghanaian employer letter need to mention the CoS code?", a: "No — it is your UK sponsor, not your current Ghanaian employer, who provides the CoS. Your current employer provides a reference letter only if UKVI asks about your current employment ties, which is uncommon for Skilled Worker applications." },
          { q: "Can I bring my family to the UK as Skilled Worker dependants?", a: "Yes. Your spouse/civil partner and children under 18 can apply as dependants. Each pays the standard visa fee and IHS. A salary uplift applies for families under the new rules from January 2025." },
        ],
        commonMistakes: [
          "Not verifying the employer's Sponsor Licence is active on the UKVI register before applying",
          "Using a standard IELTS certificate instead of IELTS UKVI",
          "Not maintaining the £1,270 savings for 28 consecutive days before applying",
          "Occupation code on CoS not matching the role described in supporting documents",
        ],
      },
    ],
  },

  // ── Pakistan → United Kingdom ─────────────────────────────────────────────
  "pakistan/united-kingdom": {
    origin: "Pakistan",
    originFlag: "🇵🇰",
    destination: "United Kingdom",
    destinationFlag: "🇬🇧",
    visaTypes: [
      {
        slug: "standard-visitor",
        name: "Standard Visitor Visa",
        shortName: "Visitor",
        outcome: "visit",
        processingTime: "3–8 weeks",
        approvalRate: "55%",
        duration: "Up to 6 months per entry",
        fee: "£115",
        legalBasis: "Immigration Rules Part V, Appendix V",
        lastVerified: "2025-07-01",
        requirements: [
          { name: "Pakistani passport (valid 6+ months beyond intended stay)", description: "Include copies of all stamped pages showing travel history.", tag: "required" },
          { name: "Bank statements — 6 months, showing stable income", description: "A consistent monthly salary credit or business revenue is essential. Sudden large deposits immediately before applying are frequently flagged. For business owners, include company accounts and tax returns.", tag: "required" },
          { name: "Employment letter or business ownership evidence", description: "For employees: employer letter on letterhead stating salary, job title, approved leave, and position held on return. For business owners: registration certificate, tax filings, and evidence of ongoing operations.", tag: "required" },
          { name: "Confirmed return travel and accommodation", description: "Return flight booking and hotel confirmation or a sponsor letter from a UK-based host showing their immigration status.", tag: "required" },
          { name: "Strong ties to Pakistan", description: "Property ownership, dependent family members (spouse, children) remaining in Pakistan, an established business, or a senior position — each significantly reduces the risk of a V 4.2(b) refusal.", tag: "watch" },
          { name: "Previous UK/Schengen/US visa history", description: "Prior visa grants showing on-time departure are the most powerful supporting factor for Pakistani applicants. Include copies of prior visas and entry/exit stamps.", tag: "advisable" },
        ],
        timeline: [
          { phase: "Prepare all documents", duration: "1–2 weeks", description: "Gather bank statements, employment/business evidence, return flights, and accommodation. Build a clear, readable document bundle — disorganised applications take longer and are more likely to be refused." },
          { phase: "Apply online at gov.uk", duration: "1 day", description: "Complete the Standard Visitor application and pay £115. Book a biometric appointment at TLScontact in Karachi, Lahore, or Islamabad." },
          { phase: "Biometrics at TLScontact", duration: "Within 2 weeks", description: "Attend your appointment and submit your supporting documents. TLScontact Islamabad, Lahore, and Karachi all accept Standard Visitor applications." },
          { phase: "UKVI processing", duration: "3–8 weeks", description: "Processing times from Pakistan can be longer than average. Priority service available for £250." },
        ],
        costs: {
          currency: "GBP",
          currencySymbol: "£",
          items: [
            { label: "Standard Visitor visa fee", amountMin: 115, amountMax: 115 },
            { label: "Priority service (optional)", amountMin: 250, amountMax: 250, optional: true },
            { label: "TLScontact service charge", amountMin: 15, amountMax: 35 },
          ],
        },
        faqs: [
          { q: "Why is the UK visitor visa refusal rate higher for Pakistani nationals?", a: "UKVI applies Appendix V paragraph 4.2 to all Standard Visitor applications. For Pakistani nationals, refusals under V 4.2(b) — 'not satisfied you will leave the UK at the end of your visit' — are the most common. Officers assess the totality of your economic and personal ties to Pakistan against the risk of overstaying. Applications that cannot clearly demonstrate those ties in writing tend to be refused regardless of genuine intent." },
          { q: "I was refused before. Can I reapply?", a: "Yes, but only once the circumstances that led to the refusal have genuinely changed. If your previous refusal cited V 4.2(b), reapplying with the same evidence almost always results in the same outcome. Improve your evidence: stronger bank statements, a higher-value property document, additional employer evidence, or a stronger travel history. Para 320(19) applies if you previously had a refusal and your circumstances have not materially changed." },
          { q: "Can my spouse apply separately for a UK visitor visa?", a: "Yes. Each applicant must submit a separate application with their own supporting documents. However, if applying as a family unit, a joint sponsorship letter and combined bank statement showing household income can be submitted alongside individual applications." },
        ],
        commonMistakes: [
          "Submitting bank statements with large unexplained deposits in the 1–2 months before applying",
          "No evidence of a dependent spouse or children remaining in Pakistan",
          "A weak or generic employer letter that doesn't confirm the position is held open",
          "Reapplying too quickly after refusal without addressing the specific refusal reasons",
          "Not including travel history stamps — officers cannot verify compliance without them",
        ],
      },
    ],
  },

  // ── India → Canada ────────────────────────────────────────────────────────
  "india/canada": {
    origin: "India",
    originFlag: "🇮🇳",
    destination: "Canada",
    destinationFlag: "🇨🇦",
    visaTypes: [
      {
        slug: "study-permit",
        name: "Study Permit",
        shortName: "Study Permit",
        outcome: "study",
        processingTime: "20 days (SDS) / 4–12 weeks (standard)",
        approvalRate: "61%",
        duration: "Duration of program + 90 days",
        fee: "CAD $150",
        legalBasis: "IRPA s.30(1), IRPR s.220",
        lastVerified: "2025-07-01",
        requirements: [
          { name: "Letter of Acceptance from a DLI", description: "Acceptance letter from a Designated Learning Institution. Canada's university system requires this before any application can be submitted.", tag: "required" },
          { name: "IELTS Academic — minimum 6.0 overall (SDS: 6.0 in all bands)", description: "Student Direct Stream (SDS) requires a minimum 6.0 in each of the four bands. Standard stream has no mandatory IELTS minimum but most institutions require it.", tag: "required" },
          { name: "Guaranteed Investment Certificate (GIC) — CAD $10,000 (SDS)", description: "Must be from a participating Canadian financial institution (CIBC, SBI Canada, ICICI Bank Canada, etc.). SDS requires the GIC before submission. Standard stream requires equivalent proof of funds.", tag: "required" },
          { name: "Statement of Purpose addressing return to India", description: "This is the highest-risk document. The officer must be satisfied that you genuinely intend to return to India after your studies. Vague or overly ambitious statements that suggest immigration intent lead to s.11(1) IRPA refusals.", tag: "watch" },
          { name: "Proof of sufficient funds (tuition + living)", description: "First year tuition plus CAD $10,000 for living expenses (or CAD $11,000 for Quebec). Must be evidenced by bank statements or the GIC.", tag: "required" },
          { name: "Indian passport valid for the full program duration", description: "Must not expire during the study program. Apply for renewal now if expiry is within 2 years.", tag: "required" },
        ],
        timeline: [
          { phase: "Get DLI acceptance", duration: "Varies by institution", description: "Apply to one or more DLIs and receive your Letter of Acceptance." },
          { phase: "GIC + IELTS", duration: "2–4 weeks", description: "Open a GIC with a participating bank (funds held in trust). Take IELTS Academic (SDS requires 6.0 in all bands)." },
          { phase: "Submit study permit application", duration: "1 week to compile", description: "Apply online. Attach DLI acceptance, GIC proof, IELTS result, Statement of Purpose, and financial evidence." },
          { phase: "Biometrics", duration: "Within 30 days of IRCC request", description: "Book at a VAC in New Delhi, Mumbai, Chandigarh, or Chennai. Must be done promptly after the Biometric Instruction Letter." },
          { phase: "IRCC processing", duration: "20 days (SDS) / 4–12 weeks (standard)", description: "SDS applications are fast-tracked if all documents are in order. Standard stream can be slower, especially during peak seasons (Oct–Jan)." },
        ],
        costs: {
          currency: "CAD",
          currencySymbol: "CA$",
          items: [
            { label: "Study permit application fee", amountMin: 150, amountMax: 150 },
            { label: "Biometrics fee", amountMin: 85, amountMax: 85 },
            { label: "GIC (Student Direct Stream)", amountMin: 10000, amountMax: 10000, note: "Held in trust; released monthly after arrival" },
            { label: "IELTS Academic test (India)", amountMin: 16250, amountMax: 17000, note: "Approx INR equivalent; ~CA$280" },
            { label: "First year tuition", amountMin: 15000, amountMax: 40000, note: "Varies widely by institution and program" },
          ],
        },
        faqs: [
          { q: "What is the Student Direct Stream (SDS) and should I use it?", a: "SDS is a faster track for Indian nationals that cuts processing to ~20 days, compared to 4–12 weeks standard. To qualify: you must have IELTS 6.0 in each band, a CAD $10,000 GIC from a participating bank, a DLI acceptance, and full first-year tuition payment. If you meet the criteria, SDS is almost always the right choice." },
          { q: "Why do so many Indian students get their study permit refused?", a: "The most common refusal ground is s.11(1) IRPA — the officer is not satisfied you will leave Canada after completing your studies. This is evaluated based on your Statement of Purpose, your economic ties to India, and the credibility of your study plan. Students who appear to be using a study permit as an immigration pathway rather than for genuine study are refused. A clear, specific SOP that acknowledges this and explains your return plan is essential." },
          { q: "Can I work in Canada while on a study permit?", a: "Yes — full-time students at DLIs can work up to 20 hours per week off-campus during the academic term and full-time during scheduled breaks. After graduation, most Indian students qualify for a Post-Graduation Work Permit (PGWP) of up to 3 years." },
        ],
        commonMistakes: [
          "A generic Statement of Purpose that reads like a template — officers flag these immediately",
          "Not explaining a credible return-to-India plan after studies",
          "Applying without a GIC when eligible for SDS (slows processing significantly)",
          "Missing the biometrics deadline after the Biometric Instruction Letter",
          "Applying to programs at non-DLI institutions",
        ],
      },
      {
        slug: "express-entry",
        name: "Express Entry — Federal Skilled Worker",
        shortName: "Express Entry",
        outcome: "permanent_residence",
        processingTime: "~6 months after ITA",
        approvalRate: "82%",
        duration: "Permanent Residence",
        fee: "CAD $1,365 + CAD $1,325 RPRF",
        minScore: "470–520 CRS (recent draws)",
        legalBasis: "IRPA s.12(2) / FSWP Reg. SOR/2002-227",
        lastVerified: "2025-07-01",
        requirements: [
          { name: "IELTS General Training — CLB 7 minimum in all four bands", description: "Listening ≥8.0, Reading ≥6.5, Writing ≥6.0, Speaking ≥6.5. Valid for 2 years from test date. CELPIP accepted as alternative.", tag: "required" },
          { name: "Educational Credential Assessment (WES)", description: "Your Indian degree or diploma must be evaluated by WES. Send original transcripts directly from your university to WES — do not forward them yourself. Takes 7–20 weeks.", tag: "required" },
          { name: "Police Clearance Certificate from India and all other countries lived in", description: "Obtain a clearance certificate from the Indian national police authority. Also required for every country where you lived 6+ months since age 18.", tag: "required" },
          { name: "Skilled work experience (TEER 0–3)", description: "Minimum 1 year of paid, continuous work experience in a NOC TEER 0, 1, 2, or 3 occupation within the last 10 years. Self-employment counts if properly documented.", tag: "required" },
          { name: "Medical exam by IRCC-designated physician", description: "Panel physicians in New Delhi, Mumbai, Chennai, Chandigarh, Kolkata, and Hyderabad. Results submitted directly to IRCC by the clinic.", tag: "required" },
          { name: "Settlement funds — CAD $13,757 minimum (single, 2025)", description: "Must be in your name, unencumbered. 6 months of bank statements required. CA income earners already in Canada may be exempt.", tag: "advisable" },
        ],
        timeline: [
          { phase: "Weeks 1–8", duration: "Up to 8 weeks", description: "Take IELTS, submit WES application, obtain police clearance, book medical exam. Run all in parallel — waiting for one before starting another adds months." },
          { phase: "Weeks 8–10", duration: "1–2 weeks", description: "Create your Express Entry profile. Your CRS score is calculated automatically. Higher scores enter the pool with a stronger chance of receiving an ITA in the next draw." },
          { phase: "Pool wait", duration: "Variable", description: "IRCC runs draws every 2 weeks. CRS cutoff varies by draw type (all-programs, STEM, healthcare, etc.). Profiles expire after 12 months." },
          { phase: "ITA received", duration: "60 days (fixed)", description: "You have exactly 60 days from ITA to submit all documents. No extensions." },
          { phase: "+6 months", duration: "~6 months", description: "IRCC processing. Biometrics at a VAC in India. IRCC may issue an Additional Document Request (ADR) — respond within 30 days." },
        ],
        costs: {
          currency: "CAD",
          currencySymbol: "CA$",
          items: [
            { label: "IRCC application fee (principal applicant)", amountMin: 1365, amountMax: 1365 },
            { label: "Right of PR fee (RPRF)", amountMin: 1325, amountMax: 1325, note: "Refunded if refused" },
            { label: "Biometrics", amountMin: 85, amountMax: 85 },
            { label: "IELTS General Training", amountMin: 17500, amountMax: 18500, note: "Approx INR equivalent; ~CA$310" },
            { label: "WES credential evaluation", amountMin: 260, amountMax: 350 },
            { label: "Medical exam (IRCC panel physician)", amountMin: 3000, amountMax: 5000, note: "Approx INR equivalent; ~CA$350–450" },
            { label: "Police clearance + document notarization", amountMin: 1000, amountMax: 3000, note: "INR equivalent; varies by state" },
          ],
        },
        faqs: [
          { q: "Does a Canadian job offer help Indian applicants get an ITA?", a: "Yes significantly. A valid LMIA-based job offer at NOC TEER 0 or 1 adds 200 CRS points; TEER 2 or 3 adds 50 points. A Provincial Nominee Program (PNP) nomination adds 600 points, effectively guaranteeing an ITA in the next draw. Many Indian professionals pursue Ontario's or British Columbia's PNP streams because their tech or engineering backgrounds align with provincial priorities." },
          { q: "My degree is from an Indian state university — will WES accept it?", a: "Yes, WES evaluates degrees from all recognised Indian universities including state universities. However, some smaller or private institutions may take longer or require additional verification. Check whether your specific university is in WES's pre-verified list. If not, expect a longer review." },
          { q: "Can I include my spouse in my Express Entry application?", a: "Yes. Your spouse's language scores and education can contribute to your CRS score. Even if your spouse's English is limited, adding them to your profile usually adds points if they have a degree. Run both scenarios — individual and spousal — before submitting." },
        ],
        commonMistakes: [
          "Using IELTS Academic instead of IELTS General Training for Federal Skilled Worker",
          "Forwarding WES documents yourself instead of having the university send directly",
          "Missing the 60-day ITA window by not starting document collection before the draw",
          "Not claiming all eligible CRS points (language, education, sibling in Canada, French)",
          "Using an IRCC-undesignated physician for the medical exam",
        ],
      },
    ],
  },

  // ── Ghana → Canada ────────────────────────────────────────────────────────
  "ghana/canada": {
    origin: "Ghana",
    originFlag: "🇬🇭",
    destination: "Canada",
    destinationFlag: "🇨🇦",
    visaTypes: [
      {
        slug: "visitor-visa",
        name: "Visitor Visa (Temporary Resident Visa)",
        shortName: "Visitor Visa",
        outcome: "visit",
        processingTime: "2–8 weeks",
        approvalRate: "54%",
        duration: "Up to 6 months per entry",
        fee: "CAD $100",
        legalBasis: "IRPA s.11(1), IRPR s.179",
        lastVerified: "2025-07-01",
        requirements: [
          { name: "Ghanaian passport (valid for the full intended stay)", description: "Bring the original plus copies of all pages.", tag: "required" },
          { name: "Bank statements — 3–6 months showing stable income and savings", description: "Show sufficient funds for the trip plus evidence of income continuity on return. Minimum CAD $2,500–5,000 recommended for a 2-week trip. Consistent deposits over time are more credible than a large balance without income context.", tag: "required" },
          { name: "Employment letter or business evidence", description: "For employed applicants: letter on letterhead confirming position, salary, leave approval, and that your role is held open. For business owners: registration certificate, audited accounts, and operational evidence.", tag: "required" },
          { name: "Confirmed purpose of visit and itinerary", description: "Hotel or host confirmation, a clear travel itinerary, and (for conference/event visits) an invitation letter with event details.", tag: "required" },
          { name: "Compelling home-country ties", description: "The most scrutinised factor for Ghanaian applicants. Property, dependent family in Ghana, ongoing business operations, and a senior employment position are the strongest evidence that you will return.", tag: "watch" },
          { name: "Previous travel history", description: "Prior Schengen, US, or Canadian visas with clean travel history are powerful supporting evidence. Include copies of used visas and relevant stamps.", tag: "advisable" },
        ],
        timeline: [
          { phase: "Prepare documents", duration: "1–2 weeks", description: "Compile bank statements, employment letter, itinerary, and accommodation proof." },
          { phase: "Apply online on IRCC portal", duration: "1 day", description: "Complete the TRV application and pay CAD $100." },
          { phase: "Biometrics", duration: "Within 30 days of IRCC request", description: "Book at a VAC in Accra. Most Ghanaian applicants are required to submit biometrics." },
          { phase: "IRCC processing", duration: "2–8 weeks", description: "Processing times vary. No interview is required for most applicants." },
        ],
        costs: {
          currency: "CAD",
          currencySymbol: "CA$",
          items: [
            { label: "TRV application fee", amountMin: 100, amountMax: 100 },
            { label: "Biometrics fee", amountMin: 85, amountMax: 85 },
          ],
        },
        faqs: [
          { q: "Why is the TRV approval rate lower for Ghanaian applicants?", a: "IRCC officers apply IRPR s.179(b) — they must be satisfied you will leave Canada by the end of your authorised stay. For applicants from countries with historically high overstay rates, this standard is assessed more rigorously. The solution is documentation, not argument: bank statements showing stable income, a signed employer letter confirming you will return to a specific position, and evidence of property or family ties in Ghana." },
          { q: "Can I apply for a TRV even if I've been refused before?", a: "Yes. A prior refusal does not permanently bar you. However, the new application must address the reasons for the previous refusal with materially better documentation. Simply reapplying with the same evidence will almost always result in the same outcome." },
        ],
        commonMistakes: [
          "Submitting bank statements with irregular large deposits that have no clear source",
          "No employer letter confirming the position is held open on return",
          "Vague travel purpose — a general 'tourism' statement without a specific itinerary",
          "Insufficient evidence of ties to Ghana beyond employment",
          "Applying too close to the travel date — allow 8–10 weeks minimum from Ghana",
        ],
      },
    ],
  },

  // ── Kenya → United Kingdom ────────────────────────────────────────────────
  "kenya/united-kingdom": {
    origin: "Kenya",
    originFlag: "🇰🇪",
    destination: "United Kingdom",
    destinationFlag: "🇬🇧",
    visaTypes: [
      {
        slug: "standard-visitor",
        name: "Standard Visitor Visa",
        shortName: "Visitor",
        outcome: "visit",
        processingTime: "3–6 weeks",
        approvalRate: "67%",
        duration: "Up to 6 months per entry",
        fee: "£115",
        legalBasis: "Immigration Rules Part V, Appendix V",
        lastVerified: "2025-07-01",
        requirements: [
          { name: "Kenyan passport (valid 6+ months beyond intended stay)", description: "Include a colour copy of the bio-data page.", tag: "required" },
          { name: "Bank statements — 6 months, showing consistent income", description: "Salary credits, business income, or investment returns. Minimum KES 300,000–500,000 in accessible savings is advisable for a 2-week visit. Statements must be original, stamped by the bank.", tag: "required" },
          { name: "Employment or business evidence", description: "Employed applicants: employer letter on company letterhead confirming position, salary, approved leave dates, and that the role is held open. Business owners: registration certificate and tax compliance documents.", tag: "required" },
          { name: "Return travel booking and accommodation", description: "A confirmed return flight and hotel booking or a signed UK sponsor letter with their immigration status (BRP or passport copy).", tag: "required" },
          { name: "Strong ties to Kenya", description: "Property ownership in Kenya, a dependent family in Kenya, or a senior employment position substantially reduces refusal risk under V 4.2(b). Land title deeds, utility bills, and birth certificates for dependent children are useful evidence.", tag: "watch" },
          { name: "Travel history", description: "Prior Schengen or US visas with compliant travel history improve credibility. Include copies of the visa and entry/exit stamps.", tag: "advisable" },
        ],
        timeline: [
          { phase: "Prepare documents", duration: "1–2 weeks", description: "Gather 6 months of bank statements, employment letter, return flights, and accommodation. Book VFS appointment in Nairobi early — slots fill." },
          { phase: "Apply online at gov.uk", duration: "1 day", description: "Complete the Standard Visitor application and pay £115. Book your biometric appointment at VFS Global Nairobi." },
          { phase: "Biometrics at VFS Nairobi", duration: "Within 2 weeks", description: "Attend your appointment at VFS Global in Upper Hill, Nairobi. Bring originals and copies of all supporting documents." },
          { phase: "UKVI processing", duration: "3–6 weeks", description: "UKVI processes from the UK. Priority service (£250) targets 5 business days from submission." },
        ],
        costs: {
          currency: "GBP",
          currencySymbol: "£",
          items: [
            { label: "Standard Visitor visa fee", amountMin: 115, amountMax: 115 },
            { label: "Priority service (optional)", amountMin: 250, amountMax: 250, optional: true },
            { label: "VFS service charge (Nairobi)", amountMin: 15, amountMax: 30 },
          ],
        },
        faqs: [
          { q: "What are the most common refusal grounds for Kenyan visitor visa applications?", a: "The most common refusal codes for Kenyan applicants are V 4.2(b) — officer not satisfied you will leave the UK — and V 4.2(e) — not satisfied you have sufficient funds. Addressing both requires: a proper employer letter with confirmed leave approval, bank statements showing consistent income (not just a high balance), and evidence of compelling reasons to return to Kenya." },
          { q: "Can I apply for a UK visitor visa if I have family members living in the UK?", a: "Yes, and having family in the UK is not automatically negative. What matters is demonstrating that your ties to Kenya are equally strong or stronger. Include both an invitation letter from your UK family and strong home-country tie evidence simultaneously." },
          { q: "What is the difference between Priority and Standard processing from Kenya?", a: "Standard processing takes 3–6 weeks from the biometric appointment date. Priority service costs an additional £250 and targets a 5-business-day turnaround from VFS submission. Super Priority (same-day, £1,000) is not available from Kenya. Priority is worth the cost if your travel date is within 6 weeks." },
        ],
        commonMistakes: [
          "Thin bank statements — a high balance alone without consistent income history is not convincing",
          "Not confirming approved leave in the employer letter",
          "Relying on informal accommodation arrangements without a signed sponsor letter",
          "No evidence of property or family ties keeping you in Kenya",
          "Applying too close to the travel date — allow at least 6 weeks from Kenya for standard processing",
        ],
      },
    ],
  },
};

// ── Exports ─────────────────────────────────────────────────────────────────

export function getCorridorDefinition(
  originSlug: string,
  destinationSlug: string,
): CorridorDefinition | null {
  return CORRIDORS[`${originSlug}/${destinationSlug}`] ?? null;
}

export function getCorridorVisaType(
  originSlug: string,
  destinationSlug: string,
  visaTypeSlug: string,
): CorridorVisaType | null {
  const corridor = getCorridorDefinition(originSlug, destinationSlug);
  if (!corridor) return null;
  return corridor.visaTypes.find((vt) => vt.slug === visaTypeSlug) ?? null;
}

export function getAllCorridorKeys(): string[] {
  return Object.keys(CORRIDORS);
}

// Popular corridors for hub page display
export const POPULAR_CORRIDORS: Array<{
  originSlug: string;
  destinationSlug: string;
  origin: string;
  destination: string;
  originFlag: string;
  destinationFlag: string;
  highlightVisaType: string;
  approvalRate: string;
  visaTypeCount: number;
}> = [
  { originSlug: "nigeria", destinationSlug: "canada", origin: "Nigeria", destination: "Canada", originFlag: "🇳🇬", destinationFlag: "🇨🇦", highlightVisaType: "Express Entry", approvalRate: "82%", visaTypeCount: 3 },
  { originSlug: "nigeria", destinationSlug: "united-kingdom", origin: "Nigeria", destination: "United Kingdom", originFlag: "🇳🇬", destinationFlag: "🇬🇧", highlightVisaType: "Skilled Worker", approvalRate: "78%", visaTypeCount: 2 },
  { originSlug: "india", destinationSlug: "canada", origin: "India", destination: "Canada", originFlag: "🇮🇳", destinationFlag: "🇨🇦", highlightVisaType: "Express Entry", approvalRate: "82%", visaTypeCount: 2 },
  { originSlug: "ghana", destinationSlug: "united-kingdom", origin: "Ghana", destination: "United Kingdom", originFlag: "🇬🇭", destinationFlag: "🇬🇧", highlightVisaType: "Visitor Visa", approvalRate: "64%", visaTypeCount: 2 },
  { originSlug: "united-kingdom", destinationSlug: "spain", origin: "United Kingdom", destination: "Spain", originFlag: "🇬🇧", destinationFlag: "🇪🇸", highlightVisaType: "Digital Nomad", approvalRate: "78%", visaTypeCount: 2 },
  { originSlug: "india", destinationSlug: "united-kingdom", origin: "India", destination: "United Kingdom", originFlag: "🇮🇳", destinationFlag: "🇬🇧", highlightVisaType: "Skilled Worker", approvalRate: "74%", visaTypeCount: 2 },
  { originSlug: "pakistan", destinationSlug: "united-kingdom", origin: "Pakistan", destination: "United Kingdom", originFlag: "🇵🇰", destinationFlag: "🇬🇧", highlightVisaType: "Visitor Visa", approvalRate: "55%", visaTypeCount: 1 },
  { originSlug: "united-kingdom", destinationSlug: "portugal", origin: "United Kingdom", destination: "Portugal", originFlag: "🇬🇧", destinationFlag: "🇵🇹", highlightVisaType: "D7 Visa", approvalRate: "85%", visaTypeCount: 1 },
  { originSlug: "philippines", destinationSlug: "united-arab-emirates", origin: "Philippines", destination: "United Arab Emirates", originFlag: "🇵🇭", destinationFlag: "🇦🇪", highlightVisaType: "Employment Visa", approvalRate: "91%", visaTypeCount: 1 },
  { originSlug: "kenya", destinationSlug: "united-kingdom", origin: "Kenya", destination: "United Kingdom", originFlag: "🇰🇪", destinationFlag: "🇬🇧", highlightVisaType: "Visitor Visa", approvalRate: "67%", visaTypeCount: 1 },
  { originSlug: "ghana", destinationSlug: "canada", origin: "Ghana", destination: "Canada", originFlag: "🇬🇭", destinationFlag: "🇨🇦", highlightVisaType: "Visitor Visa", approvalRate: "54%", visaTypeCount: 1 },
  { originSlug: "brazil", destinationSlug: "portugal", origin: "Brazil", destination: "Portugal", originFlag: "🇧🇷", destinationFlag: "🇵🇹", highlightVisaType: "D7 Visa", approvalRate: "88%", visaTypeCount: 1 },
];

// Trending searches for the hub page
export const TRENDING_SEARCHES: Array<{
  originFlag: string;
  destinationFlag: string;
  label: string;
  originSlug: string;
  destinationSlug: string;
  visaTypeSlug: string;
}> = [
  { originFlag: "🇳🇬", destinationFlag: "🇨🇦", label: "Nigeria → Canada Express Entry", originSlug: "nigeria", destinationSlug: "canada", visaTypeSlug: "express-entry" },
  { originFlag: "🇮🇳", destinationFlag: "🇨🇦", label: "India → Canada Study Permit", originSlug: "india", destinationSlug: "canada", visaTypeSlug: "study-permit" },
  { originFlag: "🇮🇳", destinationFlag: "🇬🇧", label: "India → UK Skilled Worker", originSlug: "india", destinationSlug: "united-kingdom", visaTypeSlug: "skilled-worker" },
  { originFlag: "🇬🇭", destinationFlag: "🇬🇧", label: "Ghana → UK Visitor Visa", originSlug: "ghana", destinationSlug: "united-kingdom", visaTypeSlug: "standard-visitor" },
  { originFlag: "🇵🇰", destinationFlag: "🇬🇧", label: "Pakistan → UK Visitor Visa", originSlug: "pakistan", destinationSlug: "united-kingdom", visaTypeSlug: "standard-visitor" },
  { originFlag: "🇬🇧", destinationFlag: "🇪🇸", label: "UK → Spain Digital Nomad", originSlug: "united-kingdom", destinationSlug: "spain", visaTypeSlug: "digital-nomad-visa" },
  { originFlag: "🇰🇪", destinationFlag: "🇬🇧", label: "Kenya → UK Visitor Visa", originSlug: "kenya", destinationSlug: "united-kingdom", visaTypeSlug: "standard-visitor" },
  { originFlag: "🇳🇬", destinationFlag: "🇬🇧", label: "Nigeria → UK Skilled Worker", originSlug: "nigeria", destinationSlug: "united-kingdom", visaTypeSlug: "skilled-worker" },
  { originFlag: "🇬🇧", destinationFlag: "🇵🇹", label: "UK → Portugal D7 Visa", originSlug: "united-kingdom", destinationSlug: "portugal", visaTypeSlug: "d7-visa" },
];
