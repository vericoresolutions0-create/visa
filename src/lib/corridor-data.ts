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
  { originSlug: "united-kingdom", destinationSlug: "spain", origin: "United Kingdom", destination: "Spain", originFlag: "🇬🇧", destinationFlag: "🇪🇸", highlightVisaType: "Digital Nomad", approvalRate: "78%", visaTypeCount: 2 },
  { originSlug: "united-kingdom", destinationSlug: "portugal", origin: "United Kingdom", destination: "Portugal", originFlag: "🇬🇧", destinationFlag: "🇵🇹", highlightVisaType: "D7 Visa", approvalRate: "85%", visaTypeCount: 1 },
  { originSlug: "india", destinationSlug: "united-kingdom", origin: "India", destination: "United Kingdom", originFlag: "🇮🇳", destinationFlag: "🇬🇧", highlightVisaType: "Skilled Worker", approvalRate: "74%", visaTypeCount: 2 },
  { originSlug: "philippines", destinationSlug: "united-arab-emirates", origin: "Philippines", destination: "United Arab Emirates", originFlag: "🇵🇭", destinationFlag: "🇦🇪", highlightVisaType: "Employment Visa", approvalRate: "91%", visaTypeCount: 1 },
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
  { originFlag: "🇮🇳", destinationFlag: "🇬🇧", label: "India → UK Skilled Worker", originSlug: "india", destinationSlug: "united-kingdom", visaTypeSlug: "skilled-worker" },
  { originFlag: "🇬🇧", destinationFlag: "🇪🇸", label: "UK → Spain Digital Nomad", originSlug: "united-kingdom", destinationSlug: "spain", visaTypeSlug: "digital-nomad-visa" },
  { originFlag: "🇵🇭", destinationFlag: "🇦🇪", label: "Philippines → UAE Employment", originSlug: "philippines", destinationSlug: "united-arab-emirates", visaTypeSlug: "employment-visa" },
  { originFlag: "🇧🇷", destinationFlag: "🇵🇹", label: "Brazil → Portugal D7 Visa", originSlug: "brazil", destinationSlug: "portugal", visaTypeSlug: "d7-visa" },
  { originFlag: "🇳🇬", destinationFlag: "🇬🇧", label: "Nigeria → UK Skilled Worker", originSlug: "nigeria", destinationSlug: "united-kingdom", visaTypeSlug: "skilled-worker" },
  { originFlag: "🇬🇧", destinationFlag: "🇵🇹", label: "UK → Portugal D7 Visa", originSlug: "united-kingdom", destinationSlug: "portugal", visaTypeSlug: "d7-visa" },
];
