import { useState } from "react";
import { motion } from "motion/react";
import { useNavigate } from "react-router-dom";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import { ConvexError } from "convex/values";
import { Button } from "@/components/ui/button.tsx";
import { Globe, ArrowLeft, Clock, ChevronRight, BookOpen, Tag } from "lucide-react";
import { useSeo } from "@/hooks/use-seo.ts";
import { useSmartBack } from "@/hooks/use-smart-back.ts";
import { toast } from "sonner";

type Post = {
  id: string;
  title: string;
  excerpt: string;
  category: string;
  readTime: string;
  date: string;
  featured: boolean;
};

const POSTS: Post[] = [
  {
    id: "why-visa-applications-get-rejected",
    title: "The 7 Most Common Reasons Visa Applications Get Rejected (and How to Avoid Them)",
    excerpt: "Rejection is rarely about the applicant being unqualified. In most cases, it comes down to documentation errors that are completely preventable with the right checklist.",
    category: "Visa Tips",
    readTime: "5 min read",
    date: "April 28, 2026",
    featured: true,
  },
  {
    id: "schengen-visa-guide-nigerians",
    title: "The Complete Schengen Visa Guide for Nigerian Applicants in 2026",
    excerpt: "Everything you need to know about applying for a Schengen visa from Nigeria, including which countries are easiest, document requirements, and current processing times.",
    category: "Destination Guides",
    readTime: "8 min read",
    date: "April 20, 2026",
    featured: false,
  },
  {
    id: "bank-statement-tips",
    title: "How to Prepare a Bank Statement That Satisfies Visa Officers",
    excerpt: "Your bank statement can make or break your application. Here is exactly what officers look for, what amounts are acceptable, and how to present your finances correctly.",
    category: "Document Guides",
    readTime: "4 min read",
    date: "April 14, 2026",
    featured: false,
  },
  {
    id: "uk-student-visa-checklist",
    title: "UK Student Visa Document Checklist: What Every African Student Must Know",
    excerpt: "A detailed breakdown of the documents required for a UK student visa, with specific guidance for applicants from Nigeria, Ghana, Kenya, and South Africa.",
    category: "Destination Guides",
    readTime: "6 min read",
    date: "April 8, 2026",
    featured: false,
  },
  {
    id: "poland-work-permit-2026",
    title: "Poland Work Permit for Non-EU Nationals: Step-by-Step 2026 Guide",
    excerpt: "Poland has become a top destination for Nigerian and African professionals. Here is a practical guide covering permits, documents, and processing times.",
    category: "Destination Guides",
    readTime: "7 min read",
    date: "April 2, 2026",
    featured: false,
  },
  {
    id: "travel-insurance-visa-applications",
    title: "Does Travel Insurance Actually Matter for Visa Applications?",
    excerpt: "Short answer: yes, especially for Schengen. We break down what type of insurance officers actually want to see and common mistakes applicants make.",
    category: "Visa Tips",
    readTime: "3 min read",
    date: "March 25, 2026",
    featured: false,
  },
  {
    id: "visa-agent-or-self-apply",
    title: "Should You Use a Visa Agent or Apply Yourself? An Honest Comparison",
    excerpt: "Agents are useful. But they are not always necessary. We compare both approaches across cost, time, and approval rate so you can decide what makes sense for your case.",
    category: "Guides",
    readTime: "5 min read",
    date: "March 18, 2026",
    featured: false,
  },
  {
    id: "canada-visitor-visa-africa",
    title: "Canada Visitor Visa for African Applicants: What Changed in 2026",
    excerpt: "Recent policy changes have affected approval rates for applicants from several African countries. Here is what you need to know and how to strengthen your application.",
    category: "Destination Guides",
    readTime: "6 min read",
    date: "March 10, 2026",
    featured: false,
  },
  {
    id: "how-to-write-cover-letter-visa",
    title: "How to Write a Visa Cover Letter That Officers Actually Read",
    excerpt: "Most applicants either skip the cover letter or write one that says nothing useful. A well-written letter can be the difference between approval and rejection for borderline cases.",
    category: "Document Guides",
    readTime: "5 min read",
    date: "February 28, 2026",
    featured: false,
  },
  {
    id: "uae-visa-from-nigeria-ghana",
    title: "UAE Tourist Visa from Nigeria and Ghana: Full 2026 Application Guide",
    excerpt: "Dubai is one of the fastest-growing destinations for West African travellers. Here is every document you need, current processing times, and tips to avoid the most common rejections.",
    category: "Destination Guides",
    readTime: "6 min read",
    date: "February 15, 2026",
    featured: false,
  },
];

const CATEGORIES = ["All", "Visa Tips", "Destination Guides", "Document Guides", "Guides"];

export default function BlogPage() {
  useSeo({ title: "Blog", description: "Visa tips, country guides, and immigration insights from the VisaClear team. Everything you need to know to get your visa approved." });
  const navigate = useNavigate();
  const goBack = useSmartBack("/");
  const [activeCategory, setActiveCategory] = useState("All");
  const [newsletterEmail, setNewsletterEmail] = useState("");
  const [subscribing, setSubscribing] = useState(false);
  const subscribeToNewsletter = useMutation(api.newsletter.subscribe);

  const handleSubscribe = async () => {
    if (!newsletterEmail.trim()) {
      toast.error("Please enter your email address.");
      return;
    }
    setSubscribing(true);
    try {
      const result = await subscribeToNewsletter({ email: newsletterEmail });
      toast.success(result.alreadySubscribed ? "You're already subscribed." : "Subscribed. Watch your inbox.");
      setNewsletterEmail("");
    } catch (err) {
      if (err instanceof ConvexError) {
        toast.error((err.data as { message: string }).message);
      } else {
        toast.error("Failed to subscribe. Please try again.");
      }
    } finally {
      setSubscribing(false);
    }
  };

  const filtered = activeCategory === "All" ? POSTS : POSTS.filter((p) => p.category === activeCategory);
  const featured = POSTS.find((p) => p.featured);
  const rest = filtered.filter((p) => !p.featured || activeCategory !== "All");

  return (
    <div className="min-h-screen bg-background">
      {/* Nav */}
      <header className="border-b border-border/40 px-6 py-4 flex items-center justify-between sticky top-0 z-40 bg-background/95 backdrop-blur">
        <div className="flex items-center gap-3">
          <button onClick={goBack} className="p-2 rounded-lg hover:bg-muted transition-colors cursor-pointer">
            <ArrowLeft className="w-4 h-4" />
          </button>
          <button onClick={() => navigate("/")} className="flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity">
            <Globe className="w-5 h-5 text-accent" />
            <span className="font-serif font-semibold text-primary">VisaClear</span>
            <span className="text-xs text-muted-foreground tracking-widest uppercase">Resources</span>
          </button>
        </div>
        <Button size="sm" onClick={() => navigate("/checklist")} className="cursor-pointer">
          Get Free Checklist
        </Button>
      </header>

      <div className="max-w-5xl mx-auto px-6 py-16">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-14">
          <p className="text-xs tracking-widest uppercase font-semibold text-accent mb-3">Resources and Guides</p>
          <h1 className="font-serif text-5xl font-semibold text-primary mb-4">VisaClear Resource Centre</h1>
          <p className="text-muted-foreground max-w-xl mx-auto">
            Practical guides, destination breakdowns, and document tips written specifically for African, Asian, and LatAm applicants.
          </p>
        </motion.div>

        {/* Featured post */}
        {featured && activeCategory === "All" && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-primary rounded-2xl p-10 mb-12 cursor-pointer group"
            onClick={() => navigate(`/blog/${featured.id}`)}
          >
            <div className="flex flex-wrap items-center gap-3 mb-4">
              <span className="bg-accent text-white text-xs font-semibold px-3 py-1 rounded-full">{featured.category}</span>
              <span className="text-primary-foreground/50 text-xs flex items-center gap-1"><Clock className="w-3 h-3" />{featured.readTime}</span>
              <span className="text-primary-foreground/50 text-xs">{featured.date}</span>
            </div>
            <h2 className="font-serif text-3xl font-semibold text-primary-foreground mb-3 group-hover:text-accent transition-colors leading-snug">
              {featured.title}
            </h2>
            <p className="text-primary-foreground/65 leading-relaxed mb-5">{featured.excerpt}</p>
            <div className="flex items-center gap-1.5 text-accent font-semibold text-sm">
              Read Article <ChevronRight className="w-4 h-4" />
            </div>
          </motion.div>
        )}

        {/* Category filter */}
        <div className="flex flex-wrap gap-2 mb-10">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-4 py-2 rounded-full text-sm font-semibold transition-all cursor-pointer ${
                activeCategory === cat
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Post grid */}
        <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-6">
          {rest.map((post, i) => (
            <motion.div
              key={post.id}
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.05 }}
              className="bg-background border border-border/50 rounded-2xl p-6 cursor-pointer hover:border-accent/30 transition-colors group"
              onClick={() => navigate(`/blog/${post.id}`)}
            >
              <div className="flex items-center gap-2 mb-3">
                <span className="bg-accent/10 text-accent text-[10px] font-semibold px-2.5 py-1 rounded-full uppercase tracking-widest flex items-center gap-1">
                  <Tag className="w-2.5 h-2.5" />{post.category}
                </span>
              </div>
              <h3 className="font-serif text-lg font-semibold text-primary mb-2 leading-snug group-hover:text-accent transition-colors">
                {post.title}
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed mb-4 line-clamp-3">{post.excerpt}</p>
              <div className="flex items-center justify-between text-xs text-muted-foreground border-t border-border/40 pt-3">
                <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{post.readTime}</span>
                <span>{post.date}</span>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Newsletter CTA */}
        <div className="mt-16 bg-primary rounded-2xl p-10 text-center text-primary-foreground">
          <BookOpen className="w-8 h-8 text-accent mx-auto mb-4" />
          <h2 className="font-serif text-2xl font-semibold mb-2">Get new guides in your inbox</h2>
          <p className="text-primary-foreground/65 text-sm mb-6 max-w-sm mx-auto">
            We publish practical visa guides every week. No spam, just useful information.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 max-w-sm mx-auto">
            <input
              type="email"
              placeholder="example@gmail.com"
              value={newsletterEmail}
              onChange={(e) => setNewsletterEmail(e.target.value)}
              disabled={subscribing}
              className="flex-1 px-4 py-2.5 rounded-xl bg-white/10 border border-white/20 text-primary-foreground placeholder:text-primary-foreground/40 text-sm focus:outline-none focus:border-accent disabled:opacity-60"
            />
            <Button
              size="sm"
              disabled={subscribing}
              className="bg-white text-primary hover:bg-white/90 cursor-pointer font-semibold whitespace-nowrap disabled:opacity-60"
              onClick={handleSubscribe}
            >
              {subscribing ? "Subscribing…" : "Subscribe"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
