import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery } from "convex/react";
import { Authenticated, AuthLoading, Unauthenticated } from "convex/react";
import { toast } from "sonner";
import {
  Globe, ArrowLeft, MessageSquare, Flag, Clock, Lock, Send, ThumbsUp, Heart,
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
import { CATEGORY_CONFIG, timeAgo, type Category } from "./page.tsx";

function ReactionButton({
  active, count, label, icon, onClick,
}: { active: boolean; count: number; label: string; icon: React.ReactNode; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors cursor-pointer",
        active ? "border-accent bg-accent/10 text-accent" : "border-border text-muted-foreground hover:border-accent/40 hover:text-accent",
      )}
    >
      {icon}
      {label}
      {count > 0 && <span className="tabular-nums">{count}</span>}
    </button>
  );
}

function ReplyComposer({ postId, isPaidUser }: { postId: Id<"community_posts">; isPaidUser: boolean }) {
  const submitReply = useMutation(api.community.submitReply);
  const [body, setBody] = useState("");
  const [submitting, setSubmitting] = useState(false);

  if (!isPaidUser) {
    return (
      <button
        type="button"
        onClick={() => toast.info("Replying is available on Pro and Expert plans.")}
        className="w-full flex items-center justify-center gap-1.5 text-xs font-semibold px-3 py-3 rounded-lg border border-accent/30 text-accent bg-accent/5 hover:bg-accent/10 transition-colors cursor-pointer"
      >
        <Lock className="w-3.5 h-3.5" /> Upgrade to reply
      </button>
    );
  }

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      await submitReply({ postId, body });
      setBody("");
      toast.success("Reply posted.");
    } catch (err) {
      toast.error(convexErrMsg(err) ?? "Could not post your reply. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-2">
      <Textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder="Add a reply... no phone numbers, emails, or external links."
        rows={3}
        maxLength={1000}
      />
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">{body.length} / 1000</span>
        <Button size="sm" disabled={body.trim().length < 2 || submitting} onClick={() => void handleSubmit()} className="cursor-pointer">
          <Send className="w-3.5 h-3.5" />
          {submitting ? "Posting…" : "Reply"}
        </Button>
      </div>
    </div>
  );
}

function ReplyThread({ postId }: { postId: Id<"community_posts"> }) {
  const replies = useQuery(api.community.listReplies, { postId });
  const flagReply = useMutation(api.community.flagReply);

  const handleFlag = async (replyId: Id<"community_replies">) => {
    try {
      await flagReply({ replyId });
      toast.success("Reply flagged for review. Thank you.");
    } catch (err) {
      toast.error(convexErrMsg(err) ?? "Could not flag this reply.");
    }
  };

  if (replies === undefined) {
    return (
      <div className="space-y-3">
        {[1, 2].map((i) => <Skeleton key={i} className="h-16 w-full rounded-lg" />)}
      </div>
    );
  }

  if (replies.length === 0) {
    return (
      <div className="text-center py-10 border border-dashed border-border rounded-xl">
        <MessageSquare className="w-7 h-7 text-muted-foreground/30 mx-auto mb-2" />
        <p className="text-sm text-muted-foreground">No replies yet. Be the first to respond.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {replies.map((reply) => (
        <div key={reply._id} className="bg-card border border-border rounded-xl p-4">
          <div className="flex items-start justify-between gap-3 mb-1.5">
            <span className="text-xs font-semibold text-primary">
              {reply.handle}
              {reply.isMe && <span className="ml-1.5 text-[10px] font-bold uppercase tracking-wide text-accent">You</span>}
            </span>
            <button
              type="button"
              onClick={() => void handleFlag(reply._id)}
              className="text-muted-foreground/40 hover:text-destructive transition-colors cursor-pointer shrink-0 p-0.5"
              title="Flag this reply"
            >
              <Flag className="w-3 h-3" />
            </button>
          </div>
          <p className="text-sm text-foreground leading-relaxed">{reply.body}</p>
          <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground mt-2">
            <Clock className="w-3 h-3" />
            {timeAgo(reply.createdAt)}
          </div>
        </div>
      ))}
    </div>
  );
}

function PostDetailInner({ postId, isPaidUser, isAuthenticated }: { postId: Id<"community_posts">; isPaidUser: boolean; isAuthenticated: boolean }) {
  const translateCountry = useCountryName();
  const post = useQuery(api.community.getPostDetail, { postId });
  const flagPost = useMutation(api.community.flagPost);
  const toggleReaction = useMutation(api.community.toggleReaction);

  const handleFlagPost = async () => {
    try {
      await flagPost({ postId });
      toast.success("Post flagged for review. Thank you.");
    } catch (err) {
      toast.error(convexErrMsg(err) ?? "Could not flag this post.");
    }
  };

  const handleReact = async (type: "helpful" | "relatable") => {
    if (!isAuthenticated) {
      toast.info("Sign in to react to posts.");
      return;
    }
    try {
      await toggleReaction({ postId, type });
    } catch (err) {
      toast.error(convexErrMsg(err) ?? "Could not react to this post.");
    }
  };

  if (post === undefined) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-48 w-full rounded-xl" />
        <Skeleton className="h-24 w-full rounded-xl" />
      </div>
    );
  }

  if (post === null) {
    return (
      <div className="text-center py-20">
        <MessageSquare className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
        <p className="text-muted-foreground text-sm">This post isn't available. It may have been removed.</p>
      </div>
    );
  }

  const cfg = CATEGORY_CONFIG[post.category as Category];
  const Icon = cfg.Icon;

  return (
    <div className="space-y-6">
      <div className="bg-card border border-border rounded-xl p-6">
        <div className="flex items-start justify-between gap-3 mb-3">
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
            onClick={() => void handleFlagPost()}
            className="text-muted-foreground/40 hover:text-destructive transition-colors cursor-pointer shrink-0 p-1"
            title="Flag this post"
          >
            <Flag className="w-3.5 h-3.5" />
          </button>
        </div>

        <h1 className="font-serif text-xl font-semibold text-primary mb-3">{post.title}</h1>
        <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">{post.body}</p>

        <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground mt-4 pt-3 border-t border-border/60">
          <Clock className="w-3 h-3" />
          {timeAgo(post.createdAt)}
          <span className="text-muted-foreground/40 mx-1">·</span>
          Anonymous
        </div>

        <div className="flex items-center gap-2 mt-4">
          <ReactionButton
            active={post.myReactions.includes("helpful")}
            count={post.helpfulCount}
            label="Helpful"
            icon={<ThumbsUp className="w-3.5 h-3.5" />}
            onClick={() => void handleReact("helpful")}
          />
          <ReactionButton
            active={post.myReactions.includes("relatable")}
            count={post.relatableCount}
            label="Relatable"
            icon={<Heart className="w-3.5 h-3.5" />}
            onClick={() => void handleReact("relatable")}
          />
        </div>
      </div>

      <div>
        <h2 className="text-xs font-semibold text-primary uppercase tracking-widest mb-3 flex items-center gap-1.5">
          <MessageSquare className="w-3.5 h-3.5" />
          {post.replyCount} {post.replyCount === 1 ? "Reply" : "Replies"}
        </h2>

        {isAuthenticated ? (
          <div className="mb-4">
            <ReplyComposer postId={postId} isPaidUser={isPaidUser} />
          </div>
        ) : (
          <div className="mb-4 bg-primary/4 border border-primary/15 rounded-xl p-4 text-center">
            <p className="text-sm text-muted-foreground">Sign in to reply.</p>
          </div>
        )}

        <ReplyThread postId={postId} />
      </div>
    </div>
  );
}

export default function CommunityPostPage() {
  const { postId } = useParams<{ postId: string }>();
  useSeo({ title: "Community Discussion", description: "A real visa experience, question, or tip from the VisaClear community." });
  const navigate = useNavigate();
  const goBack = useSmartBack("/community");
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
      </header>

      <main className="max-w-2xl mx-auto px-4 sm:px-6 py-8 sm:py-10">
        <AuthLoading>
          <Skeleton className="h-64 w-full rounded-xl" />
        </AuthLoading>

        <Unauthenticated>
          {postId && <PostDetailInner postId={postId as Id<"community_posts">} isPaidUser={false} isAuthenticated={false} />}
          <div className="mt-8 bg-primary/4 border border-primary/15 rounded-xl p-6">
            <div className="flex items-start gap-3">
              <Lock className="w-5 h-5 text-accent shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-primary mb-1">Sign in to reply or react</p>
                <p className="text-sm text-muted-foreground">Reading is open to everyone.</p>
              </div>
            </div>
            <div className="mt-4 max-w-sm">
              <AuthAccessPanel returnPath={`/community/${postId ?? ""}`} hideDemoOption />
            </div>
          </div>
        </Unauthenticated>

        <Authenticated>
          {postId && <PostDetailInner postId={postId as Id<"community_posts">} isPaidUser={isPaidUser} isAuthenticated={true} />}
        </Authenticated>
      </main>
    </div>
  );
}
