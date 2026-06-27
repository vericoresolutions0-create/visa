export type SettleInItem = {
  id: string;
  title: string;
  description: string;
  where: string;
  tip?: string;
};

export type SettleInSection = {
  id: string;
  label: string;
  items: SettleInItem[];
};

export type SettleInGuide = {
  destination: string;
  sections: SettleInSection[];
  lastVerified: string;
};

const GUIDES: Record<string, Omit<SettleInGuide, "lastVerified">> = {
  "United Kingdom": {
    destination: "United Kingdom",
    sections: [
      {
        id: "banking",
        label: "Open a bank account",
        items: [
          { id: "uk-bank-1", title: "Choose a bank", description: "Monzo, Starling, and Revolut accept a passport + visa as ID and let you open an account online before you even have a UK address proof.", where: "Bank's own app/website" },
          { id: "uk-bank-2", title: "Get proof of address", description: "Most banks need this within your first few weeks — a tenancy agreement or university accommodation letter usually works.", where: "Your landlord or university" },
        ],
      },
      {
        id: "sim",
        label: "Get a local SIM",
        items: [
          { id: "uk-sim-1", title: "Pick a pay-as-you-go SIM", description: "Giffgaff, Lebara, and Lycamobile are cheap, no-contract options widely sold at airports and supermarkets.", where: "Supermarkets, airports, or online" },
        ],
      },
      {
        id: "tax-id",
        label: "Register for a National Insurance Number",
        items: [
          { id: "uk-tax-1", title: "Apply for your NI Number", description: "Required to work legally and pay tax. Apply as soon as you arrive — it can take several weeks to arrive by post.", where: "gov.uk/apply-national-insurance-number" },
        ],
      },
      {
        id: "housing",
        label: "Sort housing",
        items: [
          { id: "uk-housing-1", title: "Register for council tax", description: "Every UK household pays this to the local council — register within your first month to avoid backdated bills.", where: "Your local council's website" },
        ],
      },
      {
        id: "healthcare",
        label: "Register for healthcare",
        items: [
          { id: "uk-health-1", title: "Register with a GP", description: "Register with a local doctor's surgery (GP) even if you feel healthy — you'll need one to access the NHS.", where: "Nearest GP surgery, find via nhs.uk" },
        ],
      },
      {
        id: "first-30-days",
        label: "Your first 30 days",
        items: [
          { id: "uk-30-1", title: "Collect your Biometric Residence Permit (BRP)", description: "Most visa holders must collect this within 10 days of arrival from a designated Post Office.", where: "The Post Office branch stated on your visa decision letter" },
        ],
      },
    ],
  },
  "Canada": {
    destination: "Canada",
    sections: [
      {
        id: "banking",
        label: "Open a bank account",
        items: [
          { id: "ca-bank-1", title: "Open a newcomer account", description: "RBC, TD, Scotiabank, and CIBC all have dedicated 'newcomer' packages with no fees for the first year.", where: "Any major bank branch — bring your passport and study/work permit" },
        ],
      },
      {
        id: "sim",
        label: "Get a local SIM",
        items: [
          { id: "ca-sim-1", title: "Compare providers", description: "Fido, Koodo, and Public Mobile are the most affordable; major carriers (Bell, Rogers, Telus) cost more but have better rural coverage.", where: "Carrier stores or online" },
        ],
      },
      {
        id: "tax-id",
        label: "Apply for a Social Insurance Number (SIN)",
        items: [
          { id: "ca-tax-1", title: "Get your SIN", description: "Required to work and file taxes in Canada — apply in person or online as soon as you arrive.", where: "Service Canada Centre or canada.ca" },
        ],
      },
      {
        id: "housing",
        label: "Sort housing",
        items: [
          { id: "ca-housing-1", title: "Build your credit history", description: "Canada has no credit history transfer — a secured credit card from your new bank helps you start building one immediately, useful for renting.", where: "Your bank" },
        ],
      },
      {
        id: "healthcare",
        label: "Register for healthcare",
        items: [
          { id: "ca-health-1", title: "Apply for provincial health coverage", description: "Coverage and wait times vary by province (e.g. Ontario's OHIP has a 3-month wait) — get private interim coverage if there's a gap.", where: "Your province's health ministry website" },
        ],
      },
      {
        id: "first-30-days",
        label: "Your first 30 days",
        items: [
          { id: "ca-30-1", title: "Activate your study/work permit conditions", description: "Confirm your permit conditions (hours allowed, employer restrictions) before starting work to avoid status violations.", where: "IRCC confirmation letter / permit document" },
        ],
      },
    ],
  },
  "United States": {
    destination: "United States",
    sections: [
      {
        id: "banking",
        label: "Open a bank account",
        items: [
          { id: "us-bank-1", title: "Choose a bank", description: "Chase, Bank of America, and Wells Fargo all have international-student/newcomer programs; bring your passport, visa, and I-20/proof of enrollment if applicable.", where: "Bank branch near you" },
        ],
      },
      {
        id: "sim",
        label: "Get a local SIM",
        items: [
          { id: "us-sim-1", title: "Pick a carrier", description: "Mint Mobile, Visible, and T-Mobile prepaid are cheap no-contract options; major carriers cost more but have wider coverage.", where: "Carrier stores, Walmart, or online" },
        ],
      },
      {
        id: "tax-id",
        label: "Apply for a Social Security Number (SSN)",
        items: [
          { id: "us-tax-1", title: "Get your SSN", description: "Required to work legally and for most credit/banking applications. International students on F-1 generally need a job offer first.", where: "Local Social Security Administration office" },
        ],
      },
      {
        id: "housing",
        label: "Sort housing",
        items: [
          { id: "us-housing-1", title: "Build US credit from scratch", description: "Foreign credit history doesn't transfer — a secured credit card is the fastest legitimate way to start, important for renting and utilities.", where: "Your new US bank" },
        ],
      },
      {
        id: "healthcare",
        label: "Register for healthcare",
        items: [
          { id: "us-health-1", title: "Get health insurance immediately", description: "The US has no free universal healthcare — most visa categories require proof of insurance, and an ER visit without it can cost thousands.", where: "Your university (student plans) or employer (work visas)" },
        ],
      },
      {
        id: "first-30-days",
        label: "Your first 30 days",
        items: [
          { id: "us-30-1", title: "Complete your SEVIS/visa check-in", description: "F-1/J-1 students must check in with their school's international office within the first days of the term to stay in compliant status.", where: "Your university's international student office" },
        ],
      },
    ],
  },
  "Germany": {
    destination: "Germany",
    sections: [
      {
        id: "banking",
        label: "Open a bank account",
        items: [
          { id: "de-bank-1", title: "Open a Girokonto", description: "N26, DKB, and Deutsche Bank all let non-residents open an account with just a passport and registered address.", where: "Bank branch or app — N26/DKB are fastest" },
        ],
      },
      {
        id: "sim",
        label: "Get a local SIM",
        items: [
          { id: "de-sim-1", title: "Pick a provider", description: "Lebara, Aldi Talk, and O2 prepaid are common low-cost options sold at supermarkets and kiosks.", where: "Supermarkets (Aldi, Rewe) or carrier stores" },
        ],
      },
      {
        id: "tax-id",
        label: "Register your address (Anmeldung)",
        items: [
          { id: "de-tax-1", title: "Complete your Anmeldung", description: "Germany's mandatory address registration — you legally must do this within 14 days of moving in, and you'll need the confirmation for almost everything else (bank, tax ID, visa extension).", where: "Local Bürgeramt (citizens' office)" },
          { id: "de-tax-2", title: "Receive your Steuer-ID", description: "Your tax ID is mailed automatically a few weeks after Anmeldung — needed by your employer to pay you correctly.", where: "Posted to your registered address" },
        ],
      },
      {
        id: "housing",
        label: "Sort housing",
        items: [
          { id: "de-housing-1", title: "Get Hausratversicherung", description: "Contents/liability insurance is cheap and commonly expected by landlords, and covers you for accidental damage to a rented flat.", where: "Any German insurer (e.g. HUK24, Check24 comparison)" },
        ],
      },
      {
        id: "healthcare",
        label: "Register for healthcare",
        items: [
          { id: "de-health-1", title: "Get statutory health insurance (GKV)", description: "Health insurance is legally mandatory in Germany — most employees default into a public provider (TK, AOK) automatically via payroll.", where: "Chosen Krankenkasse, or via your employer" },
        ],
      },
      {
        id: "first-30-days",
        label: "Your first 30 days",
        items: [
          { id: "de-30-1", title: "Register for the residence permit (Aufenthaltstitel)", description: "Book your Ausländerbehörde appointment as early as possible — wait times can be long in major cities like Berlin and Munich.", where: "Local Ausländerbehörde (foreigners' office)" },
        ],
      },
    ],
  },
  "Australia": {
    destination: "Australia",
    sections: [
      {
        id: "banking",
        label: "Open a bank account",
        items: [
          { id: "au-bank-1", title: "Open an account before or after arrival", description: "Commonwealth Bank, ANZ, and NAB let you set up an account online before you land, ready to use the moment you arrive.", where: "Bank's website, finalised in-branch with your passport" },
        ],
      },
      {
        id: "sim",
        label: "Get a local SIM",
        items: [
          { id: "au-sim-1", title: "Pick a provider", description: "Boost, Amaysim, and Woolworths Mobile run on the larger networks (Telstra/Optus) at prepaid prices.", where: "Supermarkets, airports, or online" },
        ],
      },
      {
        id: "tax-id",
        label: "Apply for a Tax File Number (TFN)",
        items: [
          { id: "au-tax-1", title: "Get your TFN", description: "Required to work and avoid the top emergency tax rate on your first paycheck — apply online as soon as you arrive.", where: "ato.gov.au" },
        ],
      },
      {
        id: "housing",
        label: "Sort housing",
        items: [
          { id: "au-housing-1", title: "Build a rental reference file", description: "Australian rental applications are competitive — gather reference letters and bank statements early to apply quickly when you find a place.", where: "Previous landlords/employer, your bank" },
        ],
      },
      {
        id: "healthcare",
        label: "Register for healthcare",
        items: [
          { id: "au-health-1", title: "Check your Medicare eligibility or get OSHC/OVHC", description: "Most visa holders need Overseas Student/Visitor Health Cover until/unless eligible for Medicare via a reciprocal agreement.", where: "Your visa grant letter specifies which applies" },
        ],
      },
      {
        id: "first-30-days",
        label: "Your first 30 days",
        items: [
          { id: "au-30-1", title: "Set up myGov", description: "Your gateway to Medicare, the ATO, and Centrelink — set this up early since several other registrations link through it.", where: "my.gov.au" },
        ],
      },
    ],
  },
  "Netherlands": {
    destination: "Netherlands",
    sections: [
      {
        id: "banking",
        label: "Open a bank account",
        items: [
          { id: "nl-bank-1", title: "Open a Dutch bank account", description: "ING, ABN AMRO, and bunq all accept a passport + residence permit (or proof of registration) to open an account.", where: "Bank branch or app (bunq is fastest for newcomers)" },
        ],
      },
      {
        id: "sim",
        label: "Get a local SIM",
        items: [
          { id: "nl-sim-1", title: "Pick a provider", description: "Lebara, Simyo, and Lycamobile are common prepaid options with no contract required.", where: "Supermarkets or online" },
        ],
      },
      {
        id: "tax-id",
        label: "Register your address (BRP) and get a BSN",
        items: [
          { id: "nl-tax-1", title: "Register at the Gemeente", description: "Mandatory municipal registration within 5 days of arrival if staying longer than 4 months — this is also how you get your BSN (tax/social number).", where: "Local Gemeente (municipality) office" },
        ],
      },
      {
        id: "housing",
        label: "Sort housing",
        items: [
          { id: "nl-housing-1", title: "Apply early — housing is competitive", description: "Major Dutch cities (Amsterdam, Utrecht) have very tight rental markets; have your BSN and proof of income ready before viewing.", where: "Funda, Pararius, or a local relocation agent" },
        ],
      },
      {
        id: "healthcare",
        label: "Register for healthcare",
        items: [
          { id: "nl-health-1", title: "Get Dutch health insurance", description: "Mandatory within 4 months of arrival if you're working in the Netherlands — fines apply for late registration.", where: "Any Dutch insurer (e.g. Zilveren Kruis, CZ)" },
        ],
      },
      {
        id: "first-30-days",
        label: "Your first 30 days",
        items: [
          { id: "nl-30-1", title: "Collect your residence permit card", description: "If applicable, collect your verblijfsvergunning card from the IND within the timeframe stated in your approval letter.", where: "IND desk specified in your decision letter" },
        ],
      },
    ],
  },
  "Ireland": {
    destination: "Ireland",
    sections: [
      {
        id: "banking",
        label: "Open a bank account",
        items: [
          { id: "ie-bank-1", title: "Open a bank account", description: "AIB, Bank of Ireland, and Revolut all accept a passport + proof of address (or an Irish Residence Permit) for newcomers.", where: "Bank branch or Revolut app" },
        ],
      },
      {
        id: "sim",
        label: "Get a local SIM",
        items: [
          { id: "ie-sim-1", title: "Pick a provider", description: "Tesco Mobile, GoMo, and 48 are common low-cost no-contract options.", where: "Supermarkets or online" },
        ],
      },
      {
        id: "tax-id",
        label: "Apply for a Personal Public Service (PPS) Number",
        items: [
          { id: "ie-tax-1", title: "Get your PPS Number", description: "Required to work, open certain accounts, and access public services — book an appointment as early as possible as wait times can be a few weeks.", where: "Your local Intreo Centre" },
        ],
      },
      {
        id: "housing",
        label: "Sort housing",
        items: [
          { id: "ie-housing-1", title: "Start your rental search early", description: "Dublin and Cork have very tight rental markets — references and proof of income/PPS number speed up applications significantly.", where: "Daft.ie, Rent.ie" },
        ],
      },
      {
        id: "healthcare",
        label: "Register for healthcare",
        items: [
          { id: "ie-health-1", title: "Register with a GP", description: "Register with a local GP even before you need one — most visa holders without a Medical Card pay a standard visit fee, so factor this into your budget.", where: "Nearest GP practice" },
        ],
      },
      {
        id: "first-30-days",
        label: "Your first 30 days",
        items: [
          { id: "ie-30-1", title: "Register your immigration permission", description: "Non-EU/EEA nationals staying longer than 90 days must register with the Irish immigration service and get a residence permit card.", where: "Burgh Quay Registration Office (Dublin) or local Garda station elsewhere" },
        ],
      },
    ],
  },
};

export const SETTLE_IN_DESTINATIONS = new Set(Object.keys(GUIDES));

export function getSettleInGuide(destination: string): SettleInGuide | null {
  const guide = GUIDES[destination];
  if (!guide) return null;
  return { ...guide, lastVerified: "2026-06-01" };
}
