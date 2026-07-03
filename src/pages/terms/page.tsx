import { useNavigate } from "react-router-dom";
import { Globe, ArrowLeft, Shield } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useSeo } from "@/hooks/use-seo.ts";
import { useSmartBack } from "@/hooks/use-smart-back.ts";

export default function TermsPage() {
  const { t } = useTranslation("legal");
  const navigate = useNavigate();
  const goBack = useSmartBack("/");
  useSeo({ title: "Terms of Service", description: "Read VisaClear's terms of service. Understand your rights and responsibilities when using our visa preparation platform." });
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
            <Shield className="w-3.5 h-3.5 text-accent" /> {t("terms.badge")}
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-12">
        <div className="mb-10">
          <h1 className="font-serif text-4xl font-semibold text-primary mb-3">{t("terms.title")}</h1>
          <p className="text-sm text-muted-foreground">Last updated: 1 May {year} &nbsp;·&nbsp; Effective immediately</p>
        </div>

        <div className="prose prose-sm max-w-none space-y-8 text-foreground">

          <section>
            <h2 className="font-serif text-xl font-semibold text-primary mb-3">1. Acceptance of Terms</h2>
            <p className="text-muted-foreground leading-relaxed">
              By accessing or using VisaClear ("the Service"), operated by Vericore Ltd ("we", "us", "our"), you agree to be bound by these Terms of Service. If you do not agree, please do not use the Service. These Terms apply to all visitors, users, and others who access or use VisaClear.
            </p>
          </section>

          <section>
            <h2 className="font-serif text-xl font-semibold text-primary mb-3">2. Description of Service</h2>
            <p className="text-muted-foreground leading-relaxed">
              VisaClear provides personalised visa document checklists, AI-powered rejection analysis, deadline reminders, and immigration guidance tools. The Service is a guidance tool only and does not constitute legal advice. We are not a law firm and do not provide immigration legal services.
            </p>
          </section>

          <section>
            <h2 className="font-serif text-xl font-semibold text-primary mb-3">3. Disclaimer of Legal Advice</h2>
            <p className="text-muted-foreground leading-relaxed">
              All content on VisaClear, including checklists, AI-generated analysis, and recommendations, is for informational and guidance purposes only. It does not constitute legal advice and should not be relied upon as such. For complex immigration matters, you should consult a qualified immigration solicitor or adviser. Vericore Ltd accepts no liability for decisions made based on information provided through the Service.
            </p>
          </section>

          <section>
            <h2 className="font-serif text-xl font-semibold text-primary mb-3">4. Accuracy of Information</h2>
            <p className="text-muted-foreground leading-relaxed">
              Visa requirements, processing times, and fees change frequently. While we strive to keep our data current, we cannot guarantee that all information is accurate, complete, or up to date. Always verify requirements directly with the relevant embassy, consulate, or official government immigration website before submitting any application.
            </p>
          </section>

          <section>
            <h2 className="font-serif text-xl font-semibold text-primary mb-3">5. User Accounts</h2>
            <p className="text-muted-foreground leading-relaxed">
              To access certain features, you must create an account. You are responsible for maintaining the confidentiality of your account credentials and for all activity that occurs under your account. You must notify us immediately of any unauthorised use of your account. We reserve the right to terminate accounts that violate these Terms.
            </p>
          </section>

          <section>
            <h2 className="font-serif text-xl font-semibold text-primary mb-3">6. Acceptable Use</h2>
            <p className="text-muted-foreground leading-relaxed mb-2">You agree not to:</p>
            <ul className="list-disc list-inside space-y-1 text-muted-foreground">
              <li>Use the Service for any unlawful purpose or in violation of any applicable laws</li>
              <li>Attempt to gain unauthorised access to any part of the Service</li>
              <li>Scrape, reproduce, or redistribute our content without written permission</li>
              <li>Submit false, misleading, or fraudulent information</li>
              <li>Use automated tools or bots to access or extract data from the Service</li>
              <li>Harass, abuse, or harm other users of the Service</li>
            </ul>
          </section>

          <section>
            <h2 className="font-serif text-xl font-semibold text-primary mb-3">7. User-Generated Content</h2>
            <p className="text-muted-foreground leading-relaxed">
              Features such as the Wall of Fame let you submit your own real visa story. You retain ownership of what you submit, but grant us a licence to display it publicly, always without your name or identifying details. We review submissions before they go live and may decline or remove any submission, including ones containing personal identifiers, defamatory content, or anything that violates these Terms. Community-sourced data such as reported processing times reflects individual applicants' real experiences, not an official or guaranteed figure.
            </p>
          </section>

          <section>
            <h2 className="font-serif text-xl font-semibold text-primary mb-3">8. Subscription and Payments</h2>
            <p className="text-muted-foreground leading-relaxed">
              VisaClear offers free and paid subscription plans. Paid plans are billed monthly or annually. All payments are processed securely. You may cancel your subscription at any time. Refunds are handled in accordance with applicable consumer protection laws. We reserve the right to modify pricing with reasonable notice.
            </p>
          </section>

          <section>
            <h2 className="font-serif text-xl font-semibold text-primary mb-3">9. Intellectual Property</h2>
            <p className="text-muted-foreground leading-relaxed">
              All content, design, branding, and functionality of VisaClear is the property of Vericore Ltd and is protected by applicable intellectual property laws. You may not reproduce, distribute, or create derivative works without our express written consent.
            </p>
          </section>

          <section>
            <h2 className="font-serif text-xl font-semibold text-primary mb-3">10. Limitation of Liability</h2>
            <p className="text-muted-foreground leading-relaxed">
              To the fullest extent permitted by law, Vericore Ltd shall not be liable for any indirect, incidental, special, consequential, or punitive damages arising from your use of the Service, including visa refusals, financial losses, or missed deadlines. Our total liability to you shall not exceed the amount you paid for the Service in the twelve months preceding the claim.
            </p>
          </section>

          <section>
            <h2 className="font-serif text-xl font-semibold text-primary mb-3">11. Governing Law</h2>
            <p className="text-muted-foreground leading-relaxed">
              These Terms shall be governed by and construed in accordance with the laws of England and Wales. Any disputes shall be subject to the exclusive jurisdiction of the courts of England and Wales.
            </p>
          </section>

          <section>
            <h2 className="font-serif text-xl font-semibold text-primary mb-3">11. Changes to Terms</h2>
            <p className="text-muted-foreground leading-relaxed">
              We may update these Terms at any time. We will notify users of significant changes by email or via a notice on the Service. Continued use of VisaClear after changes constitutes acceptance of the updated Terms.
            </p>
          </section>

          <section>
            <h2 className="font-serif text-xl font-semibold text-primary mb-3">12. Contact</h2>
            <p className="text-muted-foreground leading-relaxed">
              If you have any questions about these Terms, please contact us at <a href="mailto:vericoresolutions0@gmail.com" className="text-primary underline">vericoresolutions0@gmail.com</a>.
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
