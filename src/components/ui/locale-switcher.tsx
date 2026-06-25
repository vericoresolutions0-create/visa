import { changeLocale, SUPPORTED_LOCALES, SUPPORTED_LOCALES_ARRAY, type SupportedLocale } from "@/i18n.ts";
import { cn } from "@/lib/utils.ts";
import { Check, Globe } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button.tsx";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu.tsx";

export default function LocaleSwitcher({ className }: { className?: string }) {
  const { i18n } = useTranslation();
  const currentMeta = SUPPORTED_LOCALES[i18n.language as keyof typeof SUPPORTED_LOCALES] ?? SUPPORTED_LOCALES.en;

  const handleChangeLocale = (lng: SupportedLocale) => {
    void changeLocale(lng);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className={cn("cursor-pointer gap-1.5", className)}>
          <Globe className="w-3.5 h-3.5" />
          <span className="text-xs font-medium">{currentMeta.emoji} {currentMeta.code.toUpperCase()}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        {SUPPORTED_LOCALES_ARRAY.map((lng) => {
          const meta = SUPPORTED_LOCALES[lng];
          const isActive = i18n.language === lng;
          return (
            <DropdownMenuItem
              key={lng}
              onClick={() => handleChangeLocale(lng)}
              className="cursor-pointer"
            >
              <Check className={cn("mr-2 h-3.5 w-3.5", isActive ? "opacity-100" : "opacity-0")} />
              <span className="mr-2">{meta.emoji}</span>
              <span className="flex-1 text-sm">{meta.nativeName}</span>
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
