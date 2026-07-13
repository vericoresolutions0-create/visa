export type VisaType = "tourist" | "student" | "work" | "family" | "transit";

export type ChecklistItem = {
  id: string;
  title: string;
  description: string;
  where: string;
  tip?: string;
  required: boolean;
};

export type VisaChecklist = {
  visaType: VisaType;
  destination: string;
  origin: string;
  processingTime: string;
  fee: string;
  successTip: string;
  lastVerified: string; // ISO date string e.g. "2026-04-01"
  embassyUrl?: string;  // Official embassy/application portal URL, when known
  items: ChecklistItem[];
};

// Internal type for raw checklist entries before embassy/date injection
type RawVisaChecklist = Omit<VisaChecklist, "lastVerified" | "embassyUrl">;

export const ORIGIN_COUNTRIES = [
  "Nigeria", "Ghana", "Kenya", "Ethiopia", "South Africa",
  "Egypt", "Senegal", "Tanzania", "Uganda", "Cameroon",
  "Pakistan", "Bangladesh", "India", "Philippines", "Indonesia",
  "Brazil", "Mexico", "Colombia",
  "Nigeria (living in Poland)", "Nigeria (living in Germany)", "Nigeria (living in UK)",
  "Other"
];

export const DESTINATION_COUNTRIES = [
  "United Kingdom", "United States", "Canada", "Germany",
  "France", "Netherlands", "Australia", "Ireland", "Italy", "Spain"
];

export const VISA_TYPES: { value: VisaType; label: string; description: string }[] = [
  { value: "tourist", label: "Tourist / Visit", description: "Visiting for holidays, tourism or short visits" },
  { value: "student", label: "Student", description: "Studying at a university or school" },
  { value: "work", label: "Work", description: "Employment or work permit" },
  { value: "family", label: "Family / Spouse", description: "Joining family or spouse abroad" },
  { value: "transit", label: "Transit", description: "Passing through the country" },
];

// Checklist database
const CHECKLISTS: Record<string, Record<VisaType, RawVisaChecklist>> = {
  "United Kingdom": {
    tourist: {
      visaType: "tourist",
      destination: "United Kingdom",
      origin: "Africa/Asia/LatAm",
      processingTime: "3–8 weeks",
      fee: "£115 (~$145)",
      successTip: "Strong bank statements and ties to your home country (job, property, family) are the #1 factor in approval.",
      items: [
        { id: "uk-t-1", title: "Valid Passport", description: "Must be valid for the entire duration of your trip. Should have at least 2 blank pages.", where: "Your passport issuing authority. Renew if expiring soon.", required: true },
        { id: "uk-t-2", title: "Completed Online Application Form", description: "Fill out the UK Standard Visitor Visa application on the official UK government website.", where: "gov.uk/standard-visitor-visa", tip: "Do NOT use third-party websites — many are scams.", required: true },
        { id: "uk-t-3", title: "Biometric Appointment Confirmation", description: "Book and attend a biometric enrollment appointment at a UK Visa Application Centre.", where: "TLScontact or VFS Global centre in your country.", required: true },
        { id: "uk-t-4", title: "Bank Statements (6 months)", description: "Must show consistent income and a healthy balance. Avoid large unexplained cash deposits.", where: "Your bank. Request official stamped statements, not printouts.", tip: "A minimum of $3,000–$5,000 equivalent is advisable for a 2-week trip.", required: true },
        { id: "uk-t-5", title: "Proof of Employment or Business", description: "Letter from your employer stating your position, salary, and approved leave dates. If self-employed, provide business registration and tax returns.", where: "Your employer's HR department or your business registration documents.", required: true },
        { id: "uk-t-6", title: "Accommodation Proof", description: "Hotel booking confirmation or letter from host in the UK.", where: "Book a refundable hotel or get invitation letter from your UK host.", required: true },
        { id: "uk-t-7", title: "Return Flight Ticket", description: "Book a refundable return ticket showing entry and exit from the UK.", where: "Any airline or travel agent. Use refundable fares to avoid loss if rejected.", tip: "Never book non-refundable tickets before visa approval.", required: true },
        { id: "uk-t-8", title: "Travel Insurance", description: "Coverage for medical emergencies during your trip (recommended but not mandatory).", where: "Any reputable insurance provider in your country.", required: false },
        { id: "uk-t-9", title: "Proof of Ties to Home Country", description: "Evidence you will return home: property ownership, children's school records, business ownership.", where: "Land documents, school letters, business registration.", tip: "This is CRITICAL. Embassy wants proof you won't overstay.", required: true },
        { id: "uk-t-10", title: "Invitation Letter (if visiting someone)", description: "A signed letter from your UK host with their address, status in UK, and relationship to you.", where: "Written and signed by your UK host.", required: false },
      ]
    },
    student: {
      visaType: "student",
      destination: "United Kingdom",
      origin: "Africa/Asia/LatAm",
      processingTime: "3–6 weeks",
      fee: "£490 (~$620)",
      successTip: "Your CAS number from your university is the most critical document. Without it, nothing else matters.",
      items: [
        { id: "uk-s-1", title: "Valid Passport", description: "Must be valid for your entire course duration.", where: "Your passport issuing authority.", required: true },
        { id: "uk-s-2", title: "CAS (Confirmation of Acceptance for Studies)", description: "A unique reference number issued by your UK university after accepting your offer.", where: "Directly from your UK university's international admissions office.", tip: "This is the most important document. Apply only after receiving this.", required: true },
        { id: "uk-s-3", title: "Proof of English Language", description: "IELTS (usually 6.0+), TOEFL, or equivalent proof of English proficiency.", where: "Your test provider (British Council for IELTS).", required: true },
        { id: "uk-s-4", title: "Financial Evidence", description: "Bank statements showing you can cover tuition + living costs. UK requires proof of £1,334/month for London, £1,023 outside London.", where: "Your bank. Must show funds held for at least 28 consecutive days.", required: true },
        { id: "uk-s-5", title: "Academic Transcripts & Certificates", description: "Previous degrees, diplomas, and academic certificates.", where: "Your previous schools/universities.", required: true },
        { id: "uk-s-6", title: "ATAS Certificate (if applicable)", description: "Academic Technology Approval Scheme — required for certain science/engineering courses.", where: "gov.uk/guidance/academic-technology-approval-scheme", required: false },
        { id: "uk-s-7", title: "Tuberculosis (TB) Test Results", description: "Required if you are from a listed country (Nigeria, Ghana, Pakistan etc.).", where: "An approved clinic listed on the UK Home Office website.", required: true },
        { id: "uk-s-8", title: "Parental Consent (if under 18)", description: "Written consent from parents or guardians.", where: "Written and notarized by a lawyer.", required: false },
      ]
    },
    work: {
      visaType: "work",
      destination: "United Kingdom",
      origin: "Africa/Asia/LatAm",
      processingTime: "3–8 weeks",
      fee: "£719 (~$905) + Immigration Health Surcharge",
      successTip: "You MUST have a job offer from a UK employer with a Sponsor Licence before applying. You cannot apply without a Certificate of Sponsorship.",
      items: [
        { id: "uk-w-1", title: "Valid Passport", description: "Valid for the duration of your intended stay.", where: "Your passport issuing authority.", required: true },
        { id: "uk-w-2", title: "Certificate of Sponsorship (CoS)", description: "A unique reference number from your UK employer. They must be a licensed sponsor.", where: "Your UK employer. They apply for this on your behalf.", tip: "Without this, you cannot apply. Confirm your employer has a Sponsor Licence.", required: true },
        { id: "uk-w-3", title: "Proof of Meeting Salary Threshold", description: "Your job must meet the minimum salary requirement (£38,700 as of 2024 for most roles).", where: "Confirmed in your employment contract or offer letter.", required: true },
        { id: "uk-w-4", title: "English Language Proof", description: "IELTS B1 level or higher, or degree taught in English.", where: "British Council for IELTS.", required: true },
        { id: "uk-w-5", title: "Bank Statements", description: "Show £1,270 in savings held for 28 days to prove you can support yourself on arrival.", where: "Your bank.", required: true },
        { id: "uk-w-6", title: "Tuberculosis Test (if required)", description: "Required from listed countries including Nigeria, Ghana, Pakistan.", where: "Approved UK Home Office clinic.", required: true },
        { id: "uk-w-7", title: "Criminal Record Certificate", description: "Police clearance certificate showing no criminal record.", where: "Your national police service or Ministry of Interior.", required: false },
      ]
    },
    family: {
      visaType: "family",
      destination: "United Kingdom",
      origin: "Africa/Asia/LatAm",
      processingTime: "8–24 weeks",
      fee: "£1,846 (~$2,320) outside UK",
      successTip: "Proving the genuine nature of your relationship is everything. Provide years of communication history, photos, joint finances — the more evidence the better.",
      items: [
        { id: "uk-f-1", title: "Valid Passport", description: "Valid for intended duration of stay.", where: "Passport issuing authority.", required: true },
        { id: "uk-f-2", title: "Sponsor's Documents (UK Partner)", description: "UK partner's passport, proof of settlement or citizenship, proof of address.", where: "Your UK partner provides these.", required: true },
        { id: "uk-f-3", title: "Proof of Relationship", description: "Marriage certificate, civil partnership certificate, or evidence of cohabitation for 2+ years.", where: "Your local registry office for marriage certificates.", required: true },
        { id: "uk-f-4", title: "Evidence of Genuine Relationship", description: "Chat history, photos together, travel records, joint accounts, letters.", where: "Your personal records, phone, email exports.", tip: "Print hundreds of photos. Include dates and locations.", required: true },
        { id: "uk-f-5", title: "Financial Requirements", description: "UK sponsor must earn at least £29,000/year (2024 threshold) to sponsor you.", where: "UK partner's payslips and P60 tax documents.", required: true },
        { id: "uk-f-6", title: "English Language Test", description: "A2 English level minimum from an approved provider.", where: "British Council or approved test centre.", required: true },
        { id: "uk-f-7", title: "Tuberculosis Test", description: "Required for applicants from listed countries.", where: "Approved UK Home Office clinic.", required: true },
      ]
    },
    transit: {
      visaType: "transit",
      destination: "United Kingdom",
      origin: "Africa/Asia/LatAm",
      processingTime: "1–3 weeks",
      fee: "£64 (~$80)",
      successTip: "If you hold a valid US, Canadian, Australian, or Schengen visa, you may not need a UK transit visa. Check first.",
      items: [
        { id: "uk-tr-1", title: "Valid Passport", description: "Must be valid for your entire transit period.", where: "Your passport issuing authority.", required: true },
        { id: "uk-tr-2", title: "Onward Travel Ticket", description: "Confirmed booking showing you are traveling through the UK to another country.", where: "Your airline or travel agent.", required: true },
        { id: "uk-tr-3", title: "Visa for Final Destination", description: "Valid visa for the country you are ultimately traveling to.", where: "That country's embassy.", required: true },
        { id: "uk-tr-4", title: "Proof of Funds", description: "Show you have enough money for your transit and onward journey.", where: "Your bank statements.", required: true },
      ]
    }
  },
  "Canada": {
    tourist: {
      visaType: "tourist",
      destination: "Canada",
      origin: "Africa/Asia/LatAm",
      processingTime: "2–27 weeks (varies widely)",
      fee: "CAD $100 (~$75 USD)",
      successTip: "Canada is notoriously difficult for African applicants. Strong financial proof and documented ties to home country are non-negotiable.",
      items: [
        { id: "ca-t-1", title: "Valid Passport", description: "Must be valid for at least 6 months beyond your planned stay.", where: "Your passport issuing authority.", required: true },
        { id: "ca-t-2", title: "Online Application (IMM 5257)", description: "Complete the Temporary Resident Visa application on IRCC website.", where: "canada.ca/en/immigration-refugees-citizenship", required: true },
        { id: "ca-t-3", title: "Biometric Enrollment", description: "Fingerprints and photo at a Visa Application Centre.", where: "VFS Global centre in your country.", required: true },
        { id: "ca-t-4", title: "Bank Statements (6 months)", description: "Showing sufficient funds — generally CAD $2,500–$5,000 minimum per person.", where: "Your bank. Must be official stamped statements.", required: true },
        { id: "ca-t-5", title: "Proof of Employment", description: "Employer letter confirming job, salary, and approved leave.", where: "Your HR department.", required: true },
        { id: "ca-t-6", title: "Travel Itinerary", description: "Flight bookings and accommodation plans in Canada.", where: "Book refundable tickets and hotels.", required: true },
        { id: "ca-t-7", title: "Invitation Letter (if applicable)", description: "From your Canadian host including their status in Canada.", where: "Your Canadian host.", required: false },
        { id: "ca-t-8", title: "Proof of Ties to Home Country", description: "Property, family, employment — evidence you will return.", where: "Your employer, land registry, family documents.", tip: "This is CRITICAL for African applicants.", required: true },
        { id: "ca-t-9", title: "Travel History", description: "Previous visas showing you have traveled and returned. Copy of old passports.", where: "Your old passports and previous visa stamps.", tip: "Prior US/UK/Schengen visas significantly boost approval chances.", required: false },
      ]
    },
    student: {
      visaType: "student",
      destination: "Canada",
      origin: "Africa/Asia/LatAm",
      processingTime: "8–16 weeks",
      fee: "CAD $150 (~$110 USD)",
      successTip: "Apply through the Student Direct Stream (SDS) if eligible — it is much faster and has higher approval rates.",
      items: [
        { id: "ca-s-1", title: "Valid Passport", description: "Valid for entire duration of your study program.", where: "Passport issuing authority.", required: true },
        { id: "ca-s-2", title: "Letter of Acceptance", description: "From a Designated Learning Institution (DLI) in Canada.", where: "Your Canadian school's admissions office.", required: true },
        { id: "ca-s-3", title: "Proof of Financial Support", description: "CAD $10,000 minimum per year plus first-year tuition fees.", where: "Your bank statements or GIC (Guaranteed Investment Certificate).", tip: "GIC through CIBC or SBI Canada is accepted for SDS.", required: true },
        { id: "ca-s-4", title: "Language Test Results", description: "IELTS (6.0+ for SDS) or TEF for French programs.", where: "British Council or approved test centre.", required: true },
        { id: "ca-s-5", title: "Passport Photos", description: "Two recent passport-size photos meeting IRCC specifications.", where: "Any photo studio.", required: true },
        { id: "ca-s-6", title: "Medical Exam (if required)", description: "Immigration medical exam from a Panel Physician.", where: "IRCC approved panel physician in your country.", required: false },
      ]
    },
    work: {
      visaType: "work",
      destination: "Canada",
      origin: "Africa/Asia/LatAm",
      processingTime: "varies by stream",
      fee: "CAD $155 (~$115 USD)",
      successTip: "Express Entry is the main pathway. Build your CRS score through education, language, and work experience.",
      items: [
        { id: "ca-w-1", title: "Valid Passport", description: "Valid passport.", where: "Passport issuing authority.", required: true },
        { id: "ca-w-2", title: "Job Offer / LMIA", description: "Labour Market Impact Assessment-approved job offer from a Canadian employer (for most streams).", where: "Your Canadian employer.", required: true },
        { id: "ca-w-3", title: "Educational Credential Assessment (ECA)", description: "Verification that your foreign degree is equivalent to Canadian standards.", where: "WES (World Education Services) — wes.org", tip: "Takes 7–12 weeks. Apply early.", required: true },
        { id: "ca-w-4", title: "Language Test", description: "IELTS or CELPIP for English, TEF for French.", where: "British Council or approved centre.", required: true },
        { id: "ca-w-5", title: "Police Clearance Certificates", description: "From every country you have lived in for 6+ months.", where: "Your national police service.", required: true },
        { id: "ca-w-6", title: "Medical Exam", description: "From a panel physician approved by IRCC.", where: "IRCC panel physician list.", required: true },
      ]
    },
    family: {
      visaType: "family",
      destination: "Canada",
      origin: "Africa/Asia/LatAm",
      processingTime: "12–24 months",
      fee: "CAD $1,050 (~$775 USD)",
      successTip: "The sponsoring Canadian partner must prove they meet income requirements and will financially support you.",
      items: [
        { id: "ca-f-1", title: "Valid Passport", description: "Valid for entire intended stay.", where: "Passport issuing authority.", required: true },
        { id: "ca-f-2", title: "Proof of Relationship", description: "Marriage certificate or proof of common-law partnership (1 year cohabitation).", where: "Registry office.", required: true },
        { id: "ca-f-3", title: "Sponsor's Proof of Income", description: "Canadian sponsor's tax returns (NOA) showing they meet minimum income requirements.", where: "Canada Revenue Agency documents from your Canadian partner.", required: true },
        { id: "ca-f-4", title: "Evidence of Genuine Relationship", description: "Photos, communication records, visit history, shared accounts.", where: "Personal records.", required: true },
        { id: "ca-f-5", title: "Police Clearance", description: "From every country lived in for 6+ months.", where: "National police service.", required: true },
        { id: "ca-f-6", title: "Medical Exam", description: "From an IRCC panel physician.", where: "IRCC panel physician.", required: true },
        { id: "ca-f-7", title: "Biometrics", description: "Fingerprints and photo at VAC.", where: "VFS Global VAC.", required: true },
      ]
    },
    transit: {
      visaType: "transit",
      destination: "Canada",
      origin: "Africa/Asia/LatAm",
      processingTime: "1–4 weeks",
      fee: "CAD $15 (~$11 USD)",
      successTip: "You may be exempt if you hold a valid US visa. Always check before applying.",
      items: [
        { id: "ca-tr-1", title: "Valid Passport", description: "Valid passport.", where: "Passport issuing authority.", required: true },
        { id: "ca-tr-2", title: "Transit Visa Application", description: "Apply through IRCC online portal.", where: "canada.ca", required: true },
        { id: "ca-tr-3", title: "Proof of Onward Travel", description: "Confirmed booking to final destination.", where: "Your airline.", required: true },
        { id: "ca-tr-4", title: "Destination Country Visa", description: "Valid visa for your final destination.", where: "That country's embassy.", required: true },
      ]
    }
  },
  "United States": {
    tourist: {
      visaType: "tourist",
      destination: "United States",
      origin: "Africa/Asia/LatAm",
      processingTime: "2–18 months (interview wait times vary)",
      fee: "$185 USD (non-refundable)",
      successTip: "The DS-160 form and interview are everything. Be honest, concise, and confident. Show strong financial ties to home country.",
      items: [
        { id: "us-t-1", title: "Valid Passport", description: "Must be valid for at least 6 months beyond your intended stay.", where: "Your passport issuing authority.", required: true },
        { id: "us-t-2", title: "DS-160 Confirmation Page", description: "Complete the online nonimmigrant visa application form.", where: "ceac.state.gov — official US State Department website.", tip: "Save your application ID frequently. The form times out.", required: true },
        { id: "us-t-3", title: "Visa Fee Payment Receipt", description: "Pay the $185 MRV fee before scheduling your interview.", where: "ustraveldocs.com for your country.", required: true },
        { id: "us-t-4", title: "Interview Appointment Confirmation", description: "Schedule your visa interview at the US Embassy or Consulate.", where: "ustraveldocs.com", tip: "Book as early as possible — wait times in Nigeria can exceed 500 days.", required: true },
        { id: "us-t-5", title: "Photo (5x5 cm, white background)", description: "Recent passport photograph meeting US visa photo requirements.", where: "Any photo studio.", required: true },
        { id: "us-t-6", title: "Bank Statements (6 months)", description: "Showing strong financial standing and ability to fund your trip.", where: "Your bank.", required: true },
        { id: "us-t-7", title: "Proof of Employment / Income", description: "Employer letter, pay slips, tax returns.", where: "Your HR department or accountant.", required: true },
        { id: "us-t-8", title: "Ties to Home Country", description: "Property deeds, family records, business documents, employment letters.", where: "Your employer, land registry, family documents.", tip: "This determines if you will return home. It is the #1 question in the interview.", required: true },
        { id: "us-t-9", title: "Travel Itinerary", description: "Outline of your plans, places you intend to visit.", where: "Create a simple day-by-day plan.", required: false },
        { id: "us-t-10", title: "Previous US Visas (if any)", description: "Old passports with US visa stamps.", where: "Your previous passports.", required: false },
      ]
    },
    student: {
      visaType: "student",
      destination: "United States",
      origin: "Africa/Asia/LatAm",
      processingTime: "3–8 weeks after SEVIS payment",
      fee: "$185 + $350 SEVIS fee",
      successTip: "Get your I-20 from the school first. Without it, you cannot proceed with anything else.",
      items: [
        { id: "us-s-1", title: "Valid Passport", description: "Valid passport.", where: "Passport issuing authority.", required: true },
        { id: "us-s-2", title: "Form I-20", description: "Certificate of Eligibility for Nonimmigrant Student Status issued by your US school.", where: "Your US school's designated school official (DSO).", required: true },
        { id: "us-s-3", title: "SEVIS Fee Payment (I-901)", description: "Pay the $350 SEVIS fee online.", where: "fmjfee.com", required: true },
        { id: "us-s-4", title: "DS-160 Form", description: "Complete online nonimmigrant visa application.", where: "ceac.state.gov", required: true },
        { id: "us-s-5", title: "Financial Evidence", description: "Bank statements or scholarship letters proving you can fund your studies and living expenses.", where: "Your bank or scholarship provider.", required: true },
        { id: "us-s-6", title: "Academic Transcripts", description: "Previous academic records.", where: "Your previous school.", required: true },
        { id: "us-s-7", title: "English Test Score", description: "TOEFL or IELTS score accepted by your US school.", where: "ETS for TOEFL, British Council for IELTS.", required: true },
      ]
    },
    work: {
      visaType: "work",
      destination: "United States",
      origin: "Africa/Asia/LatAm",
      processingTime: "3–6 months (H-1B lottery in April)",
      fee: "$460–$4,500+ depending on visa type",
      successTip: "H-1B requires employer sponsorship and passing the lottery. O-1 (extraordinary ability) is harder to qualify but has no lottery. Explore all options.",
      items: [
        { id: "us-w-1", title: "Valid Passport", description: "Valid passport.", where: "Passport issuing authority.", required: true },
        { id: "us-w-2", title: "I-129 Petition Approval", description: "Your US employer files this petition with USCIS on your behalf.", where: "Your US employer and their immigration attorney.", required: true },
        { id: "us-w-3", title: "DS-160 Form", description: "Online nonimmigrant visa application.", where: "ceac.state.gov", required: true },
        { id: "us-w-4", title: "Job Offer Letter", description: "Formal employment offer from your US employer.", where: "Your US employer.", required: true },
        { id: "us-w-5", title: "Educational Credentials", description: "Degrees and transcripts. May need credential evaluation.", where: "WES or your school.", required: true },
        { id: "us-w-6", title: "Resume / CV", description: "Detailed work history.", where: "Your personal records.", required: true },
      ]
    },
    family: {
      visaType: "family",
      destination: "United States",
      origin: "Africa/Asia/LatAm",
      processingTime: "12 months – 10+ years depending on category",
      fee: "$325–$535",
      successTip: "Immediate relative petitions (spouse of US citizen) are fastest. Other family categories have long waiting lists.",
      items: [
        { id: "us-f-1", title: "Valid Passport", description: "Valid passport.", where: "Passport issuing authority.", required: true },
        { id: "us-f-2", title: "Approved I-130 Petition", description: "Filed by your US citizen or permanent resident relative.", where: "Your US relative files with USCIS.", required: true },
        { id: "us-f-3", title: "Proof of Relationship", description: "Marriage certificate, birth certificate showing relationship.", where: "Registry office.", required: true },
        { id: "us-f-4", title: "Affidavit of Support (I-864)", description: "Your US sponsor proves income to support you.", where: "Filed by US sponsor.", required: true },
        { id: "us-f-5", title: "Medical Exam", description: "From a USCIS civil surgeon.", where: "USCIS-approved physician.", required: true },
        { id: "us-f-6", title: "Police Clearance", description: "From every country lived in for 12+ months.", where: "National police service.", required: true },
      ]
    },
    transit: {
      visaType: "transit",
      destination: "United States",
      origin: "Africa/Asia/LatAm",
      processingTime: "varies",
      fee: "$185",
      successTip: "US transit visa (C visa) requirements are similar to tourist visa. Many travelers with valid tourist visas can transit without extra visa.",
      items: [
        { id: "us-tr-1", title: "Valid Passport", description: "Valid passport.", where: "Passport issuing authority.", required: true },
        { id: "us-tr-2", title: "DS-160 Form", description: "Online visa application.", where: "ceac.state.gov", required: true },
        { id: "us-tr-3", title: "Onward Travel Documents", description: "Proof of travel continuing beyond the US.", where: "Your airline.", required: true },
        { id: "us-tr-4", title: "Destination Country Visa", description: "Valid entry document for your final destination.", where: "That country's embassy.", required: true },
      ]
    }
  },
  "Germany": {
    tourist: {
      visaType: "tourist",
      destination: "Germany",
      origin: "Africa/Asia/LatAm",
      processingTime: "2–6 weeks",
      fee: "€90 (~$97 USD)",
      successTip: "Germany is your entry to the entire Schengen zone (26 countries). Apply at German embassy only if Germany is your main destination.",
      items: [
        { id: "de-t-1", title: "Valid Passport", description: "Issued within the last 10 years, valid 3 months beyond your stay, with 2 blank pages.", where: "Passport issuing authority.", required: true },
        { id: "de-t-2", title: "Schengen Visa Application Form", description: "Completed and signed application form.", where: "German embassy website or in person at VFS Global.", required: true },
        { id: "de-t-3", title: "Passport Photos (2)", description: "Biometric passport photos on white background.", where: "Any professional photo studio.", required: true },
        { id: "de-t-4", title: "Travel Insurance", description: "Minimum €30,000 coverage, valid for all Schengen countries.", where: "Any reputable insurance provider. AON, Allianz commonly accepted.", required: true },
        { id: "de-t-5", title: "Bank Statements (3 months)", description: "Showing at least €45/day per person.", where: "Your bank.", required: true },
        { id: "de-t-6", title: "Proof of Accommodation", description: "Hotel bookings or host invitation for entire trip.", where: "Booking.com (use free cancellation) or host letter.", required: true },
        { id: "de-t-7", title: "Return Flight Ticket", description: "Confirmed booking entering and exiting Schengen zone.", where: "Airline or travel agent.", required: true },
        { id: "de-t-8", title: "Proof of Employment", description: "Employer letter + 3 months payslips or business proof.", where: "HR department.", required: true },
        { id: "de-t-9", title: "Proof of Ties to Home Country", description: "Evidence of obligations that require your return.", where: "Property documents, employer letter, family records.", required: true },
      ]
    },
    student: {
      visaType: "student",
      destination: "Germany",
      origin: "Africa/Asia/LatAm",
      processingTime: "6–12 weeks",
      fee: "€75 (~$80 USD)",
      successTip: "Many German universities are tuition-free but you need a blocked account (Sperrkonto) showing €11,208 per year.",
      items: [
        { id: "de-s-1", title: "Valid Passport", description: "Valid passport.", where: "Passport issuing authority.", required: true },
        { id: "de-s-2", title: "University Admission Letter", description: "Official acceptance from a German university.", where: "Your German university.", required: true },
        { id: "de-s-3", title: "Blocked Bank Account (Sperrkonto)", description: "€11,208 blocked in a German-approved account for living expenses.", where: "Deutsche Bank, Fintiba, or Expatrio blocked account services.", tip: "Fintiba and Expatrio are specifically designed for international students.", required: true },
        { id: "de-s-4", title: "Language Proficiency", description: "German (B2/C1) for German-taught programs, IELTS/TOEFL for English programs.", where: "Goethe Institut for German, British Council for IELTS.", required: true },
        { id: "de-s-5", title: "Academic Certificates", description: "Secondary and university transcripts, translated into German or English.", where: "Your previous schools + a certified translator.", required: true },
        { id: "de-s-6", title: "Health Insurance", description: "Public German student health insurance (TK, AOK, Barmer).", where: "Sign up online with any public German health insurer.", required: true },
        { id: "de-s-7", title: "Accommodation Proof", description: "Confirmed student dormitory or rental contract in Germany.", where: "Your university's student services.", required: true },
      ]
    },
    work: {
      visaType: "work",
      destination: "Germany",
      origin: "Africa/Asia/LatAm",
      processingTime: "4–12 weeks",
      fee: "€100 (~$107 USD)",
      successTip: "Germany's Chancenkarte (Opportunity Card) is a new points-based visa that lets you enter Germany to look for work without a job offer first. It is a game changer for skilled workers.",
      items: [
        { id: "de-w-1", title: "Valid Passport", description: "Valid passport.", where: "Passport issuing authority.", required: true },
        { id: "de-w-2", title: "Job Offer or Employment Contract", description: "From a German employer. Must show position and salary.", where: "Your German employer.", required: true },
        { id: "de-w-3", title: "Recognized Qualification", description: "Your degree or professional qualification recognized as equivalent to German standards.", where: "anabin.kmk.org — check recognition status. Apply for recognition via German authorities.", required: true },
        { id: "de-w-4", title: "Language Skills", description: "B1–B2 German required for most jobs. English sufficient for tech/international companies.", where: "Goethe Institut certification.", required: false },
        { id: "de-w-5", title: "CV in German Format", description: "German-style CV (Lebenslauf) with photo.", where: "Your personal records.", required: true },
        { id: "de-w-6", title: "Criminal Record Certificate", description: "Police clearance from your home country.", where: "National police service.", required: true },
        { id: "de-w-7", title: "Health Insurance", description: "Proof of health coverage.", where: "Any recognized German or international health insurer.", required: true },
      ]
    },
    family: {
      visaType: "family",
      destination: "Germany",
      origin: "Africa/Asia/LatAm",
      processingTime: "3–12 months",
      fee: "€75 (~$80 USD)",
      successTip: "Your German-resident sponsor must prove adequate housing and income to support the family.",
      items: [
        { id: "de-f-1", title: "Valid Passport", description: "Valid passport.", where: "Passport issuing authority.", required: true },
        { id: "de-f-2", title: "Proof of Family Relationship", description: "Marriage or birth certificate, translated and certified.", where: "Registry office + certified translator.", required: true },
        { id: "de-f-3", title: "Sponsor's Residence Permit", description: "Copy of German partner/family member's residence permit or citizenship.", where: "Your German family member.", required: true },
        { id: "de-f-4", title: "Proof of Adequate Housing", description: "Sponsor's rental contract showing sufficient living space.", where: "German sponsor's documents.", required: true },
        { id: "de-f-5", title: "Sponsor's Financial Proof", description: "Payslips showing income above the livelihood threshold.", where: "German sponsor's employer.", required: true },
        { id: "de-f-6", title: "Basic German Language Skills", description: "A1 German certificate (for spouses).", where: "Goethe Institut in your country.", required: true },
        { id: "de-f-7", title: "Health Insurance", description: "German health insurance coverage.", where: "German public insurer.", required: true },
      ]
    },
    transit: {
      visaType: "transit",
      destination: "Germany",
      origin: "Africa/Asia/LatAm",
      processingTime: "1–2 weeks",
      fee: "€80 (~$86 USD)",
      successTip: "Airport Transit Visa (ATV) required for certain nationalities including Nigeria, Ghana, Pakistan at German airports.",
      items: [
        { id: "de-tr-1", title: "Valid Passport", description: "Valid passport.", where: "Passport issuing authority.", required: true },
        { id: "de-tr-2", title: "ATV Application Form", description: "Airport transit visa application.", where: "German embassy.", required: true },
        { id: "de-tr-3", title: "Onward Flight Ticket", description: "Confirmed booking transiting through Germany.", where: "Your airline.", required: true },
        { id: "de-tr-4", title: "Destination Visa", description: "Valid visa for your final destination.", where: "That country's embassy.", required: true },
        { id: "de-tr-5", title: "Proof of Funds", description: "Sufficient funds for transit.", where: "Bank statement.", required: true },
      ]
    }
  },
  "France": {
    tourist: {
      visaType: "tourist",
      destination: "France",
      origin: "Africa/Asia/LatAm",
      processingTime: "2–6 weeks",
      fee: "€90 (~$97 USD)",
      successTip: "France is a Schengen country. A French short-stay visa covers all 26 Schengen countries. Apply at the French embassy only if France is your main destination or first entry point.",
      items: [
        { id: "fr-t-1", title: "Valid Passport", description: "Issued within the last 10 years, valid at least 3 months beyond your stay, 2 blank pages.", where: "Your passport issuing authority.", required: true },
        { id: "fr-t-2", title: "Schengen Visa Application Form", description: "Completed and signed form.", where: "French embassy website or VFS Global France.", required: true },
        { id: "fr-t-3", title: "Passport Photos (2)", description: "Biometric photos, 35x45mm, white background.", where: "Any professional photo studio.", required: true },
        { id: "fr-t-4", title: "Travel Insurance", description: "Minimum €30,000 coverage, valid across all Schengen countries.", where: "AXA, Allianz, or any approved Schengen insurer.", required: true },
        { id: "fr-t-5", title: "Bank Statements (3 months)", description: "Showing at least €65/day for your stay.", where: "Your bank — stamped official statements.", required: true },
        { id: "fr-t-6", title: "Proof of Employment", description: "Employer letter with salary, leave approval, and company letterhead.", where: "Your HR department.", required: true },
        { id: "fr-t-7", title: "Return Flight Ticket", description: "Confirmed refundable booking entering and exiting Schengen zone.", where: "Any airline. Use refundable fares.", tip: "Never book non-refundable tickets before visa approval.", required: true },
        { id: "fr-t-8", title: "Proof of Accommodation", description: "Hotel booking or signed invitation letter (Attestation d'accueil) from French host.", where: "Book on Booking.com or get attestation from host via French mairie.", required: true },
        { id: "fr-t-9", title: "Ties to Home Country", description: "Evidence you will return — property, family, employment.", where: "Land documents, employer letter, family records.", tip: "Critical for African applicants. The consulate wants proof of strong home ties.", required: true },
      ]
    },
    student: {
      visaType: "student",
      destination: "France",
      origin: "Africa/Asia/LatAm",
      processingTime: "4–8 weeks",
      fee: "€99 (~$107 USD) + Campus France fee",
      successTip: "You MUST register with Campus France in your country before applying for a student visa. This is mandatory and non-negotiable.",
      items: [
        { id: "fr-s-1", title: "Valid Passport", description: "Valid for your entire study period.", where: "Passport issuing authority.", required: true },
        { id: "fr-s-2", title: "Campus France Registration", description: "Complete Campus France pre-application process in your country. Mandatory for most applicants.", where: "campusfrance.org — register in your country's Campus France portal.", tip: "Nigeria, Ghana, Senegal etc. are 'CEF countries' — you must use Campus France.", required: true },
        { id: "fr-s-3", title: "University Acceptance Letter", description: "Official admission from a French university or grande école.", where: "Your French institution's admissions office.", required: true },
        { id: "fr-s-4", title: "Proof of Financial Resources", description: "At least €615/month or €7,380/year in a bank account or scholarship.", where: "Your bank or scholarship provider.", required: true },
        { id: "fr-s-5", title: "French or English Language Proof", description: "DELF/DALF for French programs, IELTS/TOEFL for English programs.", where: "Alliance Française for DELF, British Council for IELTS.", required: true },
        { id: "fr-s-6", title: "Academic Certificates", description: "Previous school certificates and transcripts.", where: "Your previous schools.", required: true },
        { id: "fr-s-7", title: "Accommodation Proof", description: "University residence hall or private housing contract.", where: "Your university or a French housing platform like Studapart.", required: true },
      ]
    },
    work: {
      visaType: "work",
      destination: "France",
      origin: "Africa/Asia/LatAm",
      processingTime: "2–4 months",
      fee: "€99 (~$107 USD)",
      successTip: "Your French employer must obtain a work permit (autorisation de travail) from the DREETS authority before you apply. This is the employer's job, not yours.",
      items: [
        { id: "fr-w-1", title: "Valid Passport", description: "Valid passport.", where: "Passport issuing authority.", required: true },
        { id: "fr-w-2", title: "Work Permit Authorization (Autorisation de Travail)", description: "Your French employer must obtain this from French labor authorities (DREETS) before you apply.", where: "Your French employer handles this. Confirm before proceeding.", required: true },
        { id: "fr-w-3", title: "Employment Contract", description: "Signed work contract showing position, salary, and start date.", where: "Your French employer.", required: true },
        { id: "fr-w-4", title: "Professional Qualifications", description: "Diplomas and credentials relevant to your job.", where: "Your school and professional bodies.", required: true },
        { id: "fr-w-5", title: "Bank Statements", description: "Financial self-sufficiency proof.", where: "Your bank.", required: true },
        { id: "fr-w-6", title: "Health Insurance", description: "International coverage until you are enrolled in French social security.", where: "Any international insurer.", required: true },
      ]
    },
    family: {
      visaType: "family",
      destination: "France",
      origin: "Africa/Asia/LatAm",
      processingTime: "3–12 months",
      fee: "€99 (~$107 USD)",
      successTip: "The French family reunification process is detailed. Your sponsor must have lived legally in France for at least 18 months and meet housing/income requirements.",
      items: [
        { id: "fr-f-1", title: "Valid Passport", description: "Valid passport.", where: "Passport issuing authority.", required: true },
        { id: "fr-f-2", title: "Proof of Family Relationship", description: "Marriage or birth certificate, translated into French by a certified translator.", where: "Registry office + certified translator.", required: true },
        { id: "fr-f-3", title: "Sponsor's Residence Proof", description: "French partner's residence permit or citizenship, and proof they have lived in France 18+ months.", where: "French partner provides these documents.", required: true },
        { id: "fr-f-4", title: "Sponsor's Income Proof", description: "Last 3 months payslips showing at least SMIC (minimum wage ~€1,766/month net).", where: "French sponsor's employer.", required: true },
        { id: "fr-f-5", title: "Proof of Adequate Housing", description: "Lease or ownership documents showing sufficient space for the family.", where: "French sponsor's housing documents.", required: true },
        { id: "fr-f-6", title: "French Language Certificate", description: "Basic French (A1/A2 level) usually required.", where: "Alliance Française in your country.", required: true },
        { id: "fr-f-7", title: "Medical Certificate", description: "Health assessment from approved physician.", where: "Approved clinic designated by French consulate.", required: true },
      ]
    },
    transit: {
      visaType: "transit",
      destination: "France",
      origin: "Africa/Asia/LatAm",
      processingTime: "1–3 weeks",
      fee: "€80 (~$86 USD)",
      successTip: "If you hold a valid US, UK, or Canadian visa, you may be exempt from the French airport transit visa. Always check the exemption list first.",
      items: [
        { id: "fr-tr-1", title: "Valid Passport", description: "Valid for your transit period.", where: "Passport issuing authority.", required: true },
        { id: "fr-tr-2", title: "Airport Transit Visa Application", description: "ATV form if required by your nationality.", where: "French embassy or VFS Global.", required: true },
        { id: "fr-tr-3", title: "Onward Flight Ticket", description: "Confirmed booking transiting through France.", where: "Your airline.", required: true },
        { id: "fr-tr-4", title: "Destination Country Visa", description: "Valid entry document for your final destination.", where: "That country's embassy.", required: true },
      ]
    }
  },
  "Australia": {
    tourist: {
      visaType: "tourist",
      destination: "Australia",
      origin: "Africa/Asia/LatAm",
      processingTime: "2–8 weeks (some within 1 week)",
      fee: "AUD $195 (~$130 USD)",
      successTip: "Australia is very strict with Visitor Visas for African applicants. Strong finances, ties to home country, and a clean travel history are essential.",
      items: [
        { id: "au-t-1", title: "Valid Passport", description: "Valid for your entire intended stay.", where: "Passport issuing authority.", required: true },
        { id: "au-t-2", title: "Online Visitor Visa Application (Subclass 600)", description: "Apply online through the ImmiAccount portal.", where: "immi.homeaffairs.gov.au — create an ImmiAccount.", required: true },
        { id: "au-t-3", title: "Passport-size Photo", description: "Recent photo meeting Australian specifications.", where: "Any professional photo studio.", required: true },
        { id: "au-t-4", title: "Bank Statements (6 months)", description: "Demonstrating funds to support your stay — typically AUD $5,000+ minimum.", where: "Your bank. Official stamped statements.", required: true },
        { id: "au-t-5", title: "Proof of Employment", description: "Employer letter confirming position, salary, and approved leave.", where: "Your HR department.", required: true },
        { id: "au-t-6", title: "Return Flight Ticket", description: "Evidence of intention to return home.", where: "Any airline. Use refundable bookings.", required: true },
        { id: "au-t-7", title: "Ties to Home Country", description: "Property, family, employment — proof you will return home.", where: "Land documents, school letters for children, employment contracts.", tip: "This is the single most scrutinized aspect for African applicants.", required: true },
        { id: "au-t-8", title: "Invitation Letter (if visiting someone)", description: "From your Australian host with their visa/citizenship details.", where: "Your Australian host.", required: false },
        { id: "au-t-9", title: "Previous Travel History", description: "Previous visas (US, UK, Schengen) significantly help your application.", where: "Copies from your old passports.", required: false },
      ]
    },
    student: {
      visaType: "student",
      destination: "Australia",
      origin: "Africa/Asia/LatAm",
      processingTime: "4–8 weeks",
      fee: "AUD $710 (~$470 USD)",
      successTip: "Your Confirmation of Enrolment (CoE) from a CRICOS-registered provider is the foundation of your student visa. Without it, you cannot apply.",
      items: [
        { id: "au-s-1", title: "Valid Passport", description: "Valid for entire course duration.", where: "Passport issuing authority.", required: true },
        { id: "au-s-2", title: "Confirmation of Enrolment (CoE)", description: "Issued by your Australian education provider after paying the deposit.", where: "Your Australian university or college (must be CRICOS-registered).", required: true },
        { id: "au-s-3", title: "Genuine Temporary Entrant (GTE) Statement", description: "A written statement explaining why you want to study in Australia and your intention to return.", where: "Write yourself — be honest and specific.", tip: "This is critical. Answer why Australia, why this course, and what you plan to do after.", required: true },
        { id: "au-s-4", title: "Financial Evidence", description: "AUD $21,041/year for living expenses + tuition fees. Show in bank statements or sponsor letter.", where: "Your bank or sponsor.", required: true },
        { id: "au-s-5", title: "English Test Results", description: "IELTS (6.0+ Academic) or TOEFL for academic programs.", where: "British Council for IELTS, ETS for TOEFL.", required: true },
        { id: "au-s-6", title: "Academic Transcripts", description: "Previous school and university records.", where: "Your previous schools.", required: true },
        { id: "au-s-7", title: "Overseas Student Health Cover (OSHC)", description: "Mandatory health insurance for student visa holders.", where: "Medibank, BUPA, Allianz, or NIB — buy before applying.", required: true },
      ]
    },
    work: {
      visaType: "work",
      destination: "Australia",
      origin: "Africa/Asia/LatAm",
      processingTime: "3–12 months (depends on stream)",
      fee: "AUD $4,240 (~$2,800 USD) for Employer Sponsored",
      successTip: "The Employer-Sponsored visa (Subclass 482) requires an Australian employer to sponsor you. Alternatively, if you are under 45 with high skills, explore the Skilled Independent visa (Subclass 189).",
      items: [
        { id: "au-w-1", title: "Valid Passport", description: "Valid passport.", where: "Passport issuing authority.", required: true },
        { id: "au-w-2", title: "Nomination by Australian Employer", description: "Your employer must be an approved sponsor and nominate you for a specific role.", where: "Your Australian employer — they apply first.", required: true },
        { id: "au-w-3", title: "Skills Assessment", description: "Your occupation must be on the skilled occupation list and assessed by the relevant body (e.g., Engineers Australia, ACS for IT).", where: "The assessing body for your occupation.", required: true },
        { id: "au-w-4", title: "English Language Test", description: "IELTS 5.0+ minimum (varies by visa stream).", where: "British Council for IELTS.", required: true },
        { id: "au-w-5", title: "Health Examination", description: "Medical check from a panel physician approved by the Department.", where: "BUPA Medical, or approved panel clinics.", required: true },
        { id: "au-w-6", title: "Police Clearance", description: "From every country lived in for 12+ months.", where: "National police service.", required: true },
      ]
    },
    family: {
      visaType: "family",
      destination: "Australia",
      origin: "Africa/Asia/LatAm",
      processingTime: "12–36 months",
      fee: "AUD $8,850 (~$5,850 USD)",
      successTip: "The Partner visa has two stages — temporary then permanent. Processing is notoriously slow. Apply as early as possible and document every aspect of the relationship.",
      items: [
        { id: "au-f-1", title: "Valid Passport", description: "Valid passport.", where: "Passport issuing authority.", required: true },
        { id: "au-f-2", title: "Sponsorship by Australian Partner", description: "Your Australian citizen or PR partner must sponsor you.", where: "Applied jointly online through ImmiAccount.", required: true },
        { id: "au-f-3", title: "Relationship Evidence", description: "Extensive evidence of genuine relationship: photos, communication, finances, statutory declarations from friends/family.", where: "Your personal records. More is better.", tip: "Organize evidence into categories: financial, social, household, commitment.", required: true },
        { id: "au-f-4", title: "Health Examination", description: "Medical check from approved panel physician.", where: "BUPA Medical or approved panel clinics.", required: true },
        { id: "au-f-5", title: "Police Clearance", description: "From all countries lived in for 12+ months.", where: "National police service.", required: true },
        { id: "au-f-6", title: "Identity Documents", description: "Birth certificate, marriage certificate.", where: "Registry office.", required: true },
      ]
    },
    transit: {
      visaType: "transit",
      destination: "Australia",
      origin: "Africa/Asia/LatAm",
      processingTime: "1–3 weeks",
      fee: "AUD $190 (~$125 USD)",
      successTip: "Some nationalities are exempt from transit visas. Check the Australian government website before applying.",
      items: [
        { id: "au-tr-1", title: "Valid Passport", description: "Valid passport.", where: "Passport issuing authority.", required: true },
        { id: "au-tr-2", title: "Transit Visa Application (Subclass 771)", description: "Apply online through ImmiAccount.", where: "immi.homeaffairs.gov.au", required: true },
        { id: "au-tr-3", title: "Onward Travel Documents", description: "Confirmed booking for your onward flight.", where: "Your airline.", required: true },
        { id: "au-tr-4", title: "Destination Country Visa", description: "Valid visa for your final destination.", where: "That country's embassy.", required: true },
      ]
    }
  },
  "Netherlands": {
    tourist: {
      visaType: "tourist",
      destination: "Netherlands",
      origin: "Africa/Asia/LatAm",
      processingTime: "2–4 weeks",
      fee: "€90 (~$97 USD)",
      successTip: "Netherlands is a Schengen country. Your Dutch visa allows travel across 26 Schengen countries. Apply here only if the Netherlands is your main destination.",
      items: [
        { id: "nl-t-1", title: "Valid Passport", description: "Valid 3 months beyond planned stay, issued within last 10 years, 2 blank pages.", where: "Passport issuing authority.", required: true },
        { id: "nl-t-2", title: "Schengen Visa Application Form", description: "Completed and signed application form.", where: "Dutch embassy or VFS Global Netherlands.", required: true },
        { id: "nl-t-3", title: "Passport Photos (2)", description: "Biometric photos, 35x45mm, white background.", where: "Professional photo studio.", required: true },
        { id: "nl-t-4", title: "Travel Insurance", description: "Minimum €30,000 Schengen-wide medical coverage.", where: "Allianz, AXA, or any approved insurer.", required: true },
        { id: "nl-t-5", title: "Bank Statements (3 months)", description: "Showing €34/day minimum for Netherlands stay.", where: "Your bank. Official stamped statements.", required: true },
        { id: "nl-t-6", title: "Proof of Employment", description: "Employer letter plus recent payslips.", where: "Your HR department.", required: true },
        { id: "nl-t-7", title: "Return Flight Ticket", description: "Confirmed booking in and out of Schengen zone.", where: "Any airline. Use refundable fares.", required: true },
        { id: "nl-t-8", title: "Accommodation Proof", description: "Hotel booking for all nights or host invitation.", where: "Booking.com or written host letter.", required: true },
        { id: "nl-t-9", title: "Ties to Home Country", description: "Property, employment, family proof.", where: "Land registry, employer, family documents.", required: true },
      ]
    },
    student: {
      visaType: "student",
      destination: "Netherlands",
      origin: "Africa/Asia/LatAm",
      processingTime: "4–8 weeks",
      fee: "€192 (~$207 USD)",
      successTip: "Your Dutch university will apply for your MVV (entry visa) on your behalf through IND. You do not apply yourself. This is unique to the Netherlands.",
      items: [
        { id: "nl-s-1", title: "Valid Passport", description: "Valid for your entire study program.", where: "Passport issuing authority.", required: true },
        { id: "nl-s-2", title: "University Admission Letter", description: "Acceptance from a Dutch institution (must be IND-recognized).", where: "Your Dutch university's admissions office.", required: true },
        { id: "nl-s-3", title: "IND Application via University", description: "Your university submits the MVV/residence permit application to IND on your behalf.", where: "Your university's international office handles this. You provide supporting documents.", tip: "Ask your university's International Student Services exactly what documents they need from you.", required: true },
        { id: "nl-s-4", title: "Proof of Financial Resources", description: "€11,400/year minimum (€950/month). Must be in a Dutch account or via scholarship.", where: "Bank statements or scholarship letter.", required: true },
        { id: "nl-s-5", title: "English/Dutch Language Proof", description: "IELTS 6.0+ for English programs, NT2 for Dutch programs.", where: "British Council for IELTS.", required: true },
        { id: "nl-s-6", title: "Academic Transcripts", description: "Previous school and university records.", where: "Your previous schools.", required: true },
        { id: "nl-s-7", title: "Antecedents Certificate (VOG equivalent)", description: "Police clearance from your home country.", where: "National police service.", required: true },
      ]
    },
    work: {
      visaType: "work",
      destination: "Netherlands",
      origin: "Africa/Asia/LatAm",
      processingTime: "2–5 weeks (highly skilled) or 5 weeks (regular)",
      fee: "€192 (~$207 USD)",
      successTip: "The Netherlands' Highly Skilled Migrant (Kennismigrant) visa is the fastest track. Your Dutch employer must be IND-recognized, and your salary must meet the minimum threshold (€5,008/month for those 30+ in 2024).",
      items: [
        { id: "nl-w-1", title: "Valid Passport", description: "Valid passport.", where: "Passport issuing authority.", required: true },
        { id: "nl-w-2", title: "Employer Sponsorship (IND-recognized employer)", description: "Your Dutch employer must be registered with IND as a recognized sponsor.", where: "Your Dutch employer confirms their IND status.", required: true },
        { id: "nl-w-3", title: "Employment Contract", description: "Contract showing salary meets minimum threshold.", where: "Your Dutch employer.", required: true },
        { id: "nl-w-4", title: "Educational Credentials", description: "Relevant diplomas and professional qualifications.", where: "Your school. May need certified translation.", required: true },
        { id: "nl-w-5", title: "Antecedents Certificate", description: "Police clearance from your home country.", where: "National police service.", required: true },
        { id: "nl-w-6", title: "Health Insurance", description: "Mandatory Dutch health insurance (zorgverzekering) once you arrive.", where: "CZ, VGZ, Zilveren Kruis — sign up after arrival.", required: false },
      ]
    },
    family: {
      visaType: "family",
      destination: "Netherlands",
      origin: "Africa/Asia/LatAm",
      processingTime: "3–6 months",
      fee: "€192 (~$207 USD)",
      successTip: "Your Dutch partner must earn at least 100% of the minimum wage (€1,934/month net in 2024) to sponsor a family reunification visa.",
      items: [
        { id: "nl-f-1", title: "Valid Passport", description: "Valid passport.", where: "Passport issuing authority.", required: true },
        { id: "nl-f-2", title: "Proof of Relationship", description: "Marriage certificate or registered partnership, certified and translated.", where: "Registry office + certified translator.", required: true },
        { id: "nl-f-3", title: "Dutch Partner's Residence Documents", description: "Residence permit or Dutch citizenship proof.", where: "Dutch partner.", required: true },
        { id: "nl-f-4", title: "Sponsor's Income Proof", description: "Dutch partner's payslips showing 100%+ minimum wage.", where: "Dutch partner's employer.", required: true },
        { id: "nl-f-5", title: "Civic Integration Exam (Inburgering)", description: "Basic Dutch language and civic knowledge test (A1 level) required before arrival.", where: "IND exam at Dutch embassy in your country.", tip: "Prepare with the free online tool at inburgeren.nl", required: true },
        { id: "nl-f-6", title: "Tuberculosis Test", description: "Required for applicants from TB-risk countries including Nigeria.", where: "Approved chest clinic.", required: true },
      ]
    },
    transit: {
      visaType: "transit",
      destination: "Netherlands",
      origin: "Africa/Asia/LatAm",
      processingTime: "1–2 weeks",
      fee: "€80 (~$86 USD)",
      successTip: "Schiphol (Amsterdam) is a major transit hub. Nigerian passport holders require an ATV for all transits. Check if your connecting ticket qualifies for exemption.",
      items: [
        { id: "nl-tr-1", title: "Valid Passport", description: "Valid passport.", where: "Passport issuing authority.", required: true },
        { id: "nl-tr-2", title: "Airport Transit Visa Application", description: "ATV required for transit through Schiphol.", where: "Dutch embassy.", required: true },
        { id: "nl-tr-3", title: "Onward Flight Ticket", description: "Confirmed booking transiting through Netherlands.", where: "Your airline.", required: true },
        { id: "nl-tr-4", title: "Destination Country Visa", description: "Valid visa for final destination.", where: "That country's embassy.", required: true },
      ]
    }
  },
  "Ireland": {
    tourist: {
      visaType: "tourist",
      destination: "Ireland",
      origin: "Africa/Asia/LatAm",
      processingTime: "4–8 weeks",
      fee: "€60 single entry / €100 multi-entry",
      successTip: "Ireland is NOT in the Schengen zone. You need a separate Irish visa even if you have a Schengen visa. Strong finances and return ties are critical.",
      items: [
        { id: "ie-t-1", title: "Valid Passport", description: "Valid for at least 6 months beyond your intended stay.", where: "Passport issuing authority.", required: true },
        { id: "ie-t-2", title: "Online Visa Application (AVATS)", description: "Apply through the Irish immigration AVATS portal.", where: "visas.inis.gov.ie", required: true },
        { id: "ie-t-3", title: "Passport Photos (2)", description: "Recent photos meeting Irish specifications.", where: "Professional photo studio.", required: true },
        { id: "ie-t-4", title: "Bank Statements (6 months)", description: "Showing steady income and minimum €3,000 equivalent.", where: "Your bank. Stamped official statements.", required: true },
        { id: "ie-t-5", title: "Proof of Employment", description: "Employer letter confirming position, salary, and leave approval.", where: "Your HR department.", required: true },
        { id: "ie-t-6", title: "Return Flight Ticket", description: "Confirmed booking showing entry and exit from Ireland.", where: "Any airline. Use refundable fares.", required: true },
        { id: "ie-t-7", title: "Proof of Accommodation", description: "Hotel booking or invitation letter from your Irish host.", where: "Booking.com or written host invitation.", required: true },
        { id: "ie-t-8", title: "Travel Insurance", description: "Medical coverage for your trip.", where: "Any reputable insurer.", required: true },
        { id: "ie-t-9", title: "Ties to Home Country", description: "Property, family, employment evidence.", where: "Land documents, employer letter, family records.", required: true },
      ]
    },
    student: {
      visaType: "student",
      destination: "Ireland",
      origin: "Africa/Asia/LatAm",
      processingTime: "4–8 weeks",
      fee: "€60 single entry / €100 multi-entry",
      successTip: "Make sure your Irish school is listed on the ILEP (Irish Language Education Programme) or is an approved institution. Unapproved schools lead to automatic rejections.",
      items: [
        { id: "ie-s-1", title: "Valid Passport", description: "Valid for your entire course.", where: "Passport issuing authority.", required: true },
        { id: "ie-s-2", title: "Letter of Acceptance from Irish School", description: "From an ILEP or recognized Irish institution.", where: "Your Irish school's admissions office.", required: true },
        { id: "ie-s-3", title: "Proof of Tuition Payment", description: "Receipt showing full or partial tuition paid.", where: "Your Irish school's finance office.", required: true },
        { id: "ie-s-4", title: "Financial Evidence", description: "€7,000 minimum for first year. Bank statements for 6 months.", where: "Your bank.", required: true },
        { id: "ie-s-5", title: "Private Medical Insurance", description: "Health insurance valid in Ireland.", where: "Irish Life Health, Laya Healthcare, or any international insurer.", required: true },
        { id: "ie-s-6", title: "Academic Certificates", description: "Previous school and university transcripts.", where: "Your previous schools.", required: true },
      ]
    },
    work: {
      visaType: "work",
      destination: "Ireland",
      origin: "Africa/Asia/LatAm",
      processingTime: "4–8 weeks (employment permit) + visa",
      fee: "€1,000 general / €500 critical skills",
      successTip: "The Critical Skills Employment Permit (CSEP) is the fastest route for high-skill professionals (IT, healthcare, engineering). Salary must be €32,000+ (€64,000+ for some roles).",
      items: [
        { id: "ie-w-1", title: "Valid Passport", description: "Valid passport.", where: "Passport issuing authority.", required: true },
        { id: "ie-w-2", title: "Employment Permit", description: "Your Irish employer applies for the employment permit from DETE before you apply for a visa.", where: "Your Irish employer handles permit application at enterprise.gov.ie", required: true },
        { id: "ie-w-3", title: "Job Offer Letter", description: "Formal offer showing role, salary, and start date.", where: "Your Irish employer.", required: true },
        { id: "ie-w-4", title: "Educational Credentials", description: "Degrees and professional qualifications.", where: "Your school. May need certified translations.", required: true },
        { id: "ie-w-5", title: "Bank Statements", description: "Proof of financial standing.", where: "Your bank.", required: true },
        { id: "ie-w-6", title: "Police Clearance", description: "Criminal record certificate.", where: "National police service.", required: true },
      ]
    },
    family: {
      visaType: "family",
      destination: "Ireland",
      origin: "Africa/Asia/LatAm",
      processingTime: "6–12 months",
      fee: "€60 single entry",
      successTip: "Family reunification in Ireland is through the INIS Family Reunification scheme. Your Irish-resident sponsor must meet income thresholds.",
      items: [
        { id: "ie-f-1", title: "Valid Passport", description: "Valid passport.", where: "Passport issuing authority.", required: true },
        { id: "ie-f-2", title: "Proof of Relationship", description: "Marriage or birth certificate.", where: "Registry office.", required: true },
        { id: "ie-f-3", title: "Sponsor's Residency Documents", description: "Irish stamp or residence permit of your sponsor.", where: "Your Irish family member.", required: true },
        { id: "ie-f-4", title: "Sponsor's Financial Proof", description: "Demonstrating ability to support you without public funds.", where: "Irish sponsor's payslips and bank statements.", required: true },
        { id: "ie-f-5", title: "Accommodation Proof", description: "Rental or property document showing suitable housing.", where: "Irish sponsor's housing documents.", required: true },
        { id: "ie-f-6", title: "Medical Insurance", description: "Health insurance valid in Ireland.", where: "Any reputable insurer.", required: true },
      ]
    },
    transit: {
      visaType: "transit",
      destination: "Ireland",
      origin: "Africa/Asia/LatAm",
      processingTime: "4–8 weeks",
      fee: "€60",
      successTip: "Ireland requires a full tourist-type visa even for transit in most cases. Apply well in advance.",
      items: [
        { id: "ie-tr-1", title: "Valid Passport", description: "Valid passport.", where: "Passport issuing authority.", required: true },
        { id: "ie-tr-2", title: "Transit Visa Application", description: "Apply through AVATS portal.", where: "visas.inis.gov.ie", required: true },
        { id: "ie-tr-3", title: "Onward Ticket", description: "Confirmed booking transiting through Ireland.", where: "Your airline.", required: true },
        { id: "ie-tr-4", title: "Destination Visa", description: "Valid visa for final destination.", where: "That country's embassy.", required: true },
      ]
    }
  },
  "Poland": {
    tourist: {
      visaType: "tourist",
      destination: "Poland",
      origin: "Africa/Asia/LatAm",
      processingTime: "5–15 working days",
      fee: "€80 (~$86 USD) — Schengen visa fee",
      successTip: "Poland is a Schengen country, so your Polish visa allows travel across 26 Schengen countries. Applying in Poland (if already resident) is far faster than applying from Nigeria — use the Mazowieckie Voivodeship office in Warsaw.",
      items: [
        { id: "pl-t-1", title: "Valid Passport", description: "Must be issued within the last 10 years, valid at least 3 months beyond your intended stay, and have 2 blank pages.", where: "Your passport issuing authority in Nigeria (NIS). Renew at any Nigerian Immigration Service office.", required: true },
        { id: "pl-t-2", title: "Schengen Visa Application Form", description: "Completed and signed Schengen visa application form.", where: "Download from the Polish consulate website or fill in person at VFS Global / Polish embassy.", required: true },
        { id: "pl-t-3", title: "Passport Photos (2)", description: "Two recent biometric photos, 35x45mm, white background, taken within the last 6 months.", where: "Any professional photo studio. Confirm they meet Schengen biometric standards.", required: true },
        { id: "pl-t-4", title: "Travel Insurance", description: "Minimum €30,000 coverage for medical emergencies and repatriation, valid for all Schengen countries.", where: "Allianz, AXA, ERGO, or any Polish/international insurer offering Schengen coverage.", tip: "Buy from a Polish insurer if applying from Warsaw — processing is faster and they know the requirements.", required: true },
        { id: "pl-t-5", title: "Bank Statements (3 months)", description: "Showing sufficient funds — approximately €100/day or PLN equivalent. Polish accounts accepted if you are a resident.", where: "Your Polish bank (PKO, Santander, mBank) or Nigerian bank. Must be stamped official statements.", required: true },
        { id: "pl-t-6", title: "Proof of Legal Stay in Poland", description: "If applying from Poland, you must show you are legally resident here — residence permit (karta pobytu), work permit, or student permit.", where: "Your karta pobytu card or residence permit document.", tip: "This is critical if you are applying from Poland. Without this, you must apply at the Nigerian consulate.", required: true },
        { id: "pl-t-7", title: "Accommodation Proof", description: "Hotel bookings or invitation letter from your host in the destination Schengen country.", where: "Booking.com (free cancellation), Airbnb, or written invitation from host.", required: true },
        { id: "pl-t-8", title: "Return Flight Ticket", description: "Confirmed booking entering and exiting the Schengen zone.", where: "Any airline. Use refundable fares before visa approval.", tip: "Never book non-refundable tickets before getting your visa.", required: true },
        { id: "pl-t-9", title: "Proof of Employment in Poland", description: "If employed in Poland, provide your employer letter and recent payslips confirming your position and that you will return.", where: "Your employer's HR department.", required: false },
        { id: "pl-t-10", title: "Itinerary / Travel Plan", description: "Day-by-day plan of your trip including countries you will visit within Schengen.", where: "Prepare yourself — a simple Word/PDF document is sufficient.", required: false },
      ]
    },
    student: {
      visaType: "student",
      destination: "Poland",
      origin: "Nigeria",
      processingTime: "2–4 weeks (national visa) or 5–15 days (Schengen)",
      fee: "€80 for Schengen / PLN 440 (~€100) for national D-visa",
      successTip: "A Polish national visa (Type D) is what most international students get. It allows stays over 90 days and can be converted to a temporary residence permit (karta pobytu) once you arrive.",
      items: [
        { id: "pl-s-1", title: "Valid Passport", description: "Valid for at least 3 months beyond your study end date.", where: "Nigerian Immigration Service.", required: true },
        { id: "pl-s-2", title: "University Acceptance Letter", description: "Official admission letter from a Polish university.", where: "Your Polish university's international office.", tip: "Top affordable options: University of Warsaw, AGH University Krakow, Wroclaw University of Technology.", required: true },
        { id: "pl-s-3", title: "Visa Application Form (National D-type)", description: "Polish national visa application form for stays over 90 days.", where: "Polish embassy in Nigeria (Abuja or Lagos) or consulate website.", required: true },
        { id: "pl-s-4", title: "Proof of Financial Means", description: "Bank statements showing PLN 776/month (~€180) minimum for living expenses plus tuition coverage.", where: "Your bank — Nigerian or Polish account if already in Poland.", required: true },
        { id: "pl-s-5", title: "Proof of Tuition Payment or Scholarship", description: "Receipt of first-year tuition payment or scholarship award letter.", where: "Your university's finance office.", required: true },
        { id: "pl-s-6", title: "Health Insurance", description: "Valid medical insurance for the duration of your studies in Poland.", where: "NFZ (Polish national insurance) or private provider like PZU, Signal Iduna.", required: true },
        { id: "pl-s-7", title: "Accommodation Confirmation", description: "Dormitory allocation letter or rental contract in Poland.", where: "Your university's student housing office or a private landlord.", required: true },
        { id: "pl-s-8", title: "Academic Certificates (Apostilled)", description: "Secondary school and university certificates translated into Polish or English and apostilled.", where: "Your Nigerian school + Federal Ministry of Education for apostille + a certified translator.", tip: "Apostille is issued by the Nigerian Ministry of Foreign Affairs. Start this process early — it takes 2–4 weeks.", required: true },
        { id: "pl-s-9", title: "Passport Photos (2)", description: "Biometric photos 35x45mm, white background.", where: "Any professional photo studio.", required: true },
      ]
    },
    work: {
      visaType: "work",
      destination: "Poland",
      origin: "Nigeria",
      processingTime: "2–6 weeks",
      fee: "PLN 440 (~€100) for national work visa",
      successTip: "Poland has one of the fastest work visa processes in Europe for non-EU nationals. Your employer must obtain a work permit (zezwolenie na pracę) before you can apply. Type A work permit is the most common.",
      items: [
        { id: "pl-w-1", title: "Valid Passport", description: "Valid passport.", where: "Nigerian Immigration Service.", required: true },
        { id: "pl-w-2", title: "Work Permit (Zezwolenie na Pracę) — Type A", description: "Your Polish employer applies for this at the Voivodeship Office (Urząd Wojewódzki) before you apply for a visa.", where: "Your Polish employer handles this — confirm they have submitted the application.", tip: "Without this permit, you cannot apply for a Polish work visa. Make sure your employer has it before you start your visa process.", required: true },
        { id: "pl-w-3", title: "Employment Contract", description: "Signed employment contract with your Polish employer showing salary and job title.", where: "Your Polish employer.", required: true },
        { id: "pl-w-4", title: "National Visa Application Form (Type D)", description: "Polish national visa application for stays over 90 days.", where: "Polish embassy in Abuja or Lagos.", required: true },
        { id: "pl-w-5", title: "Bank Statements", description: "Showing financial self-sufficiency during your stay.", where: "Your bank.", required: true },
        { id: "pl-w-6", title: "Health Insurance", description: "Valid for your entire stay. Once employed, you will be covered by ZUS (Polish social insurance).", where: "Any international insurer before departure. Your employer enrolls you in ZUS after arrival.", required: true },
        { id: "pl-w-7", title: "Educational Certificates", description: "Diplomas and professional qualifications relevant to your job.", where: "Your Nigerian school. May need translation into Polish.", required: false },
        { id: "pl-w-8", title: "Passport Photos (2)", description: "Biometric photos.", where: "Any photo studio.", required: true },
        { id: "pl-w-9", title: "Criminal Record Certificate", description: "Police clearance from Nigeria.", where: "Nigeria Police Force headquarters or state command. Allow 2–4 weeks.", required: true },
      ]
    },
    family: {
      visaType: "family",
      destination: "Poland",
      origin: "Nigeria",
      processingTime: "1–3 months",
      fee: "PLN 340 (~€80) or free for some family reunification cases",
      successTip: "If your Polish-resident spouse or family member has a karta pobytu or is a Polish citizen, you can apply for family reunification. The sponsor must meet minimum income requirements.",
      items: [
        { id: "pl-f-1", title: "Valid Passport", description: "Valid for the entire intended stay.", where: "Nigerian Immigration Service.", required: true },
        { id: "pl-f-2", title: "National Visa Application Form", description: "Polish national visa D-type application form.", where: "Polish embassy in Abuja or Lagos.", required: true },
        { id: "pl-f-3", title: "Proof of Family Relationship", description: "Marriage certificate or birth certificate showing relationship. Must be apostilled and translated into Polish.", where: "Nigerian registry office + Federal Ministry of Foreign Affairs for apostille + certified Polish translator.", required: true },
        { id: "pl-f-4", title: "Sponsor's Residence Documents", description: "Spouse/family member's karta pobytu, Polish citizenship ID, or permanent residency proof.", where: "Your family member in Poland provides copies.", required: true },
        { id: "pl-f-5", title: "Sponsor's Income Proof", description: "Polish sponsor must show income above the social minimum — typically PLN 776/month per person in the household.", where: "Sponsor's payslips and ZUS contribution records.", required: true },
        { id: "pl-f-6", title: "Proof of Accommodation in Poland", description: "Rental contract or property ownership proof showing adequate living space.", where: "Sponsor's lease agreement or title deed.", required: true },
        { id: "pl-f-7", title: "Health Insurance", description: "Medical insurance valid in Poland.", where: "NFZ or private insurer.", required: true },
        { id: "pl-f-8", title: "Passport Photos (2)", description: "Biometric photos.", where: "Any photo studio.", required: true },
        { id: "pl-f-9", title: "Evidence of Genuine Relationship", description: "Photos, chat history, visit records, shared accounts.", where: "Personal records.", tip: "Polish immigration authorities take relationship verification seriously, especially for Nigerian-Polish couples.", required: true },
      ]
    },
    transit: {
      visaType: "transit",
      destination: "Poland",
      origin: "Nigeria",
      processingTime: "5–10 working days",
      fee: "€80 (Schengen airport transit visa)",
      successTip: "If you hold a valid UK, US, or Canadian visa, you may be exempt from the airport transit visa for Poland. Always check before applying.",
      items: [
        { id: "pl-tr-1", title: "Valid Passport", description: "Valid for your entire transit period.", where: "Nigerian Immigration Service.", required: true },
        { id: "pl-tr-2", title: "Airport Transit Visa Application", description: "ATV application for transiting through a Polish airport.", where: "Polish embassy in Abuja or Lagos.", required: true },
        { id: "pl-tr-3", title: "Onward Flight Ticket", description: "Confirmed booking showing you are transiting Poland to another destination.", where: "Your airline.", required: true },
        { id: "pl-tr-4", title: "Destination Country Visa", description: "Valid visa for the country you are ultimately traveling to.", where: "That country's embassy.", required: true },
        { id: "pl-tr-5", title: "Proof of Funds", description: "Sufficient funds for your transit.", where: "Bank statement.", required: true },
      ]
    }
  },

  "Italy": {
    tourist: {
      visaType: "tourist", destination: "Italy", origin: "Africa/Asia/LatAm",
      processingTime: "2–5 weeks", fee: "€90 (~$97 USD)",
      successTip: "Italy is a Schengen country. Apply here only if Italy is your main destination. Consular appointments can be scarce — book as early as possible via VFS Global.",
      items: [
        { id: "it-t-1", title: "Valid Passport", description: "Issued within the last 10 years, valid 3 months beyond your stay, 2 blank pages.", where: "Passport issuing authority.", required: true },
        { id: "it-t-2", title: "Schengen Visa Application Form", description: "Completed and signed application form.", where: "Italian consulate website or VFS Global Italy.", required: true },
        { id: "it-t-3", title: "Passport Photos (2)", description: "Biometric photos, 35x45mm, white background.", where: "Professional photo studio.", required: true },
        { id: "it-t-4", title: "Travel Insurance", description: "Minimum €30,000 medical coverage valid for all Schengen countries.", where: "Allianz, Europ Assistance, or any Schengen-approved insurer.", required: true },
        { id: "it-t-5", title: "Bank Statements (3 months)", description: "Showing at least €55/day for your stay.", where: "Your bank. Official stamped statements.", required: true },
        { id: "it-t-6", title: "Return Flight Ticket", description: "Confirmed booking into and out of the Schengen zone.", where: "Any airline. Use refundable fares.", required: true },
        { id: "it-t-7", title: "Proof of Accommodation", description: "Hotel bookings or host invitation letter for all nights.", where: "Booking.com or written host letter.", required: true },
        { id: "it-t-8", title: "Proof of Employment", description: "Employer letter with salary, position, and leave approval.", where: "Your HR department.", required: true },
        { id: "it-t-9", title: "Ties to Home Country", description: "Property, family, employment — proof you will return.", where: "Land documents, employer letter, family records.", required: true },
      ]
    },
    student: {
      visaType: "student", destination: "Italy", origin: "Africa/Asia/LatAm",
      processingTime: "4–8 weeks", fee: "€50 (~$54 USD)",
      successTip: "Apply through the Universitaly portal before the Italian consulate. Many public Italian universities have very low or zero tuition fees for international students.",
      items: [
        { id: "it-s-1", title: "Valid Passport", description: "Valid for your entire course.", where: "Passport issuing authority.", required: true },
        { id: "it-s-2", title: "University Acceptance Letter", description: "Official admission from an Italian university.", where: "Your Italian university's international office.", required: true },
        { id: "it-s-3", title: "Universitaly Pre-Enrollment", description: "Register on universitaly.it before visiting the consulate.", where: "universitaly.it", tip: "This step is mandatory and must be done before your visa appointment.", required: true },
        { id: "it-s-4", title: "Proof of Financial Resources", description: "€5,899/year minimum in bank statements or scholarship letter.", where: "Your bank or scholarship provider.", required: true },
        { id: "it-s-5", title: "Accommodation Proof", description: "University dormitory allocation or rental contract.", where: "Your university or a private landlord.", required: true },
        { id: "it-s-6", title: "Health Insurance", description: "Coverage for the duration of your studies.", where: "Any international insurer or enroll in Italian SSN after arrival.", required: true },
        { id: "it-s-7", title: "Academic Certificates", description: "Previous school transcripts and certificates.", where: "Your previous schools.", required: true },
      ]
    },
    work: {
      visaType: "work", destination: "Italy", origin: "Africa/Asia/LatAm",
      processingTime: "3–6 months", fee: "€116 (~$125 USD)",
      successTip: "Italy operates a quota system (Decreto Flussi) for non-EU workers. Slots are limited and open once a year — monitor the official site and apply the moment quotas open.",
      items: [
        { id: "it-w-1", title: "Valid Passport", description: "Valid passport.", where: "Passport issuing authority.", required: true },
        { id: "it-w-2", title: "Work Permit Nulla Osta", description: "Your Italian employer applies for this from the local Immigration Office (Sportello Unico per l'Immigrazione) on your behalf.", where: "Your Italian employer handles this application.", required: true },
        { id: "it-w-3", title: "Employment Contract", description: "Signed contract showing position, salary, and duration.", where: "Your Italian employer.", required: true },
        { id: "it-w-4", title: "Qualifications", description: "Diplomas and professional credentials relevant to your role.", where: "Your school and professional bodies.", required: true },
        { id: "it-w-5", title: "Criminal Record Certificate", description: "Police clearance from your home country.", where: "National police service.", required: true },
        { id: "it-w-6", title: "Health Insurance", description: "International health coverage until enrolled in Italian NHS.", where: "Any international insurer.", required: true },
      ]
    },
    family: {
      visaType: "family", destination: "Italy", origin: "Africa/Asia/LatAm",
      processingTime: "3–9 months", fee: "€116 (~$125 USD)",
      successTip: "Your Italian-resident sponsor must have a valid residence permit and sufficient income (at least the social allowance level) and adequate housing.",
      items: [
        { id: "it-f-1", title: "Valid Passport", description: "Valid passport.", where: "Passport issuing authority.", required: true },
        { id: "it-f-2", title: "Nulla Osta for Family Reunification", description: "The Italian-based sponsor must obtain this from the local Immigration One-Stop Shop.", where: "Italian sponsor handles this application.", required: true },
        { id: "it-f-3", title: "Proof of Relationship", description: "Marriage or birth certificate, translated and legalised.", where: "Registry office + certified translator.", required: true },
        { id: "it-f-4", title: "Sponsor's Residence Permit", description: "Italian partner's valid permesso di soggiorno.", where: "Italian family member.", required: true },
        { id: "it-f-5", title: "Sponsor's Income Proof", description: "Payslips showing income above minimum threshold.", where: "Italian sponsor's employer.", required: true },
        { id: "it-f-6", title: "Accommodation Proof", description: "Rental or ownership contract showing adequate space.", where: "Sponsor's housing documents.", required: true },
      ]
    },
    transit: {
      visaType: "transit", destination: "Italy", origin: "Africa/Asia/LatAm",
      processingTime: "1–3 weeks", fee: "€80 (~$86 USD)",
      successTip: "If you hold a valid US, UK, or Canadian visa you may be exempt. Always check the exemption list before applying.",
      items: [
        { id: "it-tr-1", title: "Valid Passport", description: "Valid for transit period.", where: "Passport issuing authority.", required: true },
        { id: "it-tr-2", title: "Airport Transit Visa Application", description: "ATV form if required.", where: "Italian consulate or VFS Global.", required: true },
        { id: "it-tr-3", title: "Onward Flight Ticket", description: "Confirmed booking transiting through Italy.", where: "Your airline.", required: true },
        { id: "it-tr-4", title: "Destination Country Visa", description: "Valid visa for final destination.", where: "That country's embassy.", required: true },
      ]
    }
  },
  "Spain": {
    tourist: {
      visaType: "tourist", destination: "Spain", origin: "Africa/Asia/LatAm",
      processingTime: "2–5 weeks", fee: "€90 (~$97 USD)",
      successTip: "Spain is a Schengen country. Apply at Spanish embassy if Spain is your main destination. Spanish consulates are known for thorough document checks — submit a complete, well-organised file.",
      items: [
        { id: "es-t-1", title: "Valid Passport", description: "Issued within 10 years, valid 3 months beyond stay, 2 blank pages.", where: "Passport issuing authority.", required: true },
        { id: "es-t-2", title: "Schengen Visa Application Form", description: "Completed and signed.", where: "Spanish consulate or BLS International.", required: true },
        { id: "es-t-3", title: "Passport Photos (2)", description: "35x45mm, white background, recent.", where: "Professional photo studio.", required: true },
        { id: "es-t-4", title: "Travel Insurance", description: "€30,000 Schengen-wide medical coverage minimum.", where: "Any Schengen-approved insurer.", required: true },
        { id: "es-t-5", title: "Bank Statements (3 months)", description: "€65/day minimum for Spain.", where: "Your bank. Stamped official statements.", required: true },
        { id: "es-t-6", title: "Return Flight Ticket", description: "Confirmed booking into and out of Schengen.", where: "Any airline. Refundable fares preferred.", required: true },
        { id: "es-t-7", title: "Accommodation Proof", description: "Hotel bookings or host invitation.", where: "Booking.com or written host letter.", required: true },
        { id: "es-t-8", title: "Proof of Employment", description: "Employer letter with salary, leave approval.", where: "Your HR department.", required: true },
        { id: "es-t-9", title: "Ties to Home Country", description: "Property, family, employment evidence.", where: "Land documents, employer letter, family records.", required: true },
      ]
    },
    student: {
      visaType: "student", destination: "Spain", origin: "Africa/Asia/LatAm",
      processingTime: "4–8 weeks", fee: "€80 (~$86 USD)",
      successTip: "Spanish student visas are national long-stay visas valid for the duration of your course. Apply at the Spanish consulate in your country — do not try to apply on arrival.",
      items: [
        { id: "es-s-1", title: "Valid Passport", description: "Valid for your entire study period.", where: "Passport issuing authority.", required: true },
        { id: "es-s-2", title: "University Acceptance Letter", description: "Official admission from a Spanish institution.", where: "Your Spanish university.", required: true },
        { id: "es-s-3", title: "Proof of Financial Resources", description: "€600/month minimum. Shown via bank statements or scholarship.", where: "Your bank or scholarship provider.", required: true },
        { id: "es-s-4", title: "Health Insurance", description: "Private health insurance covering all risks in Spain.", where: "Any reputable international insurer.", required: true },
        { id: "es-s-5", title: "Criminal Record Certificate", description: "Police clearance from every country lived in for 5+ years.", where: "National police service.", required: true },
        { id: "es-s-6", title: "Medical Certificate", description: "Proof you do not have any diseases that could pose a public health risk.", where: "Any approved medical clinic.", required: true },
        { id: "es-s-7", title: "Accommodation Proof", description: "Rental contract or university housing confirmation.", where: "Your university or private landlord.", required: true },
      ]
    },
    work: {
      visaType: "work", destination: "Spain", origin: "Africa/Asia/LatAm",
      processingTime: "1–3 months", fee: "€80 (~$86 USD)",
      successTip: "Spain's Digital Nomad Visa is a great option if you work remotely for a non-Spanish company. For traditional work, your employer must obtain a work authorization first.",
      items: [
        { id: "es-w-1", title: "Valid Passport", description: "Valid passport.", where: "Passport issuing authority.", required: true },
        { id: "es-w-2", title: "Work Authorization (Autorización de Trabajo)", description: "Your Spanish employer applies for this from the immigration authorities before you apply.", where: "Your Spanish employer handles this.", required: true },
        { id: "es-w-3", title: "Employment Contract", description: "Signed contract showing salary and job details.", where: "Your Spanish employer.", required: true },
        { id: "es-w-4", title: "Qualifications", description: "Recognized degree or professional credential.", where: "Your school. May need official translation.", required: true },
        { id: "es-w-5", title: "Criminal Record Certificate", description: "Police clearance from home country.", where: "National police service.", required: true },
        { id: "es-w-6", title: "Medical Certificate", description: "No diseases of public health importance.", where: "Approved clinic.", required: true },
      ]
    },
    family: {
      visaType: "family", destination: "Spain", origin: "Africa/Asia/LatAm",
      processingTime: "3–6 months", fee: "€80 (~$86 USD)",
      successTip: "Spain's family reunification requires the sponsor to have lived legally in Spain for at least one year with at least one year remaining on their permit.",
      items: [
        { id: "es-f-1", title: "Valid Passport", description: "Valid passport.", where: "Passport issuing authority.", required: true },
        { id: "es-f-2", title: "Proof of Relationship", description: "Marriage or birth certificate, translated and apostilled.", where: "Registry office + certified translator.", required: true },
        { id: "es-f-3", title: "Sponsor's Residence Documents", description: "Spanish residence card (TIE) or NIE showing legal stay.", where: "Spanish sponsor.", required: true },
        { id: "es-f-4", title: "Sponsor's Income Proof", description: "Payslips showing sufficient income to support the family.", where: "Spanish sponsor's employer.", required: true },
        { id: "es-f-5", title: "Accommodation Proof", description: "Rental or ownership documents.", where: "Spanish sponsor.", required: true },
        { id: "es-f-6", title: "Criminal Record Certificate", description: "Police clearance from applicant's country.", where: "National police service.", required: true },
      ]
    },
    transit: {
      visaType: "transit", destination: "Spain", origin: "Africa/Asia/LatAm",
      processingTime: "1–3 weeks", fee: "€80 (~$86 USD)",
      successTip: "Check the exemption list first. Holders of valid US, UK, or Canadian visas may be exempt from the Spanish airport transit visa.",
      items: [
        { id: "es-tr-1", title: "Valid Passport", description: "Valid for transit.", where: "Passport issuing authority.", required: true },
        { id: "es-tr-2", title: "Airport Transit Visa Application", description: "ATV form.", where: "Spanish consulate or BLS International.", required: true },
        { id: "es-tr-3", title: "Onward Flight Ticket", description: "Confirmed booking transiting Spain.", where: "Your airline.", required: true },
        { id: "es-tr-4", title: "Destination Country Visa", description: "Valid visa for final destination.", where: "That country's embassy.", required: true },
      ]
    }
  },
  "Sweden": {
    tourist: {
      visaType: "tourist", destination: "Sweden", origin: "Africa/Asia/LatAm",
      processingTime: "2–4 weeks", fee: "€90 (~$97 USD)",
      successTip: "Sweden applies Schengen rules strictly. Your financial proof must clearly cover your entire stay. Unexplained cash deposits in recent months raise red flags.",
      items: [
        { id: "se-t-1", title: "Valid Passport", description: "Valid 3 months beyond stay, 2 blank pages.", where: "Passport issuing authority.", required: true },
        { id: "se-t-2", title: "Schengen Visa Application Form", description: "Completed form.", where: "Swedish embassy or VFS Global Sweden.", required: true },
        { id: "se-t-3", title: "Passport Photos (2)", description: "Biometric, 35x45mm, white background.", where: "Photo studio.", required: true },
        { id: "se-t-4", title: "Travel Insurance", description: "€30,000 Schengen medical coverage.", where: "Any Schengen insurer.", required: true },
        { id: "se-t-5", title: "Bank Statements (3 months)", description: "€50/day minimum for Sweden.", where: "Your bank. Stamped statements.", required: true },
        { id: "se-t-6", title: "Return Flight Ticket", description: "Confirmed booking in and out of Schengen.", where: "Any airline.", required: true },
        { id: "se-t-7", title: "Accommodation Proof", description: "Hotel or invitation letter.", where: "Booking.com or host letter.", required: true },
        { id: "se-t-8", title: "Proof of Employment or Income", description: "Employer letter or self-employment proof.", where: "HR department.", required: true },
      ]
    },
    student: {
      visaType: "student", destination: "Sweden", origin: "Africa/Asia/LatAm",
      processingTime: "4–8 weeks", fee: "SEK 1,500 (~$140 USD)",
      successTip: "Apply through the Swedish Migration Agency (Migrationsverket) online. Swedish universities charge tuition only for non-EU students. Apply early as processing can be slow.",
      items: [
        { id: "se-s-1", title: "Valid Passport", description: "Valid for your study period.", where: "Passport issuing authority.", required: true },
        { id: "se-s-2", title: "Acceptance Letter", description: "From a Swedish university or higher education institution.", where: "Your university's admissions office.", required: true },
        { id: "se-s-3", title: "Proof of Financial Resources", description: "SEK 8,514/month (~$800) minimum. Bank statements or scholarship.", where: "Your bank or scholarship provider.", required: true },
        { id: "se-s-4", title: "Health Insurance", description: "Coverage for your first 90 days. Swedish health system covers after registration.", where: "Any international insurer.", required: false },
        { id: "se-s-5", title: "Academic Certificates", description: "Previous qualifications and transcripts.", where: "Your previous schools.", required: true },
      ]
    },
    work: {
      visaType: "work", destination: "Sweden", origin: "Africa/Asia/LatAm",
      processingTime: "4–16 weeks", fee: "SEK 2,000 (~$185 USD)",
      successTip: "Sweden's work permit system requires a job offer meeting the collective agreement or standard salary for that occupation. The employer must advertise the position in the EU for 10 days first.",
      items: [
        { id: "se-w-1", title: "Valid Passport", description: "Valid passport.", where: "Passport issuing authority.", required: true },
        { id: "se-w-2", title: "Job Offer from Swedish Employer", description: "Employment offer showing salary meeting collective agreement standards.", where: "Your Swedish employer.", required: true },
        { id: "se-w-3", title: "Employment Contract", description: "Signed contract with salary, job title, and duration.", where: "Your Swedish employer.", required: true },
        { id: "se-w-4", title: "Trade Union Confirmation", description: "Confirmation from the relevant Swedish trade union that terms meet collective agreement.", where: "Your employer provides this document.", required: true },
        { id: "se-w-5", title: "Educational Certificates", description: "Qualifications relevant to the position.", where: "Your school.", required: false },
      ]
    },
    family: {
      visaType: "family", destination: "Sweden", origin: "Africa/Asia/LatAm",
      processingTime: "6–18 months", fee: "SEK 1,500 (~$140 USD)",
      successTip: "Sweden has strict income requirements for family reunification. The sponsor must earn enough to support both themselves and the applicant without public benefits.",
      items: [
        { id: "se-f-1", title: "Valid Passport", description: "Valid passport.", where: "Passport issuing authority.", required: true },
        { id: "se-f-2", title: "Proof of Relationship", description: "Marriage or birth certificate.", where: "Registry office.", required: true },
        { id: "se-f-3", title: "Sponsor's Swedish Residence Permit", description: "Valid residence permit or Swedish citizenship.", where: "Swedish sponsor.", required: true },
        { id: "se-f-4", title: "Sponsor's Income Proof", description: "Sufficient self-support income as defined by Migrationsverket.", where: "Swedish sponsor's employer.", required: true },
        { id: "se-f-5", title: "Accommodation Proof", description: "Suitable housing for the family.", where: "Swedish sponsor's rental or ownership documents.", required: true },
      ]
    },
    transit: {
      visaType: "transit", destination: "Sweden", origin: "Africa/Asia/LatAm",
      processingTime: "1–2 weeks", fee: "€80 (~$86 USD)",
      successTip: "Most Nigerian, Ghanaian, and Pakistani nationals need an ATV to transit through Stockholm Arlanda. Check exemptions for US/UK/Canadian visa holders.",
      items: [
        { id: "se-tr-1", title: "Valid Passport", description: "Valid for transit.", where: "Passport issuing authority.", required: true },
        { id: "se-tr-2", title: "Airport Transit Visa Application", description: "ATV application.", where: "Swedish embassy.", required: true },
        { id: "se-tr-3", title: "Onward Ticket", description: "Confirmed booking transiting Sweden.", where: "Your airline.", required: true },
        { id: "se-tr-4", title: "Destination Visa", description: "Visa for final destination.", where: "That country's embassy.", required: true },
      ]
    }
  },
  "Norway": {
    tourist: {
      visaType: "tourist", destination: "Norway", origin: "Africa/Asia/LatAm",
      processingTime: "2–4 weeks", fee: "€90 (~$97 USD)",
      successTip: "Norway is part of the Schengen area. Although not an EU member, Schengen rules apply fully. Oslo is a major expense hub — show strong finances with at least €100/day.",
      items: [
        { id: "no-t-1", title: "Valid Passport", description: "Valid 3 months beyond stay.", where: "Passport issuing authority.", required: true },
        { id: "no-t-2", title: "Schengen Visa Application Form", description: "Completed application.", where: "Norwegian embassy or VFS Global Norway.", required: true },
        { id: "no-t-3", title: "Passport Photos (2)", description: "Biometric, 35x45mm.", where: "Photo studio.", required: true },
        { id: "no-t-4", title: "Travel Insurance", description: "€30,000 Schengen medical coverage.", where: "Any Schengen insurer.", required: true },
        { id: "no-t-5", title: "Bank Statements (3 months)", description: "€100/day minimum for Norway.", where: "Your bank.", required: true },
        { id: "no-t-6", title: "Return Flight Ticket", description: "Confirmed refundable booking.", where: "Any airline.", required: true },
        { id: "no-t-7", title: "Accommodation Proof", description: "Hotel booking or host invitation.", where: "Booking.com or host.", required: true },
        { id: "no-t-8", title: "Proof of Employment", description: "Employer letter confirming job and leave.", where: "HR department.", required: true },
      ]
    },
    student: {
      visaType: "student", destination: "Norway", origin: "Africa/Asia/LatAm",
      processingTime: "4–8 weeks", fee: "NOK 500 (~$45 USD)",
      successTip: "Norwegian public universities charge no tuition fees for international students. You still need to show NOK 133,286/year (~$12,000) in living expenses.",
      items: [
        { id: "no-s-1", title: "Valid Passport", description: "Valid for study period.", where: "Passport issuing authority.", required: true },
        { id: "no-s-2", title: "Acceptance Letter", description: "From a Norwegian university.", where: "Your university.", required: true },
        { id: "no-s-3", title: "Proof of Finances", description: "NOK 133,286/year in bank or scholarship.", where: "Your bank or scholarship provider.", required: true },
        { id: "no-s-4", title: "Accommodation Proof", description: "Student housing or rental contract.", where: "University housing office.", required: true },
        { id: "no-s-5", title: "Academic Certificates", description: "Previous transcripts and certificates.", where: "Your previous schools.", required: true },
      ]
    },
    work: {
      visaType: "work", destination: "Norway", origin: "Africa/Asia/LatAm",
      processingTime: "4–12 weeks", fee: "NOK 6,300 (~$575 USD)",
      successTip: "Norway's Skilled Worker permit requires a confirmed job offer. The salary must match the standard for the occupation. Apply through the UDI portal before arrival.",
      items: [
        { id: "no-w-1", title: "Valid Passport", description: "Valid passport.", where: "Passport issuing authority.", required: true },
        { id: "no-w-2", title: "Job Offer from Norwegian Employer", description: "Confirmed offer with salary meeting NOK standards.", where: "Your Norwegian employer.", required: true },
        { id: "no-w-3", title: "Employment Contract", description: "Signed contract.", where: "Your Norwegian employer.", required: true },
        { id: "no-w-4", title: "Educational Credentials", description: "Relevant degrees and certificates.", where: "Your school.", required: true },
        { id: "no-w-5", title: "Police Clearance", description: "From your home country.", where: "National police service.", required: true },
      ]
    },
    family: {
      visaType: "family", destination: "Norway", origin: "Africa/Asia/LatAm",
      processingTime: "6–15 months", fee: "NOK 5,900 (~$540 USD)",
      successTip: "Norway's family immigration rules require the sponsor to meet an income requirement (NOK 311,348/year in 2024). Processing times are long — apply as early as possible.",
      items: [
        { id: "no-f-1", title: "Valid Passport", description: "Valid passport.", where: "Passport issuing authority.", required: true },
        { id: "no-f-2", title: "Proof of Relationship", description: "Marriage or birth certificate.", where: "Registry office.", required: true },
        { id: "no-f-3", title: "Sponsor's Norwegian Residence", description: "Residence permit or Norwegian citizenship.", where: "Norwegian sponsor.", required: true },
        { id: "no-f-4", title: "Sponsor's Income Proof", description: "Annual income meeting UDI threshold.", where: "Norwegian sponsor's employer or tax records.", required: true },
        { id: "no-f-5", title: "Accommodation Proof", description: "Adequate housing for family.", where: "Norwegian sponsor.", required: true },
      ]
    },
    transit: {
      visaType: "transit", destination: "Norway", origin: "Africa/Asia/LatAm",
      processingTime: "1–2 weeks", fee: "€80 (~$86 USD)",
      successTip: "Schengen transit rules apply at Oslo Gardermoen. Check if your nationality requires an Airport Transit Visa.",
      items: [
        { id: "no-tr-1", title: "Valid Passport", description: "Valid for transit.", where: "Passport issuing authority.", required: true },
        { id: "no-tr-2", title: "ATV Application (if required)", description: "Airport transit visa form.", where: "Norwegian embassy.", required: true },
        { id: "no-tr-3", title: "Onward Ticket", description: "Confirmed booking.", where: "Your airline.", required: true },
        { id: "no-tr-4", title: "Destination Visa", description: "Visa for final country.", where: "That country's embassy.", required: true },
      ]
    }
  },
  "Finland": {
    tourist: {
      visaType: "tourist", destination: "Finland", origin: "Africa/Asia/LatAm",
      processingTime: "2–4 weeks", fee: "€90 (~$97 USD)",
      successTip: "Finland is a Schengen country. Finnish consulates are known for efficient processing. Apply at the Finnish embassy if Finland is your main destination.",
      items: [
        { id: "fi-t-1", title: "Valid Passport", description: "Valid 3 months beyond stay.", where: "Passport issuing authority.", required: true },
        { id: "fi-t-2", title: "Schengen Visa Application Form", description: "Completed application.", where: "Finnish embassy or VFS Global Finland.", required: true },
        { id: "fi-t-3", title: "Passport Photos (2)", description: "Biometric, 35x45mm.", where: "Photo studio.", required: true },
        { id: "fi-t-4", title: "Travel Insurance", description: "€30,000 Schengen medical coverage.", where: "Any Schengen insurer.", required: true },
        { id: "fi-t-5", title: "Bank Statements (3 months)", description: "€50/day minimum.", where: "Your bank.", required: true },
        { id: "fi-t-6", title: "Return Flight Ticket", description: "Confirmed refundable booking.", where: "Any airline.", required: true },
        { id: "fi-t-7", title: "Accommodation Proof", description: "Hotel or host invitation.", where: "Booking.com or host.", required: true },
        { id: "fi-t-8", title: "Proof of Employment", description: "Employer letter.", where: "HR department.", required: true },
      ]
    },
    student: {
      visaType: "student", destination: "Finland", origin: "Africa/Asia/LatAm",
      processingTime: "4–8 weeks", fee: "€350 (~$380 USD)",
      successTip: "Finnish universities are top-ranked and tuition fees are lower than UK or US. Apply to the Finnish Immigration Service (Migri) online as soon as you receive your acceptance letter.",
      items: [
        { id: "fi-s-1", title: "Valid Passport", description: "Valid for study period.", where: "Passport issuing authority.", required: true },
        { id: "fi-s-2", title: "Acceptance Letter", description: "From a Finnish university or institution.", where: "Your university.", required: true },
        { id: "fi-s-3", title: "Proof of Finances", description: "€560/month minimum in bank statements or scholarship.", where: "Your bank or scholarship provider.", required: true },
        { id: "fi-s-4", title: "Health Insurance", description: "Coverage for your stay.", where: "Any international insurer.", required: true },
        { id: "fi-s-5", title: "Academic Certificates", description: "Previous qualifications.", where: "Your previous schools.", required: true },
      ]
    },
    work: {
      visaType: "work", destination: "Finland", origin: "Africa/Asia/LatAm",
      processingTime: "2–6 weeks", fee: "€500 (~$540 USD)",
      successTip: "Finland's employee residence permit is one of the fastest in Europe. Your employer submits a partial application online, then you complete it. The process is smooth but requires a confirmed job offer.",
      items: [
        { id: "fi-w-1", title: "Valid Passport", description: "Valid passport.", where: "Passport issuing authority.", required: true },
        { id: "fi-w-2", title: "Employer's Partial Application", description: "Your Finnish employer submits their part of the application first via Enter Finland portal.", where: "Your Finnish employer handles this.", required: true },
        { id: "fi-w-3", title: "Employment Contract", description: "Signed contract with salary details.", where: "Your Finnish employer.", required: true },
        { id: "fi-w-4", title: "Qualifications", description: "Relevant degree or professional credentials.", where: "Your school.", required: true },
        { id: "fi-w-5", title: "Criminal Record Certificate", description: "Police clearance.", where: "National police service.", required: false },
      ]
    },
    family: {
      visaType: "family", destination: "Finland", origin: "Africa/Asia/LatAm",
      processingTime: "6–15 months", fee: "€470 (~$510 USD)",
      successTip: "Finnish family reunification requires the sponsor to have sufficient income to support both themselves and the applicant without social assistance.",
      items: [
        { id: "fi-f-1", title: "Valid Passport", description: "Valid passport.", where: "Passport issuing authority.", required: true },
        { id: "fi-f-2", title: "Proof of Relationship", description: "Marriage or birth certificate.", where: "Registry office.", required: true },
        { id: "fi-f-3", title: "Sponsor's Finnish Residence Permit", description: "Valid permit or citizenship.", where: "Finnish sponsor.", required: true },
        { id: "fi-f-4", title: "Sponsor's Income Proof", description: "Sufficient income per Migri guidelines.", where: "Finnish sponsor's employer.", required: true },
        { id: "fi-f-5", title: "Accommodation Proof", description: "Adequate housing.", where: "Finnish sponsor.", required: true },
      ]
    },
    transit: {
      visaType: "transit", destination: "Finland", origin: "Africa/Asia/LatAm",
      processingTime: "1–2 weeks", fee: "€80 (~$86 USD)",
      successTip: "Schengen transit rules apply at Helsinki Airport. Check ATV exemption list before applying.",
      items: [
        { id: "fi-tr-1", title: "Valid Passport", description: "Valid for transit.", where: "Passport issuing authority.", required: true },
        { id: "fi-tr-2", title: "ATV Application (if required)", description: "Airport transit visa.", where: "Finnish embassy.", required: true },
        { id: "fi-tr-3", title: "Onward Ticket", description: "Confirmed booking.", where: "Your airline.", required: true },
        { id: "fi-tr-4", title: "Destination Visa", description: "Visa for final country.", where: "That country's embassy.", required: true },
      ]
    }
  },
  "Denmark": {
    tourist: {
      visaType: "tourist", destination: "Denmark", origin: "Africa/Asia/LatAm",
      processingTime: "2–4 weeks", fee: "€90 (~$97 USD)",
      successTip: "Denmark is a Schengen country. Danish consulates process applications carefully. Show strong home ties and sufficient finances — Copenhagen is one of Europe's most expensive cities.",
      items: [
        { id: "dk-t-1", title: "Valid Passport", description: "Valid 3 months beyond stay.", where: "Passport issuing authority.", required: true },
        { id: "dk-t-2", title: "Schengen Visa Application Form", description: "Completed form.", where: "Danish embassy or VFS Global Denmark.", required: true },
        { id: "dk-t-3", title: "Passport Photos (2)", description: "Biometric, 35x45mm.", where: "Photo studio.", required: true },
        { id: "dk-t-4", title: "Travel Insurance", description: "€30,000 Schengen medical coverage.", where: "Any Schengen insurer.", required: true },
        { id: "dk-t-5", title: "Bank Statements (3 months)", description: "€80/day minimum for Denmark.", where: "Your bank.", required: true },
        { id: "dk-t-6", title: "Return Flight Ticket", description: "Confirmed refundable booking.", where: "Any airline.", required: true },
        { id: "dk-t-7", title: "Accommodation Proof", description: "Hotel or host letter.", where: "Booking.com or host.", required: true },
        { id: "dk-t-8", title: "Proof of Employment", description: "Employer letter.", where: "HR department.", required: true },
      ]
    },
    student: {
      visaType: "student", destination: "Denmark", origin: "Africa/Asia/LatAm",
      processingTime: "4–8 weeks", fee: "DKK 2,080 (~$295 USD)",
      successTip: "Apply through the SIRI agency (Danish Agency for International Recruitment). Danish universities charge tuition for non-EU students. Apply as soon as you receive your acceptance letter.",
      items: [
        { id: "dk-s-1", title: "Valid Passport", description: "Valid for study period.", where: "Passport issuing authority.", required: true },
        { id: "dk-s-2", title: "Acceptance Letter", description: "From a Danish institution.", where: "Your Danish university.", required: true },
        { id: "dk-s-3", title: "Proof of Finances", description: "DKK 6,243/month (~$890) in bank or scholarship.", where: "Your bank or scholarship provider.", required: true },
        { id: "dk-s-4", title: "Health Insurance", description: "Coverage until enrolled in Danish health system.", where: "Any insurer.", required: false },
        { id: "dk-s-5", title: "Academic Certificates", description: "Previous qualifications.", where: "Your previous schools.", required: true },
      ]
    },
    work: {
      visaType: "work", destination: "Denmark", origin: "Africa/Asia/LatAm",
      processingTime: "4–10 weeks", fee: "DKK 4,135 (~$590 USD)",
      successTip: "Denmark's Pay Limit Scheme is the easiest work permit route if your salary meets DKK 465,000/year (~$66,000). Positive List and Fast Track schemes exist for shortage occupations.",
      items: [
        { id: "dk-w-1", title: "Valid Passport", description: "Valid passport.", where: "Passport issuing authority.", required: true },
        { id: "dk-w-2", title: "Job Offer from Danish Employer", description: "Employment offer meeting SIRI salary requirements.", where: "Your Danish employer.", required: true },
        { id: "dk-w-3", title: "Employment Contract", description: "Signed contract with full terms.", where: "Your Danish employer.", required: true },
        { id: "dk-w-4", title: "Educational Credentials", description: "Relevant degrees.", where: "Your school.", required: true },
      ]
    },
    family: {
      visaType: "family", destination: "Denmark", origin: "Africa/Asia/LatAm",
      processingTime: "6–12 months", fee: "DKK 8,985 (~$1,280 USD)",
      successTip: "Denmark has strict family reunification rules. Both partners must be at least 24 years old, and the Danish sponsor must meet a financial attachment requirement.",
      items: [
        { id: "dk-f-1", title: "Valid Passport", description: "Valid passport.", where: "Passport issuing authority.", required: true },
        { id: "dk-f-2", title: "Proof of Relationship", description: "Marriage certificate.", where: "Registry office.", required: true },
        { id: "dk-f-3", title: "Sponsor's Danish Residence", description: "Danish citizenship or residence permit.", where: "Danish sponsor.", required: true },
        { id: "dk-f-4", title: "Sponsor's Financial Bond", description: "Sponsor may need to provide a financial guarantee.", where: "Danish immigration authorities.", required: true },
        { id: "dk-f-5", title: "Integration Requirements", description: "Meeting language and integration criteria.", where: "Danish language test centres.", required: true },
      ]
    },
    transit: {
      visaType: "transit", destination: "Denmark", origin: "Africa/Asia/LatAm",
      processingTime: "1–2 weeks", fee: "€80 (~$86 USD)",
      successTip: "Schengen ATV rules apply at Copenhagen Airport. Holders of valid US/UK/Canadian visas may be exempt.",
      items: [
        { id: "dk-tr-1", title: "Valid Passport", description: "Valid for transit.", where: "Passport issuing authority.", required: true },
        { id: "dk-tr-2", title: "ATV Application (if required)", description: "Airport transit visa.", where: "Danish embassy.", required: true },
        { id: "dk-tr-3", title: "Onward Ticket", description: "Confirmed booking.", where: "Your airline.", required: true },
        { id: "dk-tr-4", title: "Destination Visa", description: "Visa for final country.", where: "That country's embassy.", required: true },
      ]
    }
  },
  "Portugal": {
    tourist: {
      visaType: "tourist", destination: "Portugal", origin: "Africa/Asia/LatAm",
      processingTime: "2–4 weeks", fee: "€90 (~$97 USD)",
      successTip: "Portugal is a Schengen country and one of the more applicant-friendly EU countries. Apply through VFS Global. Strong bank statements and a clear travel itinerary improve your chances significantly.",
      items: [
        { id: "pt-t-1", title: "Valid Passport", description: "Valid 3 months beyond stay, 2 blank pages.", where: "Passport issuing authority.", required: true },
        { id: "pt-t-2", title: "Schengen Visa Application Form", description: "Completed form.", where: "Portuguese consulate or VFS Global Portugal.", required: true },
        { id: "pt-t-3", title: "Passport Photos (2)", description: "Biometric, 35x45mm.", where: "Photo studio.", required: true },
        { id: "pt-t-4", title: "Travel Insurance", description: "€30,000 Schengen medical coverage.", where: "Any Schengen insurer.", required: true },
        { id: "pt-t-5", title: "Bank Statements (3 months)", description: "€50/day minimum.", where: "Your bank.", required: true },
        { id: "pt-t-6", title: "Return Flight Ticket", description: "Confirmed refundable booking.", where: "Any airline.", required: true },
        { id: "pt-t-7", title: "Accommodation Proof", description: "Hotel booking or host invitation.", where: "Booking.com or host letter.", required: true },
        { id: "pt-t-8", title: "Proof of Employment", description: "Employer letter with salary and leave.", where: "HR department.", required: true },
      ]
    },
    student: {
      visaType: "student", destination: "Portugal", origin: "Africa/Asia/LatAm",
      processingTime: "4–8 weeks", fee: "€90 (~$97 USD)",
      successTip: "Portugal's D4 Student Visa is required for stays over 90 days. Portuguese universities have competitive fees and a growing number of English programs.",
      items: [
        { id: "pt-s-1", title: "Valid Passport", description: "Valid for study period.", where: "Passport issuing authority.", required: true },
        { id: "pt-s-2", title: "University Acceptance Letter", description: "From a Portuguese institution.", where: "Your university.", required: true },
        { id: "pt-s-3", title: "Proof of Financial Resources", description: "€600/month minimum.", where: "Your bank or scholarship provider.", required: true },
        { id: "pt-s-4", title: "Health Insurance", description: "Full medical coverage for your study period.", where: "Any international insurer.", required: true },
        { id: "pt-s-5", title: "Criminal Record Certificate", description: "Police clearance.", where: "National police service.", required: true },
        { id: "pt-s-6", title: "Academic Certificates", description: "Previous qualifications.", where: "Your previous schools.", required: true },
      ]
    },
    work: {
      visaType: "work", destination: "Portugal", origin: "Africa/Asia/LatAm",
      processingTime: "2–4 months", fee: "€90 (~$97 USD)",
      successTip: "Portugal's D3 Highly Qualified Worker Visa and the Digital Nomad Visa (D8) are popular routes. For traditional work, your employer must prove they could not fill the role from within the EU first.",
      items: [
        { id: "pt-w-1", title: "Valid Passport", description: "Valid passport.", where: "Passport issuing authority.", required: true },
        { id: "pt-w-2", title: "Job Offer or Employment Contract", description: "Signed offer showing role and salary.", where: "Your Portuguese employer.", required: true },
        { id: "pt-w-3", title: "Work Permit Authorization", description: "Employer must obtain authorization from SEF/AIMA.", where: "Your Portuguese employer handles this.", required: true },
        { id: "pt-w-4", title: "Qualifications", description: "Relevant degrees.", where: "Your school.", required: true },
        { id: "pt-w-5", title: "Criminal Record Certificate", description: "Police clearance.", where: "National police service.", required: true },
      ]
    },
    family: {
      visaType: "family", destination: "Portugal", origin: "Africa/Asia/LatAm",
      processingTime: "3–9 months", fee: "€90 (~$97 USD)",
      successTip: "Portugal's family reunification requires the sponsor to have lived legally in Portugal for at least one year and meet income requirements.",
      items: [
        { id: "pt-f-1", title: "Valid Passport", description: "Valid passport.", where: "Passport issuing authority.", required: true },
        { id: "pt-f-2", title: "Proof of Relationship", description: "Marriage or birth certificate, certified and translated.", where: "Registry office + certified translator.", required: true },
        { id: "pt-f-3", title: "Sponsor's Residence Permit", description: "Valid Portuguese residence authorization.", where: "Portuguese sponsor.", required: true },
        { id: "pt-f-4", title: "Sponsor's Income Proof", description: "Sufficient monthly income per SEF/AIMA requirements.", where: "Portuguese sponsor's employer.", required: true },
        { id: "pt-f-5", title: "Accommodation Proof", description: "Adequate housing documents.", where: "Portuguese sponsor.", required: true },
      ]
    },
    transit: {
      visaType: "transit", destination: "Portugal", origin: "Africa/Asia/LatAm",
      processingTime: "1–3 weeks", fee: "€80 (~$86 USD)",
      successTip: "Schengen ATV rules apply at Lisbon and Porto airports. Check exemption list for your nationality.",
      items: [
        { id: "pt-tr-1", title: "Valid Passport", description: "Valid for transit.", where: "Passport issuing authority.", required: true },
        { id: "pt-tr-2", title: "ATV Application (if required)", description: "Airport transit visa.", where: "Portuguese consulate or VFS Global.", required: true },
        { id: "pt-tr-3", title: "Onward Ticket", description: "Confirmed booking.", where: "Your airline.", required: true },
        { id: "pt-tr-4", title: "Destination Visa", description: "Visa for final country.", where: "That country's embassy.", required: true },
      ]
    }
  },
  "Austria": {
    tourist: {
      visaType: "tourist", destination: "Austria", origin: "Africa/Asia/LatAm",
      processingTime: "2–4 weeks", fee: "€90 (~$97 USD)",
      successTip: "Austria is a Schengen country. Applications are processed at the Austrian embassy. Vienna and Salzburg are expensive cities — show at least €75/day in finances.",
      items: [
        { id: "at-t-1", title: "Valid Passport", description: "Valid 3 months beyond stay, 2 blank pages.", where: "Passport issuing authority.", required: true },
        { id: "at-t-2", title: "Schengen Visa Application Form", description: "Completed application.", where: "Austrian embassy or VFS Global Austria.", required: true },
        { id: "at-t-3", title: "Passport Photos (2)", description: "Biometric, 35x45mm.", where: "Photo studio.", required: true },
        { id: "at-t-4", title: "Travel Insurance", description: "€30,000 Schengen medical coverage.", where: "Any Schengen insurer.", required: true },
        { id: "at-t-5", title: "Bank Statements (3 months)", description: "€75/day minimum.", where: "Your bank.", required: true },
        { id: "at-t-6", title: "Return Flight Ticket", description: "Confirmed booking.", where: "Any airline.", required: true },
        { id: "at-t-7", title: "Accommodation Proof", description: "Hotel or host invitation.", where: "Booking.com or host.", required: true },
        { id: "at-t-8", title: "Proof of Employment", description: "Employer letter.", where: "HR department.", required: true },
      ]
    },
    student: {
      visaType: "student", destination: "Austria", origin: "Africa/Asia/LatAm",
      processingTime: "4–8 weeks", fee: "€160 (~$173 USD)",
      successTip: "Austrian universities charge modest tuition for non-EU students (€726/semester at public universities). Apply as soon as you receive your acceptance — residence permit must be obtained after arrival at Magistrat.",
      items: [
        { id: "at-s-1", title: "Valid Passport", description: "Valid for study period.", where: "Passport issuing authority.", required: true },
        { id: "at-s-2", title: "University Acceptance Letter", description: "From an Austrian institution.", where: "Your university.", required: true },
        { id: "at-s-3", title: "Proof of Finances", description: "€900/month minimum in bank or scholarship.", where: "Your bank or scholarship provider.", required: true },
        { id: "at-s-4", title: "Health Insurance", description: "Coverage for your study period.", where: "Any international insurer.", required: true },
        { id: "at-s-5", title: "Academic Certificates", description: "Previous qualifications.", where: "Your previous schools.", required: true },
        { id: "at-s-6", title: "Accommodation Proof", description: "Dormitory or rental contract.", where: "Your university or landlord.", required: true },
      ]
    },
    work: {
      visaType: "work", destination: "Austria", origin: "Africa/Asia/LatAm",
      processingTime: "4–12 weeks", fee: "€160 (~$173 USD)",
      successTip: "Austria's Rot-Weiss-Rot (Red-White-Red) Card is the primary skilled worker permit. Points are awarded for qualifications, work experience, and language skills.",
      items: [
        { id: "at-w-1", title: "Valid Passport", description: "Valid passport.", where: "Passport issuing authority.", required: true },
        { id: "at-w-2", title: "Job Offer from Austrian Employer", description: "Confirmed offer meeting salary threshold.", where: "Your Austrian employer.", required: true },
        { id: "at-w-3", title: "Employment Contract", description: "Signed contract.", where: "Your Austrian employer.", required: true },
        { id: "at-w-4", title: "Educational Credentials", description: "Relevant degrees, possibly with credential recognition.", where: "Your school + Austrian recognition authority.", required: true },
        { id: "at-w-5", title: "German Language Proof", description: "A1/A2 German for many permit categories.", where: "Goethe Institut or ÖSD.", required: false },
      ]
    },
    family: {
      visaType: "family", destination: "Austria", origin: "Africa/Asia/LatAm",
      processingTime: "4–12 months", fee: "€160 (~$173 USD)",
      successTip: "Austrian family reunification requires German A1 language proof for most applicants. The sponsor must have sufficient income and adequate housing.",
      items: [
        { id: "at-f-1", title: "Valid Passport", description: "Valid passport.", where: "Passport issuing authority.", required: true },
        { id: "at-f-2", title: "Proof of Relationship", description: "Marriage or birth certificate, translated and apostilled.", where: "Registry office + certified translator.", required: true },
        { id: "at-f-3", title: "Sponsor's Residence Permit", description: "Valid Austrian residence permit.", where: "Austrian sponsor.", required: true },
        { id: "at-f-4", title: "Sponsor's Income Proof", description: "Sufficient net income per Austrian law.", where: "Austrian sponsor's employer.", required: true },
        { id: "at-f-5", title: "German A1 Language Certificate", description: "Basic German for most applicants.", where: "Goethe Institut in your country.", required: true },
        { id: "at-f-6", title: "Accommodation Proof", description: "Adequate housing.", where: "Austrian sponsor.", required: true },
      ]
    },
    transit: {
      visaType: "transit", destination: "Austria", origin: "Africa/Asia/LatAm",
      processingTime: "1–2 weeks", fee: "€80 (~$86 USD)",
      successTip: "Schengen ATV rules apply at Vienna International Airport. Check if your nationality requires an ATV.",
      items: [
        { id: "at-tr-1", title: "Valid Passport", description: "Valid for transit.", where: "Passport issuing authority.", required: true },
        { id: "at-tr-2", title: "ATV Application (if required)", description: "Airport transit visa form.", where: "Austrian embassy.", required: true },
        { id: "at-tr-3", title: "Onward Ticket", description: "Confirmed booking.", where: "Your airline.", required: true },
        { id: "at-tr-4", title: "Destination Visa", description: "Visa for final country.", where: "That country's embassy.", required: true },
      ]
    }
  },
  "Belgium": {
    tourist: {
      visaType: "tourist", destination: "Belgium", origin: "Africa/Asia/LatAm",
      processingTime: "2–5 weeks", fee: "€90 (~$97 USD)",
      successTip: "Belgium is a Schengen country and home to EU headquarters in Brussels. Belgian embassies are thorough — provide a complete, well-organised application with full itinerary.",
      items: [
        { id: "be-t-1", title: "Valid Passport", description: "Valid 3 months beyond stay, 2 blank pages.", where: "Passport issuing authority.", required: true },
        { id: "be-t-2", title: "Schengen Visa Application Form", description: "Completed application.", where: "Belgian embassy or VFS Global Belgium.", required: true },
        { id: "be-t-3", title: "Passport Photos (2)", description: "Biometric, 35x45mm.", where: "Photo studio.", required: true },
        { id: "be-t-4", title: "Travel Insurance", description: "€30,000 Schengen medical coverage.", where: "Any Schengen insurer.", required: true },
        { id: "be-t-5", title: "Bank Statements (3 months)", description: "€95/day minimum for Belgium.", where: "Your bank.", required: true },
        { id: "be-t-6", title: "Return Flight Ticket", description: "Confirmed refundable booking.", where: "Any airline.", required: true },
        { id: "be-t-7", title: "Accommodation Proof", description: "Hotel or host invitation.", where: "Booking.com or host.", required: true },
        { id: "be-t-8", title: "Proof of Employment", description: "Employer letter.", where: "HR department.", required: true },
      ]
    },
    student: {
      visaType: "student", destination: "Belgium", origin: "Africa/Asia/LatAm",
      processingTime: "4–8 weeks", fee: "€180 (~$195 USD)",
      successTip: "Belgium offers programs in French, Dutch, and English. Apply to the Belgian consulate after receiving acceptance. A Declaration of Commitment (Annexe 33) may be required.",
      items: [
        { id: "be-s-1", title: "Valid Passport", description: "Valid for study period.", where: "Passport issuing authority.", required: true },
        { id: "be-s-2", title: "University Acceptance Letter", description: "From a Belgian institution.", where: "Your university.", required: true },
        { id: "be-s-3", title: "Proof of Financial Resources", description: "€620/month minimum.", where: "Your bank or scholarship provider.", required: true },
        { id: "be-s-4", title: "Health Insurance", description: "Medical coverage for your stay.", where: "Any international insurer.", required: true },
        { id: "be-s-5", title: "Academic Certificates", description: "Previous qualifications.", where: "Your previous schools.", required: true },
      ]
    },
    work: {
      visaType: "work", destination: "Belgium", origin: "Africa/Asia/LatAm",
      processingTime: "4–12 weeks", fee: "€180 (~$195 USD)",
      successTip: "Belgium's Single Permit combines the work and residence permit. Your Belgian employer applies to the regional authority first, then you apply for the visa.",
      items: [
        { id: "be-w-1", title: "Valid Passport", description: "Valid passport.", where: "Passport issuing authority.", required: true },
        { id: "be-w-2", title: "Single Permit Authorization", description: "Employer obtains work authorization from regional labor authority.", where: "Your Belgian employer handles this.", required: true },
        { id: "be-w-3", title: "Employment Contract", description: "Signed contract.", where: "Your Belgian employer.", required: true },
        { id: "be-w-4", title: "Qualifications", description: "Relevant degrees.", where: "Your school.", required: true },
        { id: "be-w-5", title: "Criminal Record Certificate", description: "Police clearance.", where: "National police service.", required: true },
      ]
    },
    family: {
      visaType: "family", destination: "Belgium", origin: "Africa/Asia/LatAm",
      processingTime: "3–12 months", fee: "€180 (~$195 USD)",
      successTip: "Belgian family reunification requires the sponsor to have a stable, regular, and sufficient income. Both must be adults. Ensure all documents are apostilled.",
      items: [
        { id: "be-f-1", title: "Valid Passport", description: "Valid passport.", where: "Passport issuing authority.", required: true },
        { id: "be-f-2", title: "Proof of Relationship", description: "Marriage or birth certificate, apostilled.", where: "Registry office.", required: true },
        { id: "be-f-3", title: "Sponsor's Belgian Residence", description: "Valid residence permit or Belgian citizenship.", where: "Belgian sponsor.", required: true },
        { id: "be-f-4", title: "Sponsor's Income Proof", description: "Meets Belgian legal net income threshold.", where: "Belgian sponsor's employer.", required: true },
        { id: "be-f-5", title: "Accommodation Proof", description: "Adequate housing documents.", where: "Belgian sponsor.", required: true },
      ]
    },
    transit: {
      visaType: "transit", destination: "Belgium", origin: "Africa/Asia/LatAm",
      processingTime: "1–2 weeks", fee: "€80 (~$86 USD)",
      successTip: "Schengen ATV rules apply at Brussels Airport (Zaventem). Check if your nationality is on the required ATV list.",
      items: [
        { id: "be-tr-1", title: "Valid Passport", description: "Valid for transit.", where: "Passport issuing authority.", required: true },
        { id: "be-tr-2", title: "ATV Application (if required)", description: "Airport transit visa.", where: "Belgian embassy.", required: true },
        { id: "be-tr-3", title: "Onward Ticket", description: "Confirmed booking.", where: "Your airline.", required: true },
        { id: "be-tr-4", title: "Destination Visa", description: "Visa for final country.", where: "That country's embassy.", required: true },
      ]
    }
  },
  "Switzerland": {
    tourist: {
      visaType: "tourist", destination: "Switzerland", origin: "Africa/Asia/LatAm",
      processingTime: "2–4 weeks", fee: "CHF 80 (~$90 USD)",
      successTip: "Switzerland is part of Schengen but not the EU. Swiss consulates are methodical — submit a very organised application. Zurich and Geneva are among the world's most expensive cities. Show at least CHF 100/day.",
      items: [
        { id: "ch-t-1", title: "Valid Passport", description: "Valid 3 months beyond stay, 2 blank pages.", where: "Passport issuing authority.", required: true },
        { id: "ch-t-2", title: "Schengen Visa Application Form", description: "Completed form.", where: "Swiss embassy or VFS Global Switzerland.", required: true },
        { id: "ch-t-3", title: "Passport Photos (2)", description: "Biometric, 35x45mm.", where: "Photo studio.", required: true },
        { id: "ch-t-4", title: "Travel Insurance", description: "€30,000 Schengen medical coverage.", where: "Any Schengen insurer.", required: true },
        { id: "ch-t-5", title: "Bank Statements (3 months)", description: "CHF 100/day minimum.", where: "Your bank.", required: true },
        { id: "ch-t-6", title: "Return Flight Ticket", description: "Confirmed refundable booking.", where: "Any airline.", required: true },
        { id: "ch-t-7", title: "Accommodation Proof", description: "Hotel or host invitation.", where: "Booking.com or host.", required: true },
        { id: "ch-t-8", title: "Proof of Employment", description: "Employer letter.", where: "HR department.", required: true },
      ]
    },
    student: {
      visaType: "student", destination: "Switzerland", origin: "Africa/Asia/LatAm",
      processingTime: "4–8 weeks", fee: "CHF 80 (~$90 USD)",
      successTip: "Swiss universities (ETH Zurich, EPFL) are world-class. You apply for a student visa (national D-visa) at the cantonal authority before the consulate. Show CHF 21,000/year in finances.",
      items: [
        { id: "ch-s-1", title: "Valid Passport", description: "Valid for study period.", where: "Passport issuing authority.", required: true },
        { id: "ch-s-2", title: "University Acceptance Letter", description: "From a Swiss institution.", where: "Your university.", required: true },
        { id: "ch-s-3", title: "Cantonal Approval", description: "Pre-approval from the cantonal migration office (required before consulate visit).", where: "Your university usually coordinates this.", required: true },
        { id: "ch-s-4", title: "Proof of Finances", description: "CHF 21,000/year (~$23,000) in bank or scholarship.", where: "Your bank or scholarship provider.", required: true },
        { id: "ch-s-5", title: "Health Insurance", description: "Swiss health coverage — mandatory.", where: "Helsana, CSS, or any Swiss insurer.", required: true },
        { id: "ch-s-6", title: "Academic Certificates", description: "Previous qualifications.", where: "Your previous schools.", required: true },
      ]
    },
    work: {
      visaType: "work", destination: "Switzerland", origin: "Africa/Asia/LatAm",
      processingTime: "4–12 weeks", fee: "CHF 80 (~$90 USD)",
      successTip: "Switzerland has strict quotas for non-EU workers. Your employer must prove the position could not be filled within Switzerland or the EU/EFTA first. High-skill roles in finance, tech, and pharma have better success rates.",
      items: [
        { id: "ch-w-1", title: "Valid Passport", description: "Valid passport.", where: "Passport issuing authority.", required: true },
        { id: "ch-w-2", title: "Cantonal Work Permit Approval", description: "Your employer applies to the cantonal labor market authority for a quota allocation.", where: "Your Swiss employer handles this.", required: true },
        { id: "ch-w-3", title: "Employment Contract", description: "Full contract meeting Swiss salary standards.", where: "Your Swiss employer.", required: true },
        { id: "ch-w-4", title: "Educational Credentials", description: "Recognized qualifications.", where: "Your school.", required: true },
        { id: "ch-w-5", title: "Criminal Record Certificate", description: "Police clearance.", where: "National police service.", required: true },
      ]
    },
    family: {
      visaType: "family", destination: "Switzerland", origin: "Africa/Asia/LatAm",
      processingTime: "4–12 months", fee: "CHF 80 (~$90 USD)",
      successTip: "Swiss family reunification is controlled at the cantonal level. Requirements vary by canton. The sponsor must have a permanent residence permit (C permit) or Swiss citizenship for the fastest process.",
      items: [
        { id: "ch-f-1", title: "Valid Passport", description: "Valid passport.", where: "Passport issuing authority.", required: true },
        { id: "ch-f-2", title: "Proof of Relationship", description: "Marriage or birth certificate, apostilled.", where: "Registry office.", required: true },
        { id: "ch-f-3", title: "Sponsor's Swiss Residence Permit", description: "C permit or Swiss citizenship.", where: "Swiss sponsor.", required: true },
        { id: "ch-f-4", title: "Sponsor's Income Proof", description: "Sufficient income as required by cantonal authority.", where: "Swiss sponsor's employer.", required: true },
        { id: "ch-f-5", title: "Accommodation Proof", description: "Adequate housing.", where: "Swiss sponsor.", required: true },
      ]
    },
    transit: {
      visaType: "transit", destination: "Switzerland", origin: "Africa/Asia/LatAm",
      processingTime: "1–2 weeks", fee: "CHF 80 (~$90 USD)",
      successTip: "Schengen ATV rules apply at Zurich and Geneva airports. US, UK, and Canadian visa holders may be exempt.",
      items: [
        { id: "ch-tr-1", title: "Valid Passport", description: "Valid for transit.", where: "Passport issuing authority.", required: true },
        { id: "ch-tr-2", title: "ATV Application (if required)", description: "Airport transit visa.", where: "Swiss embassy.", required: true },
        { id: "ch-tr-3", title: "Onward Ticket", description: "Confirmed booking.", where: "Your airline.", required: true },
        { id: "ch-tr-4", title: "Destination Visa", description: "Visa for final country.", where: "That country's embassy.", required: true },
      ]
    }
  },
  "Japan": {
    tourist: {
      visaType: "tourist", destination: "Japan", origin: "Africa/Asia/LatAm",
      processingTime: "3–5 working days", fee: "¥3,000 (~$20 USD) single entry",
      successTip: "Japan processes tourist visas very quickly once submitted. A detailed itinerary and hotel bookings for every night are essential. Bank statements must show a minimum of ¥100,000–¥200,000 (~$700–$1,400).",
      items: [
        { id: "jp-t-1", title: "Valid Passport", description: "Valid for duration of intended stay.", where: "Passport issuing authority.", required: true },
        { id: "jp-t-2", title: "Visa Application Form", description: "Completed Japanese visa application form.", where: "Japanese embassy or consulate.", required: true },
        { id: "jp-t-3", title: "Passport Photo (1)", description: "Recent 45x45mm photo on white background.", where: "Professional photo studio.", required: true },
        { id: "jp-t-4", title: "Detailed Itinerary", description: "Day-by-day travel plan showing all destinations and overnight stays.", where: "Prepare yourself — must be comprehensive.", tip: "Japanese consulates check this carefully. Include addresses of all hotels.", required: true },
        { id: "jp-t-5", title: "Hotel Bookings", description: "Confirmed reservations for all nights in Japan.", where: "Booking.com, Jalan, or any hotel booking platform.", required: true },
        { id: "jp-t-6", title: "Return Flight Ticket", description: "Confirmed booking showing departure from Japan.", where: "Any airline.", required: true },
        { id: "jp-t-7", title: "Bank Statements (3 months)", description: "Showing sufficient funds for your trip.", where: "Your bank. Official statements.", required: true },
        { id: "jp-t-8", title: "Proof of Employment", description: "Employer letter or self-employment proof.", where: "HR department or business registration.", required: true },
      ]
    },
    student: {
      visaType: "student", destination: "Japan", origin: "Africa/Asia/LatAm",
      processingTime: "4–8 weeks", fee: "¥3,000 (~$20 USD)",
      successTip: "Your Japanese school must apply for a Certificate of Eligibility (CoE) from immigration on your behalf before you apply for the visa. Without the CoE, you cannot apply.",
      items: [
        { id: "jp-s-1", title: "Valid Passport", description: "Valid for study period.", where: "Passport issuing authority.", required: true },
        { id: "jp-s-2", title: "Certificate of Eligibility (CoE)", description: "Issued by the Japanese school after applying to Immigration Services Agency on your behalf.", where: "Your Japanese school coordinates this. It takes 1–3 months.", required: true },
        { id: "jp-s-3", title: "Acceptance Letter", description: "Official admission from your Japanese school.", where: "Your institution.", required: true },
        { id: "jp-s-4", title: "Proof of Financial Resources", description: "Bank statements or sponsor letter covering tuition and living costs.", where: "Your bank or scholarship provider.", required: true },
        { id: "jp-s-5", title: "Academic Certificates", description: "Previous qualifications.", where: "Your previous schools.", required: true },
      ]
    },
    work: {
      visaType: "work", destination: "Japan", origin: "Africa/Asia/LatAm",
      processingTime: "4–8 weeks", fee: "¥3,000 (~$20 USD)",
      successTip: "Your Japanese employer must apply for a Certificate of Eligibility (CoE) first. Japan's Specified Skilled Worker visa is a growing pathway for various industries including agriculture, construction, and food services.",
      items: [
        { id: "jp-w-1", title: "Valid Passport", description: "Valid passport.", where: "Passport issuing authority.", required: true },
        { id: "jp-w-2", title: "Certificate of Eligibility (CoE)", description: "Your employer applies to the Immigration Services Agency on your behalf.", where: "Your Japanese employer handles this application.", required: true },
        { id: "jp-w-3", title: "Employment Contract", description: "Signed contract with job details and salary.", where: "Your Japanese employer.", required: true },
        { id: "jp-w-4", title: "Educational Credentials", description: "Relevant degrees and qualifications.", where: "Your school.", required: true },
        { id: "jp-w-5", title: "Japanese Language Test (if required)", description: "JLPT N4 or equivalent for some visa categories.", where: "JLPT test centres globally.", required: false },
      ]
    },
    family: {
      visaType: "family", destination: "Japan", origin: "Africa/Asia/LatAm",
      processingTime: "4–8 weeks", fee: "¥3,000 (~$20 USD)",
      successTip: "Spouse or child of a Japanese national or permanent resident can apply for family stay visa. A Certificate of Eligibility is required. The application process is detailed and requires extensive documentation.",
      items: [
        { id: "jp-f-1", title: "Valid Passport", description: "Valid passport.", where: "Passport issuing authority.", required: true },
        { id: "jp-f-2", title: "Certificate of Eligibility (CoE)", description: "Applied by the Japanese sponsor at the Immigration Services Agency.", where: "Japanese sponsor applies.", required: true },
        { id: "jp-f-3", title: "Proof of Relationship", description: "Marriage or birth certificate, officially translated into Japanese.", where: "Registry office + certified Japanese translator.", required: true },
        { id: "jp-f-4", title: "Sponsor's Residence Documents", description: "Japanese residence card or passport of your Japanese family member.", where: "Japanese sponsor.", required: true },
        { id: "jp-f-5", title: "Sponsor's Income Proof", description: "Tax returns or employment certificate.", where: "Japanese sponsor's employer or tax office.", required: true },
      ]
    },
    transit: {
      visaType: "transit", destination: "Japan", origin: "Africa/Asia/LatAm",
      processingTime: "3–5 working days", fee: "¥3,000 (~$20 USD)",
      successTip: "Nationals of many African countries can transit through Japan without a transit visa for up to 72 hours if remaining airside. Confirm your exact situation with the Japanese embassy.",
      items: [
        { id: "jp-tr-1", title: "Valid Passport", description: "Valid for transit.", where: "Passport issuing authority.", required: true },
        { id: "jp-tr-2", title: "Onward Flight Ticket", description: "Confirmed booking continuing from Japan.", where: "Your airline.", required: true },
        { id: "jp-tr-3", title: "Destination Visa", description: "Valid visa for final destination.", where: "That country's embassy.", required: true },
        { id: "jp-tr-4", title: "Transit Visa Application (if required)", description: "Some nationalities require a transit visa.", where: "Japanese embassy.", required: false },
      ]
    }
  },
  "South Korea": {
    tourist: {
      visaType: "tourist", destination: "South Korea", origin: "Africa/Asia/LatAm",
      processingTime: "3–5 working days", fee: "USD $45 (single entry)",
      successTip: "South Korea processes tourist visas very efficiently. Show clear travel plans, hotel bookings, and sufficient funds. Nigerian passport holders require a visa — K-ETA does not apply to them.",
      items: [
        { id: "kr-t-1", title: "Valid Passport", description: "Valid for duration of stay.", where: "Passport issuing authority.", required: true },
        { id: "kr-t-2", title: "Visa Application Form (Form 17)", description: "Completed application form.", where: "Korean embassy or consulate.", required: true },
        { id: "kr-t-3", title: "Passport Photo (1)", description: "Recent 35x45mm photo on white background.", where: "Photo studio.", required: true },
        { id: "kr-t-4", title: "Return Flight Ticket", description: "Confirmed booking showing departure from Korea.", where: "Any airline.", required: true },
        { id: "kr-t-5", title: "Hotel Bookings", description: "Confirmed accommodation for all nights.", where: "Booking.com or hotel platform.", required: true },
        { id: "kr-t-6", title: "Bank Statements (3 months)", description: "Showing sufficient funds — at least $50/day.", where: "Your bank.", required: true },
        { id: "kr-t-7", title: "Proof of Employment", description: "Employer letter or self-employment proof.", where: "HR department.", required: true },
      ]
    },
    student: {
      visaType: "student", destination: "South Korea", origin: "Africa/Asia/LatAm",
      processingTime: "2–4 weeks", fee: "USD $60",
      successTip: "South Korea's D-2 student visa requires a Certificate of Admission from a Korean university. Korean universities offer many English-taught programs and scholarships (GKS).",
      items: [
        { id: "kr-s-1", title: "Valid Passport", description: "Valid for study period.", where: "Passport issuing authority.", required: true },
        { id: "kr-s-2", title: "Certificate of Admission", description: "From a Korean university or institution.", where: "Your Korean university.", required: true },
        { id: "kr-s-3", title: "Proof of Financial Resources", description: "USD $5,000–$10,000 in bank statements or scholarship.", where: "Your bank or scholarship provider.", required: true },
        { id: "kr-s-4", title: "Academic Certificates", description: "Previous qualifications and transcripts.", where: "Your previous schools.", required: true },
        { id: "kr-s-5", title: "Health Certificate", description: "Medical certificate confirming good health.", where: "Any approved clinic.", required: true },
      ]
    },
    work: {
      visaType: "work", destination: "South Korea", origin: "Africa/Asia/LatAm",
      processingTime: "4–8 weeks", fee: "USD $45–60",
      successTip: "The E-7 Specifically Designated Activities visa covers most professional roles. Your Korean employer must obtain an immigration quota before you apply.",
      items: [
        { id: "kr-w-1", title: "Valid Passport", description: "Valid passport.", where: "Passport issuing authority.", required: true },
        { id: "kr-w-2", title: "Job Offer from Korean Employer", description: "Confirmed offer with role, salary, and company details.", where: "Your Korean employer.", required: true },
        { id: "kr-w-3", title: "Employment Contract", description: "Signed contract.", where: "Your Korean employer.", required: true },
        { id: "kr-w-4", title: "Educational Credentials", description: "Relevant degree and transcript.", where: "Your school.", required: true },
        { id: "kr-w-5", title: "Criminal Record Certificate", description: "Police clearance.", where: "National police service.", required: true },
      ]
    },
    family: {
      visaType: "family", destination: "South Korea", origin: "Africa/Asia/LatAm",
      processingTime: "4–8 weeks", fee: "USD $45",
      successTip: "Spouse or minor children of Korean nationals or long-term residents can apply for F-6 or F-3 visas. Proof of genuine relationship is carefully examined.",
      items: [
        { id: "kr-f-1", title: "Valid Passport", description: "Valid passport.", where: "Passport issuing authority.", required: true },
        { id: "kr-f-2", title: "Proof of Relationship", description: "Marriage or birth certificate.", where: "Registry office.", required: true },
        { id: "kr-f-3", title: "Korean Sponsor's Documents", description: "Korean sponsor's passport, alien registration card, or family relationship certificate.", where: "Korean sponsor.", required: true },
        { id: "kr-f-4", title: "Evidence of Genuine Relationship", description: "Photos, communication records, visit history.", where: "Personal records.", required: true },
        { id: "kr-f-5", title: "Financial Documents", description: "Sponsor's income proof.", where: "Korean sponsor's employer.", required: true },
      ]
    },
    transit: {
      visaType: "transit", destination: "South Korea", origin: "Africa/Asia/LatAm",
      processingTime: "3–5 working days", fee: "USD $25",
      successTip: "South Korea offers visa-free transit for up to 72 hours in the International Transit Area at Incheon Airport for some nationalities. Check current rules at the Korean embassy.",
      items: [
        { id: "kr-tr-1", title: "Valid Passport", description: "Valid for transit.", where: "Passport issuing authority.", required: true },
        { id: "kr-tr-2", title: "Onward Flight Ticket", description: "Confirmed booking continuing from Korea.", where: "Your airline.", required: true },
        { id: "kr-tr-3", title: "Destination Visa", description: "Visa for final destination.", where: "That country's embassy.", required: true },
        { id: "kr-tr-4", title: "Transit Visa (if required)", description: "C-2 transit visa if landside transit required.", where: "Korean embassy.", required: false },
      ]
    }
  },
  "UAE": {
    tourist: {
      visaType: "tourist", destination: "UAE", origin: "Africa/Asia/LatAm",
      processingTime: "2–5 working days", fee: "AED 250–500 (~$68–136 USD)",
      successTip: "UAE tourist visas for Nigerians and other African nationalities are typically applied for through an airline (Emirates, Etihad, Air Arabia) or a licensed UAE visa agency. The process is straightforward if your finances are in order.",
      items: [
        { id: "ae-t-1", title: "Valid Passport", description: "Valid for at least 6 months beyond the visa validity.", where: "Passport issuing authority.", required: true },
        { id: "ae-t-2", title: "Passport Photo", description: "Recent colour photo on white background.", where: "Professional photo studio.", required: true },
        { id: "ae-t-3", title: "Bank Statements (3 months)", description: "Showing minimum balance of $3,000–$5,000 equivalent.", where: "Your bank. Official statements.", required: true },
        { id: "ae-t-4", title: "Return Flight Ticket", description: "Confirmed booking into and out of UAE.", where: "Any airline.", required: true },
        { id: "ae-t-5", title: "Hotel Booking or Host Invitation", description: "Confirmed accommodation for entire stay.", where: "Booking.com or UAE host.", required: true },
        { id: "ae-t-6", title: "Proof of Employment", description: "Employer letter confirming position and salary.", where: "HR department.", required: true },
      ]
    },
    student: {
      visaType: "student", destination: "UAE", origin: "Africa/Asia/LatAm",
      processingTime: "2–4 weeks", fee: "AED 1,025 (~$280 USD)",
      successTip: "UAE student visas are typically sponsored by the educational institution. Apply through your UAE university — they will handle the residence visa application on your behalf.",
      items: [
        { id: "ae-s-1", title: "Valid Passport", description: "Valid for study period.", where: "Passport issuing authority.", required: true },
        { id: "ae-s-2", title: "University Acceptance Letter", description: "From a UAE institution (GEMS, NYU Abu Dhabi, AUS, etc.).", where: "Your university.", required: true },
        { id: "ae-s-3", title: "Proof of Financial Resources", description: "Bank statements or scholarship letter covering tuition and living costs.", where: "Your bank or scholarship provider.", required: true },
        { id: "ae-s-4", title: "Medical Fitness Certificate", description: "Health test including blood tests. Required for UAE residence.", where: "An approved medical centre in the UAE (done after arrival).", required: true },
        { id: "ae-s-5", title: "Academic Certificates", description: "Previous qualifications.", where: "Your previous schools.", required: true },
      ]
    },
    work: {
      visaType: "work", destination: "UAE", origin: "Africa/Asia/LatAm",
      processingTime: "2–4 weeks", fee: "AED 2,000–4,000 (~$545–$1,090 USD)",
      successTip: "Your UAE employer sponsors your employment visa and residence permit. The process is straightforward but your employer must be licensed and approved. Medical fitness and biometrics are done after arrival.",
      items: [
        { id: "ae-w-1", title: "Valid Passport", description: "Valid for at least 6 months.", where: "Passport issuing authority.", required: true },
        { id: "ae-w-2", title: "Job Offer and Employment Contract", description: "Your UAE employer initiates the visa process. They apply for your entry permit first.", where: "Your UAE employer handles the process through MOHRE and ICA.", required: true },
        { id: "ae-w-3", title: "Educational Certificates (attested)", description: "Degrees must be attested by UAE Ministry of Foreign Affairs equivalents.", where: "Ministry of Foreign Affairs in your country + UAE embassy attestation.", tip: "Attestation takes 2–4 weeks. Start early.", required: true },
        { id: "ae-w-4", title: "Medical Fitness Certificate", description: "Done in the UAE after arrival at an approved medical centre.", where: "UAE Government-approved medical centres.", required: true },
        { id: "ae-w-5", title: "Emirates ID", description: "Applied for after arrival. Required to work legally.", where: "Federal Authority for Identity and Citizenship (ICA) offices.", required: true },
      ]
    },
    family: {
      visaType: "family", destination: "UAE", origin: "Africa/Asia/LatAm",
      processingTime: "2–4 weeks", fee: "AED 2,000–3,500 (~$545–$953 USD)",
      successTip: "The UAE sponsor (your family member) must earn a minimum salary of AED 4,000/month (or AED 3,000 + accommodation) to sponsor a spouse. Sponsor must have a valid UAE residence visa.",
      items: [
        { id: "ae-f-1", title: "Valid Passport", description: "Valid for at least 6 months.", where: "Passport issuing authority.", required: true },
        { id: "ae-f-2", title: "Proof of Relationship", description: "Marriage certificate or birth certificate, attested.", where: "Registry office + UAE embassy attestation.", required: true },
        { id: "ae-f-3", title: "Sponsor's UAE Residence Visa", description: "Copy of sponsor's valid UAE residence visa and Emirates ID.", where: "UAE-based sponsor.", required: true },
        { id: "ae-f-4", title: "Sponsor's Salary Certificate", description: "Confirming monthly salary meets minimum threshold.", where: "Sponsor's UAE employer.", required: true },
        { id: "ae-f-5", title: "Tenancy Contract", description: "UAE rental contract in sponsor's name showing adequate space.", where: "Sponsor's UAE housing documents.", required: true },
      ]
    },
    transit: {
      visaType: "transit", destination: "UAE", origin: "Africa/Asia/LatAm",
      processingTime: "1–3 working days", fee: "AED 50–150 (~$14–41 USD)",
      successTip: "Dubai is a major international hub. Many nationalities can transit visa-free for up to 96 hours. Nigerian passport holders currently require a transit visa — apply through Emirates airline or a UAE agency.",
      items: [
        { id: "ae-tr-1", title: "Valid Passport", description: "Valid for transit period.", where: "Passport issuing authority.", required: true },
        { id: "ae-tr-2", title: "Transit Visa Application", description: "Apply through Emirates, Etihad, or a UAE visa agency.", where: "Emirates.com, Etihad.com, or licensed UAE visa agency.", required: true },
        { id: "ae-tr-3", title: "Onward Flight Ticket", description: "Confirmed booking from UAE to final destination.", where: "Your airline.", required: true },
        { id: "ae-tr-4", title: "Destination Country Visa", description: "Valid visa for your final destination.", where: "That country's embassy.", required: true },
      ]
    }
  },
  "New Zealand": {
    tourist: {
      visaType: "tourist", destination: "New Zealand", origin: "Africa/Asia/LatAm",
      processingTime: "2–4 weeks", fee: "NZD $211 (~$128 USD)",
      successTip: "New Zealand's Visitor Visa is applied for online through Immigration New Zealand. Strong bank statements, a clear itinerary, and ties to home country are the key approval factors.",
      items: [
        { id: "nz-t-1", title: "Valid Passport", description: "Valid for at least 3 months beyond your intended departure from NZ.", where: "Passport issuing authority.", required: true },
        { id: "nz-t-2", title: "Online Visitor Visa Application", description: "Apply through the Immigration NZ online portal.", where: "immigration.govt.nz — create an account.", required: true },
        { id: "nz-t-3", title: "Passport Photo", description: "Recent photo meeting INZ specifications.", where: "Professional photo studio.", required: true },
        { id: "nz-t-4", title: "Bank Statements (6 months)", description: "Showing NZD $1,000–$4,000/month equivalent.", where: "Your bank. Official statements.", required: true },
        { id: "nz-t-5", title: "Return Flight Ticket", description: "Confirmed booking showing departure from NZ.", where: "Any airline.", required: true },
        { id: "nz-t-6", title: "Accommodation Proof", description: "Hotel bookings or invitation letter from NZ host.", where: "Booking.com or NZ host.", required: true },
        { id: "nz-t-7", title: "Proof of Employment", description: "Employer letter confirming job and approved leave.", where: "HR department.", required: true },
        { id: "nz-t-8", title: "Ties to Home Country", description: "Property, family, employment — proof you will return.", where: "Land documents, employer letter.", required: true },
      ]
    },
    student: {
      visaType: "student", destination: "New Zealand", origin: "Africa/Asia/LatAm",
      processingTime: "4–8 weeks", fee: "NZD $330 (~$200 USD)",
      successTip: "New Zealand's Student Visa requires a letter of offer from a New Zealand Qualifications Authority (NZQA) accredited institution. Funds of NZD $15,000/year must be demonstrated.",
      items: [
        { id: "nz-s-1", title: "Valid Passport", description: "Valid for study period.", where: "Passport issuing authority.", required: true },
        { id: "nz-s-2", title: "Offer of Place Letter", description: "From an NZ-accredited institution.", where: "Your New Zealand school.", required: true },
        { id: "nz-s-3", title: "Proof of Finances", description: "NZD $15,000/year plus tuition fees in bank statements.", where: "Your bank or sponsor.", required: true },
        { id: "nz-s-4", title: "Evidence of English Language", description: "IELTS 5.5+ or equivalent.", where: "British Council for IELTS.", required: true },
        { id: "nz-s-5", title: "Medical Certificate", description: "Chest X-ray and full medical exam if from certain countries.", where: "INZ-approved physician.", required: true },
        { id: "nz-s-6", title: "Academic Certificates", description: "Previous qualifications.", where: "Your previous schools.", required: true },
      ]
    },
    work: {
      visaType: "work", destination: "New Zealand", origin: "Africa/Asia/LatAm",
      processingTime: "4–12 weeks", fee: "NZD $500–$750 (~$305–$455 USD)",
      successTip: "New Zealand's Accredited Employer Work Visa (AEWV) requires an employer to be accredited with INZ. The role must be above the median wage. Skill Shortage list occupations have higher approval rates.",
      items: [
        { id: "nz-w-1", title: "Valid Passport", description: "Valid passport.", where: "Passport issuing authority.", required: true },
        { id: "nz-w-2", title: "Job Offer from Accredited NZ Employer", description: "Employer must be accredited with INZ and offer above-median-wage role.", where: "Your New Zealand employer.", required: true },
        { id: "nz-w-3", title: "Employment Agreement", description: "Signed agreement with salary and role details.", where: "Your NZ employer.", required: true },
        { id: "nz-w-4", title: "Qualifications and Work History", description: "Relevant degrees and employment history.", where: "Your school and previous employers.", required: true },
        { id: "nz-w-5", title: "Police Clearance", description: "From every country lived in for 5+ years.", where: "National police service.", required: true },
      ]
    },
    family: {
      visaType: "family", destination: "New Zealand", origin: "Africa/Asia/LatAm",
      processingTime: "12–24 months", fee: "NZD $1,050–$2,310 (~$640–$1,400 USD)",
      successTip: "New Zealand's Partner of a NZ Resident Visa is a two-stage process. Stage 1 gives a temporary visa, Stage 2 (after 2 years) gives residence. Documenting the genuine nature of the relationship is critical.",
      items: [
        { id: "nz-f-1", title: "Valid Passport", description: "Valid passport.", where: "Passport issuing authority.", required: true },
        { id: "nz-f-2", title: "Proof of Relationship", description: "Marriage certificate or de facto relationship evidence.", where: "Registry office or personal records.", required: true },
        { id: "nz-f-3", title: "NZ Sponsor's Residence Documents", description: "NZ residence visa or citizenship.", where: "NZ sponsor.", required: true },
        { id: "nz-f-4", title: "Evidence of Genuine Relationship", description: "Photos, communications, shared finances, statutory declarations.", where: "Personal records.", required: true },
        { id: "nz-f-5", title: "Medical Certificate", description: "Chest X-ray and medical exam.", where: "INZ-approved physician.", required: true },
        { id: "nz-f-6", title: "Police Clearance", description: "From every country lived in for 5+ years.", where: "National police service.", required: true },
      ]
    },
    transit: {
      visaType: "transit", destination: "New Zealand", origin: "Africa/Asia/LatAm",
      processingTime: "3–5 working days", fee: "NZD $72 (~$44 USD)",
      successTip: "Many nationalities require a transit visa for New Zealand even if remaining airside. Check if your nationality is on the Visas of No Concern list before applying.",
      items: [
        { id: "nz-tr-1", title: "Valid Passport", description: "Valid for transit.", where: "Passport issuing authority.", required: true },
        { id: "nz-tr-2", title: "Transit Visa Application (if required)", description: "Apply online through immigration.govt.nz.", where: "immigration.govt.nz", required: true },
        { id: "nz-tr-3", title: "Onward Flight Ticket", description: "Confirmed booking from NZ to final destination.", where: "Your airline.", required: true },
        { id: "nz-tr-4", title: "Destination Visa", description: "Valid visa for final destination.", where: "That country's embassy.", required: true },
      ]
    }
  },
  "Singapore": {
    tourist: {
      visaType: "tourist", destination: "Singapore", origin: "Africa/Asia/LatAm",
      processingTime: "3–5 working days", fee: "SGD $30 (~$22 USD)",
      successTip: "Singapore tourist visas are processed efficiently but scrutinized carefully for African nationalities. Apply through an accredited Singapore travel agent — direct applications are not accepted from most countries. Show strong finances and clear travel purpose.",
      items: [
        { id: "sg-t-1", title: "Valid Passport", description: "Valid for at least 6 months beyond stay, 2 blank pages.", where: "Passport issuing authority.", required: true },
        { id: "sg-t-2", title: "Visa Application via Accredited Agent", description: "Must be submitted through a Singapore-based accredited hotel or travel agent.", where: "Any accredited Singapore agent. They submit on your behalf.", tip: "You cannot apply directly — the agent submits via ICA's SAVE portal.", required: true },
        { id: "sg-t-3", title: "Passport Photo (1)", description: "Recent colour photo on white background.", where: "Professional photo studio.", required: true },
        { id: "sg-t-4", title: "Bank Statements (3 months)", description: "Showing minimum SGD $3,000 equivalent balance.", where: "Your bank. Official stamped statements.", required: true },
        { id: "sg-t-5", title: "Return Flight Ticket", description: "Confirmed booking into and out of Singapore.", where: "Any airline.", required: true },
        { id: "sg-t-6", title: "Hotel Booking", description: "Confirmed accommodation for all nights.", where: "Booking.com or hotel platform.", required: true },
        { id: "sg-t-7", title: "Proof of Employment", description: "Employer letter with position, salary, and leave approval.", where: "HR department.", required: true },
        { id: "sg-t-8", title: "Evidence of Ties to Home Country", description: "Property, employment, family evidence showing intent to return.", where: "Land documents, employer letter.", required: true },
      ]
    },
    student: {
      visaType: "student", destination: "Singapore", origin: "Africa/Asia/LatAm",
      processingTime: "4–8 weeks", fee: "SGD $30 (~$22 USD)",
      successTip: "Singapore's universities (NUS, NTU, SMU) are world-ranked. Your institution will apply for your Student Pass through ICA's SOLAR system. You do not apply for the visa directly.",
      items: [
        { id: "sg-s-1", title: "Valid Passport", description: "Valid for study period.", where: "Passport issuing authority.", required: true },
        { id: "sg-s-2", title: "Acceptance Letter from Singapore Institution", description: "Official offer from NUS, NTU, SMU, or any other institution.", where: "Your Singapore university.", required: true },
        { id: "sg-s-3", title: "Student Pass Application via SOLAR", description: "Your institution applies for your Student Pass through ICA's SOLAR portal on your behalf.", where: "Your institution's International Student Office coordinates this.", required: true },
        { id: "sg-s-4", title: "Proof of Financial Resources", description: "SGD $15,000–$20,000/year in bank statements or scholarship.", where: "Your bank or scholarship provider.", required: true },
        { id: "sg-s-5", title: "Academic Certificates", description: "Previous qualifications and transcripts.", where: "Your previous schools.", required: true },
      ]
    },
    work: {
      visaType: "work", destination: "Singapore", origin: "Africa/Asia/LatAm",
      processingTime: "3–8 weeks", fee: "SGD $105 (~$78 USD)",
      successTip: "Singapore's Employment Pass (EP) requires a salary of at least SGD $5,000/month (higher for financial services). Your employer applies through the MOM portal. Qualifications from recognized universities strengthen the application.",
      items: [
        { id: "sg-w-1", title: "Valid Passport", description: "Valid for at least 6 months.", where: "Passport issuing authority.", required: true },
        { id: "sg-w-2", title: "Employment Pass Application by Employer", description: "Your Singapore employer applies through MOM's EP Online portal.", where: "Your Singapore employer handles this.", required: true },
        { id: "sg-w-3", title: "Employment Contract", description: "Signed contract showing salary meeting EP threshold.", where: "Your Singapore employer.", required: true },
        { id: "sg-w-4", title: "Educational Certificates", description: "Degrees from recognized institutions.", where: "Your school.", required: true },
        { id: "sg-w-5", title: "Professional Qualifications", description: "Professional certifications relevant to your role.", where: "Your professional body.", required: false },
      ]
    },
    family: {
      visaType: "family", destination: "Singapore", origin: "Africa/Asia/LatAm",
      processingTime: "4–8 weeks", fee: "SGD $30–$105 (~$22–$78 USD)",
      successTip: "Dependant's Pass requires the sponsor to earn at least SGD $6,000/month. Long-Term Visit Pass (LTVP) covers parents and common-law spouses. Your employer's MOM relationship and the sponsor's salary are the biggest factors.",
      items: [
        { id: "sg-f-1", title: "Valid Passport", description: "Valid for at least 6 months.", where: "Passport issuing authority.", required: true },
        { id: "sg-f-2", title: "Proof of Relationship", description: "Marriage certificate or birth certificate.", where: "Registry office.", required: true },
        { id: "sg-f-3", title: "Sponsor's Employment Pass or S Pass", description: "Copy of sponsor's valid Singapore work pass.", where: "Singapore-based sponsor.", required: true },
        { id: "sg-f-4", title: "Sponsor's Salary Documents", description: "Payslips showing salary meets minimum threshold.", where: "Singapore sponsor's employer.", required: true },
        { id: "sg-f-5", title: "Application via MOM Portal", description: "Employer or sponsor applies through MOM's EP Online portal.", where: "Sponsor applies through mom.gov.sg.", required: true },
      ]
    },
    transit: {
      visaType: "transit", destination: "Singapore", origin: "Africa/Asia/LatAm",
      processingTime: "3–5 working days", fee: "SGD $30 (~$22 USD)",
      successTip: "Singapore's VFTF (Visa-Free Transit Facility) allows eligible nationalities to transit for up to 96 hours without a visa. Nigerian passport holders do not qualify for VFTF and must apply for a transit visa.",
      items: [
        { id: "sg-tr-1", title: "Valid Passport", description: "Valid for transit period.", where: "Passport issuing authority.", required: true },
        { id: "sg-tr-2", title: "Transit Visa Application via Agent", description: "Submit through a Singapore-accredited travel agent.", where: "Any Singapore accredited agent.", required: true },
        { id: "sg-tr-3", title: "Onward Flight Ticket", description: "Confirmed booking continuing from Singapore.", where: "Your airline.", required: true },
        { id: "sg-tr-4", title: "Destination Country Visa", description: "Valid visa for your final destination.", where: "That country's embassy.", required: true },
      ]
    }
  },
};

const BASE_DESTINATIONS = ["United Kingdom", "Canada", "United States", "Germany", "Poland", "France", "Australia", "Netherlands", "Ireland", "Italy", "Spain", "Sweden", "Norway", "Finland", "Denmark", "Portugal", "Austria", "Belgium", "Switzerland", "Japan", "South Korea", "UAE", "New Zealand", "Singapore"];

// Official embassy / immigration portal links per destination
export const EMBASSY_URLS: Record<string, string> = {
  "United Kingdom": "https://www.gov.uk/apply-uk-visa",
  "Canada": "https://www.canada.ca/en/immigration-refugees-citizenship/services/application.html",
  "United States": "https://ceac.state.gov/genniv/",
  "Germany": "https://videx-national.diplo.de/",
  "Poland": "https://e-konsulat.gov.pl/",
  "France": "https://france-visas.gouv.fr/",
  "Australia": "https://immi.homeaffairs.gov.au/visas/getting-a-visa/visa-listing",
  "Netherlands": "https://www.netherlandsworldwide.nl/visas-for-the-netherlands/schengen-visa",
  "Ireland": "https://www.visas.inis.gov.ie/",
  "Italy": "https://vistoperitalia.esteri.it/",
  "Spain": "https://www.exteriores.gob.es/Embajadas/Lagos/es/ServiciosConsulares/Paginas/Visados.aspx",
  "Sweden": "https://www.migrationsverket.se/",
  "Norway": "https://www.udi.no/en/",
  "Finland": "https://migri.fi/en/",
  "Denmark": "https://www.nyidanmark.dk/",
  "Portugal": "https://aima.gov.pt/",
  "Austria": "https://www.mfa.gv.at/en/visa.html",
  "Belgium": "https://dofi.ibz.be/",
  "Switzerland": "https://www.sem.admin.ch/",
  "Japan": "https://www.mofa.go.jp/j_info/visit/visa/",
  "South Korea": "https://www.visa.go.kr/",
  "UAE": "https://gdrfad.gov.ae/en/visa-services",
  "New Zealand": "https://www.immigration.govt.nz/",
  "Singapore": "https://www.ica.gov.sg/enter-depart/entry_requirements/visa_requirements",
};

// Last-verified dates — updated quarterly. Format: YYYY-MM-DD
const LAST_VERIFIED_DATES: Record<string, string> = {
  "United Kingdom": "2026-04-01",
  "Canada": "2026-04-01",
  "United States": "2026-04-01",
  "Germany": "2026-04-01",
  "Poland": "2026-04-01",
  "France": "2026-04-01",
  "Australia": "2026-04-01",
  "Netherlands": "2026-04-01",
  "Ireland": "2026-04-01",
  "Italy": "2026-04-01",
  "Spain": "2026-04-01",
  "Sweden": "2026-03-01",
  "Norway": "2026-03-01",
  "Finland": "2026-03-01",
  "Denmark": "2026-03-01",
  "Portugal": "2026-03-01",
  "Austria": "2026-03-01",
  "Belgium": "2026-03-01",
  "Switzerland": "2026-03-01",
  "Japan": "2026-04-01",
  "South Korea": "2026-04-01",
  "UAE": "2026-04-01",
  "New Zealand": "2026-03-01",
  "Singapore": "2026-04-01",
};

export function getChecklist(destination: string, visaType: VisaType): VisaChecklist | null {
  const destData = CHECKLISTS[destination];
  if (!destData) return null;
  const entry = destData[visaType];
  if (!entry) return null;
  // Inject verified date and embassy URL (no need to edit every checklist object)
  return {
    ...entry,
    lastVerified: LAST_VERIFIED_DATES[destination] ?? "2026-01-01",
    embassyUrl: EMBASSY_URLS[destination],
  };
}

export function getAvailableVisaTypes(destination: string): VisaType[] {
  const destData = CHECKLISTS[destination];
  if (!destData) return [];
  return Object.keys(destData) as VisaType[];
}

// Pure data, no DOM/browser dependency — safe to import from the Convex
// backend too (see convex/dataFreshness.ts), so admins get a real,
// server-computed view of which destinations are overdue for a recheck
// instead of staleness silently going unnoticed.
export function getDataFreshness(): Array<{
  destination: string;
  lastVerified: string;
  visaTypeCount: number;
}> {
  return Object.keys(CHECKLISTS).map((destination) => ({
    destination,
    lastVerified: LAST_VERIFIED_DATES[destination] ?? "2026-01-01",
    visaTypeCount: Object.keys(CHECKLISTS[destination]).length,
  }));
}

export const CHECKLISTS_WITH_DATA = new Set(Object.keys(CHECKLISTS));

export const AVAILABLE_DESTINATIONS = BASE_DESTINATIONS;
