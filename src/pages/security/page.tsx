import { useNavigate } from "react-router-dom";
import { Globe, ArrowLeft, ShieldCheck, ExternalLink } from "lucide-react";
import { useSeo } from "@/hooks/use-seo.ts";
import { useSmartBack } from "@/hooks/use-smart-back.ts";

export default function SecurityPage() {
  const navigate = useNavigate();
  const goBack = useSmartBack("/");
  useSeo({ title: "Security", description: "How to report a security issue on VisaClear, what's in scope, and what to expect from us." });
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
            <ShieldCheck className="w-3.5 h-3.5 text-accent" /> Security
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-12">
        <div className="mb-10">
          <h1 className="font-serif text-4xl font-semibold text-primary mb-3">Found a security issue? Tell us.</h1>
          <p className="text-sm text-muted-foreground">Last updated: 18 July {year}</p>
        </div>

        <div className="prose prose-sm max-w-none space-y-8 text-foreground">

          <section>
            <p className="text-muted-foreground leading-relaxed">
              VisaClear handles real immigration documents and personal data, so if you've found a way to break something, we want to hear about it before anyone else does. This page explains what's in scope, what isn't, and what happens after you email us. We're a small team, so please read it before you dig in — it'll save us both time.
            </p>
          </section>

          <section>
            <h2 className="font-serif text-xl font-semibold text-primary mb-3">What's in scope</h2>
            <ul className="list-disc list-inside space-y-1 text-muted-foreground">
              <li>visaclear.app and every page/feature on it</li>
              <li>Our API and backend, wherever it's reachable from visaclear.app (including anything under *.convex.cloud or *.convex.site that our frontend talks to)</li>
              <li>Authentication, payments, file uploads/downloads, the admin panel, and anything involving another user's data</li>
            </ul>
          </section>

          <section>
            <h2 className="font-serif text-xl font-semibold text-primary mb-3">What's out of scope</h2>
            <ul className="list-disc list-inside space-y-1 text-muted-foreground">
              <li>Anything that needs you to flood us with traffic (denial of service, rate-limit stress testing, load testing)</li>
              <li>Social engineering against us or our users — phishing emails, pretexting, calling us up pretending to be someone else</li>
              <li>Automated scanners left running unattended, or anything that could degrade the site for real users</li>
              <li>Third-party services we don't control — Stripe, Paystack, Vercel, Convex, Google, our email provider. Report those issues to them directly</li>
              <li>Missing security headers, cookie flags, or best-practice nitpicks with no real, demonstrated impact</li>
              <li>Reports generated purely by an automated scanner with no manual verification that the issue is real</li>
            </ul>
          </section>

          <section>
            <h2 className="font-serif text-xl font-semibold text-primary mb-3">Ground rules</h2>
            <p className="text-muted-foreground leading-relaxed mb-2">If you're testing against the live site:</p>
            <ul className="list-disc list-inside space-y-1 text-muted-foreground">
              <li>Only use accounts you created yourself. Don't try to access, download, or modify another real user's data — if you can prove the issue exists, stop there and tell us</li>
              <li>Don't run anything that could knock the site over for other people</li>
              <li>If you accidentally see something sensitive that isn't yours, stop, don't dig further, and mention it in your report so we know what happened</li>
              <li>Give us a reasonable amount of time to fix a real issue before writing about it publicly — we'll keep you posted on where we're at</li>
            </ul>
          </section>

          <section>
            <h2 className="font-serif text-xl font-semibold text-primary mb-3">Our commitment to you</h2>
            <p className="text-muted-foreground leading-relaxed">
              If you find something and follow the rules above in good faith, we won't take legal action against you or report you to anyone over it. We'd genuinely rather know.
            </p>
          </section>

          <section>
            <h2 className="font-serif text-xl font-semibold text-primary mb-3">How to report something</h2>
            <p className="text-muted-foreground leading-relaxed">
              Email <a href="mailto:hello@visaclear.app" className="text-primary underline">hello@visaclear.app</a> with what you found. It helps a lot if you include:
            </p>
            <ul className="list-disc list-inside space-y-1 text-muted-foreground mt-2">
              <li>The exact page or endpoint affected</li>
              <li>Steps to reproduce it, as plainly as you can write them</li>
              <li>What you think the actual impact is — what could someone do with this</li>
              <li>Anything you used to find it (screenshots, a short video, request/response bodies with anything sensitive of your own redacted)</li>
            </ul>
          </section>

          <section>
            <h2 className="font-serif text-xl font-semibold text-primary mb-3">What to expect from us</h2>
            <p className="text-muted-foreground leading-relaxed">
              We'll acknowledge your email within 5 business days and let you know if we can reproduce it. We're an early-stage startup and don't run a paid bug bounty program right now — we can't promise a reward. What we can promise: we'll read every report ourselves, fix real issues, and credit you publicly if you'd like that once it's resolved (or keep you anonymous, your call).
            </p>
          </section>

          <section>
            <h2 className="font-serif text-xl font-semibold text-primary mb-3">Contact</h2>
            <p className="text-muted-foreground leading-relaxed">
              <a href="mailto:hello@visaclear.app" className="text-primary underline">hello@visaclear.app</a> — also published at{" "}
              <a href="/.well-known/security.txt" target="_blank" rel="noopener noreferrer" className="text-primary underline inline-flex items-center gap-1">
                /.well-known/security.txt <ExternalLink className="w-3 h-3" />
              </a>{" "}
              per RFC 9116, so security tools and researchers can find it automatically.
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
