import type { ReactNode } from "react";
import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { CheckCircle2, XCircle, Eye } from "lucide-react";
import { toast } from "sonner";
import type { Id } from "@/convex/_generated/dataModel.js";

export function CommunityAdminPanel() {
  const posts = useQuery(api.community.listPostsForModeration, {});
  const moderate = useMutation(api.community.moderatePost);
  const toggleFeatured = useMutation(api.community.toggleFeatured);
  const [processingId, setProcessingId] = useState<string | null>(null);

  const handleModerate = async (postId: string, decision: "approved" | "rejected", featured?: boolean) => {
    setProcessingId(postId);
    try {
      await moderate({
        postId: postId as Id<"community_posts">,
        decision,
        featured: featured ?? false,
      });
      toast.success(decision === "approved" ? "Post approved." : "Post rejected.");
    } catch {
      toast.error("Failed to moderate post.");
    } finally {
      setProcessingId(null);
    }
  };

  const handleToggleFeatured = async (postId: string) => {
    setProcessingId(postId);
    try {
      await toggleFeatured({ postId: postId as Id<"community_posts"> });
      toast.success("Featured status updated.");
    } catch {
      toast.error("Failed to update featured status.");
    } finally {
      setProcessingId(null);
    }
  };

  const pending = posts?.filter((p) => p.status === "pending") ?? [];
  const hidden = posts?.filter((p) => p.status === "hidden") ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h3 className="font-semibold text-sm text-primary uppercase tracking-widest mb-1">
          Community Posts — Pending Review ({pending.length})
        </h3>
        <p className="text-xs text-muted-foreground mb-3">
          Approve to make a post live. Mark as Featured to surface it on the Blog Community tab.
        </p>
        {posts === undefined ? (
          <Skeleton className="h-40 w-full rounded-xl" />
        ) : pending.length === 0 ? (
          <div className="border border-dashed border-border rounded-xl p-8 text-center text-sm text-muted-foreground">
            No posts pending review.
          </div>
        ) : (
          <div className="space-y-3">
            {pending.map((post) => (
              <div key={post._id} className="bg-card border border-border rounded-xl p-4">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-semibold text-accent uppercase tracking-wide">{post.category} · {post.country}</span>
                  <span className="text-[10px] text-muted-foreground">{new Date(post.createdAt).toLocaleString("en-GB")}</span>
                </div>
                <p className="text-sm font-semibold text-primary mb-1">{post.title}</p>
                <p className="text-xs text-muted-foreground mb-3 leading-relaxed">{post.body}</p>
                <div className="flex flex-wrap gap-2">
                  <button
                    disabled={processingId === post._id}
                    onClick={() => { void handleModerate(post._id, "approved", false); }}
                    className="flex items-center gap-1 text-xs font-semibold text-green-700 bg-green-50 hover:bg-green-100 border border-green-200 px-2.5 py-1.5 rounded-lg cursor-pointer transition-colors"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" /> Approve
                  </button>
                  <button
                    disabled={processingId === post._id}
                    onClick={() => { void handleModerate(post._id, "approved", true); }}
                    className="flex items-center gap-1 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 px-2.5 py-1.5 rounded-lg cursor-pointer transition-colors"
                  >
                    <Eye className="w-3.5 h-3.5" /> Approve + Feature
                  </button>
                  <button
                    disabled={processingId === post._id}
                    onClick={() => { void handleModerate(post._id, "rejected"); }}
                    className="flex items-center gap-1 text-xs font-semibold text-destructive hover:bg-destructive/10 px-2.5 py-1.5 rounded-lg cursor-pointer transition-colors"
                  >
                    <XCircle className="w-3.5 h-3.5" /> Reject
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {hidden.length > 0 && (
        <div>
          <h3 className="font-semibold text-sm text-primary uppercase tracking-widest mb-1">
            Auto-Hidden by Flags ({hidden.length})
          </h3>
          <p className="text-xs text-muted-foreground mb-3">
            These posts were hidden automatically after receiving 3 or more flags from users.
          </p>
          <div className="space-y-3">
            {hidden.map((post) => (
              <div key={post._id} className="bg-card border border-orange-200 rounded-xl p-4">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-semibold text-orange-600 uppercase tracking-wide">
                    {post.category} · {post.country} · {post.flagCount} flags
                  </span>
                  <span className="text-[10px] text-muted-foreground">{new Date(post.createdAt).toLocaleString("en-GB")}</span>
                </div>
                <p className="text-sm font-semibold text-primary mb-1">{post.title}</p>
                <p className="text-xs text-muted-foreground mb-3 leading-relaxed">{post.body}</p>
                <div className="flex flex-wrap gap-2">
                  <button
                    disabled={processingId === post._id}
                    onClick={() => { void handleModerate(post._id, "approved"); }}
                    className="flex items-center gap-1 text-xs font-semibold text-green-700 bg-green-50 hover:bg-green-100 border border-green-200 px-2.5 py-1.5 rounded-lg cursor-pointer transition-colors"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" /> Restore
                  </button>
                  <button
                    disabled={processingId === post._id}
                    onClick={() => { void handleModerate(post._id, "rejected"); }}
                    className="flex items-center gap-1 text-xs font-semibold text-destructive hover:bg-destructive/10 px-2.5 py-1.5 rounded-lg cursor-pointer transition-colors"
                  >
                    <XCircle className="w-3.5 h-3.5" /> Remove
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
