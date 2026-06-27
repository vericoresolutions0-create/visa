import { Star } from "lucide-react";

// The identical star-row pattern repeated across every testimonial card on
// Index, Pricing, and White-Label — each page keeps its own card chrome and
// animation, only this inner piece was truly byte-for-byte duplicated.
export function StarRating({ count, className = "w-4 h-4 fill-accent text-accent" }: { count: number; className?: string }) {
  return (
    <div className="flex gap-0.5">
      {Array.from({ length: count }).map((_, i) => (
        <Star key={i} className={className} />
      ))}
    </div>
  );
}
