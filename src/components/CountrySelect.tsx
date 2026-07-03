import { useState, useRef, useEffect, useCallback } from "react";
import { Search, Check, ChevronDown, X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useCountryName } from "@/hooks/use-country-name.ts";
import { DESTINATION_FLAGS } from "@/lib/destination-flags.ts";
import { ALL_COUNTRIES } from "@/lib/countries.ts";
import { cn } from "@/lib/utils.ts";

interface CountrySelectProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  countries?: string[];
  className?: string;
  id?: string;
}

export function CountrySelect({
  value,
  onChange,
  placeholder = "Select a country…",
  countries = ALL_COUNTRIES,
  className,
  id,
}: CountrySelectProps) {
  const translateCountry = useCountryName();
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [highlighted, setHighlighted] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  const filtered = query.trim()
    ? countries.filter(
        (c) =>
          c.toLowerCase().includes(query.toLowerCase()) ||
          translateCountry(c).toLowerCase().includes(query.toLowerCase()),
      )
    : countries;

  const displayValue = value ? `${DESTINATION_FLAGS[value] ?? "🌍"} ${translateCountry(value)}` : "";

  const select = useCallback(
    (country: string) => {
      onChange(country);
      setQuery("");
      setOpen(false);
      setHighlighted(0);
    },
    [onChange],
  );

  const clear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange("");
    setQuery("");
    setOpen(false);
  };

  // Close on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        setQuery("");
      }
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Scroll highlighted item into view
  useEffect(() => {
    if (!open || !listRef.current) return;
    const item = listRef.current.children[highlighted] as HTMLElement | undefined;
    item?.scrollIntoView({ block: "nearest" });
  }, [highlighted, open]);

  // Reset highlight when filter changes
  useEffect(() => {
    setHighlighted(0);
  }, [query]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!open) {
      if (e.key === "Enter" || e.key === " " || e.key === "ArrowDown") {
        e.preventDefault();
        setOpen(true);
      }
      return;
    }
    if (e.key === "Escape") {
      setOpen(false);
      setQuery("");
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlighted((h) => Math.min(h + 1, filtered.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlighted((h) => Math.max(h - 1, 0));
    } else if (e.key === "Enter" && filtered[highlighted]) {
      e.preventDefault();
      select(filtered[highlighted]);
    }
  };

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      {/* Trigger */}
      <div
        role="combobox"
        aria-expanded={open}
        aria-haspopup="listbox"
        tabIndex={0}
        id={id}
        onClick={() => {
          setOpen((v) => !v);
          if (!open) setTimeout(() => inputRef.current?.focus(), 50);
        }}
        onKeyDown={handleKeyDown}
        className={cn(
          "flex items-center gap-2 w-full px-3.5 py-2.5 text-sm rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring cursor-pointer select-none transition-colors",
          open && "ring-2 ring-ring border-transparent",
        )}
      >
        {value ? (
          <span className="flex-1 truncate text-foreground">{displayValue}</span>
        ) : (
          <span className="flex-1 truncate text-muted-foreground">{placeholder}</span>
        )}
        <div className="flex items-center gap-1 shrink-0">
          {value && (
            <button
              type="button"
              onClick={clear}
              tabIndex={-1}
              className="text-muted-foreground hover:text-foreground transition-colors cursor-pointer p-0.5 rounded"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
          <ChevronDown className={cn("w-4 h-4 text-muted-foreground transition-transform duration-150", open && "rotate-180")} />
        </div>
      </div>

      {/* Dropdown */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.12 }}
            className="absolute z-50 mt-1.5 w-full bg-card border border-border rounded-xl shadow-xl overflow-hidden"
          >
            {/* Search box inside dropdown */}
            <div className="p-2 border-b border-border">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
                <input
                  ref={inputRef}
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Search countries…"
                  className="w-full pl-8 pr-3 py-1.5 text-sm rounded-lg bg-background border border-input focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
            </div>

            {/* List */}
            <ul
              ref={listRef}
              role="listbox"
              className="max-h-52 overflow-y-auto py-1"
            >
              {filtered.length === 0 ? (
                <li className="px-4 py-3 text-sm text-muted-foreground text-center">
                  No countries match &ldquo;{query}&rdquo;
                </li>
              ) : (
                filtered.map((country, i) => (
                  <li
                    key={country}
                    role="option"
                    aria-selected={value === country}
                    onMouseDown={() => select(country)}
                    onMouseEnter={() => setHighlighted(i)}
                    className={cn(
                      "flex items-center gap-2.5 px-3.5 py-2 text-sm cursor-pointer transition-colors",
                      i === highlighted && "bg-accent/8",
                      value === country && "text-primary font-medium",
                    )}
                  >
                    <span className="text-base leading-none shrink-0">
                      {DESTINATION_FLAGS[country] ?? "🌍"}
                    </span>
                    <span className="flex-1 truncate">{translateCountry(country)}</span>
                    {value === country && (
                      <Check className="w-3.5 h-3.5 text-accent shrink-0" />
                    )}
                  </li>
                ))
              )}
            </ul>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
