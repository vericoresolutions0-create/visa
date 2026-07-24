import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { useNavigate } from "react-router-dom";
import { useMutation, usePaginatedQuery, useQuery } from "convex/react";
import { Authenticated, AuthLoading, Unauthenticated } from "convex/react";

import { toast } from "sonner";
import {
  Globe,
  ArrowLeft,
  MessageSquare,
  Lightbulb,
  HelpCircle,
  AlertCircle,
  Plane,
  Flag,
  Plus,
  X,
  Clock,
  Lock,
  Award,
  ChevronRight,
  Zap,
} from "lucide-react";
import { api } from "@/convex/_generated/api.js";
import { Button } from "@/components/ui/button.tsx";
import { Textarea } from "@/components/ui/textarea.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { AuthAccessPanel } from "@/components/auth/access-panel.tsx";
import { useSeo } from "@/hooks/use-seo.ts";
import { useSmartBack } from "@/hooks/use-smart-back.ts";
import { useAuth } from "@/hooks/use-auth.ts";
import { useCountryName } from "@/hooks/use-country-name.ts";
import { DESTINATION_FLAGS } from "@/lib/destination-flags.ts";
import { cn, convexErrMsg } from "@/lib/utils.ts";
import type { Id } from "@/convex/_generated/dataModel.js";

export type Category = "experience" | "question" | "tip" | "complaint";
type Post = {
  _id: Id<"community_posts">;
  title: string;
  body: string;
  category: Category;
  country: string;
  featured: boolean;
  createdAt: string;
  replyCount: number;
  helpfulCount: number;
  relatableCount: number;
};

export const CATEGORY_CONFIG: Record<Category, { label: string; Icon: typeof Plane; color: string }> = {
  experience: { label: "Experience", Icon: Plane, color: "text-blue-600 bg-blue-50 border-blue-200" },
  question:   { label: "Question",   Icon: HelpCircle, color: "text-purple-600 bg-purple-50 border-purple-200" },
  tip:        { label: "Tip",        Icon: Lightbulb, color: "text-amber-600 bg-amber-50 border-amber-200" },
  complaint:  { label: "Complaint",  Icon: AlertCircle, color: "text-red-600 bg-red-50 border-red-200" },
};

const FILTER_CATEGORIES: { value: Category | "all"; label: string }[] = [
  { value: "all", label: "All" },
  { value: "experience", label: "Experiences" },
  { value: "question", label: "Questions" },
  { value: "tip", label: "Tips" },
  { value: "complaint", label: "Complaints" },
];

export function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function PostCard({ post, onFlag }: { post: Post; onFlag: (id: Id<"community_posts">) => void }) {
  const navigate = useNavigate();
  const translateCountry = useCountryName();
  const cfg = CATEGORY_CONFIG[post.category];
  const Icon = cfg.Icon;

  return (
    <motion.article
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-card border border-border rounded-xl p-5 flex flex-col gap-3 cursor-pointer hover:border-accent/40 transition-colors"
      onClick={() => navigate(`/community/${post._id}`)}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2 flex-wrap">
          <span className={cn("flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-full border", cfg.color)}>
            <Icon className="w-3 h-3" />
            {cfg.label}
          </span>
          <span className="text-xs text-muted-foreground flex items-center gap-1">
            {DESTINATION_FLAGS[post.country] ?? "🌍"} {translateCountry(post.country)}
          </span>
        </div>
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onFlag(post._id); }}
          className="text-muted-foreground/40 hover:text-destructive transition-colors cursor-pointer shrink-0 p-1"
          title="Flag this post"
        >
          <Flag className="w-3.5 h-3.5" />
        </button>
      </div>

      <h3 className="font-semibold text-sm text-primary leading-snug">{post.title}</h3>
      <p className="text-sm text-foreground leading-relaxed line-clamp-4">{post.body}</p>

      <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground mt-auto pt-1 border-t border-border/60">
        <Clock className="w-3 h-3" />
        {timeAgo(post.createdAt)}
        <span className="text-muted-foreground/40 mx-1">·</span>
        Anonymous
        <span className="text-muted-foreground/40 mx-1">·</span>
        <MessageSquare className="w-3 h-3" />
        {post.replyCount}
        {(post.helpfulCount > 0 || post.relatableCount > 0) && (
          <>
            <span className="text-muted-foreground/40 mx-1">·</span>
            {post.helpfulCount > 0 && <span>👍 {post.helpfulCount}</span>}
            {post.helpfulCount > 0 && post.relatableCount > 0 && " "}
            {post.relatableCount > 0 && <span>❤️ {post.relatableCount}</span>}
          </>
        )}
      </div>
    </motion.article>
  );
}

function SubmitPostForm({ onClose }: { onClose: () => void }) {
  const submitPost = useMutation(api.community.submitPost);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [category, setCategory] = useState<Category>("experience");
  const [submitting, setSubmitting] = useState(false);

  const canSubmit = title.trim().length > 0 && body.trim().length >= 30;

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      await submitPost({ title, body, category });
      toast.success("Post submitted. It will appear once reviewed.");
      onClose();
    } catch (err) {
      const msg = convexErrMsg(err) ?? "Something went wrong. Please try again.";
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="bg-card border border-border rounded-xl p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-sm text-primary">Share with the community</h3>
        <button type="button" onClick={onClose} className="text-muted-foreground hover:text-primary transition-colors cursor-pointer">
          <X className="w-4 h-4" />
        </button>
      </div>

      <p className="text-xs text-muted-foreground leading-relaxed">
        Your post is anonymous — your name and contact details are never shown. Do not include phone numbers, email addresses, or external links. Posts are reviewed before going live.
      </p>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {(["experience", "question", "tip", "complaint"] as Category[]).map((cat) => {
          const cfg = CATEGORY_CONFIG[cat];
          const Icon = cfg.Icon;
          return (
            <button
              key={cat}
              type="button"
              onClick={() => setCategory(cat)}
              className={cn(
                "flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold border transition-colors cursor-pointer",
                category === cat ? cfg.color : "border-border text-muted-foreground hover:border-primary/30 hover:text-primary",
              )}
            >
              <Icon className="w-3.5 h-3.5 shrink-0" />
              {cfg.label}
            </button>
          );
        })}
      </div>

      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Give your post a clear title..."
        maxLength={120}
        className="w-full px-3 py-2.5 text-sm rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring"
      />

      <Textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder="Share your experience, question, or tip... (at least 30 characters)"
        rows={5}
        maxLength={2000}
      />

      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">{body.length} / 2000</span>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={onClose} className="cursor-pointer">Cancel</Button>
          <Button size="sm" disabled={!canSubmit || submitting} onClick={() => { void handleSubmit(); }} className="cursor-pointer">
            {submitting ? "Submitting…" : "Submit Post"}
          </Button>
        </div>
      </div>
    </div>
  );
}

function MyPostsPanel() {
  const myPosts = useQuery(api.community.getMyPosts);
  if (!myPosts || myPosts.length === 0) return null;

  return (
    <div className="mb-8 bg-primary/4 border border-primary/15 rounded-xl p-4">
      <h3 className="text-xs font-semibold text-primary uppercase tracking-widest mb-3">Your Submissions</h3>
      <div className="space-y-2">
        {myPosts.map((p) => (
          <div key={p._id} className="flex items-center justify-between gap-3 text-sm">
            <span className="text-foreground truncate">{p.title}</span>
            <span className={cn(
              "shrink-0 text-[10px] font-semibold px-2 py-0.5 rounded-full",
              p.status === "approved" ? "bg-green-100 text-green-700" :
              p.status === "pending"  ? "bg-amber-100 text-amber-700" :
              p.status === "hidden"   ? "bg-orange-100 text-orange-700" :
                                        "bg-red-100 text-red-700",
            )}>
              {p.status === "pending" ? "Under Review" : p.status === "hidden" ? "Flagged" : p.status.charAt(0).toUpperCase() + p.status.slice(1)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function CommunityFeed({ isPaidUser }: { isPaidUser: boolean }) {
  const { isAuthenticated } = useAuth();
  const [activeCategory, setActiveCategory] = useState<Category | "all">("all");
  const [showForm, setShowForm] = useState(false);
  const flagPost = useMutation(api.community.flagPost);

  const { results: posts, status, loadMore } = usePaginatedQuery(
    api.community.listApprovedPosts,
    { category: activeCategory === "all" ? undefined : activeCategory },
    { initialNumItems: 12 },
  );

  const handleFlag = async (postId: Id<"community_posts">) => {
    try {
      await flagPost({ postId });
      toast.success("Post flagged for review. Thank you.");
    } catch (err) {
      const msg = convexErrMsg(err) ?? "Could not flag this post.";
      toast.error(msg);
    }
  };

  return (
    <div>
      {isAuthenticated && <MyPostsPanel />}

      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div className="flex flex-wrap gap-2">
          {FILTER_CATEGORIES.map((cat) => (
            <button
              key={cat.value}
              type="button"
              onClick={() => setActiveCategory(cat.value)}
              className={cn(
                "px-4 py-2 rounded-full text-sm font-semibold transition-all cursor-pointer",
                activeCategory === cat.value
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-muted/80",
              )}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {isAuthenticated && isPaidUser && (
          <Button size="sm" onClick={() => setShowForm((v) => !v)} className="cursor-pointer">
            <Plus className="w-4 h-4" />
            Post
          </Button>
        )}
        {isAuthenticated && !isPaidUser && (
          <button
            type="button"
            onClick={() => toast.info("Community posting is available on Pro and Expert plans.")}
            className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg border border-accent/30 text-accent bg-accent/5 hover:bg-accent/10 transition-colors cursor-pointer"
          >
            <Zap className="w-3.5 h-3.5" /> Upgrade to Post
          </button>
        )}
      </div>

      <AnimatePresence>
        {showForm && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="mb-6"
          >
            <SubmitPostForm onClose={() => setShowForm(false)} />
          </motion.div>
        )}
      </AnimatePresence>

      {status === "LoadingFirstPage" && (
        <div className="grid gap-4 sm:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-40 rounded-xl" />
          ))}
        </div>
      )}

      {status !== "LoadingFirstPage" && posts.length === 0 && (
        <div className="text-center py-20">
          <MessageSquare className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-muted-foreground text-sm">No posts yet. Be the first to share.</p>
        </div>
      )}

      {posts.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2">
          {(posts as Post[]).map((post) => (
            <PostCard key={post._id} post={post} onFlag={(id) => { void handleFlag(id); }} />
          ))}
        </div>
      )}

      {status === "CanLoadMore" && (
        <div className="text-center mt-8">
          <Button variant="outline" onClick={() => loadMore(12)} className="cursor-pointer">
            Load more
          </Button>
        </div>
      )}
    </div>
  );
}

export default function CommunityPage() {
  useSeo({
    title: "Community",
    description: "Real visa experiences, questions, and tips from VisaClear members. Anonymous, safe, and moderated.",
  });
  const navigate = useNavigate();
  const goBack = useSmartBack("/");
  const { isAuthenticated } = useAuth();
  const currentUser = useQuery(api.users.getCurrentUser, isAuthenticated ? {} : "skip");
  const isPaidUser = currentUser?.plan === "pro" || currentUser?.plan === "expert";

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border/40 px-4 sm:px-6 py-4 flex items-center justify-between sticky top-0 z-40 bg-background/95 backdrop-blur">
        <div className="flex items-center gap-3">
          <button onClick={goBack} className="p-2 rounded-lg hover:bg-muted transition-colors cursor-pointer">
            <ArrowLeft className="w-4 h-4" />
          </button>
          <button onClick={() => navigate("/")} className="flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity">
            <Globe className="w-5 h-5 text-accent" />
            <span className="font-serif font-semibold text-primary">VisaClear</span>
            <span className="text-xs text-muted-foreground tracking-widest uppercase ml-1">Community</span>
          </button>
        </div>
        <Button size="sm" onClick={() => navigate("/checklist")} className="cursor-pointer">
          Get My Checklist
        </Button>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-10 sm:py-12">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="mb-10">
          <p className="text-xs tracking-widest uppercase font-semibold text-accent mb-3">Real People. Real Journeys.</p>
          <h1 className="font-serif text-3xl sm:text-4xl font-semibold text-primary mb-3">VisaClear Community</h1>
          <p className="text-muted-foreground max-w-xl leading-relaxed">
            Experiences, questions, and tips from people who have been through the process. Everything here is anonymous. No names, no contact details — just honest, useful stories.
          </p>
          <div className="flex items-center gap-2 mt-4 text-xs text-muted-foreground">
            <Lock className="w-3.5 h-3.5 text-accent" />
            Posting open to Pro and Expert members only. Reading is open to everyone.
          </div>
          {/* Wall of Fame crosslink */}
          <button
            type="button"
            onClick={() => navigate("/wall-of-fame")}
            className="mt-5 inline-flex items-center gap-1.5 text-xs font-semibold text-accent hover:text-accent/80 transition-colors cursor-pointer underline-offset-4 hover:underline"
          >
            <Award className="w-3.5 h-3.5" />
            Refusal → Approval stories
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </motion.div>

        <AuthLoading>
          <div className="grid gap-4 sm:grid-cols-2">
            {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-40 rounded-xl" />)}
          </div>
        </AuthLoading>

        <Unauthenticated>
          <div className="mb-10 bg-primary/4 border border-primary/15 rounded-xl p-6">
            <div className="flex items-start gap-3">
              <Lock className="w-5 h-5 text-accent shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-primary mb-1">Sign in to post</p>
                <p className="text-sm text-muted-foreground">
                  Reading is open to everyone. To share your own experience or ask a question, sign in with a Pro or Expert account.
                </p>
              </div>
            </div>
            <div className="mt-4 max-w-sm">
              <AuthAccessPanel returnPath="/community" hideDemoOption />
            </div>
          </div>
          <CommunityFeed isPaidUser={false} />
        </Unauthenticated>

        <Authenticated>
          <CommunityFeed isPaidUser={isPaidUser} />
        </Authenticated>
      </main>
    </div>
  );
}
