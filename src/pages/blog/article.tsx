import { useNavigate, useParams } from "react-router-dom";
import { motion } from "motion/react";
import { ArrowLeft, Globe, Clock, Tag, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button.tsx";
import { useSeo } from "@/hooks/use-seo.ts";
import { useSmartBack } from "@/hooks/use-smart-back.ts";

type Article = {
  id: string;
  title: string;
  category: string;
  readTime: string;
  date: string;
  excerpt: string;
  body: string;
};

const ARTICLES: Article[] = [
  {
    id: "why-visa-applications-get-rejected",
    title: "The 7 Most Common Reasons Visa Applications Get Rejected (and How to Avoid Them)",
    category: "Visa Tips",
    readTime: "5 min read",
    date: "April 28, 2026",
    excerpt: "Rejection is rarely about the applicant being unqualified. In most cases, it comes down to documentation errors that are completely preventable with the right checklist.",
    body: `Visa rejection is one of the most frustrating experiences for any traveller. But after reviewing thousands of refusal cases, one pattern emerges clearly: **most rejections are preventable**.

Here are the seven most common reasons — and what you can do about each one.

## 1. Incomplete Documentation

The single most common reason for rejection. Missing a single supporting document — even a minor one — can lead to an outright refusal. Officers are not required to contact you for missing items; they simply reject and move on.

**Fix:** Use a precise, destination-specific checklist. VisaClear generates one for your exact nationality, destination, and visa type in under 60 seconds.

## 2. Insufficient Financial Evidence

Embassies want to see that you can support yourself during your trip and return home. A bank statement with erratic deposits or a balance that appears recently inflated raises immediate red flags.

**Fix:** Ensure your bank statement shows at least 3–6 months of consistent transactions. The required minimum balance varies by destination — VisaClear includes exact figures.

## 3. Weak Ties to Home Country

Visa officers are evaluating your intention to return. If you cannot demonstrate employment, property ownership, family ties, or other commitments at home, they assume you plan to overstay.

**Fix:** Include a cover letter explicitly addressing your ties. A job appointment letter, payslip, or proof of ongoing business is far more persuasive than a verbal declaration.

## 4. Inconsistent Information

Any discrepancy between your application form, supporting documents, or previous travel history triggers suspicion. Officers cross-reference everything.

**Fix:** Review every document before submission. Ensure names, dates, addresses, and numbers match exactly across all materials.

## 5. Poor Travel History (or Misrepresenting It)

No prior travel is not automatically a problem. But lying about past visa refusals or omitting travel history is grounds for permanent bans in some countries.

**Fix:** Disclose everything honestly. A previous refusal does not automatically mean another one — but dishonesty almost certainly does.

## 6. Passport Photo Non-Compliance

Rejected photos are more common than applicants realise. Background colour, head size ratio, glasses, and expression all have specific requirements that vary by country.

**Fix:** Use VisaClear's Passport Photo Checker to verify your photo before submission.

## 7. Late or Rushed Applications

Submitting too close to your travel date — or not leaving enough time for processing — leads to rejections on procedural grounds. This is especially true for Schengen and UK visas.

**Fix:** Apply at minimum 6–8 weeks before your travel date. Premium VisaClear users receive deadline reminders automatically.

---

The good news: all seven of these are fixable before you submit. A proper preparation process eliminates the vast majority of preventable rejections.`,
  },
  {
    id: "schengen-visa-guide-nigerians",
    title: "The Complete Schengen Visa Guide for Nigerian Applicants in 2026",
    category: "Destination Guides",
    readTime: "8 min read",
    date: "April 20, 2026",
    excerpt: "Everything you need to know about applying for a Schengen visa from Nigeria, including which countries are easiest, document requirements, and current processing times.",
    body: `The Schengen Area covers 29 European countries and allows free movement between them on a single visa. For Nigerian applicants, this makes it both highly desirable and highly scrutinised.

## Which Country Should You Apply Through?

You must apply at the embassy of the country where you will spend the most time. If equally split, apply at the first country you will enter.

**Historically more accessible for Nigerians:**
- Germany (high approval rate, well-documented process)
- France (large Nigerian applicant volume, established process)
- Netherlands (consistent processing times)

**Generally stricter:**
- Sweden, Denmark, Finland

## Required Documents (2026)

Every Schengen application requires:

1. **Schengen visa application form** — signed and dated
2. **Valid passport** — minimum 3 months beyond intended stay, at least 2 blank pages
3. **Recent passport photographs** — 35x45mm, plain white background, no glasses
4. **Travel itinerary** — confirmed flights or detailed travel plan
5. **Hotel bookings or accommodation proof**
6. **Travel insurance** — minimum €30,000 coverage, valid for all Schengen states
7. **Bank statements** — last 3–6 months, showing sufficient funds
8. **Proof of employment or business** — appointment letter, payslip, or business registration
9. **Cover letter** explaining purpose of travel and ties to Nigeria
10. **Visa application fee** — currently €80 for adults

## Financial Requirements

Most embassies expect approximately **€50–€100 per day** of your intended stay. The exact figure depends on the country and your specific circumstances.

A clean, consistent bank statement is more important than the exact balance. Sudden large deposits immediately before application are a common reason for rejection.

## Processing Times

Average processing times from Nigeria in 2026:

- Germany: 10–20 working days
- France: 15–25 working days
- Netherlands: 10–15 working days

Apply at least **8 weeks** before your travel date. Appointment slots fill up quickly, especially at peak travel periods (May–September, December).

## After a Rejection

If your application is refused, you will receive a refusal notice stating the reason. You have the right to appeal. However, in most cases, addressing the stated reason and reapplying is faster and more effective than appealing.

Use VisaClear's Rejection Analyser to understand exactly what went wrong and how to fix it.`,
  },
  {
    id: "bank-statement-tips",
    title: "How to Prepare a Bank Statement That Satisfies Visa Officers",
    category: "Document Guides",
    readTime: "4 min read",
    date: "April 14, 2026",
    excerpt: "Your bank statement can make or break your application. Here is exactly what officers look for, what amounts are acceptable, and how to present your finances correctly.",
    body: `Of all the documents in a visa application, the bank statement is the one most frequently misunderstood — and most frequently responsible for rejections.

## What Officers Are Actually Looking For

A visa officer reviewing your bank statement asks three questions:

1. **Can this person afford the trip?** — Is the balance sufficient to cover accommodation, food, transport, and unexpected costs?
2. **Is this money genuinely theirs?** — Does the account show consistent income, or were large sums deposited just before application?
3. **Will this person return home?** — Does their financial situation suggest they have reason to go back?

## The Right Balance

The required minimum varies by destination. A rough guide:

- **UK:** £2,500–£5,000+ depending on length of stay
- **Schengen:** €50–100 per day of stay
- **Canada:** CAD $10,000+ for a typical visit
- **USA:** No fixed minimum, but consistent financial profile matters

VisaClear provides exact figures for your specific destination and visa type.

## What to Avoid

**Sudden large deposits.** If your balance jumps significantly in the weeks before you apply, officers will suspect the funds belong to someone else. This is extremely common and extremely damaging.

**Salary amounts that don't match your stated employment.** If your letter says you earn $3,000/month but your statement shows irregular payments of varying amounts, expect questions.

**Accounts with erratic or unexplained transactions.** Gambling transactions, frequent large withdrawals, or unexplained income can trigger additional scrutiny.

## How to Present Your Statement

- Request a stamped and signed statement from your bank, not just a printed digital statement
- Ensure the statement clearly shows your full name, account number, and address
- Include at least 3 months, ideally 6 months
- If you have multiple accounts, include all of them — hiding an account looks worse than having an empty one

## If Your Balance is Low

Be honest. A cover letter explaining your financial situation, combined with a sponsor letter and sponsor's bank statement, is far better than inflated figures that don't hold up to scrutiny.`,
  },
  {
    id: "uk-student-visa-checklist",
    title: "UK Student Visa Document Checklist: What Every African Student Must Know",
    category: "Destination Guides",
    readTime: "6 min read",
    date: "April 8, 2026",
    excerpt: "A detailed breakdown of the documents required for a UK student visa, with specific guidance for applicants from Nigeria, Ghana, Kenya, and South Africa.",
    body: `The UK Student visa (formerly Tier 4) is one of the most applied-for visas among African students. It is also one of the most document-intensive. This guide covers exactly what you need.

## Before You Apply

You must have a **Confirmation of Acceptance for Studies (CAS)** from a UK Visas and Immigration (UKVI)-approved institution before you can apply. Your university or college will provide this.

You can only apply **up to 6 months before your course starts**.

## Core Document Requirements

1. **Valid passport** — must be valid for the duration of your studies
2. **CAS number** from your institution
3. **Proof of English language proficiency** — IELTS, TOEFL, or institutional assessment
4. **Proof of financial funds** — see details below
5. **Academic qualifications** — certificates and transcripts
6. **Tuberculosis test results** — required for applicants from Nigeria, Ghana, Kenya, and most African countries
7. **ATAS certificate** — required for certain science and engineering subjects (check with your institution)

## Financial Requirements

You must show funds sufficient to cover:
- **Course fees for the first year** — or the full course if under 9 months
- **Living costs** — £1,334/month in London, £1,023/month outside London, for up to 9 months

Funds must be held in your account (or a sponsor's account) for **at least 28 consecutive days** before you apply. Day 28 must be within 31 days of your application date.

This 28-day rule catches many applicants. The money must be continuously present — not just there on the day you apply.

## TB Test

Applicants from Nigeria, Ghana, Kenya, Uganda, and most other African countries must take an approved tuberculosis test at an approved clinic. Results are valid for 6 months.

Find your nearest approved clinic on the UK Home Office website.

## NHS Surcharge

Most student applicants must pay the Immigration Health Surcharge as part of the application. As of 2026, this is **£776 per year** of study.

## Processing Times

Standard processing: **3 weeks**
Priority service: **5 working days** (additional fee)
Super priority: **next working day** (additional fee, limited availability)

Apply early. Delays do happen and universities have deadlines.`,
  },
  {
    id: "poland-work-permit-2026",
    title: "Poland Work Permit for Non-EU Nationals: Step-by-Step 2026 Guide",
    category: "Destination Guides",
    readTime: "7 min read",
    date: "April 2, 2026",
    excerpt: "Poland has become a top destination for Nigerian and African professionals. Here is a practical guide covering permits, documents, and processing times.",
    body: `Poland has emerged as one of the fastest-growing destinations for African professionals, particularly from Nigeria. The country has a booming technology and logistics sector, a growing English-speaking professional community, and a cost of living significantly lower than Western Europe.

## Types of Work Authorisation

**Type A Work Permit** — For employment with a Polish employer. Most common route.

**Work Declaration (Oświadczenie)** — For citizens of certain countries, allows up to 24 months of work for a single employer without a formal permit. Check current eligibility as rules change.

**EU Blue Card** — For highly skilled workers earning above a threshold salary. Provides stronger residence rights.

## The Type A Work Permit Process

### Step 1: Your Employer Applies First

The Polish employer must apply for a work permit on your behalf at the Voivodeship Office (Urząd Wojewódzki) in the region where you will work. You cannot initiate this process yourself.

### Step 2: Labour Market Test

In most cases, the employer must first demonstrate that no suitable EU candidate is available. This involves advertising the role with the local employment office. This can take 2–4 weeks.

### Step 3: Work Permit Issued

Once approved, the employer receives the work permit decision. Processing time: **1–3 months**, though backlogs can extend this.

### Step 4: You Apply for a Visa

With the work permit in hand, you apply for a **National Visa (type D)** at the Polish embassy or consulate in your home country. Processing time: **2–4 weeks**.

## Required Documents (Employee Side)

- Valid passport
- Passport photos
- Completed visa application form
- Copy of your work permit decision
- Employment contract or letter of intent
- Educational qualifications (certified translation may be required)
- Proof of accommodation in Poland
- Health insurance

## Salaries and Costs

Poland's minimum wage in 2026 is approximately PLN 4,300/month (~€1,000). Most skilled roles in technology, finance, and logistics pay PLN 8,000–20,000/month.

## Important Caution

Immigration rules in Poland — particularly around work declarations and permit categories — change frequently. Always verify current requirements with the Polish embassy in your country before beginning the process. VisaClear's checklist for Poland is updated regularly.`,
  },
  {
    id: "travel-insurance-visa-applications",
    title: "Does Travel Insurance Actually Matter for Visa Applications?",
    category: "Visa Tips",
    readTime: "3 min read",
    date: "March 25, 2026",
    excerpt: "Short answer: yes, especially for Schengen. We break down what type of insurance officers actually want to see and common mistakes applicants make.",
    body: `Many applicants treat travel insurance as an afterthought — something to buy at the last minute or skip entirely if it is not listed as mandatory. This is a mistake.

## Where It Is Mandatory

**Schengen Area:** Travel insurance is a **formal requirement**. Minimum coverage is €30,000 for medical emergencies and repatriation. It must be valid in all Schengen states. Applications without valid insurance will be rejected.

**UK:** Not formally required but strongly recommended and frequently requested by officers assessing your application.

**Canada, USA, Australia:** Not mandatory but demonstrates financial responsibility and planning — which positively influences approval decisions.

## What Officers Look For

When reviewing your insurance:

- **Coverage amount** — must meet the minimum (€30,000 for Schengen)
- **Coverage area** — must include the destination country/countries
- **Validity period** — must cover your entire intended stay, including potential delays
- **Provider legitimacy** — some officers verify that the policy is from a recognised insurer

## Common Mistakes

**Buying the cheapest policy available.** Some budget policies exclude medical evacuation, which is the most expensive emergency scenario. Officers in some embassies have begun checking policy inclusions.

**Dates that don't match your itinerary.** Your insurance start and end dates must align with your travel dates on your application.

**Not covering transit countries.** If your route passes through a Schengen country that is not your primary destination, your insurance must cover it.

## Our Recommendation

For Schengen: purchase from a well-known insurer, ensure medical coverage is at least €30,000, and print the policy document — not just a confirmation email.

For other destinations: include insurance regardless. The cost is modest and the signal it sends — that you are a prepared, organised traveller — is worth far more.`,
  },
  {
    id: "visa-agent-or-self-apply",
    title: "Should You Use a Visa Agent or Apply Yourself? An Honest Comparison",
    category: "Guides",
    readTime: "5 min read",
    date: "March 18, 2026",
    excerpt: "Agents are useful. But they are not always necessary. We compare both approaches across cost, time, and approval rate so you can decide what makes sense for your case.",
    body: `The visa agent question is one we get asked constantly. Here is an honest breakdown.

## What a Visa Agent Actually Does

A good visa agent will:
- Review your documents before submission
- Advise on the correct visa type and category
- Help you complete the application form accurately
- Advise on financial presentation
- Submit on your behalf (in some jurisdictions)

What they **cannot** do: guarantee approval. Any agent claiming a guaranteed visa is making a claim no legitimate professional can make.

## When an Agent Is Worth It

**Complex cases.** If you have a previous rejection, complicated financial history, an unusual purpose of travel, or a visa that requires significant supporting documentation (student, work), professional guidance has real value.

**Limited time.** Preparing a thorough visa application takes 4–10 hours for a first-time applicant. If your time is genuinely worth more than the agent fee, outsource it.

**Unfamiliar destination.** Some countries have highly specific requirements that change frequently. An agent who specialises in that destination country will have current knowledge.

## When You Don't Need One

**Tourist visas to well-documented destinations.** A UK tourist visa or Schengen visa from Nigeria is applied for by thousands of people every month. The process is well-documented, and with the right checklist, most applicants can handle it themselves.

**If your case is straightforward.** Stable employment, consistent income, clean travel history, purpose of travel is clear — you have what it takes to apply yourself.

## Cost Comparison

| Approach | Cost | Time | Approval rate |
|---|---|---|---|
| Self-apply (no tools) | Low | High | Variable |
| Self-apply with VisaClear | Low | Medium | Improved |
| Professional agent | £200–£800+ | Low | Dependent on agent |

## Our Take

Use VisaClear's checklist as your first step. It was built to give individual applicants the same level of document precision that a good agent provides — at a fraction of the cost. If your case is genuinely complex, use an agent. If not, you can likely handle it yourself.

Our Agents Marketplace connects you with verified agents for cases that genuinely warrant professional help.`,
  },
  {
    id: "canada-visitor-visa-africa",
    title: "Canada Visitor Visa for African Applicants: What Changed in 2026",
    category: "Destination Guides",
    readTime: "6 min read",
    date: "March 10, 2026",
    excerpt: "Recent policy changes have affected approval rates for applicants from several African countries. Here is what you need to know and how to strengthen your application.",
    body: `Canada remains one of the most desirable destinations for African travellers — and one of the most competitive to obtain a visa for. Several policy and processing changes in 2026 have shifted the landscape.

## What Changed in 2026

**Online biometric collection expanded.** Applicants from more African countries are now required to provide biometrics at a Visa Application Centre (VAC) before their application can be processed. This adds 1–3 weeks to processing time.

**Financial thresholds updated.** IRCC increased its informal financial guidelines. Applicants are now expected to show stronger financial evidence than in previous years.

**Digital document submission.** Most applications now use the online portal exclusively. Paper submissions are significantly more restricted.

## Core Requirements

1. **Valid passport** — minimum 6 months beyond intended stay
2. **Completed IMM 5257 form** — via the online IRCC portal
3. **Proof of purpose** — invitation letter, conference documentation, tourism itinerary
4. **Financial evidence** — bank statements (3–6 months), employment proof, payslips
5. **Ties to home country** — employment letter, property, family commitments
6. **Travel history** — previous visas and travel stamps are highly beneficial
7. **Biometrics** — required for most African applicants

## Financial Expectations

Canada has no published minimum balance requirement, but case officers informally expect:

- **CAD $10,000–$15,000** for a 2–4 week visit
- Evidence the funds are consistently yours, not recently transferred
- Income documentation supporting your ability to sustain your finances

## Strengthening Your Application

**Previous travel to developed countries** significantly improves your chances. A US, UK, or Schengen visa — even if expired — demonstrates that other immigration authorities have already assessed you favourably.

**A clear and specific itinerary** reduces officer discretion. Vague applications invite refusals. Be specific about where you will stay, who you will see, and what you will do.

**A compelling ties letter** is increasingly important. Write clearly about your employment, your family, and your reasons for returning home after your visit.

## Processing Times (2026)

Standard processing: **60–100 days** for Nigerian applicants
Biometric step adds 1–3 weeks at the beginning

Apply **4–5 months** before your intended travel date.`,
  },
  {
    id: "how-to-write-cover-letter-visa",
    title: "How to Write a Visa Cover Letter That Officers Actually Read",
    category: "Document Guides",
    readTime: "5 min read",
    date: "February 28, 2026",
    excerpt: "Most applicants either skip the cover letter or write one that says nothing useful. A well-written letter can be the difference between approval and rejection for borderline cases.",
    body: `The cover letter is one of the most underused documents in a visa application. Most people skip it, or write two sentences that add nothing to what is already in the form. That is a missed opportunity.

A well-written cover letter does not just repeat your application. It tells the story behind it. It addresses questions the officer might have before they think to ask them.

## What a Cover Letter Should Contain

Your letter should cover six areas, in this order:

**1. Who you are.** One paragraph. Name, nationality, occupation, and where you currently live. Keep it factual, not promotional.

**2. The purpose of your trip.** Be specific. If you are visiting for tourism, say exactly where you plan to go and why. If it is for a conference, name the conference. Vague statements like "I wish to experience the culture" do not carry weight.

**3. Your itinerary.** Dates of travel, places you will stay, how long you plan to be in each location. This is especially important for multi-city Schengen trips.

**4. How you will fund the trip.** State your income, employment status, and that your bank statements are included. If someone is sponsoring you, explain who they are and your relationship to them.

**5. Your ties to your home country.** This is the most important section for African, Asian, and LatAm applicants. Explicitly state what you are returning to: your job, your business, your family, your property. Officers want to see that you have strong reasons to go home.

**6. A closing statement.** One sentence. Something like: "I confirm that I will comply with all visa conditions and return to Nigeria before the expiry of my permitted stay."

## Tone and Length

Keep it formal but readable. One to two pages is enough. Use short paragraphs. Do not use bullet points in the letter itself. Write in full sentences.

Avoid emotional language. "I have always dreamed of visiting..." does not help your application. Officers are not moved by sentiment. They are moved by evidence.

## Common Mistakes

Copying a template from the internet is one of the worst things you can do. Officers review thousands of applications. They recognise generic letters immediately. Write yours from scratch using your actual circumstances.

Contradicting your application form is another frequent error. If your form states you are employed, your letter must be consistent with that. Any discrepancy creates doubt.

## One Final Point

A cover letter does not save a weak application. If your financial proof is inadequate or your ties to home country are thin, no letter will fix that. The letter works best when your core documents are already strong — it adds context and removes doubt.`,
  },
  {
    id: "uae-visa-from-nigeria-ghana",
    title: "UAE Tourist Visa from Nigeria and Ghana: Full 2026 Application Guide",
    category: "Destination Guides",
    readTime: "6 min read",
    date: "February 15, 2026",
    excerpt: "Dubai is one of the fastest-growing destinations for West African travellers. Here is every document you need, current processing times, and tips to avoid the most common rejections.",
    body: `The UAE — and Dubai in particular — has become one of the most popular short-haul destinations for Nigerians and Ghanaians over the past five years. It is also one of the more accessible destinations to get a visa for, provided your application is properly prepared.

## How the UAE Visa System Works

UAE visas are not applied for directly at an embassy in most cases. They are processed through:

- **Emirates, Flydubai, or Air Arabia** — airlines often issue visa sponsorship as part of booking
- **UAE-based hotels** — four and five-star hotels can sponsor tourist visas
- **Licensed travel agencies** in the UAE

The most straightforward route for Nigerian and Ghanaian applicants is applying through Emirates airline when booking your ticket, or through a verified UAE travel agent.

## Required Documents

1. **Valid passport** — minimum 6 months validity beyond your intended travel date
2. **Passport photograph** — white background, no glasses, taken within the last 3 months
3. **Return flight ticket** — confirmed booking
4. **Bank statements (3 months)** — showing sufficient funds for your stay
5. **Hotel booking or host invitation** — confirmed accommodation details
6. **Proof of employment** — letter from employer stating your designation and salary
7. **Travel insurance** — not always mandatory but strengthens the application

## Financial Requirements

There is no formally published minimum, but in practice you should be able to show **at least $2,000–$3,000** equivalent for a one to two week visit. Consistent income is more important than a large one-time balance.

## Processing Times

Standard processing: **3–5 working days**
Express processing: **1–2 working days** (additional fee)

Apply at least **2 weeks before** your travel date to allow for any complications.

## Common Reasons for Rejection

**Insufficient bank balance.** This is the top reason. Your statement needs to show that you can comfortably fund the trip and return home.

**Incomplete documents.** Missing a single item can result in rejection without explanation.

**Previous overstay or violation.** Any prior immigration violation in any country significantly impacts your UAE application.

## After Arrival

On a standard tourist visa, you can stay up to **30 days**, with an option to extend once for another 30 days through the ICA (Federal Authority for Identity, Citizenship, Customs and Ports Security) online portal. Do not overstay — fines are AED 50 per day.

Use VisaClear's checklist for UAE to get your full document list in under 60 seconds.`,
  },
];

export default function BlogArticlePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const goBack = useSmartBack("/blog");
  const article = ARTICLES.find((a) => a.id === id);

  useSeo({
    title: article ? article.title : "Article Not Found",
    description: article ? article.excerpt : "This article could not be found.",
  });

  if (!article) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center px-6 text-center">
        <h1 className="font-serif text-4xl font-semibold text-primary mb-4">Article not found</h1>
        <Button onClick={() => navigate("/blog")} className="cursor-pointer">Back to Blog</Button>
      </div>
    );
  }

  // Render simple markdown-like body
  const renderBody = (body: string) => {
    return body.split("\n\n").map((block, i) => {
      if (block.startsWith("## ")) {
        return <h2 key={i} className="font-serif text-2xl font-semibold text-primary mt-10 mb-4">{block.replace("## ", "")}</h2>;
      }
      if (block.startsWith("### ")) {
        return <h3 key={i} className="font-semibold text-lg text-primary mt-6 mb-2">{block.replace("### ", "")}</h3>;
      }
      if (block.startsWith("| ")) {
        // Simple table rendering
        const rows = block.split("\n").filter((r) => !r.startsWith("|---"));
        return (
          <div key={i} className="overflow-x-auto my-6">
            <table className="w-full text-sm border-collapse">
              {rows.map((row, ri) => {
                const cells = row.split("|").filter((c) => c.trim());
                return ri === 0 ? (
                  <thead key={ri}><tr>{cells.map((c, ci) => <th key={ci} className="border border-border px-4 py-2 text-left font-semibold bg-muted/40">{c.trim()}</th>)}</tr></thead>
                ) : (
                  <tbody key={ri}><tr>{cells.map((c, ci) => <td key={ci} className="border border-border px-4 py-2 text-muted-foreground">{c.trim()}</td>)}</tr></tbody>
                );
              })}
            </table>
          </div>
        );
      }
      if (block.startsWith("- ") || block.includes("\n- ")) {
        const items = block.split("\n").filter((l) => l.startsWith("- "));
        return (
          <ul key={i} className="list-disc list-inside space-y-1.5 text-muted-foreground my-4 ml-2">
            {items.map((item, li) => <li key={li}>{item.replace("- ", "")}</li>)}
          </ul>
        );
      }
      if (block.match(/^\d+\. /)) {
        const items = block.split("\n").filter((l) => l.match(/^\d+\. /));
        return (
          <ol key={i} className="list-decimal list-inside space-y-1.5 text-muted-foreground my-4 ml-2">
            {items.map((item, li) => <li key={li}>{item.replace(/^\d+\. /, "")}</li>)}
          </ol>
        );
      }
      if (block.startsWith("---")) {
        return <hr key={i} className="border-border my-8" />;
      }
      // Bold text
      const parts = block.split(/\*\*(.*?)\*\*/g);
      return (
        <p key={i} className="text-muted-foreground leading-relaxed my-4">
          {parts.map((part, pi) => pi % 2 === 1 ? <strong key={pi} className="text-foreground font-semibold">{part}</strong> : part)}
        </p>
      );
    });
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border/40 px-6 py-4 flex items-center justify-between sticky top-0 z-40 bg-background/95 backdrop-blur">
        <div className="flex items-center gap-3">
          <button onClick={goBack} className="p-2 rounded-lg hover:bg-muted transition-colors cursor-pointer">
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="flex items-center gap-2">
            <Globe className="w-5 h-5 text-accent" />
            <span className="font-serif font-semibold text-primary">VisaClear</span>
            <span className="text-xs text-muted-foreground tracking-widest uppercase">Resources</span>
          </div>
        </div>
        <Button size="sm" onClick={() => navigate("/checklist")} className="cursor-pointer">
          Get Free Checklist
        </Button>
      </header>

      <article className="max-w-3xl mx-auto px-6 py-14 pb-24">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
          {/* Meta */}
          <div className="flex flex-wrap items-center gap-3 mb-6">
            <span className="bg-accent/10 text-accent text-xs font-semibold px-3 py-1 rounded-full flex items-center gap-1">
              <Tag className="w-3 h-3" />{article.category}
            </span>
            <span className="text-muted-foreground text-xs flex items-center gap-1"><Clock className="w-3 h-3" />{article.readTime}</span>
            <span className="text-muted-foreground text-xs">{article.date}</span>
          </div>

          {/* Title */}
          <h1 className="font-serif text-3xl md:text-5xl font-semibold text-primary leading-[1.15] mb-6 text-balance">
            {article.title}
          </h1>

          {/* Excerpt */}
          <p className="text-lg text-muted-foreground border-l-4 border-accent/40 pl-5 italic mb-10 leading-relaxed">
            {article.excerpt}
          </p>

          {/* Body */}
          <div>{renderBody(article.body)}</div>

          {/* CTA */}
          <div className="mt-14 bg-primary rounded-2xl p-8 text-center text-primary-foreground">
            <h2 className="font-serif text-2xl font-semibold mb-2">Ready to prepare your application?</h2>
            <p className="text-primary-foreground/65 text-sm mb-5">Get your exact document checklist in 60 seconds. Free to start.</p>
            <Button
              className="cursor-pointer bg-accent text-white hover:bg-accent/90 font-semibold"
              onClick={() => navigate("/checklist")}
            >
              Get My Free Checklist <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        </motion.div>
      </article>
    </div>
  );
}
