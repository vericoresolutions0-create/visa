import { useNavigate } from "react-router-dom";
import { Globe, ArrowLeft, Lock } from "lucide-react";
import { useSeo } from "@/hooks/use-seo.ts";
import { useSmartBack } from "@/hooks/use-smart-back.ts";

export default function PrivacyPage() {
  const navigate = useNavigate();
  const goBack = useSmartBack("/");
  useSeo({ title: "Privacy Policy", description: "VisaClear by Vericore is built around GDPR and NDPA data protection principles. Read how we handle your data with full transparency and zero compromise." });
  const year = new Date().getFullYear();

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 border-b border-border/60 bg-background/90 backdrop-blur-md">
        <div className="max-w-3xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={goBack} className="text-muted-foreground hover:text-primary transition-colors cursor-pointer p-1 -ml-1">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2.5 cursor-pointer" onClick={() => navigate("/")}>
              <div className="w-7 h-7 rounded-md bg-primary flex items-center justify-center">
                <Globe className="w-3.5 h-3.5 text-primary-foreground" />
              </div>
              <span className="font-serif text-lg font-semibold text-primary">VisaClear</span>
              <span className="text-[10px] text-muted-foreground tracking-widest uppercase">by Vericore</span>
            </div>
          </div>
          <div className="flex items-center gap-1.5 text-xs font-semibold text-primary">
            <Lock className="w-3.5 h-3.5 text-accent" /> Privacy Policy
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-12">
        <div className="mb-10">
          <h1 className="font-serif text-4xl font-semibold text-primary mb-3">Privacy Policy</h1>
          <p className="text-sm text-muted-foreground">Last updated: 1 May {year} &nbsp;·&nbsp; Effective immediately</p>
          <div className="mt-4 p-4 bg-accent/8 border border-accent/20 rounded-xl">
            <p className="text-sm font-semibold text-primary italic">&ldquo;It&apos;s all about Privacy.&rdquo;</p>
            <p className="text-xs text-muted-foreground mt-1">This is our core principle. We collect only what is necessary, never sell your data, and give you full control.</p>
          </div>
        </div>

        <div className="prose prose-sm max-w-none space-y-8 text-foreground">

          <section>
            <h2 className="font-serif text-xl font-semibold text-primary mb-3">1. Who We Are</h2>
            <p className="text-muted-foreground leading-relaxed">
              Vericore Ltd ("we", "us", "our") operates VisaClear. We are the data controller for personal data collected through the Service. Our registered address and data protection contact: <a href="mailto:privacy@vericore.app" className="text-primary underline">privacy@vericore.app</a>.
            </p>
          </section>

          <section>
            <h2 className="font-serif text-xl font-semibold text-primary mb-3">2. Data We Collect</h2>
            <p className="text-muted-foreground leading-relaxed mb-3">We collect only what is necessary to provide the Service:</p>
            <div className="space-y-3">
              {[
                { title: "Account information", desc: "Your name and email address when you create an account." },
                { title: "Usage data", desc: "Visa checklists you generate, reminders you set, and checklists you save. This data is tied to your account." },
                { title: "Refusal letter content", desc: "Text you paste into the AI Rejection Analyser. This is processed transiently to generate your analysis and stored only if you save the result." },
                { title: "Risk Score and pre-submission audit answers", desc: "Financial and personal readiness answers you submit to get a Risk Score or pre-submission check. If you are signed in this is linked to your account; if not, it is stored only against a private result link that you choose whether to share." },
                { title: "Wall of Fame submissions", desc: "Visa refusal/approval stories you choose to submit. Reviewed before publishing and always shown to other users without your name or any identifying information." },
                { title: "Wait time reports", desc: "Application and decision dates you submit for a specific visa route. These are combined into anonymous community statistics (e.g. a median processing time) and never shown individually." },
                { title: "Partner referral", desc: "If you arrive via a partner organisation's link (e.g. a university), we record which partner referred you so we can report aggregate usage back to that partner. Your individual identity is never shared with the partner." },
                { title: "Telegram bot messages", desc: "If you message our Telegram bot, we log the message text and which destination/visa type it matched, to operate and improve the bot. This is not linked to any VisaClear account." },
                { title: "Payment information", desc: "Billing details for paid plans, processed by our payment provider. We do not store card numbers." },
                { title: "Technical data", desc: "Browser type, device type, and anonymised usage analytics to improve the Service. No personal identifiers are included." },
              ].map((item) => (
                <div key={item.title} className="flex gap-3 p-3 bg-muted/30 rounded-lg">
                  <div className="w-1.5 h-1.5 rounded-full bg-accent shrink-0 mt-2" />
                  <div>
                    <span className="font-semibold text-sm text-foreground">{item.title}: </span>
                    <span className="text-sm text-muted-foreground">{item.desc}</span>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section>
            <h2 className="font-serif text-xl font-semibold text-primary mb-3">3. Legal Basis for Processing (GDPR)</h2>
            <p className="text-muted-foreground leading-relaxed">
              We process your personal data on the following legal bases: (a) <strong>Contract</strong> , to provide the Service you have requested; (b) <strong>Legitimate interests</strong> , to improve the Service and prevent fraud; (c) <strong>Legal obligation</strong> , where required by law; (d) <strong>Consent</strong> , for marketing communications, which you may withdraw at any time.
            </p>
          </section>

          <section>
            <h2 className="font-serif text-xl font-semibold text-primary mb-3">4. Nigeria Data Protection Act (NDPA)</h2>
            <p className="text-muted-foreground leading-relaxed">
              We comply with the Nigeria Data Protection Act 2023. Nigerian users have the right to access, correct, delete, and object to the processing of their personal data. We do not transfer Nigerian personal data outside Nigeria without appropriate safeguards. To exercise your rights, contact <a href="mailto:privacy@vericore.app" className="text-primary underline">privacy@vericore.app</a>.
            </p>
          </section>

          <section>
            <h2 className="font-serif text-xl font-semibold text-primary mb-3">5. How We Use Your Data</h2>
            <ul className="list-disc list-inside space-y-1 text-muted-foreground">
              <li>To provide and improve VisaClear features</li>
              <li>To send deadline reminders you have requested</li>
              <li>To send welcome and transactional emails</li>
              <li>To process subscription payments</li>
              <li>To detect and prevent fraud or abuse</li>
              <li>To comply with legal obligations</li>
            </ul>
          </section>

          <section>
            <h2 className="font-serif text-xl font-semibold text-primary mb-3">6. Data Sharing</h2>
            <p className="text-muted-foreground leading-relaxed">
              We do not sell, rent, or trade your personal data. We share data only with trusted service providers who process it on our behalf (hosting, payment processing, email delivery) under strict data processing agreements. We may disclose data if required by law or to protect our legal rights. Features like the Wall of Fame are different from third-party sharing: content is only ever made public because you actively chose to submit it, and it is always shown without your name or identity.
            </p>
          </section>

          <section>
            <h2 className="font-serif text-xl font-semibold text-primary mb-3">7. Data Retention</h2>
            <p className="text-muted-foreground leading-relaxed">
              We retain your data for as long as your account is active. If you delete your account, we delete your personal data within 30 days, except where retention is required by law. Anonymised, aggregated analytics data may be retained indefinitely.
            </p>
          </section>

          <section>
            <h2 className="font-serif text-xl font-semibold text-primary mb-3">8. Your Rights</h2>
            <p className="text-muted-foreground leading-relaxed mb-2">Under GDPR and NDPA, you have the right to:</p>
            <ul className="list-disc list-inside space-y-1 text-muted-foreground">
              <li>Access the personal data we hold about you</li>
              <li>Correct inaccurate or incomplete data</li>
              <li>Request deletion of your data ("right to be forgotten")</li>
              <li>Object to or restrict processing</li>
              <li>Data portability (receive your data in a machine-readable format)</li>
              <li>Withdraw consent at any time</li>
            </ul>
            <p className="text-muted-foreground leading-relaxed mt-2">
              To exercise these rights, contact <a href="mailto:privacy@vericore.app" className="text-primary underline">privacy@vericore.app</a>. We will respond within 30 days.
            </p>
          </section>

          <section>
            <h2 className="font-serif text-xl font-semibold text-primary mb-3">9. Cookies</h2>
            <p className="text-muted-foreground leading-relaxed">
              We use only essential cookies required for authentication and session management. We do not use advertising or third-party tracking cookies.
            </p>
          </section>

          <section>
            <h2 className="font-serif text-xl font-semibold text-primary mb-3">10. Security</h2>
            <p className="text-muted-foreground leading-relaxed">
              We implement industry-standard security measures including encryption in transit (TLS), encryption at rest, and access controls. Our compliance framework is overseen by a CISA-certified security professional. No method of transmission over the internet is 100% secure; we cannot guarantee absolute security.
            </p>
          </section>

          <section>
            <h2 className="font-serif text-xl font-semibold text-primary mb-3">11. Contact and Complaints</h2>
            <p className="text-muted-foreground leading-relaxed">
              For privacy questions, contact <a href="mailto:privacy@vericore.app" className="text-primary underline">privacy@vericore.app</a>. If you are in the UK or EU and are not satisfied with our response, you have the right to lodge a complaint with your local data protection authority (UK: ICO; EU: your national DPA; Nigeria: NDPC).
            </p>
          </section>

        </div>
      </main>

      <footer className="border-t border-border mt-12 py-6 px-6 text-center">
        <p className="text-xs text-muted-foreground italic mb-1">&ldquo;It&apos;s all about Privacy.&rdquo;</p>
        <p className="text-xs text-muted-foreground">
          &copy; {year} Vericore Ltd. &nbsp;·&nbsp;
          <button onClick={() => navigate("/privacy")} className="hover:text-primary underline cursor-pointer">Privacy Policy</button>
          &nbsp;·&nbsp;
          <button onClick={() => navigate("/terms")} className="hover:text-primary underline cursor-pointer">Terms of Service</button>
        </p>
      </footer>
    </div>
  );
}
