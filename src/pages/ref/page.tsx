import { useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import { storeCreatorSlug } from "@/hooks/use-creator-referral.ts";

function getOrCreateSessionId(): string {
  const key = "vc_sid";
  let sid = sessionStorage.getItem(key);
  if (!sid) {
    sid = Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2);
    sessionStorage.setItem(key, sid);
  }
  return sid;
}

export default function RefPage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const logClick = useMutation(api.creators.logClick);

  useEffect(() => {
    if (!slug) { void navigate("/", { replace: true }); return; }
    const normalized = slug.toLowerCase().replace(/[^a-z0-9-]/g, "");
    if (!normalized) { void navigate("/", { replace: true }); return; }

    const sessionId = getOrCreateSessionId();
    storeCreatorSlug(normalized);

    // Log the click, then redirect regardless of whether it succeeds
    void logClick({ slug: normalized, sessionId }).finally(() => {
      void navigate("/", { replace: true });
    });
  }, [slug, navigate, logClick]);

  // Shows briefly while the click fires — not visible to fast connections
  return (
    <div className="min-h-screen flex items-center justify-center bg-white">
      <div className="text-center">
        <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-sm text-slate-500">Taking you to VisaClear…</p>
      </div>
    </div>
  );
}
