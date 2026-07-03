import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { motion } from "motion/react";
import { Globe, ChevronRight, FileText } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button.tsx";

export default function NotFound() {
  const { t } = useTranslation("not-found");
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-6 text-center">
      {/* Logo */}
      <motion.div
        initial={{ opacity: 0, y: -16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="flex items-center gap-3 mb-12 cursor-pointer"
        onClick={() => navigate("/")}
      >
        <div className="w-8 h-8 rounded-md bg-primary flex items-center justify-center">
          <Globe className="w-4 h-4 text-primary-foreground" />
        </div>
        <div>
          <span className="font-serif text-xl font-semibold tracking-wide text-primary">VisaClear</span>
          <span className="text-[10px] text-muted-foreground font-sans ml-2 tracking-widest uppercase">by Vericore</span>
        </div>
      </motion.div>

      {/* 404 Number */}
      <motion.div
        initial={{ opacity: 0, scale: 0.85 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.6, ease: "easeOut", delay: 0.1 }}
      >
        <p className="font-serif text-[10rem] md:text-[14rem] font-semibold leading-none select-none"
          style={{ color: "oklch(0.72 0.13 80 / 18%)" }}>
          404
        </p>
      </motion.div>

      {/* Message */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.55, ease: "easeOut", delay: 0.25 }}
        className="space-y-4 -mt-6"
      >
        <h1 className="font-serif text-3xl md:text-4xl font-semibold text-primary">
          {t("title")}
        </h1>
        <p className="text-muted-foreground max-w-md mx-auto text-balance leading-relaxed">
          {t("subtitle")}
        </p>
      </motion.div>

      {/* CTAs */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.55, ease: "easeOut", delay: 0.4 }}
        className="flex flex-col sm:flex-row items-center gap-3 mt-10"
      >
        <Button
          size="lg"
          className="cursor-pointer bg-primary text-primary-foreground hover:bg-primary/90 font-medium px-8"
          onClick={() => navigate("/")}
        >
          {t("back_home")}
          <ChevronRight className="w-4 h-4 ml-1.5" />
        </Button>
        <Button
          size="lg"
          variant="secondary"
          className="cursor-pointer font-medium px-8"
          onClick={() => navigate("/checklist")}
        >
          <FileText className="w-4 h-4 mr-1.5" />
          {t("get_checklist")}
        </Button>
      </motion.div>

      {/* Disclaimer */}
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.55, delay: 0.6 }}
        className="text-xs text-muted-foreground/50 mt-16 italic"
      >
        &ldquo;It&apos;s all about Privacy.&rdquo; , Vericore Ltd.
      </motion.p>
    </div>
  );
}
