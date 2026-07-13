import { motion } from "motion/react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  ListChecks,
  LayoutDashboard,
  UserCircle,
  AlertOctagon,
  Camera,
  Users,
  Tag,
  Building2,
  DollarSign,
  ShoppingCart,
  BookOpen,
  Info,
  Mail,
  Shield,
  FileText,
  ArrowLeft,
  BadgeCheck,
  LogIn,
  Briefcase,
  Sparkles,
} from "lucide-react";
import { useSeo } from "@/hooks/use-seo.ts";
import { useSmartBack } from "@/hooks/use-smart-back.ts";

const SECTIONS = [
  {
    label: "Core Tools",
    items: [
      {
        icon: ListChecks,
        title: "Checklist",
        desc: "Your personalised document list, ready in 60 seconds.",
        href: "/checklist",
        color: "text-blue-600 bg-blue-50 dark:bg-blue-900/30",
      },
      {
        icon: AlertOctagon,
        title: "Rejection Analyser",
        desc: "Upload a refusal letter and get a concrete fix plan.",
        href: "/rejection-analyser",
        color: "text-amber-600 bg-amber-50 dark:bg-amber-900/30",
      },
      {
        icon: Camera,
        title: "Photo Checker",
        desc: "Verify your passport photo meets embassy requirements.",
        href: "/passport-photo",
        color: "text-yellow-600 bg-yellow-50 dark:bg-yellow-900/30",
      },
    ],
  },
  {
    label: "Your Account",
    items: [
      {
        icon: LogIn,
        title: "Sign In",
        desc: "Sign in or create a free account to access your dashboard.",
        href: "/login",
        color: "text-blue-600 bg-blue-50 dark:bg-blue-900/30",
      },
      {
        icon: LayoutDashboard,
        title: "Dashboard",
        desc: "Your saved checklists, trips and progress at a glance.",
        href: "/dashboard",
        color: "text-slate-600 bg-slate-100 dark:bg-slate-800",
      },
      {
        icon: UserCircle,
        title: "Profile Settings",
        desc: "Manage your name, email, plan and referral rewards.",
        href: "/settings/profile",
        color: "text-slate-600 bg-slate-100 dark:bg-slate-800",
      },
    ],
  },
  {
    label: "For Business",
    items: [
      {
        icon: Users,
        title: "Agents",
        desc: "Find a verified visa agent for complex or high-stakes cases.",
        href: "/agents",
        color: "text-purple-600 bg-purple-50 dark:bg-purple-900/30",
      },
      {
        icon: BadgeCheck,
        title: "Agent Portal",
        desc: "Sign in to your agent account — manage clients and earnings.",
        href: "/agents/login",
        color: "text-violet-600 bg-violet-50 dark:bg-violet-900/30",
      },
      {
        icon: Sparkles,
        title: "AI Assistant",
        desc: "Ask about your pipeline, draft follow-ups, and flag stalled cases — inside your agent dashboard.",
        href: "/agents/login",
        color: "text-fuchsia-600 bg-fuchsia-50 dark:bg-fuchsia-900/30",
      },
      {
        icon: Tag,
        title: "White-Label",
        desc: "License VisaClear under your own brand.",
        href: "/white-label",
        color: "text-violet-600 bg-violet-50 dark:bg-violet-900/30",
      },
      {
        icon: Building2,
        title: "For Employers",
        desc: "Visa support tools for your international hires.",
        href: "/business",
        color: "text-indigo-600 bg-indigo-50 dark:bg-indigo-900/30",
      },
      {
        icon: Briefcase,
        title: "Business Portal",
        desc: "Sign in to your employer or organisation dashboard.",
        href: "/business/login",
        color: "text-emerald-700 bg-emerald-50 dark:bg-emerald-900/30",
      },
    ],
  },
  {
    label: "Plans & Pricing",
    items: [
      {
        icon: DollarSign,
        title: "Pricing",
        desc: "Compare Free, Premium and Expert tiers.",
        href: "/pricing",
        color: "text-emerald-600 bg-emerald-50 dark:bg-emerald-900/30",
      },
      {
        icon: ShoppingCart,
        title: "Checkout",
        desc: "Upgrade your plan — takes under a minute.",
        href: "/payment?plan=pro&billing=yearly",
        color: "text-teal-600 bg-teal-50 dark:bg-teal-900/30",
      },
    ],
  },
  {
    label: "Learn",
    items: [
      {
        icon: BookOpen,
        title: "Blog",
        desc: "Guides, destination tips and visa strategy articles.",
        href: "/blog",
        color: "text-sky-600 bg-sky-50 dark:bg-sky-900/30",
      },
      {
        icon: Info,
        title: "About",
        desc: "Our story, mission and the team behind VisaClear.",
        href: "/about",
        color: "text-slate-600 bg-slate-100 dark:bg-slate-800",
      },
      {
        icon: Mail,
        title: "Contact",
        desc: "Questions, partnerships or press — we're here.",
        href: "/contact",
        color: "text-slate-600 bg-slate-100 dark:bg-slate-800",
      },
    ],
  },
  {
    label: "Legal",
    items: [
      {
        icon: Shield,
        title: "Privacy Policy",
        desc: "How we handle and protect your data.",
        href: "/privacy",
        color: "text-slate-500 bg-slate-100 dark:bg-slate-800",
      },
      {
        icon: FileText,
        title: "Terms of Service",
        desc: "The rules that govern use of this platform.",
        href: "/terms",
        color: "text-slate-500 bg-slate-100 dark:bg-slate-800",
      },
    ],
  },
];

export default function MenuPage() {
  useSeo({ title: "Menu — VisaClear", description: "All VisaClear features and pages in one place." });
  const { t } = useTranslation("common");
  const goBack = useSmartBack();

  return (
    <div className="min-h-screen bg-background">
      {/* ── Sticky header ── */}
      <div className="sticky top-0 z-10 bg-background/80 backdrop-blur border-b border-border">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center gap-3">
          <button
            onClick={goBack}
            className="p-2 rounded-lg hover:bg-muted transition-colors text-muted-foreground cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <h1 className="font-serif text-xl font-semibold text-primary">Menu</h1>
        </div>
      </div>

      {/* ── Sections ── */}
      <div className="max-w-5xl mx-auto px-6 py-10 space-y-10">
        {SECTIONS.map((section, si) => (
          <motion.div
            key={section.label}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: si * 0.06, duration: 0.4 }}
          >
            <p className="text-xs font-semibold tracking-widest uppercase text-muted-foreground mb-4">
              {section.label}
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {section.items.map((item) => (
                <Link
                  key={item.title}
                  to={item.href}
                  className="group flex items-start gap-4 bg-card border border-border rounded-2xl p-5 hover:border-accent/50 hover:shadow-sm transition-all"
                >
                  <div className={`shrink-0 w-10 h-10 rounded-xl flex items-center justify-center ${item.color}`}>
                    <item.icon className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-sm text-primary group-hover:text-accent transition-colors">
                      {item.title}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                      {item.desc}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          </motion.div>
        ))}
      </div>

      {/* ── Footer note ── */}
      <div className="max-w-5xl mx-auto px-6 pb-16 md:pb-10">
        <p className="text-xs text-muted-foreground/60 text-center">
          {t("footer.disclaimer")}
        </p>
      </div>
    </div>
  );
}
